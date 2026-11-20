import { Injectable } from '@nestjs/common';
import {
  mesesEntre,
  type Estadisticas,
  type RangoEstadisticas,
  type TotalesMes,
} from '@autonota/shared';
import { centavosANumero } from '../../../common/utils/dinero';
import { EstadisticasRepository } from '../repositories/estadisticas.repository';

/** Lista de meses AAAA-MM entre dos meses, ambos incluidos */
export function listarMeses(desde: string, hasta: string): string[] {
  const [anio, mes] = desde.split('-').map(Number) as [number, number];
  return Array.from({ length: mesesEntre(desde, hasta) + 1 }, (_, i) => {
    const fecha = new Date(Date.UTC(anio, mes - 1 + i, 1));
    return fecha.toISOString().slice(0, 7);
  });
}

const vacio = (): TotalesMes => ({
  ingresosCentavos: 0,
  gastosCentavos: 0,
  saldoCentavos: 0,
  cantidadIngresos: 0,
  cantidadGastos: 0,
});

@Injectable()
export class EstadisticasService {
  constructor(private readonly repo: EstadisticasRepository) {}

  /** CU-12 (RF-70 a RF-72): los meses sin movimientos aparecen en cero, para que el gráfico no tenga huecos */
  async obtener(emprendimientoId: string, rango: RangoEstadisticas): Promise<Estadisticas> {
    const filas = await this.repo.totalesPorMes(
      emprendimientoId,
      new Date(`${rango.desde}-01T00:00:00Z`),
      new Date(`${rango.hasta}-01T00:00:00Z`),
    );
    const porMes = new Map(listarMeses(rango.desde, rango.hasta).map((m) => [m, vacio()]));
    for (const f of filas) {
      const t = porMes.get(f.mes);
      if (!t) continue;
      if (f.tipo === 'INGRESO') {
        t.ingresosCentavos = centavosANumero(f.total);
        t.cantidadIngresos = centavosANumero(f.cantidad);
      } else {
        t.gastosCentavos = centavosANumero(f.total);
        t.cantidadGastos = centavosANumero(f.cantidad);
      }
    }
    const totales = vacio();
    const meses = [...porMes.entries()].map(([mes, t]) => {
      t.saldoCentavos = t.ingresosCentavos - t.gastosCentavos;
      totales.ingresosCentavos += t.ingresosCentavos;
      totales.gastosCentavos += t.gastosCentavos;
      totales.cantidadIngresos += t.cantidadIngresos;
      totales.cantidadGastos += t.cantidadGastos;
      return { mes, ...t };
    });
    totales.saldoCentavos = totales.ingresosCentavos - totales.gastosCentavos;
    return { meses, totales };
  }
}
