import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { API, crearApp, registrar, type SesionDePrueba } from './ayudantes';

let app: NestExpressApplication;

beforeAll(async () => {
  app = await crearApp();
});

afterAll(async () => {
  await app.close();
});

const http = () => request(app.getHttpServer());
const auth = (s: SesionDePrueba) => ({ Authorization: `Bearer ${s.accessToken}` });
const hora = (dia: string, hhmm: string) => `${dia}T${hhmm}:00-03:00`;

async function nuevo(tipo: 'CLASES' | 'VENTAS') {
  const s = await registrar(app);
  const res = await http()
    .post(`${API}/emprendimientos`)
    .set(auth(s))
    .send({ nombre: tipo, tipo })
    .expect(201);
  return { s, base: `${API}/emprendimientos/${res.body.id}` };
}

async function alumnos(s: SesionDePrueba, base: string, ...nombres: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const nombre of nombres)
    ids.push(
      (await http().post(`${base}/alumnos`).set(auth(s)).send({ nombre }).expect(201)).body.id,
    );
  return ids;
}

describe('calendario de clases', () => {
  it('debería crear clases individuales y grupales y validar la modalidad (RF-31)', async () => {
    const { s, base } = await nuevo('CLASES');
    const [a1, a2] = await alumnos(s, base, 'Julián', 'Camila');
    const grupal = await http()
      .post(`${base}/clases`)
      .set(auth(s))
      .send({
        titulo: 'Tenis inicial',
        modalidad: 'GRUPAL',
        inicio: hora('2027-11-15', '18:00'),
        duracionMinutos: 60,
        alumnoIds: [a1, a2],
      })
      .expect(201);
    expect(grupal.body).toMatchObject({
      modalidad: 'GRUPAL',
      estado: 'PROGRAMADA',
      duracionMinutos: 60,
    });
    expect(grupal.body.alumnos).toHaveLength(2);
    await http()
      .post(`${base}/clases`)
      .set(auth(s))
      .send({
        modalidad: 'INDIVIDUAL',
        inicio: hora('2027-11-16', '10:00'),
        duracionMinutos: 60,
        alumnoIds: [a1, a2],
      })
      .expect(400);
    await http()
      .post(`${base}/clases`)
      .set(auth(s))
      .send({
        modalidad: 'GRUPAL',
        inicio: hora('2027-11-16', '10:00'),
        duracionMinutos: 60,
        alumnoIds: [],
      })
      .expect(400);
  });

  it('debería editar alumnos, reprogramar y cancelar (RF-32)', async () => {
    const { s, base } = await nuevo('CLASES');
    const [a1, a2] = await alumnos(s, base, 'Julián', 'Camila');
    const c = await http()
      .post(`${base}/clases`)
      .set(auth(s))
      .send({
        modalidad: 'GRUPAL',
        inicio: hora('2027-11-15', '18:00'),
        duracionMinutos: 60,
        alumnoIds: [a1],
      })
      .expect(201);
    const editada = await http()
      .patch(`${base}/clases/${c.body.id}`)
      .set(auth(s))
      .send({ alumnoIds: [a1, a2], inicio: hora('2027-11-15', '19:00') })
      .expect(200);
    expect(editada.body.alumnos).toHaveLength(2);
    expect(editada.body.inicio).toBe('2027-11-15T22:00:00.000Z');
    await http()
      .patch(`${base}/clases/${c.body.id}`)
      .set(auth(s))
      .send({ modalidad: 'INDIVIDUAL' })
      .expect(400);
    await http().post(`${base}/clases/${c.body.id}/cancelar`).set(auth(s)).expect(200);
    await http()
      .patch(`${base}/clases/${c.body.id}`)
      .set(auth(s))
      .send({ titulo: 'x' })
      .expect(409);
  });

  it('debería copiar la semana sin alumnos dados de baja y omitir clases que quedan vacías (CU-10)', async () => {
    const { s, base } = await nuevo('CLASES');
    const [a1, a2] = await alumnos(s, base, 'Julián', 'Camila');
    const crear = (alumnoIds: string[], dia: string) =>
      http()
        .post(`${base}/clases`)
        .set(auth(s))
        .send({ modalidad: 'GRUPAL', inicio: hora(dia, '18:00'), duracionMinutos: 60, alumnoIds })
        .expect(201);
    await crear([a1, a2], '2027-11-15');
    await crear([a2], '2027-11-17');
    const cancelada = await crear([a1], '2027-11-18');
    await http().post(`${base}/clases/${cancelada.body.id}/cancelar`).set(auth(s)).expect(200);
    await http().delete(`${base}/alumnos/${a2}`).set(auth(s)).expect(204);

    const r = await http()
      .post(`${base}/clases/copiar-semana`)
      .set(auth(s))
      .send({ semanaOrigen: '2027-11-15', forzar: false })
      .expect(201);
    expect(r.body.creadas).toHaveLength(1);
    expect(r.body.creadas[0].alumnos.map((a: { id: string }) => a.id)).toEqual([a1]);
    expect(r.body.omitidas).toEqual([expect.objectContaining({ motivo: 'SIN_ALUMNOS' })]);

    expect(
      (
        await http()
          .post(`${base}/clases/copiar-semana`)
          .set(auth(s))
          .send({ semanaOrigen: '2027-11-15' })
          .expect(409)
      ).body.error.code,
    ).toBe('SEMANA_DESTINO_OCUPADA');
    const forzada = await http()
      .post(`${base}/clases/copiar-semana`)
      .set(auth(s))
      .send({ semanaOrigen: '2027-11-15', forzar: true })
      .expect(201);
    expect(forzada.body.creadas).toHaveLength(1);
    const semana = await http()
      .get(
        `${base}/clases?desde=${encodeURIComponent(hora('2027-11-22', '00:00'))}&hasta=${encodeURIComponent(hora('2027-11-29', '00:00'))}`,
      )
      .set(auth(s))
      .expect(200);
    expect(semana.body).toHaveLength(2);
  });

  it('debería marcar qué alumnos pagaron un mes y listar los que no (CU-14, RF-35)', async () => {
    const { s, base } = await nuevo('CLASES');
    const [a1, a2, a3] = await alumnos(s, base, 'Ana', 'Beto', 'Ceci');
    // Ana paga noviembre en diciembre: cuenta para noviembre
    await http()
      .post(`${base}/movimientos`)
      .set(auth(s))
      .send({
        tipo: 'INGRESO',
        montoCentavos: 4000000,
        fecha: '2027-12-02',
        alumnoId: a1,
        mesCorrespondiente: '2027-11',
      })
      .expect(201);
    await http()
      .post(`${base}/movimientos`)
      .set(auth(s))
      .send({
        tipo: 'INGRESO',
        montoCentavos: 4000000,
        fecha: '2027-10-05',
        alumnoId: a2,
        mesCorrespondiente: '2027-10',
      })
      .expect(201);
    await http().delete(`${base}/alumnos/${a3}`).set(auth(s)).expect(204);

    const todos = await http().get(`${base}/alumnos?mesPago=2027-11`).set(auth(s)).expect(200);
    expect(
      Object.fromEntries(
        todos.body.data.map((a: { nombre: string; pagoEnMes: boolean }) => [a.nombre, a.pagoEnMes]),
      ),
    ).toEqual({ Ana: true, Beto: false });
    const sinPago = await http()
      .get(`${base}/alumnos?mesPago=2027-11&sinPago=true`)
      .set(auth(s))
      .expect(200);
    expect(sinPago.body.data.map((a: { nombre: string }) => a.nombre)).toEqual(['Beto']);
    await http().get(`${base}/alumnos?sinPago=true`).set(auth(s)).expect(400);

    const pagos = await http().get(`${base}/alumnos/${a1}/pagos`).set(auth(s)).expect(200);
    expect(pagos.body.data[0]).toMatchObject({
      mesCorrespondiente: '2027-11',
      fecha: '2027-12-02',
    });
  });

  it('debería anonimizar un alumno y conservar sus pagos (CU-18)', async () => {
    const { s, base } = await nuevo('CLASES');
    const [a1] = await alumnos(s, base, 'Florencia');
    await http()
      .post(`${base}/movimientos`)
      .set(auth(s))
      .send({
        tipo: 'INGRESO',
        montoCentavos: 100,
        fecha: '2027-11-02',
        alumnoId: a1,
        mesCorrespondiente: '2027-11',
      })
      .expect(201);
    expect(
      (await http().post(`${base}/alumnos/${a1}/anonimizar`).set(auth(s)).expect(200)).body.nombre,
    ).toBe('Alumno anónimo');
    expect(
      (await http().get(`${base}/alumnos/${a1}/pagos`).set(auth(s)).expect(200)).body.meta.total,
    ).toBe(1);
  });
});

describe('ventas y anotaciones', () => {
  it('debería crear una tarea con historial, cambiar su estado y filtrarla (RF-50 a RF-54)', async () => {
    const { s, base } = await nuevo('VENTAS');
    const t = await http()
      .post(`${base}/tareas`)
      .set(auth(s))
      .send({ titulo: 'Pedir harina al proveedor', descripcion: '50 kg', prioridad: 'ALTA' })
      .expect(201);
    expect(t.body).toMatchObject({ estado: 'PENDIENTE', prioridad: 'ALTA' });
    expect(t.body.historial).toEqual([
      expect.objectContaining({ estadoAnterior: null, estadoNuevo: 'PENDIENTE' }),
    ]);
    await http().post(`${base}/tareas`).set(auth(s)).send({ titulo: 'Cajas' }).expect(201);

    const cambio = await http()
      .patch(`${base}/tareas/${t.body.id}/estado`)
      .set(auth(s))
      .send({ estado: 'EN_CURSO' })
      .expect(200);
    expect(cambio.body.historial.map((h: { estadoNuevo: string }) => h.estadoNuevo)).toEqual([
      'PENDIENTE',
      'EN_CURSO',
    ]);
    // Mismo estado: no agrega historial
    const igual = await http()
      .patch(`${base}/tareas/${t.body.id}/estado`)
      .set(auth(s))
      .send({ estado: 'EN_CURSO' })
      .expect(200);
    expect(igual.body.historial).toHaveLength(2);

    expect((await http().get(`${base}/tareas?estado=EN_CURSO`).set(auth(s))).body.meta.total).toBe(
      1,
    );
    expect(
      (await http().get(`${base}/tareas?prioridad=MEDIA`).set(auth(s))).body.data[0].titulo,
    ).toBe('Cajas');
    expect(
      (await http().get(`${base}/tareas?orden=prioridad`).set(auth(s))).body.data[0].prioridad,
    ).toBe('ALTA');
    await http()
      .patch(`${base}/tareas/${t.body.id}`)
      .set(auth(s))
      .send({ prioridad: 'BAJA', titulo: 'Harina' })
      .expect(200);
  });

  it('debería vincular ventas a una tarea y conservarlas al borrarla (RF-55)', async () => {
    const { s, base } = await nuevo('VENTAS');
    const t = await http()
      .post(`${base}/tareas`)
      .set(auth(s))
      .send({ titulo: 'Torta' })
      .expect(201);
    for (const monto of [500000, 700000]) {
      await http()
        .post(`${base}/movimientos`)
        .set(auth(s))
        .send({ tipo: 'INGRESO', montoCentavos: monto, fecha: '2027-11-10', tareaId: t.body.id })
        .expect(201);
    }
    const detalle = await http().get(`${base}/tareas/${t.body.id}`).set(auth(s)).expect(200);
    expect(detalle.body.ventas).toHaveLength(2);
    expect(detalle.body.totalVendidoCentavos).toBe(1200000);
    await http().delete(`${base}/tareas/${t.body.id}`).set(auth(s)).expect(204);
    await http().get(`${base}/tareas/${t.body.id}`).set(auth(s)).expect(404);
    expect((await http().get(`${base}/movimientos`).set(auth(s))).body.meta.total).toBe(2);
  });

  it('debería impedir ver tareas de otro usuario y usarlas desde otro tipo de negocio', async () => {
    const duenio = await nuevo('VENTAS');
    const t = await http()
      .post(`${duenio.base}/tareas`)
      .set(auth(duenio.s))
      .send({ titulo: 'Secreta' })
      .expect(201);
    const intruso = await nuevo('CLASES');
    await http().get(`${duenio.base}/tareas/${t.body.id}`).set(auth(intruso.s)).expect(404);
    expect(
      (await http().get(`${intruso.base}/tareas`).set(auth(intruso.s)).expect(409)).body.error.code,
    ).toBe('TIPO_INCOMPATIBLE');
  });
});
