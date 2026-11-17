import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type {
  FiltroPersonasRepo,
  PersonaDb,
  RepositorioPersonas,
} from '../../../common/personas/personas.service';

@Injectable()
export class AlumnosRepository implements RepositorioPersonas {
  constructor(private readonly prisma: PrismaService) {}

  /** RF-30 y RF-38: con sinPagoEn, solo los alumnos sin pago registrado para ese mes */
  listar(
    emprendimientoId: string,
    f: FiltroPersonasRepo & { sinPagoEn?: Date },
  ): Promise<[PersonaDb[], number]> {
    const where: Prisma.AlumnoWhereInput = { emprendimientoId, activo: f.activo };
    if (f.q) {
      where.OR = [
        { nombre: { contains: f.q, mode: 'insensitive' } },
        { telefono: { contains: f.q } },
      ];
    }
    if (f.sinPagoEn) where.pagos = { none: { mesCorrespondiente: f.sinPagoEn } };
    return this.prisma.$transaction([
      this.prisma.alumno.findMany({
        where,
        orderBy: { nombre: 'asc' },
        skip: f.saltar,
        take: f.tomar,
      }),
      this.prisma.alumno.count({ where }),
    ]);
  }

  /** RF-38: cuáles de estos alumnos tienen al menos un pago para el mes */
  async conPagoEn(alumnoIds: string[], mes: Date): Promise<Set<string>> {
    const filas = await this.prisma.movimiento.findMany({
      where: { alumnoId: { in: alumnoIds }, mesCorrespondiente: mes },
      select: { alumnoId: true },
      distinct: ['alumnoId'],
    });
    return new Set(filas.map((f) => f.alumnoId as string));
  }

  buscar(id: string, emprendimientoId: string): Promise<PersonaDb | null> {
    return this.prisma.alumno.findFirst({ where: { id, emprendimientoId } });
  }

  /** Alumnos activos del emprendimiento entre los ids pedidos */
  activosEntre(ids: string[], emprendimientoId: string): Promise<{ id: string }[]> {
    return this.prisma.alumno.findMany({
      where: { id: { in: ids }, emprendimientoId, activo: true },
      select: { id: true },
    });
  }

  crear(datos: Prisma.AlumnoUncheckedCreateInput): Promise<PersonaDb> {
    return this.prisma.alumno.create({ data: datos });
  }

  actualizar(id: string, datos: Prisma.AlumnoUpdateInput): Promise<PersonaDb> {
    return this.prisma.alumno.update({ where: { id }, data: datos });
  }
}
