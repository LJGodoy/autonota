import { Prisma, type Movimiento } from '@prisma/client';
import { MovimientosService } from '../services/movimientos.service';
import type { MovimientosRepository } from '../repositories/movimientos.repository';
import type { EmprendimientoDePeticion } from '../../../common/auth/peticion';
import { leerClaveIdempotencia } from '../../../common/http/clave-idempotencia.decorator';

const ID = '11111111-1111-4111-8111-111111111111';
const CLAVE = '22222222-2222-4222-8222-222222222222';
const ALUMNO = '33333333-3333-4333-8333-333333333333';

const emp = (tipo: EmprendimientoDePeticion['tipo'] = 'TURNERO'): EmprendimientoDePeticion => ({
  id: 'e1',
  usuarioId: 'u1',
  nombre: 'E',
  tipo,
});

function movimiento(extra: Partial<Movimiento> = {}): Movimiento {
  return {
    id: ID,
    emprendimientoId: 'e1',
    tipo: 'INGRESO',
    montoCentavos: 850050n,
    fecha: new Date('2026-12-03T00:00:00Z'),
    descripcion: null,
    medioPago: null,
    claveIdempotencia: null,
    turnoId: null,
    alumnoId: null,
    tareaId: null,
    mesCorrespondiente: null,
    creadoEn: new Date('2026-12-03T12:00:00Z'),
    ...extra,
  };
}

function crear() {
  const repo = {
    buscarPorClave: jest.fn().mockResolvedValue(null),
    buscarDelEmprendimiento: jest.fn(),
    crear: jest.fn(async (d: Partial<Movimiento>) => movimiento(d)),
    // Como Prisma, ignora los campos undefined
    actualizar: jest.fn(async (_id: string, d: Partial<Movimiento>) =>
      movimiento(Object.fromEntries(Object.entries(d).filter(([, v]) => v !== undefined))),
    ),
    eliminar: jest.fn(),
    listar: jest.fn(),
    alumnoPerteneceA: jest.fn().mockResolvedValue(true),
    tareaPerteneceA: jest.fn().mockResolvedValue(true),
  };
  return { repo, servicio: new MovimientosService(repo as unknown as MovimientosRepository) };
}

const ingreso = { tipo: 'INGRESO' as const, montoCentavos: 850050, fecha: '2026-12-03' };

describe('MovimientosService', () => {
  it('debería guardar el monto en centavos bigint y devolverlo como número (ADR-007)', async () => {
    const { repo, servicio } = crear();
    const r = await servicio.crear(emp(), { ...ingreso, medioPago: 'EFECTIVO' });
    expect(repo.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        montoCentavos: 850050n,
        fecha: new Date('2026-12-03T00:00:00Z'),
        medioPago: 'EFECTIVO',
      }),
    );
    expect(r).toMatchObject({
      montoCentavos: 850050,
      fecha: '2026-12-03',
      mesImputacion: '2026-12',
    });
  });

  it('debería devolver el movimiento existente si la clave de idempotencia ya se usó (RF-07)', async () => {
    const { repo, servicio } = crear();
    repo.buscarPorClave.mockResolvedValue(movimiento({ claveIdempotencia: CLAVE }));
    const r = await servicio.crear(emp(), ingreso, CLAVE);
    expect(r.id).toBe(ID);
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it('debería resolver una carrera con la misma clave devolviendo el registro ganador', async () => {
    const { repo, servicio } = crear();
    repo.buscarPorClave
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(movimiento({ claveIdempotencia: CLAVE }));
    repo.crear.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '6' }),
    );
    expect((await servicio.crear(emp(), ingreso, CLAVE)).id).toBe(ID);
  });

  it('debería rechazar una clave de idempotencia usada en otro emprendimiento', async () => {
    const { repo, servicio } = crear();
    repo.buscarPorClave.mockResolvedValue(movimiento({ emprendimientoId: 'otro' }));
    await expect(servicio.crear(emp(), ingreso, CLAVE)).rejects.toMatchObject({
      code: 'VALIDACION',
    });
  });

  it('debería aceptar el pago de un alumno solo en emprendimientos de clases', async () => {
    const { repo, servicio } = crear();
    const pago = { ...ingreso, alumnoId: ALUMNO, mesCorrespondiente: '2026-11' };
    await expect(servicio.crear(emp('TURNERO'), pago)).rejects.toMatchObject({
      code: 'TIPO_INCOMPATIBLE',
    });
    const r = await servicio.crear(emp('CLASES'), pago);
    expect(repo.crear).toHaveBeenCalledWith(
      expect.objectContaining({ mesCorrespondiente: new Date('2026-11-01T00:00:00Z') }),
    );
    expect(r.mesImputacion).toBe('2026-11');
  });

  it('debería rechazar un alumno de otro emprendimiento', async () => {
    const { repo, servicio } = crear();
    repo.alumnoPerteneceA.mockResolvedValue(false);
    await expect(
      servicio.crear(emp('CLASES'), {
        ...ingreso,
        alumnoId: ALUMNO,
        mesCorrespondiente: '2026-11',
      }),
    ).rejects.toMatchObject({ code: 'VALIDACION' });
  });

  it('debería aceptar ventas vinculadas a tareas solo en emprendimientos de ventas', async () => {
    const { servicio } = crear();
    await expect(
      servicio.crear(emp('CLASES'), { ...ingreso, tareaId: ALUMNO }),
    ).rejects.toMatchObject({
      code: 'TIPO_INCOMPATIBLE',
    });
    await expect(
      servicio.crear(emp('VENTAS'), { ...ingreso, tareaId: ALUMNO }),
    ).resolves.toBeDefined();
  });

  it('debería permitir borrar el medio de pago y la descripción al editar', async () => {
    const { repo, servicio } = crear();
    repo.buscarDelEmprendimiento.mockResolvedValue(
      movimiento({ medioPago: 'EFECTIVO', descripcion: 'x' }),
    );
    await servicio.editar(emp(), ID, { medioPago: null, descripcion: '' });
    expect(repo.actualizar).toHaveBeenCalledWith(
      ID,
      expect.objectContaining({ medioPago: null, descripcion: null }),
    );
  });

  it('no debería cambiar el mes de un movimiento que no es pago de alumno', async () => {
    const { repo, servicio } = crear();
    repo.buscarDelEmprendimiento.mockResolvedValue(movimiento());
    await expect(
      servicio.editar(emp(), ID, { mesCorrespondiente: '2026-10' }),
    ).rejects.toMatchObject({
      code: 'VALIDACION',
    });
  });

  it('debería responder NO_ENCONTRADO para un id inválido o de otro emprendimiento', async () => {
    const { repo, servicio } = crear();
    await expect(servicio.eliminar(emp(), 'no-es-uuid')).rejects.toMatchObject({
      code: 'NO_ENCONTRADO',
    });
    repo.buscarDelEmprendimiento.mockResolvedValue(null);
    await expect(servicio.eliminar(emp(), ID)).rejects.toMatchObject({ code: 'NO_ENCONTRADO' });
  });

  it('debería paginar y filtrar por mes de imputación', async () => {
    const { repo, servicio } = crear();
    repo.listar.mockResolvedValue([[movimiento()], 41]);
    const r = await servicio.listar(emp(), { mes: '2026-12', page: 3, pageSize: 20 });
    expect(repo.listar).toHaveBeenCalledWith(
      'e1',
      expect.objectContaining({ mes: new Date('2026-12-01T00:00:00Z'), saltar: 40, tomar: 20 }),
    );
    expect(r.meta).toEqual({ page: 3, pageSize: 20, total: 41 });
  });
});

describe('leerClaveIdempotencia', () => {
  it('debería aceptar un UUID, ignorar la ausencia y rechazar otro formato', () => {
    expect(leerClaveIdempotencia(undefined)).toBeUndefined();
    expect(leerClaveIdempotencia(CLAVE.toUpperCase())).toBe(CLAVE);
    expect(() => leerClaveIdempotencia('abc')).toThrow();
  });
});
