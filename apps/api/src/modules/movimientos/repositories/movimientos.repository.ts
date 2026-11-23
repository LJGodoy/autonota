import { Injectable } from '@nestjs/common';
import type { MedioPago, Movimiento, Prisma, TipoMovimiento } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

/** Movimiento con el nombre del alumno, para el DTO de salida */
export type MovimientoConAlumno = Movimiento & { alumno: { nombre: string } | null };
const CON_ALUMNO = { alumno: { select: { nombre: true } } } as const;

export interface DatosMovimiento {
  emprendimientoId: string;
  tipo: TipoMovimiento;
  montoCentavos: bigint;
  fecha: Date;
  descripcion: string | null;
  medioPago: MedioPago | null;
  claveIdempotencia: string | null;
  turnoId: string | null;
  alumnoId: string | null;
  tareaId: string | null;
  mesCorrespondiente: Date | null;
}

export interface FiltroRepositorio {
  tipo?: TipoMovimiento;
  /** Primer día del mes de imputación */
  mes?: Date;
  medioPago?: MedioPago;
  alumnoId?: string;
  tareaId?: string;
  saltar: number;
  tomar: number;
}

@Injectable()
export class MovimientosRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscarPorClave(claveIdempotencia: string): Promise<MovimientoConAlumno | null> {
    return this.prisma.movimiento.findUnique({
      where: { claveIdempotencia },
      include: CON_ALUMNO,
    });
  }

  buscarDelEmprendimiento(
    id: string,
    emprendimientoId: string,
  ): Promise<MovimientoConAlumno | null> {
    return this.prisma.movimiento.findFirst({
      where: { id, emprendimientoId },
      include: CON_ALUMNO,
    });
  }

  crear(datos: DatosMovimiento): Promise<MovimientoConAlumno> {
    return this.prisma.movimiento.create({ data: datos, include: CON_ALUMNO });
  }

  actualizar(
    id: string,
    datos: Partial<Pick<DatosMovimiento, 'montoCentavos' | 'fecha' | 'descripcion' | 'medioPago'>>,
  ): Promise<MovimientoConAlumno> {
    return this.prisma.movimiento.update({ where: { id }, data: datos, include: CON_ALUMNO });
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.movimiento.delete({ where: { id } });
  }

  /**
   * RF-73: listado del emprendimiento. El filtro por mes usa el mes de imputación
   * (Parte 3, sección 4.2): el mes correspondiente si existe; si no, el mes de la fecha.
   */
  async listar(
    emprendimientoId: string,
    f: FiltroRepositorio,
  ): Promise<[MovimientoConAlumno[], number]> {
    const where: Prisma.MovimientoWhereInput = {
      emprendimientoId,
      tipo: f.tipo,
      medioPago: f.medioPago,
      alumnoId: f.alumnoId,
      tareaId: f.tareaId,
    };
    if (f.mes) {
      const siguiente = new Date(Date.UTC(f.mes.getUTCFullYear(), f.mes.getUTCMonth() + 1, 1));
      where.OR = [
        { mesCorrespondiente: f.mes },
        { mesCorrespondiente: null, fecha: { gte: f.mes, lt: siguiente } },
      ];
    }
    return this.prisma.$transaction([
      this.prisma.movimiento.findMany({
        where,
        include: CON_ALUMNO,
        orderBy: [{ fecha: 'desc' }, { creadoEn: 'desc' }],
        skip: f.saltar,
        take: f.tomar,
      }),
      this.prisma.movimiento.count({ where }),
    ]);
  }

  async tareaPerteneceA(tareaId: string, emprendimientoId: string): Promise<boolean> {
    return (await this.prisma.tarea.count({ where: { id: tareaId, emprendimientoId } })) > 0;
  }
}
