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

// Semana de prueba lejana para no depender de "hoy": lunes 15/11/2027 a domingo 21/11/2027
const LUNES = '2027-11-15';
const hora = (dia: string, hhmm: string) => `${dia}T${hhmm}:00-03:00`;

/** Turnero con horario de lunes a viernes de 9 a 13 y de 13 a 18 */
async function nuevoTurnero() {
  const s = await registrar(app);
  const res = await http()
    .post(`${API}/emprendimientos`)
    .set(auth(s))
    .send({ nombre: 'Pelu', tipo: 'TURNERO' })
    .expect(201);
  const base = `${API}/emprendimientos/${res.body.id}`;
  const franjas = [1, 2, 3, 4, 5].flatMap((d) => [
    { diaSemana: d, horaInicio: '09:00', horaFin: '13:00' },
    { diaSemana: d, horaInicio: '13:00', horaFin: '18:00' },
  ]);
  await http().put(`${base}/horarios-atencion`).set(auth(s)).send(franjas).expect(200);
  const cliente = await http()
    .post(`${base}/clientes`)
    .set(auth(s))
    .send({ nombre: 'Ana Gómez', telefono: '11 5555-1234' })
    .expect(201);
  return { s, base, eid: res.body.id as string, clienteId: cliente.body.id as string };
}

describe('horarios de atención y bloqueos', () => {
  it('debería rechazar franjas superpuestas y aceptar contiguas (RF-10)', async () => {
    const { s, base } = await nuevoTurnero();
    await http()
      .put(`${base}/horarios-atencion`)
      .set(auth(s))
      .send([
        { diaSemana: 2, horaInicio: '09:00', horaFin: '13:00' },
        { diaSemana: 2, horaInicio: '12:00', horaFin: '14:00' },
      ])
      .expect(400);
    const lista = await http().get(`${base}/horarios-atencion`).set(auth(s)).expect(200);
    expect(lista.body).toHaveLength(10);
  });

  it('debería avisar los turnos afectados y guardar igual con confirmar=true (CU-16)', async () => {
    const { s, base, clienteId } = await nuevoTurnero();
    await http()
      .post(`${base}/turnos`)
      .set(auth(s))
      .send({ clienteId, inicio: hora('2027-11-16', '16:00'), duracionMinutos: 60 })
      .expect(201);

    const soloMananas = [{ diaSemana: 2, horaInicio: '09:00', horaFin: '13:00' }];
    const r = await http()
      .put(`${base}/horarios-atencion`)
      .set(auth(s))
      .send(soloMananas)
      .expect(409);
    expect(r.body.error.code).toBe('TURNOS_AFECTADOS');
    expect(r.body.error.details[0].message).toMatch(/mar 16\/11 16:00 · Ana Gómez/);
    await http()
      .put(`${base}/horarios-atencion?confirmar=true`)
      .set(auth(s))
      .send(soloMananas)
      .expect(200);
    // El turno no se modificó
    expect(
      (
        await http()
          .get(
            `${base}/turnos?desde=${encodeURIComponent(hora(LUNES, '00:00'))}&hasta=${encodeURIComponent(hora('2027-11-22', '00:00'))}`,
          )
          .set(auth(s))
      ).body,
    ).toHaveLength(1);
  });

  it('debería crear un bloqueo, avisar los turnos que cruza y eliminarlo (RF-11)', async () => {
    const { s, base, clienteId } = await nuevoTurnero();
    await http()
      .post(`${base}/turnos`)
      .set(auth(s))
      .send({ clienteId, inicio: hora('2027-11-17', '10:00'), duracionMinutos: 60 })
      .expect(201);
    const bloqueo = {
      inicio: hora('2027-11-17', '00:00'),
      fin: hora('2027-11-18', '00:00'),
      motivo: 'Feriado',
    };
    expect(
      (await http().post(`${base}/bloqueos`).set(auth(s)).send(bloqueo).expect(409)).body.error
        .code,
    ).toBe('TURNOS_AFECTADOS');
    const creado = await http()
      .post(`${base}/bloqueos?confirmar=true`)
      .set(auth(s))
      .send(bloqueo)
      .expect(201);
    const lista = await http()
      .get(
        `${base}/bloqueos?desde=${encodeURIComponent(hora(LUNES, '00:00'))}&hasta=${encodeURIComponent(hora('2027-11-22', '00:00'))}`,
      )
      .set(auth(s))
      .expect(200);
    expect(lista.body.map((b: { id: string }) => b.id)).toEqual([creado.body.id]);
    await http().delete(`${base}/bloqueos/${creado.body.id}`).set(auth(s)).expect(204);
  });
});

describe('clientes', () => {
  it('debería buscar, dar de baja, reactivar y anonimizar conservando los turnos (RF-19, CU-18)', async () => {
    const { s, base, clienteId } = await nuevoTurnero();
    const turno = await http()
      .post(`${base}/turnos`)
      .set(auth(s))
      .send({ clienteId, inicio: hora('2027-11-15', '10:00'), duracionMinutos: 30 })
      .expect(201);
    expect(
      (await http().get(`${base}/clientes?q=5555`).set(auth(s)).expect(200)).body.meta.total,
    ).toBe(1);

    await http().delete(`${base}/clientes/${clienteId}`).set(auth(s)).expect(204);
    expect((await http().get(`${base}/clientes`).set(auth(s))).body.meta.total).toBe(0);
    expect((await http().get(`${base}/clientes?activo=false`).set(auth(s))).body.meta.total).toBe(
      1,
    );
    await http()
      .patch(`${base}/clientes/${clienteId}`)
      .set(auth(s))
      .send({ activo: true })
      .expect(200);

    const anon = await http()
      .post(`${base}/clientes/${clienteId}/anonimizar`)
      .set(auth(s))
      .expect(200);
    expect(anon.body).toMatchObject({
      nombre: 'Cliente anónimo',
      telefono: null,
      notas: null,
      activo: false,
    });
    const t = await http().get(`${base}/turnos/${turno.body.id}`).set(auth(s)).expect(200);
    expect(t.body.cliente.nombre).toBe('Cliente anónimo');
  });
});

describe('turnos', () => {
  it('debería crear un turno, permitir superposición y rechazar la misma hora de inicio (CU-06)', async () => {
    const { s, base, clienteId } = await nuevoTurnero();
    const t = await http()
      .post(`${base}/turnos`)
      .set(auth(s))
      .send({
        clienteId,
        inicio: hora('2027-11-15', '10:00'),
        duracionMinutos: 90,
        descripcion: 'Tintura y corte',
      })
      .expect(201);
    expect(t.body).toMatchObject({
      inicio: '2027-11-15T13:00:00.000Z',
      fin: '2027-11-15T14:30:00.000Z',
      duracionMinutos: 90,
      estado: 'PROGRAMADO',
      cobros: [],
      totalCobradoCentavos: 0,
    });
    await http()
      .post(`${base}/turnos`)
      .set(auth(s))
      .send({ clienteId, inicio: hora('2027-11-15', '10:30'), duracionMinutos: 30 })
      .expect(201);
    const r = await http()
      .post(`${base}/turnos`)
      .set(auth(s))
      .send({ clienteId, inicio: hora('2027-11-15', '10:00'), duracionMinutos: 30 })
      .expect(409);
    expect(r.body.error.code).toBe('TURNO_MISMO_INICIO');
  });

  it('debería rechazar turnos fuera de horario, en un bloqueo o con cliente inactivo', async () => {
    const { s, base, clienteId } = await nuevoTurnero();
    const crear = (inicio: string, duracionMinutos = 60, cliente = clienteId) =>
      http()
        .post(`${base}/turnos`)
        .set(auth(s))
        .send({ clienteId: cliente, inicio, duracionMinutos });
    expect((await crear(hora('2027-11-15', '17:30')).expect(409)).body.error.code).toBe(
      'FUERA_DE_HORARIO',
    );
    expect((await crear(hora('2027-11-20', '10:00')).expect(409)).body.error.code).toBe(
      'FUERA_DE_HORARIO',
    );
    await http()
      .post(`${base}/bloqueos`)
      .set(auth(s))
      .send({ inicio: hora('2027-11-16', '11:00'), fin: hora('2027-11-16', '12:00') })
      .expect(201);
    expect((await crear(hora('2027-11-16', '10:30')).expect(409)).body.error.code).toBe(
      'EN_BLOQUEO',
    );
    await http().delete(`${base}/clientes/${clienteId}`).set(auth(s)).expect(204);
    expect((await crear(hora('2027-11-17', '10:00')).expect(400)).body.error.code).toBe(
      'VALIDACION',
    );
    await crear(hora('2027-11-17', '10:00'), 3).expect(400);
  });

  it('debería aceptar turnos con fecha pasada (RF-12)', async () => {
    const { s, base, clienteId } = await nuevoTurnero();
    await http()
      .post(`${base}/turnos`)
      .set(auth(s))
      .send({ clienteId, inicio: '2025-03-03T10:00:00-03:00', duracionMinutos: 60 })
      .expect(201);
  });

  it('debería reubicar, cancelar y liberar la hora de inicio (CU-07)', async () => {
    const { s, base, clienteId } = await nuevoTurnero();
    const t = await http()
      .post(`${base}/turnos`)
      .set(auth(s))
      .send({ clienteId, inicio: hora('2027-11-15', '10:00'), duracionMinutos: 60 })
      .expect(201);
    const reubicado = await http()
      .patch(`${base}/turnos/${t.body.id}`)
      .set(auth(s))
      .send({ inicio: hora('2027-11-15', '15:00') })
      .expect(200);
    expect(reubicado.body.inicio).toBe('2027-11-15T18:00:00.000Z');
    await http()
      .patch(`${base}/turnos/${t.body.id}`)
      .set(auth(s))
      .send({ inicio: hora('2027-11-15', '17:30') })
      .expect(409);

    await http().post(`${base}/turnos/${t.body.id}/cancelar`).set(auth(s)).expect(200);
    await http().post(`${base}/turnos/${t.body.id}/cancelar`).set(auth(s)).expect(409);
    await http()
      .patch(`${base}/turnos/${t.body.id}`)
      .set(auth(s))
      .send({ duracionMinutos: 30 })
      .expect(409);
    // La hora queda libre para otro turno
    await http()
      .post(`${base}/turnos`)
      .set(auth(s))
      .send({ clienteId, inicio: hora('2027-11-15', '15:00'), duracionMinutos: 30 })
      .expect(201);
  });

  it('debería marcar ausente, realizar con cobro y sumar varios cobros sin duplicar (CU-08)', async () => {
    const { s, base, clienteId, eid } = await nuevoTurnero();
    const t = await http()
      .post(`${base}/turnos`)
      .set(auth(s))
      .send({ clienteId, inicio: hora('2027-11-15', '10:00'), duracionMinutos: 60 })
      .expect(201);
    const url = `${base}/turnos/${t.body.id}`;
    // Seña antes del trabajo
    await http()
      .post(`${url}/cobros`)
      .set(auth(s))
      .send({ montoCentavos: 1000000, fecha: '2027-11-10', medioPago: 'TRANSFERENCIA' })
      .expect(201);
    await http().post(`${url}/ausente`).set(auth(s)).expect(200);

    const clave = randomUUID();
    const cuerpo = {
      cobro: { montoCentavos: 2500000, fecha: '2027-11-15', medioPago: 'EFECTIVO' },
    };
    const [a, b] = await Promise.all([
      http().post(`${url}/realizar`).set(auth(s)).set('Idempotency-Key', clave).send(cuerpo),
      http().post(`${url}/realizar`).set(auth(s)).set('Idempotency-Key', clave).send(cuerpo),
    ]);
    expect([a.status, b.status]).toEqual([200, 200]);
    const detalle = await http().get(url).set(auth(s)).expect(200);
    expect(detalle.body).toMatchObject({ estado: 'REALIZADO', totalCobradoCentavos: 3500000 });
    expect(detalle.body.cobros).toHaveLength(2);
    expect(
      await prisma.movimiento.count({ where: { emprendimientoId: eid, turnoId: t.body.id } }),
    ).toBe(2);

    // Realizado sin cobro y luego corregido a ausente
    await http().post(`${url}/realizar`).set(auth(s)).send({}).expect(200);
    await http().post(`${url}/ausente`).set(auth(s)).expect(200);
  });

  it('no debería cambiar el estado de un turno cancelado (CU-08, flujo alternativo)', async () => {
    const { s, base, clienteId } = await nuevoTurnero();
    const t = await http()
      .post(`${base}/turnos`)
      .set(auth(s))
      .send({ clienteId, inicio: hora('2027-11-15', '11:00'), duracionMinutos: 60 })
      .expect(201);
    await http().post(`${base}/turnos/${t.body.id}/cancelar`).set(auth(s)).expect(200);
    expect(
      (
        await http()
          .post(`${base}/turnos/${t.body.id}/realizar`)
          .set(auth(s))
          .send({ cobro: { montoCentavos: 100 } })
          .expect(409)
      ).body.error.code,
    ).toBe('ESTADO_INVALIDO');
    await http().post(`${base}/turnos/${t.body.id}/ausente`).set(auth(s)).expect(409);
    // Igual se puede registrar un cobro en cualquier estado
    await http()
      .post(`${base}/turnos/${t.body.id}/cobros`)
      .set(auth(s))
      .send({ montoCentavos: 100 })
      .expect(201);
  });

  it('debería listar por rango y rechazar rangos de más de 31 días (RF-17)', async () => {
    const { s, base } = await nuevoTurnero();
    await http()
      .get(
        `${base}/turnos?desde=${encodeURIComponent(hora('2027-01-01', '00:00'))}&hasta=${encodeURIComponent(hora('2027-03-01', '00:00'))}`,
      )
      .set(auth(s))
      .expect(400);
  });

  it('debería copiar la semana omitiendo lo que no se puede copiar (CU-13)', async () => {
    const { s, base, clienteId } = await nuevoTurnero();
    const otro = await http()
      .post(`${base}/clientes`)
      .set(auth(s))
      .send({ nombre: 'Martín' })
      .expect(201);
    const crear = (cliente: string, dia: string, hhmm: string) =>
      http()
        .post(`${base}/turnos`)
        .set(auth(s))
        .send({ clienteId: cliente, inicio: hora(dia, hhmm), duracionMinutos: 60 })
        .expect(201);
    await crear(clienteId, '2027-11-15', '10:00'); // se copia
    await crear(otro.body.id, '2027-11-16', '10:00'); // cliente inactivo
    await crear(clienteId, '2027-11-17', '10:00'); // cae en bloqueo
    const cancelado = await crear(clienteId, '2027-11-18', '10:00'); // cancelado: no se copia
    await http().post(`${base}/turnos/${cancelado.body.id}/cancelar`).set(auth(s)).expect(200);
    await http().delete(`${base}/clientes/${otro.body.id}`).set(auth(s)).expect(204);
    await http()
      .post(`${base}/bloqueos`)
      .set(auth(s))
      .send({ inicio: hora('2027-11-24', '00:00'), fin: hora('2027-11-25', '00:00') })
      .expect(201);

    await http()
      .post(`${base}/turnos/copiar-semana`)
      .set(auth(s))
      .send({ semanaOrigen: '2027-11-16' })
      .expect(400);
    const r = await http()
      .post(`${base}/turnos/copiar-semana`)
      .set(auth(s))
      .send({ semanaOrigen: LUNES })
      .expect(201);
    expect(
      r.body.creados.map((t: { inicio: string; estado: string }) => [t.inicio, t.estado]),
    ).toEqual([['2027-11-22T13:00:00.000Z', 'PROGRAMADO']]);
    expect(r.body.omitidos.map((o: { motivo: string }) => o.motivo).sort()).toEqual([
      'CLIENTE_INACTIVO',
      'EN_BLOQUEO',
    ]);

    const ocupada = await http()
      .post(`${base}/turnos/copiar-semana`)
      .set(auth(s))
      .send({ semanaOrigen: LUNES })
      .expect(409);
    expect(ocupada.body.error.code).toBe('SEMANA_DESTINO_OCUPADA');
    const forzada = await http()
      .post(`${base}/turnos/copiar-semana`)
      .set(auth(s))
      .send({ semanaOrigen: LUNES, forzar: true })
      .expect(201);
    expect(forzada.body.creados).toHaveLength(0);
    expect(forzada.body.omitidos.map((o: { motivo: string }) => o.motivo)).toContain(
      'TURNO_MISMO_INICIO',
    );
  });
});

describe('aislamiento y tipo de negocio', () => {
  it('debería impedir usar rutas del turnero en otro tipo y acceder a turnos de otro usuario', async () => {
    const duenio = await nuevoTurnero();
    const intruso = await registrar(app);
    const clases = await http()
      .post(`${API}/emprendimientos`)
      .set(auth(intruso))
      .send({ nombre: 'C', tipo: 'CLASES' })
      .expect(201);
    expect(
      (
        await http()
          .get(`${API}/emprendimientos/${clases.body.id}/clientes`)
          .set(auth(intruso))
          .expect(409)
      ).body.error.code,
    ).toBe('TIPO_INCOMPATIBLE');
    await http().get(`${duenio.base}/clientes`).set(auth(intruso)).expect(404);
    const t = await http()
      .post(`${duenio.base}/turnos`)
      .set(auth(duenio.s))
      .send({
        clienteId: duenio.clienteId,
        inicio: hora('2027-11-15', '10:00'),
        duracionMinutos: 30,
      })
      .expect(201);
    await http().post(`${duenio.base}/turnos/${t.body.id}/cancelar`).set(auth(intruso)).expect(404);
  });
});
