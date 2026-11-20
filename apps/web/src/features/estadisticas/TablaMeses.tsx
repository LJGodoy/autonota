import type { Estadisticas } from '@autonota/shared';
import { formatearPesos } from '../../lib/dinero';
import { formatearMes } from '../../lib/meses';
import { promedioCentavos } from './GraficoMensual';

interface Props {
  estadisticas: Estadisticas;
  etiquetaIngresos: string;
  nombreIngreso: string;
  mesElegido?: string;
  alElegirMes: (mes: string) => void;
}

/** Vista de tabla del gráfico (accesibilidad) con los totales del período (RF-70 a RF-72) */
export function TablaMeses({
  estadisticas,
  etiquetaIngresos,
  nombreIngreso,
  mesElegido,
  alElegirMes,
}: Props) {
  const celda = 'px-2 py-2 text-right montos whitespace-nowrap';
  return (
    <div className="overflow-x-auto rounded-trazo-2 border border-linea bg-hoja shadow-nota">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <caption className="sr-only">Ingresos, gastos y saldo por mes</caption>
        <thead>
          <tr className="border-b border-tinta/70 bg-arena text-left text-lapiz">
            <th scope="col" className="px-2 py-2">
              Mes
            </th>
            <th scope="col" className="px-2 py-2 text-right">
              {etiquetaIngresos}
            </th>
            <th scope="col" className="px-2 py-2 text-right">
              Gastos
            </th>
            <th scope="col" className="px-2 py-2 text-right">
              Saldo
            </th>
            <th scope="col" className="px-2 py-2 text-right">
              Cantidad de {nombreIngreso}s
            </th>
            <th scope="col" className="px-2 py-2 text-right">
              Cantidad de gastos
            </th>
            <th scope="col" className="px-2 py-2 text-right">
              Monto por {nombreIngreso}
            </th>
            <th scope="col" className="px-2 py-2 text-right">
              Monto por gasto
            </th>
          </tr>
        </thead>
        <tbody>
          {[...estadisticas.meses].reverse().map((m) => (
            <tr
              key={m.mes}
              className={`border-b border-cuadricula ${m.mes === mesElegido ? 'bg-resaltador/45' : 'hover:bg-arena/60'}`}
            >
              <th scope="row" className="px-2 py-1 text-left font-normal">
                <button
                  type="button"
                  className="min-h-9 text-cafe underline decoration-1 underline-offset-4 first-letter:uppercase hover:text-cafe-oscuro"
                  aria-pressed={m.mes === mesElegido}
                  onClick={() => alElegirMes(m.mes)}
                >
                  {formatearMes(m.mes)}
                </button>
              </th>
              <td className={`${celda} text-verde`}>{formatearPesos(m.ingresosCentavos)}</td>
              <td className={`${celda} text-rojo`}>{formatearPesos(m.gastosCentavos)}</td>
              <td className={`${celda} font-bold`}>{formatearPesos(m.saldoCentavos)}</td>
              <td className={celda}>{m.cantidadIngresos}</td>
              <td className={celda}>{m.cantidadGastos}</td>
              <td className={`${celda} text-verde`}>
                {formatearPesos(promedioCentavos(m.ingresosCentavos, m.cantidadIngresos))}
              </td>
              <td className={`${celda} text-rojo`}>
                {formatearPesos(promedioCentavos(m.gastosCentavos, m.cantidadGastos))}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-[3px] border-double border-tinta font-bold">
            <th scope="row" className="px-2 py-2 text-left">
              Total del período
            </th>
            <td className={celda}>{formatearPesos(estadisticas.totales.ingresosCentavos)}</td>
            <td className={celda}>{formatearPesos(estadisticas.totales.gastosCentavos)}</td>
            <td className={celda}>{formatearPesos(estadisticas.totales.saldoCentavos)}</td>
            <td className={celda}>{estadisticas.totales.cantidadIngresos}</td>
            <td className={celda}>{estadisticas.totales.cantidadGastos}</td>
            <td className={celda}>
              {formatearPesos(
                promedioCentavos(
                  estadisticas.totales.ingresosCentavos,
                  estadisticas.totales.cantidadIngresos,
                ),
              )}
            </td>
            <td className={celda}>
              {formatearPesos(
                promedioCentavos(
                  estadisticas.totales.gastosCentavos,
                  estadisticas.totales.cantidadGastos,
                ),
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
