import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface FilaEstadistica {
  mes: string;
  tipo: 'INGRESO' | 'GASTO';
  total: bigint;
  cantidad: bigint;
}

@Injectable()
export class EstadisticasRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * CU-12, paso 3: agrupa por mes de imputación y tipo en una sola consulta. Usa la columna
   * calculada mes_imputacion y su índice (Parte 3, sección 4.2). SQL parametrizado (Parte 6, sección 9).
   */
  totalesPorMes(emprendimientoId: string, desde: Date, hasta: Date): Promise<FilaEstadistica[]> {
    return this.prisma.$queryRaw<FilaEstadistica[]>`
      SELECT to_char(mes_imputacion, 'YYYY-MM') AS mes,
             tipo::text AS tipo,
             SUM(monto_centavos)::bigint AS total,
             COUNT(*)::bigint AS cantidad
      FROM movimientos
      WHERE emprendimiento_id = ${emprendimientoId}::uuid
        AND mes_imputacion BETWEEN ${desde}::date AND ${hasta}::date
      GROUP BY mes_imputacion, tipo`;
  }
}
