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
    expect(grupal.body).toMatchObject({ modalidad: 'GRUPAL', duracionMinutos: 60 });
    expect(grupal.body.alumnos).toHaveLength(2);
    expect(grupal.body.alumnos[0].pagada).toBe(false);
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

  it('debería editar alumnos, reprogramar y cancelar borrando la clase (RF-32)', async () => {
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
    await http().delete(`${base}/clases/${c.body.id}`).set(auth(s)).expect(204);
    await http().get(`${base}/clases/${c.body.id}`).set(auth(s)).expect(404);
  });

  it('debería borrar las clases que empiezan en el rango del día o la semana', async () => {
    const { s, base } = await nuevo('CLASES');
    const [a1] = await alumnos(s, base, 'Julián');
    for (const dia of ['2027-11-15', '2027-11-17', '2027-11-23'])
      await http()
        .post(`${base}/clases`)
        .set(auth(s))
        .send({
          modalidad: 'GRUPAL',
          inicio: hora(dia, '18:00'),
          duracionMinutos: 60,
          alumnoIds: [a1],
        })
        .expect(201);
    const rango = (desde: string, hasta: string) =>
      `desde=${encodeURIComponent(hora(desde, '00:00'))}&hasta=${encodeURIComponent(hora(hasta, '00:00'))}`;
    const r = await http()
      .delete(`${base}/clases?${rango('2027-11-15', '2027-11-22')}`)
      .set(auth(s))
      .expect(200);
    expect(r.body).toEqual({ borradas: 2 });
    const quedan = await http()
      .get(`${base}/clases?${rango('2027-11-15', '2027-11-29')}`)
      .set(auth(s))
      .expect(200);
    expect(quedan.body).toHaveLength(1);
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
    await http().delete(`${base}/clases/${cancelada.body.id}`).set(auth(s)).expect(204);
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

  it('debería registrar un pago por clase y marcar qué clases y alumnos deben (CU-14, RF-35)', async () => {
    const { s, base } = await nuevo('CLASES');
    const [ana, beto, ceci] = await alumnos(s, base, 'Ana', 'Beto', 'Ceci');
    const crear = async (alumnoIds: string[], inicio: string) =>
      (
        await http()
          .post(`${base}/clases`)
          .set(auth(s))
          .send({ modalidad: 'GRUPAL', inicio, duracionMinutos: 60, alumnoIds })
          .expect(201)
      ).body.id as string;
    // Clases ya dictadas (2025) y una futura
    const c1 = await crear([ana, beto], hora('2025-11-10', '18:00'));
    const c2 = await crear([ana], hora('2025-11-12', '18:00'));
    const c3 = await crear([ana], hora('2027-11-15', '18:00'));
    const clave = '0b8f6c1e-9d6a-4c33-8f2e-1a2b3c4d5e6f';
    const pagar = () =>
      http()
        .post(`${base}/alumnos/${ana}/pagos`)
        .set(auth(s))
        .set('Idempotency-Key', clave)
        .send({ montoCentavos: 2400000, fecha: '2025-11-12', claseIds: [c1, c2] })
        .expect(201);

    const pago = await pagar();
    expect(pago.body).toMatchObject({
      tipo: 'INGRESO',
      alumnoId: ana,
      mesCorrespondiente: null,
      mesImputacion: '2025-11',
    });
    // Misma clave: mismo ingreso, sin duplicar
    expect((await pagar()).body.id).toBe(pago.body.id);
    // Una clase ya pagada o que no es del alumno
    for (const [alumno, claseIds] of [
      [ana, [c1]],
      [beto, [c2]],
    ] as const)
      expect(
        (
          await http()
            .post(`${base}/alumnos/${alumno}/pagos`)
            .set(auth(s))
            .send({ montoCentavos: 100, claseIds })
            .expect(400)
        ).body.error.code,
      ).toBe('VALIDACION');
    // Los pagos mensuales ya no se cargan desde movimientos
    await http()
      .post(`${base}/movimientos`)
      .set(auth(s))
      .send({ tipo: 'INGRESO', montoCentavos: 1, fecha: '2025-11-02', alumnoId: ana })
      .expect(400);

    const detalle = await http().get(`${base}/clases/${c1}`).set(auth(s)).expect(200);
    expect(
      Object.fromEntries(
        detalle.body.alumnos.map((a: { nombre: string; pagada: boolean }) => [a.nombre, a.pagada]),
      ),
    ).toEqual({ Ana: true, Beto: false });

    await http().delete(`${base}/alumnos/${ceci}`).set(auth(s)).expect(204);
    const todos = await http().get(`${base}/alumnos`).set(auth(s)).expect(200);
    expect(
      Object.fromEntries(
        todos.body.data.map((a: { nombre: string; clasesAdeudadas: number }) => [
          a.nombre,
          a.clasesAdeudadas,
        ]),
      ),
    ).toEqual({ Ana: 0, Beto: 1 });
    const deben = await http().get(`${base}/alumnos?debe=true`).set(auth(s)).expect(200);
    expect(deben.body.data.map((a: { nombre: string }) => a.nombre)).toEqual(['Beto']);
    // Por mes: Ana pagó (2 clases), Beto debe, Ceci está de baja; en otro mes nadie tuvo clases
    const delMesDe = async (mes: string) =>
      Object.fromEntries(
        (await http().get(`${base}/alumnos?mes=${mes}`).set(auth(s)).expect(200)).body.data.map(
          (a: { nombre: string; clasesAdeudadas: number; clasesDelMes: number }) => [
            a.nombre,
            [a.clasesAdeudadas, a.clasesDelMes],
          ],
        ),
      );
    expect(await delMesDe('2025-11')).toEqual({ Ana: [0, 2], Beto: [1, 1] });
    // La clase futura (2027) no cuenta aunque el mes sea ese
    expect(await delMesDe('2027-11')).toEqual({ Ana: [0, 0], Beto: [0, 0] });
    expect(await delMesDe('2025-10')).toEqual({ Ana: [0, 0], Beto: [0, 0] });
    const debenMes = async (mes: string) =>
      (
        await http().get(`${base}/alumnos?debe=true&mes=${mes}`).set(auth(s)).expect(200)
      ).body.data.map((a: { nombre: string }) => a.nombre);
    expect(await debenMes('2025-11')).toEqual(['Beto']);
    expect(await debenMes('2025-10')).toEqual([]);

    const delMes = await http()
      .get(`${base}/alumnos/${ana}/clases?mes=2025-11`)
      .set(auth(s))
      .expect(200);
    expect(delMes.body.map((c: { id: string; pagada: boolean }) => [c.id, c.pagada])).toEqual([
      [c1, true],
      [c2, true],
    ]);
    const impagas = async () =>
      (
        await http().get(`${base}/alumnos/${ana}/clases?impagas=true`).set(auth(s)).expect(200)
      ).body.map((c: { id: string }) => c.id);
    expect(await impagas()).toEqual([c3]);
    await http().get(`${base}/alumnos/${ana}/clases`).set(auth(s)).expect(400);

    // Editar la clase conserva el pago de quien sigue en ella
    await http()
      .patch(`${base}/clases/${c1}`)
      .set(auth(s))
      .send({ alumnoIds: [ana] })
      .expect(200);
    expect(await impagas()).toEqual([c3]);
    // Borrar la clase conserva el ingreso
    await http().delete(`${base}/clases/${c1}`).set(auth(s)).expect(204);
    const pagos = await http().get(`${base}/alumnos/${ana}/pagos`).set(auth(s)).expect(200);
    expect(pagos.body.data).toEqual([expect.objectContaining({ id: pago.body.id })]);
    // Borrar el ingreso deja la clase impaga
    await http().delete(`${base}/movimientos/${pago.body.id}`).set(auth(s)).expect(204);
    expect(await impagas()).toEqual([c2, c3]);
    // Impagas de cualquier mes: una de un mes anterior y otra del actual se listan juntas
    const anterior = await crear([ana], hora('2025-10-20', '18:00'));
    expect(await impagas()).toEqual([anterior, c2, c3]);
  });

  it('debería cancelar una clase como registro: no se debe, no se paga ni se edita', async () => {
    const { s, base } = await nuevo('CLASES');
    const [ana] = await alumnos(s, base, 'Ana');
    const crear = async (inicio: string) =>
      (
        await http()
          .post(`${base}/clases`)
          .set(auth(s))
          .send({ modalidad: 'INDIVIDUAL', inicio, duracionMinutos: 60, alumnoIds: [ana] })
          .expect(201)
      ).body.id as string;
    const c1 = await crear(hora('2025-11-10', '18:00'));
    const c2 = await crear(hora('2025-11-12', '18:00'));
    const c3 = await crear(hora('2025-11-14', '18:00'));
    const debe = async () =>
      (await http().get(`${base}/alumnos?mes=2025-11`).set(auth(s)).expect(200)).body.data[0];
    expect(await debe()).toMatchObject({ clasesAdeudadas: 3, clasesDelMes: 3 });

    // c3 se paga y después se cancela: el vínculo queda
    await http()
      .post(`${base}/alumnos/${ana}/pagos`)
      .set(auth(s))
      .send({ montoCentavos: 100, fecha: '2025-11-14', claseIds: [c3] })
      .expect(201);
    const cancelada = await http()
      .post(`${base}/clases/${c1}/cancelar`)
      .set(auth(s))
      .send({ motivo: 'Me enfermé' })
      .expect(200);
    expect(cancelada.body).toMatchObject({ cancelada: true, motivoCancelacion: 'Me enfermé' });
    await http().post(`${base}/clases/${c3}/cancelar`).set(auth(s)).send({}).expect(200);

    expect(
      (await http().post(`${base}/clases/${c1}/cancelar`).set(auth(s)).send({}).expect(409)).body
        .error.code,
    ).toBe('ESTADO_INVALIDO');
    await http().patch(`${base}/clases/${c1}`).set(auth(s)).send({ titulo: 'x' }).expect(409);
    expect(
      (
        await http()
          .post(`${base}/alumnos/${ana}/pagos`)
          .set(auth(s))
          .send({ montoCentavos: 100, claseIds: [c1] })
          .expect(400)
      ).body.error.code,
    ).toBe('VALIDACION');

    // Solo c2 se debe; las canceladas no cuentan ni como clases del mes
    expect(await debe()).toMatchObject({ clasesAdeudadas: 1, clasesDelMes: 1 });
    const impagas = await http()
      .get(`${base}/alumnos/${ana}/clases?impagas=true`)
      .set(auth(s))
      .expect(200);
    expect(impagas.body.map((c: { id: string }) => c.id)).toEqual([c2]);
    // En el perfil se ven, con el pago conservado
    const delMes = await http()
      .get(`${base}/alumnos/${ana}/clases?mes=2025-11`)
      .set(auth(s))
      .expect(200);
    expect(
      delMes.body.map((c: { id: string; cancelada: boolean; pagada: boolean }) => [
        c.id,
        c.cancelada,
        c.pagada,
      ]),
    ).toEqual([
      [c1, true, false],
      [c2, false, false],
      [c3, true, true],
    ]);

    // Copiar la semana la copia como clase normal
    const copia = await http()
      .post(`${base}/clases/copiar-semana`)
      .set(auth(s))
      .send({ semanaOrigen: '2025-11-10' })
      .expect(201);
    expect(copia.body.creadas).toHaveLength(3);
    expect(copia.body.creadas.every((c: { cancelada: boolean }) => !c.cancelada)).toBe(true);
    expect(copia.body.creadas[0].motivoCancelacion).toBeNull();

    // Reactivar: vuelve a ser una clase normal que se debe; una no cancelada da 409
    const reactivada = await http().post(`${base}/clases/${c1}/reactivar`).set(auth(s)).expect(200);
    expect(reactivada.body).toMatchObject({ cancelada: false, motivoCancelacion: null });
    expect(
      (await http().post(`${base}/clases/${c1}/reactivar`).set(auth(s)).expect(409)).body.error
        .code,
    ).toBe('ESTADO_INVALIDO');
    expect(await debe()).toMatchObject({ clasesAdeudadas: 5, clasesDelMes: 5 }); // 2 + las 3 copias
    const impagas2 = await http()
      .get(`${base}/alumnos/${ana}/clases?impagas=true`)
      .set(auth(s))
      .expect(200);
    expect(impagas2.body.map((c: { id: string }) => c.id).slice(0, 2)).toEqual([c1, c2]);

    await http().delete(`${base}/clases/${c1}`).set(auth(s)).expect(204);
  });

  it('debería anonimizar un alumno y conservar sus pagos (CU-18)', async () => {
    const { s, base } = await nuevo('CLASES');
    const [a1] = await alumnos(s, base, 'Florencia');
    const clase = await http()
      .post(`${base}/clases`)
      .set(auth(s))
      .send({
        modalidad: 'INDIVIDUAL',
        inicio: hora('2025-11-10', '18:00'),
        duracionMinutos: 60,
        alumnoIds: [a1],
      })
      .expect(201);
    await http()
      .post(`${base}/alumnos/${a1}/pagos`)
      .set(auth(s))
      .send({ montoCentavos: 100, fecha: '2025-11-10', claseIds: [clase.body.id] })
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

  it('debería listar realizadas por fecha de finalización, de a pocas y con filtro de días', async () => {
    const { s, base } = await nuevo('VENTAS');
    const ids: string[] = [];
    for (const titulo of ['A', 'B', 'C']) {
      const t = await http().post(`${base}/tareas`).set(auth(s)).send({ titulo }).expect(201);
      ids.push(t.body.id);
    }
    for (const id of [ids[1], ids[0], ids[2]]) {
      await http().patch(`${base}/tareas/${id}/estado`).set(auth(s)).send({ estado: 'REALIZADA' });
    }
    // Editar una realizada no cambia su fecha de finalización
    await http().patch(`${base}/tareas/${ids[1]}`).set(auth(s)).send({ titulo: 'B2' }).expect(200);

    const p1 = await http().get(`${base}/tareas/realizadas?pageSize=2`).set(auth(s)).expect(200);
    expect(p1.body.data.map((t: { titulo: string }) => t.titulo)).toEqual(['C', 'A']);
    expect(p1.body.meta).toMatchObject({ page: 1, pageSize: 2, total: 3 });
    const p2 = await http()
      .get(`${base}/tareas/realizadas?pageSize=2&page=2`)
      .set(auth(s))
      .expect(200);
    expect(p2.body.data.map((t: { titulo: string }) => t.titulo)).toEqual(['B2']);
    await http().get(`${base}/tareas/realizadas?pageSize=51`).set(auth(s)).expect(400);
    // Todas se terminaron hoy: entran en los últimos 7 días
    expect((await http().get(`${base}/tareas?realizadasDias=7`).set(auth(s))).body.meta.total).toBe(
      3,
    );
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
