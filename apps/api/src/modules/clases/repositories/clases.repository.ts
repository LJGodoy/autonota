import { Injectable } from '@nestjs/common';
import type { ModalidadClase, Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

const INCLUIR = {
  alumnos: {
    include: {
      alumno: { select: { id: true, nombre: true, activo: true } },
      pago: { select: { movimientoId: true } },
    },
    orderBy: { alumno: { nombre: 'asc' } },
  },
} satisfies Prisma.ClaseInclude;

export type ClaseConAlumnos = Prisma.ClaseGetPayload<{ include: typeof INCLUIR }>;

export interface NuevaClase {
  emprendimientoId: string;
  titulo: string | null;
  modalidad: ModalidadClase;
  inicio: Date;
  fin: Date;
  alumnoIds: string[];
}

const aCreacion = (c: NuevaClase): Prisma.ClaseUncheckedCreateInput => ({
  emprendimientoId: c.emprendimientoId,
  titulo: c.titulo,
  modalidad: c.modalidad,
  inicio: c.inicio,
  fin: c.fin,
  alumnos: { create: c.alumnoIds.map((alumnoId) => ({ alumnoId })) },
});

@Injectable()
export class ClasesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** RF-33: clases que se cruzan con el rango */
  listar(emprendimientoId: string, desde: Date, hasta: Date): Promise<ClaseConAlumnos[]> {
    return this.prisma.clase.findMany({
      where: { emprendimientoId, inicio: { lt: hasta }, fin: { gt: desde } },
      include: INCLUIR,
      orderBy: { inicio: 'asc' },
    });
  }

  buscar(id: string, emprendimientoId: string): Promise<ClaseConAlumnos | null> {
    return this.prisma.clase.findFirst({ where: { id, emprendimientoId }, include: INCLUIR });
  }

  crear(c: NuevaClase): Promise<ClaseConAlumnos> {
    return this.prisma.clase.create({ data: aCreacion(c), include: INCLUIR });
  }

  /**
   * RF-32: edita la clase y, si vienen, reemplaza sus alumnos, en una transacción.
   * Solo borra a los que salen, para no perder los pagos de los que siguen.
   */
  actualizar(
    id: string,
    datos: Prisma.ClaseUncheckedUpdateInput,
    alumnoIds?: string[],
  ): Promise<ClaseConAlumnos> {
    return this.prisma.$transaction(async (tx) => {
      if (alumnoIds) {
        await tx.claseAlumno.deleteMany({ where: { claseId: id, alumnoId: { notIn: alumnoIds } } });
        await tx.claseAlumno.createMany({
          data: alumnoIds.map((alumnoId) => ({ claseId: id, alumnoId })),
          skipDuplicates: true,
        });
      }
      return tx.clase.update({ where: { id }, data: datos, include: INCLUIR });
    });
  }

  /** Clases que empiezan en el rango (para copiar semana) */
  queEmpiezanEn(emprendimientoId: string, desde: Date, hasta: Date): Promise<ClaseConAlumnos[]> {
    return this.prisma.clase.findMany({
      where: { emprendimientoId, inicio: { gte: desde, lt: hasta } },
      include: INCLUIR,
      orderBy: { inicio: 'asc' },
    });
  }

  /** CU-10, paso 4: inserta las copias en una transacción */
  crearVarias(clases: NuevaClase[]): Promise<ClaseConAlumnos[]> {
    return this.prisma.$transaction(
      clases.map((c) => this.prisma.clase.create({ data: aCreacion(c), include: INCLUIR })),
    );
  }

  /** Borra la clase; los pagos de la clase pierden el vínculo pero el ingreso queda */
  async eliminar(id: string): Promise<void> {
    await this.prisma.clase.delete({ where: { id } });
  }

  /** Borra las clases que empiezan en el rango; devuelve cuántas */
  async eliminarQueEmpiezanEn(emprendimientoId: string, desde: Date, hasta: Date): Promise<number> {
    const r = await this.prisma.clase.deleteMany({
      where: { emprendimientoId, inicio: { gte: desde, lt: hasta } },
    });
    return r.count;
  }
}
