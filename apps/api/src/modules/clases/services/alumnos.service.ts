import { Injectable } from '@nestjs/common';
import {
  NOMBRE_ANONIMO,
  type Alumno,
  type ClaseDeAlumno,
  type FiltroAlumnos,
  type FiltroClasesAlumno,
  type Movimiento,
  type PagoClasesInput,
  type Paginado,
} from '@autonota/shared';
import { aPersonaDto, PersonasService } from '../../../common/personas/personas.service';
import type { EmprendimientoDePeticion } from '../../../common/auth/peticion';
import { DomainException } from '../../../common/errors/domain.exception';
import { esViolacionUnica } from '../../../common/prisma/prisma.service';
import { desdeHoraArgentina, hoyEnArgentina } from '../../../common/utils/fechas';
import { MovimientosService } from '../../movimientos/services/movimientos.service';
import { aMovimientoDto, desdeTextoFecha } from '../../movimientos/dto/movimiento.dto';
import { AlumnosRepository } from '../repositories/alumnos.repository';

/** RF-30, RF-35 y RF-38, con pago por clase */
@Injectable()
export class AlumnosService extends PersonasService {
  constructor(
    private readonly alumnos: AlumnosRepository,
    private readonly movimientos: MovimientosService,
  ) {
    super(alumnos, NOMBRE_ANONIMO.ALUMNO);
  }

  /**
   * CU-14: cada alumno trae cuántas clases ya empezadas no pagó; con debe, solo los activos
   * que deben alguna. No calcula montos adeudados (no hay precio por clase).
   */
  async listarConPagos(emprendimientoId: string, f: FiltroAlumnos): Promise<Paginado<Alumno>> {
    const ahora = new Date();
    const [items, total] = await this.alumnos.listar(emprendimientoId, {
      q: f.q || undefined,
      activo: f.debe ? true : f.activo,
      debeAntesDe: f.debe ? ahora : undefined,
      saltar: (f.page - 1) * f.pageSize,
      tomar: f.pageSize,
    });
    const adeudadas = await this.alumnos.adeudadas(
      items.map((a) => a.id),
      ahora,
    );
    return {
      data: items.map((a) => ({ ...aPersonaDto(a), clasesAdeudadas: adeudadas.get(a.id) ?? 0 })),
      meta: { page: f.page, pageSize: f.pageSize, total },
    };
  }

  /** Perfil del alumno: sus clases del mes, o todas las impagas, con su estado de pago */
  async clases(
    emprendimientoId: string,
    id: string,
    f: FiltroClasesAlumno,
  ): Promise<ClaseDeAlumno[]> {
    const alumno = await this.buscarOFallar(emprendimientoId, id);
    let rango = {};
    if (f.mes) {
      const [a, m] = f.mes.split('-').map(Number) as [number, number];
      rango = { desde: desdeHoraArgentina(a, m, 1), hasta: desdeHoraArgentina(a, m + 1, 1) };
    }
    const filas = await this.alumnos.clases(alumno.id, { ...rango, impagas: f.impagas });
    return filas.map(({ clase: c, pago }) => ({
      id: c.id,
      titulo: c.titulo,
      modalidad: c.modalidad,
      inicio: c.inicio.toISOString(),
      fin: c.fin.toISOString(),
      pagada: pago !== null,
    }));
  }

  /**
   * Pago por clase: un ingreso con alumnoId más el vínculo con cada clase elegida, en una
   * transacción. Con la misma clave de idempotencia devuelve el ingreso ya creado.
   */
  async registrarPago(
    emp: EmprendimientoDePeticion,
    id: string,
    input: PagoClasesInput,
    clave?: string,
  ): Promise<Movimiento> {
    const alumno = await this.buscarOFallar(emp.id, id);
    if (clave) {
      const existente = await this.movimientos.buscarPorClave(emp.id, clave);
      if (existente) return existente;
    }
    try {
      const m = await this.alumnos.registrarPago(
        {
          emprendimientoId: emp.id,
          tipo: 'INGRESO',
          montoCentavos: BigInt(input.montoCentavos),
          fecha: input.fecha ? desdeTextoFecha(input.fecha) : hoyEnArgentina(),
          descripcion: input.descripcion || null,
          medioPago: input.medioPago ?? null,
          claveIdempotencia: clave ?? null,
          turnoId: null,
          alumnoId: alumno.id,
          tareaId: null,
          mesCorrespondiente: null,
        },
        input.claseIds,
      );
      return aMovimientoDto(m);
    } catch (error) {
      if (!esViolacionUnica(error)) throw error;
      // Dos pedidos con la misma clave: el segundo devuelve el ya creado
      const existente = clave ? await this.movimientos.buscarPorClave(emp.id, clave) : null;
      if (existente) return existente;
      throw new DomainException('ESTADO_INVALIDO', 'Alguna de las clases ya está pagada.');
    }
  }

  /** RF-35: historial de pagos del alumno, del más reciente al más antiguo */
  async pagos(
    emp: EmprendimientoDePeticion,
    id: string,
    page: number,
    pageSize: number,
  ): Promise<Paginado<Movimiento>> {
    const alumno = await this.buscarOFallar(emp.id, id);
    return this.movimientos.listar(emp, { alumnoId: alumno.id, page, pageSize });
  }

  /** Alumnos activos del emprendimiento; los demás ids quedan afuera */
  activosEntre(emprendimientoId: string, ids: string[]) {
    return this.alumnos.activosEntre(ids, emprendimientoId);
  }
}
