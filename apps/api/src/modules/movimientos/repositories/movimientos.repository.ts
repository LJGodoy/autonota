import { Injectable } from '@nestjs/common';
import type { MedioPago, Movimiento, Prisma, TipoMovimiento } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface DatosMovimiento {
  emprendimientoId: string;
  tipo: TipoMovimiento;
  montoCentavos: bigint;
  fecha: Date;
  descripcion: string | null;
  medioPago: MedioPago | null;
  claveIdempotencia: string | null;
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

  buscarPorClave(claveIdempotencia: string): Promise<Movimiento | null> {
    return this.prisma.movimiento.findUnique({ where: { claveIdempotencia } });
  }

  buscarDelEmprendimiento(id: string, emprendimientoId: string): Promise<Movimiento | null> {
    return this.prisma.movimiento.findFirst({ where: { id, emprendimientoId } });
  }

  crear(datos: DatosMovimiento): Promise<Movimiento> {
    return this.prisma.movimiento.create({ data: datos });
  }

  actualizar(
    id: string,
    datos: Partial<
      Pick<
        DatosMovimiento,
        'montoCentavos' | 'fecha' | 'descripcion' | 'medioPago' | 'mesCorrespondiente'
      >
    >,
  ): Promise<Movimiento> {
    return this.prisma.movimiento.update({ where: { id }, data: datos });
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.movimiento.delete({ where: { id } });
  }

  /**
   * RF-73: listado del emprendimiento. El filtro por mes usa el mes de imputación
   * (Parte 3, sección 4.2): el mes correspondiente si existe; si no, el mes de la fecha.
   */
  async listar(emprendimientoId: string, f: FiltroRepositorio): Promise<[Movimiento[], number]> {
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
        orderBy: [{ fecha: 'desc' }, { creadoEn: 'desc' }],
        skip: f.saltar,
        take: f.tomar,
      }),
      this.prisma.movimiento.count({ where }),
    ]);
  }

  async alumnoPerteneceA(alumnoId: string, emprendimientoId: string): Promise<boolean> {
    return (await this.prisma.alumno.count({ where: { id: alumnoId, emprendimientoId } })) > 0;
  }

  async tareaPerteneceA(tareaId: string, emprendimientoId: string): Promise<boolean> {
    return (await this.prisma.tarea.count({ where: { id: tareaId, emprendimientoId } })) > 0;
  }
}
