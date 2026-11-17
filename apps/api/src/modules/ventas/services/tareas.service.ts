import { Injectable } from '@nestjs/common';
import type { Tarea as TareaDb } from '@prisma/client';
import type {
  CrearTareaInput,
  EditarTareaInput,
  EstadoTareaInput,
  FiltroTareas,
  Paginado,
  Tarea,
  TareaDetalle,
} from '@autonota/shared';
import { DomainException } from '../../../common/errors/domain.exception';
import { centavosANumero } from '../../../common/utils/dinero';
import { aMovimientoDto } from '../../movimientos/dto/movimiento.dto';
import { TareasRepository, type TareaConDetalle } from '../repositories/tareas.repository';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function aTareaDto(t: TareaDb): Tarea {
  return {
    id: t.id,
    titulo: t.titulo,
    descripcion: t.descripcion,
    estado: t.estado,
    prioridad: t.prioridad,
    creadoEn: t.creadoEn.toISOString(),
    actualizadoEn: t.actualizadoEn.toISOString(),
  };
}

/** Detalle con historial de estados (RF-53) y ventas vinculadas (RF-55) */
function aTareaDetalle(t: TareaConDetalle): TareaDetalle {
  return {
    ...aTareaDto(t),
    historial: t.historial.map((h) => ({
      estadoAnterior: h.estadoAnterior,
      estadoNuevo: h.estadoNuevo,
      cambiadoEn: h.cambiadoEn.toISOString(),
    })),
    ventas: t.ventas.map(aMovimientoDto),
    totalVendidoCentavos: t.ventas.reduce((s, v) => s + centavosANumero(v.montoCentavos), 0),
  };
}

/** Anotaciones de tareas pendientes (RF-50 a RF-54) */
@Injectable()
export class TareasService {
  constructor(private readonly repo: TareasRepository) {}

  async listar(emprendimientoId: string, f: FiltroTareas): Promise<Paginado<Tarea>> {
    const [items, total] = await this.repo.listar(emprendimientoId, {
      estado: f.estado,
      prioridad: f.prioridad,
      orden: f.orden,
      saltar: (f.page - 1) * f.pageSize,
      tomar: f.pageSize,
    });
    return { data: items.map(aTareaDto), meta: { page: f.page, pageSize: f.pageSize, total } };
  }

  async obtener(emprendimientoId: string, id: string): Promise<TareaDetalle> {
    return aTareaDetalle(await this.buscarOFallar(emprendimientoId, id));
  }

  async crear(emprendimientoId: string, input: CrearTareaInput): Promise<TareaDetalle> {
    return aTareaDetalle(
      await this.repo.crear({
        emprendimientoId,
        titulo: input.titulo,
        descripcion: input.descripcion || null,
        prioridad: input.prioridad ?? 'MEDIA',
      }),
    );
  }

  async editar(
    emprendimientoId: string,
    id: string,
    input: EditarTareaInput,
  ): Promise<TareaDetalle> {
    const actual = await this.buscarOFallar(emprendimientoId, id);
    return aTareaDetalle(
      await this.repo.actualizar(actual.id, {
        titulo: input.titulo,
        descripcion: input.descripcion === undefined ? undefined : input.descripcion || null,
        prioridad: input.prioridad,
      }),
    );
  }

  /** CU-11: si el estado nuevo es igual al actual, responde sin agregar historial */
  async cambiarEstado(
    emprendimientoId: string,
    id: string,
    input: EstadoTareaInput,
  ): Promise<TareaDetalle> {
    const actual = await this.buscarOFallar(emprendimientoId, id);
    if (actual.estado === input.estado) return aTareaDetalle(actual);
    return aTareaDetalle(await this.repo.cambiarEstado(actual.id, actual.estado, input.estado));
  }

  /** Elimina la tarea y su historial; sus ventas se conservan, sin vínculo */
  async eliminar(emprendimientoId: string, id: string): Promise<void> {
    const actual = await this.buscarOFallar(emprendimientoId, id);
    await this.repo.eliminar(actual.id);
  }

  private async buscarOFallar(emprendimientoId: string, id: string): Promise<TareaConDetalle> {
    const t = UUID.test(id) ? await this.repo.buscar(id, emprendimientoId) : null;
    if (!t) throw new DomainException('NO_ENCONTRADO');
    return t;
  }
}
