import { Injectable } from '@nestjs/common';
import type {
  CobroTurnoInput,
  CrearMovimientoInput,
  EditarMovimientoInput,
  FiltroMovimientos,
  Movimiento,
  Paginado,
} from '@autonota/shared';
import type { EmprendimientoDePeticion } from '../../../common/auth/peticion';
import { DomainException } from '../../../common/errors/domain.exception';
import { esViolacionUnica } from '../../../common/prisma/prisma.service';
import {
  MovimientosRepository,
  type DatosMovimiento,
} from '../repositories/movimientos.repository';
import { hoyEnArgentina } from '../../../common/utils/fechas';
import { aMovimientoDto, desdeTextoFecha, desdeTextoMes } from '../dto/movimiento.dto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class MovimientosService {
  constructor(private readonly repo: MovimientosRepository) {}

  /** RF-73 */
  async listar(emp: EmprendimientoDePeticion, f: FiltroMovimientos): Promise<Paginado<Movimiento>> {
    const [items, total] = await this.repo.listar(emp.id, {
      tipo: f.tipo,
      mes: f.mes ? desdeTextoMes(f.mes) : undefined,
      medioPago: f.medioPago,
      alumnoId: f.alumnoId,
      tareaId: f.tareaId,
      saltar: (f.page - 1) * f.pageSize,
      tomar: f.pageSize,
    });
    return { data: items.map(aMovimientoDto), meta: { page: f.page, pageSize: f.pageSize, total } };
  }

  /**
   * RF-07, RF-18, RF-20, RF-34, RF-36, RF-55, RF-56. Si la clave de idempotencia ya se usó
   * en este emprendimiento, devuelve el movimiento existente en lugar de crear otro.
   */
  async crear(
    emp: EmprendimientoDePeticion,
    input: CrearMovimientoInput,
    claveIdempotencia?: string,
  ): Promise<Movimiento> {
    if (claveIdempotencia) {
      const existente = await this.buscarPorClave(emp.id, claveIdempotencia);
      if (existente) return existente;
    }
    await this.validarVinculos(emp, input);
    return this.insertar(
      {
        emprendimientoId: emp.id,
        tipo: input.tipo,
        montoCentavos: BigInt(input.montoCentavos),
        fecha: desdeTextoFecha(input.fecha),
        descripcion: input.descripcion || null,
        medioPago: input.medioPago ?? null,
        claveIdempotencia: claveIdempotencia ?? null,
        turnoId: null,
        alumnoId: null,
        tareaId: input.tareaId ?? null,
        mesCorrespondiente: null,
      },
      claveIdempotencia,
    );
  }

  /**
   * RF-16: cobro de un turno (seña, pago parcial o total), en cualquier estado del turno.
   * El turno ya fue verificado por TurnosService; la fecha por defecto es hoy.
   */
  async registrarCobroTurno(
    emprendimientoId: string,
    turnoId: string,
    cobro: CobroTurnoInput,
    claveIdempotencia?: string,
  ): Promise<Movimiento> {
    if (claveIdempotencia) {
      const existente = await this.buscarPorClave(emprendimientoId, claveIdempotencia);
      if (existente) return existente;
    }
    return this.insertar(
      {
        emprendimientoId,
        tipo: 'INGRESO',
        montoCentavos: BigInt(cobro.montoCentavos),
        fecha: cobro.fecha ? desdeTextoFecha(cobro.fecha) : hoyEnArgentina(),
        descripcion: cobro.descripcion || null,
        medioPago: cobro.medioPago ?? null,
        claveIdempotencia: claveIdempotencia ?? null,
        turnoId,
        alumnoId: null,
        tareaId: null,
        mesCorrespondiente: null,
      },
      claveIdempotencia,
    );
  }

  private async insertar(datos: DatosMovimiento, claveIdempotencia?: string): Promise<Movimiento> {
    try {
      return aMovimientoDto(await this.repo.crear(datos));
    } catch (error) {
      // Dos pedidos simultáneos con la misma clave: el segundo devuelve el ya creado
      if (claveIdempotencia && esViolacionUnica(error)) {
        const existente = await this.buscarPorClave(datos.emprendimientoId, claveIdempotencia);
        if (existente) return existente;
      }
      throw error;
    }
  }

  /** RF-07: corregir un movimiento cargado por error */
  async editar(
    emp: EmprendimientoDePeticion,
    id: string,
    input: EditarMovimientoInput,
  ): Promise<Movimiento> {
    const actual = await this.obtener(emp, id);
    const actualizado = await this.repo.actualizar(actual.id, {
      montoCentavos: input.montoCentavos === undefined ? undefined : BigInt(input.montoCentavos),
      fecha: input.fecha ? desdeTextoFecha(input.fecha) : undefined,
      descripcion: input.descripcion === undefined ? undefined : input.descripcion || null,
      medioPago: input.medioPago,
    });
    return aMovimientoDto(actualizado);
  }

  /**
   * RF-07: eliminar un movimiento cargado por error, incluidos los cobros de turnos. Si era el
   * pago de clases, esas clases vuelven a quedar impagas (cascada en pagos_clase).
   */
  async eliminar(emp: EmprendimientoDePeticion, id: string): Promise<void> {
    const actual = await this.obtener(emp, id);
    await this.repo.eliminar(actual.id);
  }

  private async obtener(emp: EmprendimientoDePeticion, id: string) {
    const m = UUID.test(id) ? await this.repo.buscarDelEmprendimiento(id, emp.id) : null;
    if (!m) throw new DomainException('NO_ENCONTRADO');
    return m;
  }

  /** También lo usa el pago por clase de los alumnos */
  async buscarPorClave(emprendimientoId: string, clave: string): Promise<Movimiento | null> {
    const existente = await this.repo.buscarPorClave(clave);
    if (!existente) return null;
    if (existente.emprendimientoId !== emprendimientoId) {
      throw new DomainException(
        'VALIDACION',
        'La clave de idempotencia ya se usó para otro registro.',
        [{ field: 'Idempotency-Key', message: 'Generá una clave nueva' }],
      );
    }
    return aMovimientoDto(existente);
  }

  /** Parte 4, sección 9; Parte 6, sección 9: los vínculos deben ser del mismo emprendimiento */
  private async validarVinculos(
    emp: EmprendimientoDePeticion,
    input: CrearMovimientoInput,
  ): Promise<void> {
    if (input.tareaId) {
      if (emp.tipo !== 'VENTAS') {
        throw new DomainException(
          'TIPO_INCOMPATIBLE',
          'Las ventas vinculadas a tareas son solo para emprendimientos de ventas.',
        );
      }
      if (!(await this.repo.tareaPerteneceA(input.tareaId, emp.id))) {
        throw new DomainException('VALIDACION', 'La tarea no pertenece a este emprendimiento.', [
          { field: 'tareaId', message: 'Tarea inexistente' },
        ]);
      }
    }
  }
}
