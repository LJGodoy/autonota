import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Estadisticas } from '@autonota/shared';
import { formatearPesos } from '../../lib/dinero';
import { formatearMes, formatearMesCorto } from '../../lib/meses';

// Verde para lo que entra y rojo para lo que sale, sobre la hoja blanca. Los gastos llevan además
// rayado diagonal, para no depender solo del color.
const HOJA = '#FFFFFF';
const VERDE = '#1D6B3F';
const ROJO = '#B42318';
const TINTA = '#161311';
const LAPIZ = '#5E554D';
const LINEA = '#D6CDC2';
const CUADRICULA = '#ECE6DE';

const compacto = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 });

interface Props {
  datos: Estadisticas['meses'];
  etiquetaIngresos: string;
  etiquetaGastos: string;
  alElegirMes: (mes: string) => void;
}

/** CU-12, paso 4: ingresos y gastos por mes */
export function GraficoMensual({ datos, etiquetaIngresos, etiquetaGastos, alElegirMes }: Props) {
  const filas = datos.map((d) => ({
    ...d,
    ingresos: d.ingresosCentavos / 100,
    gastos: d.gastosCentavos / 100,
  }));

  return (
    <figure className="flex flex-col gap-2">
      <div className="h-72 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={filas}
            barGap={2}
            barCategoryGap="22%"
            margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
            onClick={(e) => {
              const mes = (e as { activeLabel?: string | number } | null)?.activeLabel;
              if (typeof mes === 'string') alElegirMes(mes);
            }}
          >
            <defs>
              <pattern
                id="rayado-gastos"
                width="6"
                height="6"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect width="6" height="6" fill={ROJO} />
                <line x1="0" y1="0" x2="0" y2="6" stroke={HOJA} strokeWidth="2" />
              </pattern>
            </defs>
            <CartesianGrid vertical={false} stroke={CUADRICULA} />
            <XAxis
              dataKey="mes"
              tickFormatter={formatearMesCorto}
              tick={{ fill: LAPIZ, fontSize: 12 }}
              axisLine={{ stroke: TINTA }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => `$ ${compacto.format(v)}`}
              tick={{ fill: LAPIZ, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={64}
            />
            <Tooltip
              cursor={{ fill: CUADRICULA, opacity: 0.7 }}
              formatter={(valor, nombre) => [
                formatearPesos(Math.round(Number(valor) * 100)),
                String(nombre),
              ]}
              labelFormatter={(mes) => formatearMes(String(mes))}
              contentStyle={{
                background: HOJA,
                border: `1px solid ${LINEA}`,
                borderRadius: 6,
                boxShadow: '0 6px 16px -4px rgb(22 19 17 / 0.12)',
                fontFamily: 'Atkinson Hyperlegible',
              }}
              labelStyle={{ color: TINTA, fontWeight: 700 }}
              itemStyle={{ color: TINTA }}
            />
            <Legend wrapperStyle={{ color: TINTA, fontSize: 14 }} iconType="square" />
            <Bar
              dataKey="ingresos"
              name={etiquetaIngresos}
              fill={VERDE}
              radius={[4, 4, 0, 0]}
              stroke={HOJA}
              strokeWidth={1}
              cursor="pointer"
            />
            <Bar
              dataKey="gastos"
              name={etiquetaGastos}
              fill="url(#rayado-gastos)"
              radius={[4, 4, 0, 0]}
              stroke={ROJO}
              strokeWidth={1}
              cursor="pointer"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="text-sm text-lapiz">
        Tocá un mes en el gráfico o en la tabla para ver el detalle. Los datos del gráfico están en
        la tabla de abajo.
      </figcaption>
    </figure>
  );
}
