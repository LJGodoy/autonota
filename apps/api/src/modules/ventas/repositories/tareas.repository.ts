import { Injectable } from '@nestjs/common';
import type { EstadoTarea, Prisma, PrioridadTarea, Tarea } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

const DETALLE = {
  historial: { orderBy: { cambiadoEn: 'asc' } },
  ventas: { orderBy: [{ fecha: 'desc' }, { creadoEn: 'desc' }] },
} satisfies Prisma.TareaInclude;

export type TareaConDetalle = Prisma.TareaGetPayload<{ include: typeof DETALLE }>;

export interface FiltroTareasRepo {
  estado?: EstadoTarea;
  prioridad?: PrioridadTarea;
  orden: 'creadoEn' | 'prioridad';
  saltar: number;
  tomar: number;
}

@Injectable()
export class TareasRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** RF-54: el enum de prioridad está en orden BAJA, MEDIA, ALTA, así que desc pone ALTA primero */
  listar(emprendimientoId: string, f: FiltroTareasRepo): Promise<[Tarea[], number]> {
    const where: Prisma.TareaWhereInput = {
      emprendimientoId,
      estado: f.estado,
      prioridad: f.prioridad,
    };
    const orderBy: Prisma.TareaOrderByWithRelationInput[] =
      f.orden === 'prioridad'
        ? [{ prioridad: 'desc' }, { creadoEn: 'desc' }]
        : [{ creadoEn: 'desc' }];
    return this.prisma.$transaction([
      this.prisma.tarea.findMany({ where, orderBy, skip: f.saltar, take: f.tomar }),
      this.prisma.tarea.count({ where }),
    ]);
  }

  buscar(id: string, emprendimientoId: string): Promise<TareaConDetalle | null> {
    return this.prisma.tarea.findFirst({ where: { id, emprendimientoId }, include: DETALLE });
  }

  /** RF-50: se crea PENDIENTE y con el primer registro de historial, en una transacción */
  crear(datos: {
    emprendimientoId: string;
    titulo: string;
    descripcion: string | null;
    prioridad: PrioridadTarea;
  }): Promise<TareaConDetalle> {
    return this.prisma.tarea.create({
      data: {
        ...datos,
        estado: 'PENDIENTE',
        historial: { create: { estadoAnterior: null, estadoNuevo: 'PENDIENTE' } },
      },
      include: DETALLE,
    });
  }

  actualizar(id: string, datos: Prisma.TareaUpdateInput): Promise<TareaConDetalle> {
    return this.prisma.tarea.update({ where: { id }, data: datos, include: DETALLE });
  }

  /** CU-11, paso 3: actualiza el estado y agrega el historial en una transacción */
  cambiarEstado(id: string, anterior: EstadoTarea, nuevo: EstadoTarea): Promise<TareaConDetalle> {
    return this.prisma.tarea.update({
      where: { id },
      data: {
        estado: nuevo,
        historial: { create: { estadoAnterior: anterior, estadoNuevo: nuevo } },
      },
      include: DETALLE,
    });
  }

  /** La base borra el historial en cascada y deja las ventas sin vínculo (ON DELETE SET NULL) */
  async eliminar(id: string): Promise<void> {
    await this.prisma.tarea.delete({ where: { id } });
  }
}
