import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { API, crearApp, registrar, type SesionDePrueba } from './ayudantes';

let app: NestExpressApplication;
let prisma: PrismaService;

beforeAll(async () => {
  app = await crearApp();
  prisma = app.get(PrismaService);
});

afterAll(async () => {
  await app.close();
});

const http = () => request(app.getHttpServer());
const auth = (s: SesionDePrueba) => ({ Authorization: `Bearer ${s.accessToken}` });

function crearEmp(s: SesionDePrueba, nombre = 'Peluquería Laura', tipo = 'TURNERO') {
  return http().post(`${API}/emprendimientos`).set(auth(s)).send({ nombre, tipo });
}

describe('/emprendimientos', () => {
  it('debería exigir autenticación', async () => {
    await http().get(`${API}/emprendimientos`).expect(401);
  });

  it('debería crear, listar, ver y renombrar un emprendimiento', async () => {
    const s = await registrar(app);
    const creado = await crearEmp(s).expect(201);
    expect(creado.body).toEqual({
      id: expect.any(String),
      nombre: 'Peluquería Laura',
      tipo: 'TURNERO',
      creadoEn: expect.any(String),
    });
    const id = creado.body.id as string;
    expect((await http().get(`${API}/emprendimientos`).set(auth(s)).expect(200)).body).toHaveLength(
      1,
    );
    await http().get(`${API}/emprendimientos/${id}`).set(auth(s)).expect(200);
    const editado = await http()
      .patch(`${API}/emprendimientos/${id}`)
      .set(auth(s))
      .send({ nombre: 'Peluquería Lau' })
      .expect(200);
    expect(editado.body).toMatchObject({ nombre: 'Peluquería Lau', tipo: 'TURNERO' });
  });

  it('no debería permitir cambiar el tipo', async () => {
    const s = await registrar(app);
    const id = (await crearEmp(s).expect(201)).body.id as string;
    const res = await http()
      .patch(`${API}/emprendimientos/${id}`)
      .set(auth(s))
      .send({ nombre: 'X', tipo: 'VENTAS' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDACION');
  });

  it('debería responder LIMITE_EMPRENDIMIENTOS al crear el cuarto', async () => {
    const s = await registrar(app);
    for (const tipo of ['TURNERO', 'CLASES', 'VENTAS'])
      await crearEmp(s, `E ${tipo}`, tipo).expect(201);
    const res = await crearEmp(s, 'Cuarto', 'VENTAS').expect(409);
    expect(res.body.error.code).toBe('LIMITE_EMPRENDIMIENTOS');
  });

  it('no debería superar el límite con peticiones simultáneas', async () => {
    const s = await registrar(app);
    const respuestas = await Promise.all(
      [1, 2, 3, 4, 5].map((n) => crearEmp(s, `E${n}`, 'VENTAS')),
    );
    expect(respuestas.filter((r) => r.status === 201)).toHaveLength(3);
    expect(respuestas.filter((r) => r.status === 409)).toHaveLength(2);
    expect(await prisma.emprendimiento.count({ where: { usuarioId: s.usuarioId } })).toBe(3);
  });

  it('debería pedir el nombre para eliminar y borrar en cascada liberando el cupo', async () => {
    const s = await registrar(app);
    const id = (await crearEmp(s).expect(201)).body.id as string;
    await prisma.cliente.create({ data: { emprendimientoId: id, nombre: 'Ana' } });

    const mal = await http()
      .delete(`${API}/emprendimientos/${id}`)
      .set(auth(s))
      .send({ confirmarNombre: 'otro' })
      .expect(400);
    expect(mal.body.error.code).toBe('VALIDACION');
    await http().delete(`${API}/emprendimientos/${id}`).set(auth(s)).send({}).expect(400);
    expect(await prisma.emprendimiento.count({ where: { id } })).toBe(1);

    await http()
      .delete(`${API}/emprendimientos/${id}`)
      .set(auth(s))
      .send({ confirmarNombre: 'Peluquería Laura' })
      .expect(204);
    expect(await prisma.emprendimiento.count({ where: { id } })).toBe(0);
    expect(await prisma.cliente.count({ where: { emprendimientoId: id } })).toBe(0);
  });

  it('debería responder NO_ENCONTRADO a un usuario que intenta ver, editar o borrar datos de otro', async () => {
    const duenio = await registrar(app);
    const intruso = await registrar(app);
    const id = (await crearEmp(duenio).expect(201)).body.id as string;

    expect(
      (await http().get(`${API}/emprendimientos/${id}`).set(auth(intruso)).expect(404)).body.error
        .code,
    ).toBe('NO_ENCONTRADO');
    await http()
      .patch(`${API}/emprendimientos/${id}`)
      .set(auth(intruso))
      .send({ nombre: 'Robado' })
      .expect(404);
    await http()
      .delete(`${API}/emprendimientos/${id}`)
      .set(auth(intruso))
      .send({ confirmarNombre: 'Peluquería Laura' })
      .expect(404);
    expect(
      (await http().get(`${API}/emprendimientos`).set(auth(intruso)).expect(200)).body,
    ).toEqual([]);
    expect((await prisma.emprendimiento.findUniqueOrThrow({ where: { id } })).nombre).toBe(
      'Peluquería Laura',
    );
  });

  it('debería responder 404 con un identificador que no es UUID o que no existe', async () => {
    const s = await registrar(app);
    await http().get(`${API}/emprendimientos/no-es-uuid`).set(auth(s)).expect(404);
    await http()
      .get(`${API}/emprendimientos/00000000-0000-4000-8000-000000000000`)
      .set(auth(s))
      .expect(404);
  });
});
