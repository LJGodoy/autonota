import { Injectable } from '@nestjs/common';
import type { EstadoTurno, Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

const INCLUIR = {
  cliente: { select: { id: true, nombre: true, activo: true } },
  cobros: { orderBy: [{ fecha: 'asc' }, { creadoEn: 'asc' }] },
} satisfies Prisma.TurnoInclude;

export type TurnoConDatos = Prisma.TurnoGetPayload<{ include: typeof INCLUIR }>;

export interface NuevoTurno {
  emprendimientoId: string;
  clienteId: string;
  inicio: Date;
  fin: Date;
  descripcion: string | null;
}

export interface CobroEnTransaccion {
  montoCentavos: bigint;
  fecha: Date;
  medioPago: Prisma.MovimientoUncheckedCreateInput['medioPago'];
  descripcion: string | null;
  claveIdempotencia: string | null;
}

@Injectable()
export class TurnosRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** RF-17: turnos que se cruzan con el rango, para la agenda diaria o semanal */
  listar(
    emprendimientoId: string,
    desde: Date,
    hasta: Date,
    estado?: EstadoTurno,
  ): Promise<TurnoConDatos[]> {
    return this.prisma.turno.findMany({
      where: { emprendimientoId, estado, inicio: { lt: hasta }, fin: { gt: desde } },
      include: INCLUIR,
      orderBy: { inicio: 'asc' },
    });
  }

  buscar(id: string, emprendimientoId: string): Promise<TurnoConDatos | null> {
    return this.prisma.turno.findFirst({ where: { id, emprendimientoId }, include: INCLUIR });
  }

  crear(datos: NuevoTurno): Promise<TurnoConDatos> {
    return this.prisma.turno.create({ data: datos, include: INCLUIR });
  }

  actualizar(id: string, datos: Prisma.TurnoUncheckedUpdateInput): Promise<TurnoConDatos> {
    return this.prisma.turno.update({ where: { id }, data: datos, include: INCLUIR });
  }

  /**
   * CU-08: en una transacción bloquea la fila del turno; si no está cancelado lo marca como
   * REALIZADO y, si vino un cobro, inserta el movimiento con turno_id. Devuelve null si estaba
   * cancelado. Si la clave de idempotencia ya existe, no inserta otro cobro.
   */
  realizar(
    id: string,
    emprendimientoId: string,
    cobro: CobroEnTransaccion | null,
  ): Promise<TurnoConDatos | null> {
    return this.prisma.$transaction(async (tx) => {
      const filas = await tx.$queryRaw<{ estado: EstadoTurno }[]>`
        SELECT estado FROM turnos WHERE id = ${id}::uuid AND emprendimiento_id = ${emprendimientoId}::uuid FOR UPDATE`;
      if (filas[0]?.estado === 'CANCELADO') return null;
      await tx.turno.update({ where: { id }, data: { estado: 'REALIZADO' } });
      const repetido = cobro?.claveIdempotencia
        ? await tx.movimiento.findUnique({ where: { claveIdempotencia: cobro.claveIdempotencia } })
        : null;
      if (cobro && !repetido) {
        await tx.movimiento.create({
          data: { ...cobro, emprendimientoId, tipo: 'INGRESO', turnoId: id },
        });
      }
      return tx.turno.findUniqueOrThrow({ where: { id }, include: INCLUIR });
    });
  }

  /** CU-16: turnos programados desde un momento en adelante */
  programadosDesde(emprendimientoId: string, desde: Date): Promise<TurnoConDatos[]> {
    return this.prisma.turno.findMany({
      where: { emprendimientoId, estado: 'PROGRAMADO', inicio: { gte: desde } },
      include: INCLUIR,
      orderBy: { inicio: 'asc' },
    });
  }

  /** Turnos no cancelados que empiezan en el rango (para copiar semana) */
  noCanceladosQueEmpiezanEn(
    emprendimientoId: string,
    desde: Date,
    hasta: Date,
  ): Promise<TurnoConDatos[]> {
    return this.prisma.turno.findMany({
      where: { emprendimientoId, estado: { not: 'CANCELADO' }, inicio: { gte: desde, lt: hasta } },
      include: INCLUIR,
      orderBy: { inicio: 'asc' },
    });
  }

  /** RF-21: crea las copias en una transacción */
  crearVarios(turnos: NuevoTurno[]): Promise<TurnoConDatos[]> {
    return this.prisma.$transaction(
      turnos.map((t) => this.prisma.turno.create({ data: t, include: INCLUIR })),
    );
  }
}
