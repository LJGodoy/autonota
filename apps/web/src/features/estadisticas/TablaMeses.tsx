import type { Estadisticas } from '@autonota/shared';
import { formatearPesos } from '../../lib/dinero';
import { formatearMes } from '../../lib/meses';

interface Props {
  estadisticas: Estadisticas;
  etiquetaIngresos: string;
  etiquetaCantidad: string;
  mesElegido?: string;
  alElegirMes: (mes: string) => void;
}

/** Vista de tabla del gráfico (accesibilidad) con los totales del período (RF-70 a RF-72) */
export function TablaMeses({
  estadisticas,
  etiquetaIngresos,
  etiquetaCantidad,
  mesElegido,
  alElegirMes,
}: Props) {
  const celda = 'px-2 py-2 text-right montos whitespace-nowrap';
  return (
    <div className="overflow-x-auto rounded-trazo-2 border-2 border-grafito">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <caption className="sr-only">Ingresos, gastos y saldo por mes</caption>
        <thead>
          <tr className="border-b-2 border-grafito text-left text-lapiz">
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
              {etiquetaCantidad}
            </th>
          </tr>
        </thead>
        <tbody>
          {[...estadisticas.meses].reverse().map((m) => (
            <tr
              key={m.mes}
              className={`border-b border-renglon ${m.mes === mesElegido ? 'bg-kraft-claro' : ''}`}
            >
              <th scope="row" className="px-2 py-1 text-left font-normal">
                <button
                  type="button"
                  className="text-madera underline underline-offset-4 first-letter:uppercase"
                  aria-pressed={m.mes === mesElegido}
                  onClick={() => alElegirMes(m.mes)}
                >
                  {formatearMes(m.mes)}
                </button>
              </th>
              <td className={`${celda} text-cafe`}>{formatearPesos(m.ingresosCentavos)}</td>
              <td className={`${celda} text-madera`}>{formatearPesos(m.gastosCentavos)}</td>
              <td className={`${celda} font-bold`}>{formatearPesos(m.saldoCentavos)}</td>
              <td className={celda}>{m.cantidadIngresos}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-grafito font-bold">
            <th scope="row" className="px-2 py-2 text-left">
              Total del período
            </th>
            <td className={celda}>{formatearPesos(estadisticas.totales.ingresosCentavos)}</td>
            <td className={celda}>{formatearPesos(estadisticas.totales.gastosCentavos)}</td>
            <td className={celda}>{formatearPesos(estadisticas.totales.saldoCentavos)}</td>
            <td className={celda}>{estadisticas.totales.cantidadIngresos}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
