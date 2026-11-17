import { Injectable } from '@nestjs/common';
import {
  NOMBRE_ANONIMO,
  type Alumno,
  type FiltroAlumnos,
  type Movimiento,
  type Paginado,
} from '@autonota/shared';
import { aPersonaDto, PersonasService } from '../../../common/personas/personas.service';
import type { EmprendimientoDePeticion } from '../../../common/auth/peticion';
import { MovimientosService } from '../../movimientos/services/movimientos.service';
import { desdeTextoMes } from '../../movimientos/dto/movimiento.dto';
import { AlumnosRepository } from '../repositories/alumnos.repository';

/** RF-30, RF-35 y RF-38 */
@Injectable()
export class AlumnosService extends PersonasService {
  constructor(
    private readonly alumnos: AlumnosRepository,
    private readonly movimientos: MovimientosService,
  ) {
    super(alumnos, NOMBRE_ANONIMO.ALUMNO);
  }

  /**
   * CU-14: con mesPago agrega pagoEnMes a cada alumno; con sinPago lista solo los activos
   * sin pago para ese mes. No calcula montos adeudados.
   */
  async listarConPagos(emprendimientoId: string, f: FiltroAlumnos): Promise<Paginado<Alumno>> {
    const mes = f.mesPago ? desdeTextoMes(f.mesPago) : undefined;
    const [items, total] = await this.alumnos.listar(emprendimientoId, {
      q: f.q || undefined,
      activo: f.sinPago ? true : f.activo,
      sinPagoEn: f.sinPago ? mes : undefined,
      saltar: (f.page - 1) * f.pageSize,
      tomar: f.pageSize,
    });
    const conPago = mes
      ? await this.alumnos.conPagoEn(
          items.map((a) => a.id),
          mes,
        )
      : null;
    return {
      data: items.map((a) => ({
        ...aPersonaDto(a),
        ...(conPago ? { pagoEnMes: conPago.has(a.id) } : {}),
      })),
      meta: { page: f.page, pageSize: f.pageSize, total },
    };
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
