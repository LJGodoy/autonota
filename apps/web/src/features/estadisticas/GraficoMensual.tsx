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

// Paleta validada contra el papel (#FBF8F1): café e madera se distinguen con todo tipo de
// daltonismo (ΔE 17) y superan 3:1 de contraste. Los gastos llevan además rayado diagonal,
// para no depender solo del color (Parte 6, sección 5.3).
const CAFE = '#4A3222';
const MADERA = '#8B5E3C';
const GRAFITO = '#2B2724';
const LAPIZ = '#5E5852';
const RENGLON = '#ECE3D3';

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
                <rect width="6" height="6" fill={MADERA} />
                <line x1="0" y1="0" x2="0" y2="6" stroke="#FBF8F1" strokeWidth="2" />
              </pattern>
            </defs>
            <CartesianGrid vertical={false} stroke={RENGLON} />
            <XAxis
              dataKey="mes"
              tickFormatter={formatearMesCorto}
              tick={{ fill: LAPIZ, fontSize: 12 }}
              axisLine={{ stroke: GRAFITO }}
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
              cursor={{ fill: RENGLON, opacity: 0.6 }}
              formatter={(valor, nombre) => [
                formatearPesos(Math.round(Number(valor) * 100)),
                String(nombre),
              ]}
              labelFormatter={(mes) => formatearMes(String(mes))}
              contentStyle={{
                background: '#FBF8F1',
                border: `2px solid ${GRAFITO}`,
                borderRadius: 10,
                fontFamily: 'Atkinson Hyperlegible',
              }}
              labelStyle={{ color: GRAFITO, fontWeight: 700 }}
              itemStyle={{ color: GRAFITO }}
            />
            <Legend wrapperStyle={{ color: GRAFITO, fontSize: 14 }} iconType="square" />
            <Bar
              dataKey="ingresos"
              name={etiquetaIngresos}
              fill={CAFE}
              radius={[4, 4, 0, 0]}
              stroke="#FBF8F1"
              strokeWidth={1}
              cursor="pointer"
            />
            <Bar
              dataKey="gastos"
              name={etiquetaGastos}
              fill="url(#rayado-gastos)"
              radius={[4, 4, 0, 0]}
              stroke={MADERA}
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
