import { Injectable } from '@nestjs/common';
import type { Movimiento, Prisma } from '@prisma/client';
import { DomainException } from '../../../common/errors/domain.exception';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type {
  FiltroPersonasRepo,
  PersonaDb,
  RepositorioPersonas,
} from '../../../common/personas/personas.service';
import type { DatosMovimiento } from '../../movimientos/repositories/movimientos.repository';

/** Clases que empezaron antes de `antesDe` y, si hay `desde`, no antes de esa fecha */
export interface RangoEmpezadas {
  desde?: Date;
  antesDe: Date;
}

/** Clase del alumno que no tiene pago */
const impaga: Prisma.ClaseAlumnoWhereInput = { pago: { is: null } };

const empezadas = (r: RangoEmpezadas): Prisma.ClaseAlumnoWhereInput => ({
  clase: { inicio: { lt: r.antesDe, ...(r.desde ? { gte: r.desde } : {}) } },
});

@Injectable()
export class AlumnosRepository implements RepositorioPersonas {
  constructor(private readonly prisma: PrismaService) {}

  /** RF-30 y RF-38: con debe, solo los que tienen clases impagas ya empezadas en el rango */
  listar(
    emprendimientoId: string,
    f: FiltroPersonasRepo & { debe?: RangoEmpezadas },
  ): Promise<[PersonaDb[], number]> {
    const where: Prisma.AlumnoWhereInput = { emprendimientoId, activo: f.activo };
    if (f.q) {
      where.OR = [
        { nombre: { contains: f.q, mode: 'insensitive' } },
        { telefono: { contains: f.q } },
      ];
    }
    if (f.debe) where.clases = { some: { ...impaga, ...empezadas(f.debe) } };
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

  /** Cuántas clases ya empezadas del rango tiene cada alumno; con soloImpagas, las que no pagó */
  async contar(
    alumnoIds: string[],
    rango: RangoEmpezadas,
    soloImpagas: boolean,
  ): Promise<Map<string, number>> {
    const filas = await this.prisma.claseAlumno.groupBy({
      by: ['alumnoId'],
      where: { alumnoId: { in: alumnoIds }, ...empezadas(rango), ...(soloImpagas ? impaga : {}) },
      _count: { _all: true },
    });
    return new Map(filas.map((f) => [f.alumnoId, f._count._all]));
  }

  /** Clases del alumno que empiezan en el rango, o todas las impagas */
  clases(alumnoId: string, f: { desde?: Date; hasta?: Date; impagas?: boolean }) {
    return this.prisma.claseAlumno.findMany({
      where: {
        alumnoId,
        ...(f.impagas ? impaga : {}),
        ...(f.desde && f.hasta ? { clase: { inicio: { gte: f.desde, lt: f.hasta } } } : {}),
      },
      include: { clase: true, pago: { select: { movimientoId: true } } },
      orderBy: { clase: { inicio: 'asc' } },
    });
  }

  /**
   * Pago por clase: en una transacción verifica que las clases sean del alumno, del
   * emprendimiento y estén impagas, y crea el ingreso con sus vínculos. Si otro pago gana la
   * carrera, la clave primaria de pagos_clase hace fallar la transacción (P2002).
   */
  registrarPago(datos: DatosMovimiento, claseIds: string[]): Promise<Movimiento> {
    const alumnoId = datos.alumnoId as string;
    return this.prisma.$transaction(async (tx) => {
      const validas = await tx.claseAlumno.count({
        where: {
          alumnoId,
          claseId: { in: claseIds },
          clase: { emprendimientoId: datos.emprendimientoId },
          ...impaga,
        },
      });
      if (validas !== claseIds.length) {
        throw new DomainException(
          'VALIDACION',
          'Hay clases que no son del alumno o ya están pagadas.',
          [{ field: 'claseIds', message: 'Elegí clases impagas del alumno' }],
        );
      }
      const movimiento = await tx.movimiento.create({
        data: datos,
        include: { alumno: { select: { nombre: true } } },
      });
      await tx.pagoClase.createMany({
        data: claseIds.map((claseId) => ({ claseId, alumnoId, movimientoId: movimiento.id })),
      });
      return movimiento;
    });
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
