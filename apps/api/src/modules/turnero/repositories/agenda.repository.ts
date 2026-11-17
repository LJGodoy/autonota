import { Injectable } from '@nestjs/common';
import type { Bloqueo, HorarioAtencion } from '@prisma/client';
import type { Franja } from '@autonota/shared';
import { PrismaService } from '../../../common/prisma/prisma.service';

/** HH:MM de una columna TIME (Prisma la devuelve como fecha del 1/1/1970 en UTC) */
export const aTextoHora = (t: Date): string => t.toISOString().slice(11, 16);
const desdeTextoHora = (h: string): Date => new Date(`1970-01-01T${h}:00Z`);

export function aFranja(h: HorarioAtencion): Franja & { id: string } {
  return {
    id: h.id,
    diaSemana: h.diaSemana,
    horaInicio: aTextoHora(h.horaInicio),
    horaFin: aTextoHora(h.horaFin),
  };
}

/** Horarios de atención y bloqueos (RF-10, RF-11) */
@Injectable()
export class AgendaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listarFranjas(emprendimientoId: string): Promise<(Franja & { id: string })[]> {
    const filas = await this.prisma.horarioAtencion.findMany({
      where: { emprendimientoId },
      orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
    });
    return filas.map(aFranja);
  }

  /** RF-10: reemplaza todas las franjas de la semana en una transacción */
  async reemplazarFranjas(
    emprendimientoId: string,
    franjas: Franja[],
  ): Promise<(Franja & { id: string })[]> {
    await this.prisma.$transaction([
      this.prisma.horarioAtencion.deleteMany({ where: { emprendimientoId } }),
      this.prisma.horarioAtencion.createMany({
        data: franjas.map((f) => ({
          emprendimientoId,
          diaSemana: f.diaSemana,
          horaInicio: desdeTextoHora(f.horaInicio),
          horaFin: desdeTextoHora(f.horaFin),
        })),
      }),
    ]);
    return this.listarFranjas(emprendimientoId);
  }

  listarBloqueos(emprendimientoId: string, desde: Date, hasta: Date): Promise<Bloqueo[]> {
    return this.prisma.bloqueo.findMany({
      where: { emprendimientoId, inicio: { lt: hasta }, fin: { gt: desde } },
      orderBy: { inicio: 'asc' },
    });
  }

  crearBloqueo(datos: {
    emprendimientoId: string;
    inicio: Date;
    fin: Date;
    motivo: string | null;
  }): Promise<Bloqueo> {
    return this.prisma.bloqueo.create({ data: datos });
  }

  buscarBloqueo(id: string, emprendimientoId: string): Promise<Bloqueo | null> {
    return this.prisma.bloqueo.findFirst({ where: { id, emprendimientoId } });
  }

  async eliminarBloqueo(id: string): Promise<void> {
    await this.prisma.bloqueo.delete({ where: { id } });
  }
}
