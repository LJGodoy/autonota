import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
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

async function nuevoEmprendimiento(tipo: 'TURNERO' | 'CLASES' | 'VENTAS' = 'TURNERO') {
  const s = await registrar(app);
  const res = await http()
    .post(`${API}/emprendimientos`)
    .set(auth(s))
    .send({ nombre: `E ${tipo}`, tipo })
    .expect(201);
  return {
    s,
    eid: res.body.id as string,
    base: `${API}/emprendimientos/${res.body.id}/movimientos`,
  };
}

describe('/movimientos', () => {
  it('debería crear, listar, corregir y eliminar un movimiento (RF-07)', async () => {
    const { s, base } = await nuevoEmprendimiento();
    const creado = await http()
      .post(base)
      .set(auth(s))
      .send({ tipo: 'GASTO', montoCentavos: 2500000, fecha: '2026-11-14', descripcion: 'Tinturas' })
      .expect(201);
    expect(creado.body).toMatchObject({
      tipo: 'GASTO',
      montoCentavos: 2500000,
      fecha: '2026-11-14',
      descripcion: 'Tinturas',
      medioPago: null,
      mesImputacion: '2026-11',
    });
    const id = creado.body.id as string;

    const editado = await http()
      .patch(`${base}/${id}`)
      .set(auth(s))
      .send({ montoCentavos: 2600050, medioPago: 'TARJETA' })
      .expect(200);
    expect(editado.body).toMatchObject({ montoCentavos: 2600050, medioPago: 'TARJETA' });

    const lista = await http().get(base).set(auth(s)).expect(200);
    expect(lista.body.meta).toEqual({ page: 1, pageSize: 20, total: 1 });

    await http().delete(`${base}/${id}`).set(auth(s)).expect(204);
    await http().delete(`${base}/${id}`).set(auth(s)).expect(404);
  });

  it('no debería duplicar un registro enviado dos veces con la misma Idempotency-Key', async () => {
    const { s, base, eid } = await nuevoEmprendimiento();
    const clave = randomUUID();
    const cuerpo = { tipo: 'INGRESO', montoCentavos: 1500000, fecha: '2026-11-15' };
    const [a, b] = await Promise.all([
      http().post(base).set(auth(s)).set('Idempotency-Key', clave).send(cuerpo),
      http().post(base).set(auth(s)).set('Idempotency-Key', clave).send(cuerpo),
    ]);
    expect([a.status, b.status]).toEqual([201, 201]);
    expect(a.body.id).toBe(b.body.id);
    expect(await prisma.movimiento.count({ where: { emprendimientoId: eid } })).toBe(1);

    const otra = await http()
      .post(base)
      .set(auth(s))
      .set('Idempotency-Key', randomUUID())
      .send(cuerpo)
      .expect(201);
    expect(otra.body.id).not.toBe(a.body.id);
    await http()
      .post(base)
      .set(auth(s))
      .set('Idempotency-Key', 'no-es-uuid')
      .send(cuerpo)
      .expect(400);
  });

  it('debería rechazar montos inválidos y campos no declarados con el detalle por campo', async () => {
    const { s, base } = await nuevoEmprendimiento();
    const res = await http()
      .post(base)
      .set(auth(s))
      .send({ tipo: 'INGRESO', montoCentavos: 10.5, fecha: '2026-02-30', turnoId: randomUUID() })
      .expect(400);
    const campos = res.body.error.details.map((d: { field: string }) => d.field);
    expect(campos).toEqual(expect.arrayContaining(['montoCentavos', 'fecha']));
  });

  it('debería seguir contando un pago mensual anterior en el mes asignado (RF-34, RF-70)', async () => {
    const { s, base, eid } = await nuevoEmprendimiento('CLASES');
    const alumno = await prisma.alumno.create({
      data: { emprendimientoId: eid, nombre: 'Julián' },
    });
    // Pago mensual cargado antes del pago por clase
    const pago = await prisma.movimiento.create({
      data: {
        emprendimientoId: eid,
        tipo: 'INGRESO',
        montoCentavos: 4000000n,
        fecha: new Date('2026-12-03'),
        alumnoId: alumno.id,
        mesCorrespondiente: new Date('2026-11-01'),
      },
    });

    const noviembre = await http().get(`${base}?mes=2026-11`).set(auth(s)).expect(200);
    expect(noviembre.body.data).toEqual([
      expect.objectContaining({
        id: pago.id,
        mesCorrespondiente: '2026-11',
        mesImputacion: '2026-11',
      }),
    ]);
    expect(noviembre.body.data[0]).toMatchObject({ alumnoNombre: 'Julián' });
    const diciembre = await http().get(`${base}?mes=2026-12`).set(auth(s)).expect(200);
    expect(diciembre.body.data).toEqual([]);

    // Los pagos nuevos van por clase: /movimientos ya no acepta alumno ni mes
    await http()
      .post(base)
      .set(auth(s))
      .send({
        tipo: 'INGRESO',
        montoCentavos: 1,
        fecha: '2026-12-03',
        alumnoId: alumno.id,
        mesCorrespondiente: '2026-11',
      })
      .expect(400);
  });

  it('debería rechazar pagos de alumnos fuera de un calendario de clases o de otro emprendimiento', async () => {
    const turnero = await nuevoEmprendimiento('TURNERO');
    const clases = await nuevoEmprendimiento('CLASES');
    const ajeno = await prisma.alumno.create({
      data: { emprendimientoId: clases.eid, nombre: 'Ajeno' },
    });
    const pago = { montoCentavos: 100, claseIds: [randomUUID()] };
    const pagos = (eid: string) => `${API}/emprendimientos/${eid}/alumnos/${ajeno.id}/pagos`;

    const r1 = await http().post(pagos(turnero.eid)).set(auth(turnero.s)).send(pago).expect(409);
    expect(r1.body.error.code).toBe('TIPO_INCOMPATIBLE');
    const otroClases = await nuevoEmprendimiento('CLASES');
    await http().post(pagos(otroClases.eid)).set(auth(otroClases.s)).send(pago).expect(404);
  });

  it('debería conservar las ventas al borrar su tarea (RF-55)', async () => {
    const { s, base, eid } = await nuevoEmprendimiento('VENTAS');
    const tarea = await prisma.tarea.create({ data: { emprendimientoId: eid, titulo: 'Torta' } });
    const venta = await http()
      .post(base)
      .set(auth(s))
      .send({
        tipo: 'INGRESO',
        montoCentavos: 1200000,
        fecha: '2026-11-15',
        tareaId: tarea.id,
        medioPago: 'EFECTIVO',
      })
      .expect(201);
    await prisma.tarea.delete({ where: { id: tarea.id } });
    const lista = await http().get(base).set(auth(s)).expect(200);
    expect(lista.body.data[0]).toMatchObject({ id: venta.body.id, tareaId: null });
  });

  it('no debería permitir a un usuario ver, editar ni borrar movimientos de otro (RNF-02)', async () => {
    const duenio = await nuevoEmprendimiento();
    const intruso = await nuevoEmprendimiento();
    const m = await http()
      .post(duenio.base)
      .set(auth(duenio.s))
      .send({ tipo: 'INGRESO', montoCentavos: 100, fecha: '2026-11-15' })
      .expect(201);

    await http().get(duenio.base).set(auth(intruso.s)).expect(404);
    await http()
      .patch(`${intruso.base}/${m.body.id}`)
      .set(auth(intruso.s))
      .send({ montoCentavos: 1 })
      .expect(404);
    await http().delete(`${intruso.base}/${m.body.id}`).set(auth(intruso.s)).expect(404);
    expect(
      (await prisma.movimiento.findUniqueOrThrow({ where: { id: m.body.id } })).montoCentavos,
    ).toBe(100n);
  });
});

describe('/estadisticas', () => {
  it('debería coincidir con la suma de los movimientos por mes de imputación (CU-12)', async () => {
    const { s, base, eid } = await nuevoEmprendimiento('CLASES');
    const alumno = await prisma.alumno.create({
      data: { emprendimientoId: eid, nombre: 'Camila' },
    });
    const cargar = (cuerpo: object) => http().post(base).set(auth(s)).send(cuerpo).expect(201);
    // Pago mensual anterior al pago por clase: cuenta en el mes asignado
    await prisma.movimiento.create({
      data: {
        emprendimientoId: eid,
        tipo: 'INGRESO',
        montoCentavos: 4000000n,
        fecha: new Date('2026-12-02'),
        alumnoId: alumno.id,
        mesCorrespondiente: new Date('2026-11-01'),
      },
    });
    await cargar({ tipo: 'INGRESO', montoCentavos: 10, fecha: '2026-11-30' });
    await cargar({ tipo: 'GASTO', montoCentavos: 6000050, fecha: '2026-11-01' });
    await cargar({ tipo: 'GASTO', montoCentavos: 999, fecha: '2026-09-10' });
    await cargar({ tipo: 'INGRESO', montoCentavos: 7, fecha: '2026-12-15' });

    const res = await http()
      .get(`${API}/emprendimientos/${eid}/estadisticas?desde=2026-09&hasta=2026-11`)
      .set(auth(s))
      .expect(200);
    expect(res.body.meses).toEqual([
      {
        mes: '2026-09',
        ingresosCentavos: 0,
        gastosCentavos: 999,
        saldoCentavos: -999,
        cantidadIngresos: 0,
        cantidadGastos: 1,
      },
      {
        mes: '2026-10',
        ingresosCentavos: 0,
        gastosCentavos: 0,
        saldoCentavos: 0,
        cantidadIngresos: 0,
        cantidadGastos: 0,
      },
      {
        mes: '2026-11',
        ingresosCentavos: 4000010,
        gastosCentavos: 6000050,
        saldoCentavos: -2000040,
        cantidadIngresos: 2,
        cantidadGastos: 1,
      },
    ]);
    expect(res.body.totales).toEqual({
      ingresosCentavos: 4000010,
      gastosCentavos: 6001049,
      saldoCentavos: -2001039,
      cantidadIngresos: 2,
      cantidadGastos: 2,
    });
  });

  it('debería validar el rango de meses', async () => {
    const { s, eid } = await nuevoEmprendimiento();
    const url = `${API}/emprendimientos/${eid}/estadisticas`;
    await http().get(`${url}?desde=2026-11&hasta=2026-09`).set(auth(s)).expect(400);
    await http().get(`${url}?desde=2024-01&hasta=2026-11`).set(auth(s)).expect(400);
    await http().get(url).set(auth(s)).expect(400);
  });
});
