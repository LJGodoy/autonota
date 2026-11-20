import { useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Estadisticas } from '@autonota/shared';
import { CasillaVerificacion } from '../../components/CasillaVerificacion';
import { formatearPesos } from '../../lib/dinero';
import { formatearMes, formatearMesCorto } from '../../lib/meses';

// Verde para lo que entra y rojo para lo que sale, sobre la hoja blanca. Los gastos llevan además
// rayado diagonal, y cada serie tiene su forma o trazo, para no depender solo del color.
const HOJA = '#FFFFFF';
const VERDE = '#1D6B3F';
const VERDE_CLARO = '#4FA877';
const ROJO = '#B42318';
const ROJO_CLARO = '#DB6B5F';
const TINTA = '#161311';
const LAPIZ = '#5E554D';
const LINEA = '#D6CDC2';
const CUADRICULA = '#ECE6DE';

const compacto = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 });

type Mes = Estadisticas['meses'][number];
type Clave =
  | 'ingresos'
  | 'gastos'
  | 'cantidadIngresos'
  | 'cantidadGastos'
  | 'promedioIngresos'
  | 'promedioGastos';

/** División protegida: un mes sin movimientos tiene promedio 0 */
export const promedioCentavos = (centavos: number, cantidad: number) =>
  cantidad > 0 ? Math.round(centavos / cantidad) : 0;

const esCantidad = (clave: string) => clave.startsWith('cantidad');

interface Props {
  datos: Estadisticas['meses'];
  /** Cómo se llama un ingreso en este tipo de emprendimiento, en singular y minúscula: «cobro» o «venta» */
  nombreIngreso: string;
  alElegirMes: (mes: string) => void;
}

const CLAVES_INICIALES: Clave[] = ['ingresos', 'gastos'];

/** CU-12, paso 4: variables mensuales a elección, montos a la izquierda y cantidades a la derecha */
export function GraficoMensual({ datos, nombreIngreso, alElegirMes }: Props) {
  const [elegidas, setElegidas] = useState<Clave[]>(CLAVES_INICIALES);
  const filas = datos.map((d: Mes) => ({
    mes: d.mes,
    ingresos: d.ingresosCentavos / 100,
    gastos: d.gastosCentavos / 100,
    cantidadIngresos: d.cantidadIngresos,
    cantidadGastos: d.cantidadGastos,
    promedioIngresos: promedioCentavos(d.ingresosCentavos, d.cantidadIngresos) / 100,
    promedioGastos: promedioCentavos(d.gastosCentavos, d.cantidadGastos) / 100,
  }));
  const nombres: Record<Clave, string> = {
    ingresos: nombreIngreso.charAt(0).toUpperCase() + nombreIngreso.slice(1),
    gastos: 'Gasto',
    cantidadIngresos: `Cantidad de ${nombreIngreso}s`,
    cantidadGastos: 'Cantidad de gastos',
    promedioIngresos: `Monto por ${nombreIngreso}`,
    promedioGastos: 'Monto por gasto',
  };
  const con = (c: Clave) => elegidas.includes(c);
  const hayMontos = elegidas.some((c) => !esCantidad(c));
  const hayCantidades = elegidas.some(esCantidad);
  const cuadrado = ({ cx, cy, stroke }: { cx?: number; cy?: number; stroke?: string }) =>
    cx === undefined || cy === undefined ? (
      <g />
    ) : (
      <rect
        x={cx - 4}
        y={cy - 4}
        width={8}
        height={8}
        fill={HOJA}
        stroke={stroke}
        strokeWidth={2}
      />
    );

  return (
    <figure className="flex flex-col gap-2">
      <fieldset className="flex flex-wrap gap-x-5 gap-y-2">
        <legend className="mb-1 text-sm text-lapiz">Variables del gráfico</legend>
        {(Object.keys(nombres) as Clave[]).map((c) => (
          <CasillaVerificacion
            key={c}
            checked={con(c)}
            onChange={(e) =>
              setElegidas((previas) =>
                e.target.checked ? [...previas, c] : previas.filter((p) => p !== c),
              )
            }
          >
            {nombres[c]}
          </CasillaVerificacion>
        ))}
      </fieldset>
      <div className="h-72 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
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
              yAxisId="montos"
              hide={!hayMontos}
              tickFormatter={(v: number) => `$ ${compacto.format(v)}`}
              tick={{ fill: LAPIZ, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={64}
            />
            <YAxis
              yAxisId="cantidades"
              orientation="right"
              hide={!hayCantidades}
              allowDecimals={false}
              tick={{ fill: LAPIZ, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              cursor={{ fill: CUADRICULA, opacity: 0.7 }}
              formatter={(valor, nombre, item) => [
                esCantidad(String(item.dataKey))
                  ? String(Math.round(Number(valor)))
                  : formatearPesos(Math.round(Number(valor) * 100)),
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
            <Legend wrapperStyle={{ color: TINTA, fontSize: 14 }} iconType="plainline" />
            {con('ingresos') && (
              <Bar
                yAxisId="montos"
                dataKey="ingresos"
                name={nombres.ingresos}
                fill={VERDE}
                radius={[4, 4, 0, 0]}
                stroke={HOJA}
                strokeWidth={1}
                cursor="pointer"
              />
            )}
            {con('gastos') && (
              <Bar
                yAxisId="montos"
                dataKey="gastos"
                name={nombres.gastos}
                fill="url(#rayado-gastos)"
                radius={[4, 4, 0, 0]}
                stroke={ROJO}
                strokeWidth={1}
                cursor="pointer"
              />
            )}
            {/* Cantidades: línea llena con marcador; ingresos con círculo y gastos con cuadrado */}
            {con('cantidadIngresos') && (
              <Line
                yAxisId="cantidades"
                dataKey="cantidadIngresos"
                name={nombres.cantidadIngresos}
                type="monotone"
                stroke={VERDE_CLARO}
                strokeWidth={2.5}
                dot={{ r: 4, fill: HOJA, stroke: VERDE_CLARO, strokeWidth: 2 }}
              />
            )}
            {con('cantidadGastos') && (
              <Line
                yAxisId="cantidades"
                dataKey="cantidadGastos"
                name={nombres.cantidadGastos}
                type="monotone"
                stroke={ROJO_CLARO}
                strokeWidth={2.5}
                dot={cuadrado}
              />
            )}
            {/* Promedios: trazo punteado sobre el eje de montos, sin marcador */}
            {con('promedioIngresos') && (
              <Line
                yAxisId="montos"
                dataKey="promedioIngresos"
                name={nombres.promedioIngresos}
                type="monotone"
                stroke={VERDE}
                strokeWidth={2}
                strokeDasharray="7 5"
                dot={false}
              />
            )}
            {con('promedioGastos') && (
              <Line
                yAxisId="montos"
                dataKey="promedioGastos"
                name={nombres.promedioGastos}
                type="monotone"
                stroke={ROJO}
                strokeWidth={2}
                strokeDasharray="2 4"
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="text-sm text-lapiz">
        Montos en pesos a la izquierda y cantidades a la derecha. Tocá un mes en el gráfico o en la
        tabla para ver el detalle. Los datos del gráfico están en la tabla de abajo.
      </figcaption>
    </figure>
  );
}
