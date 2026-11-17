import { Injectable } from '@nestjs/common';
import type { ModalidadClase, Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

const INCLUIR = {
  alumnos: {
    include: { alumno: { select: { id: true, nombre: true, activo: true } } },
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

  /** RF-32: edita la clase y, si vienen, reemplaza sus alumnos, en una transacción */
  actualizar(
    id: string,
    datos: Prisma.ClaseUncheckedUpdateInput,
    alumnoIds?: string[],
  ): Promise<ClaseConAlumnos> {
    return this.prisma.$transaction(async (tx) => {
      if (alumnoIds) {
        await tx.claseAlumno.deleteMany({ where: { claseId: id } });
        await tx.claseAlumno.createMany({
          data: alumnoIds.map((alumnoId) => ({ claseId: id, alumnoId })),
        });
      }
      return tx.clase.update({ where: { id }, data: datos, include: INCLUIR });
    });
  }

  /** Clases no canceladas que empiezan en el rango (para copiar semana) */
  noCanceladasQueEmpiezanEn(
    emprendimientoId: string,
    desde: Date,
    hasta: Date,
  ): Promise<ClaseConAlumnos[]> {
    return this.prisma.clase.findMany({
      where: { emprendimientoId, estado: 'PROGRAMADA', inicio: { gte: desde, lt: hasta } },
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
}
