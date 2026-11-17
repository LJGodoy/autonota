import { useState } from 'react';
import { MAX_MESES_ESTADISTICAS, mesesEntre } from '@autonota/shared';
import { Cargando, MensajeError, Vacio } from '../../components/Estados';
import { SelectorMes } from '../../components/SelectorMes';
import { formatearPesos } from '../../lib/dinero';
import { formatearMes, mesActual, sumarMeses } from '../../lib/meses';
import { useEmprendimientoActual } from '../emprendimientos/LayoutEmprendimiento';
import { useEstadisticas, useMovimientos } from '../movimientos/api';
import { PLURALES } from '../movimientos/etiquetas';
import { ListaMovimientos } from '../movimientos/ListaMovimientos';
import { GraficoMensual } from './GraficoMensual';
import { TablaMeses } from './TablaMeses';

/** CU-12: por defecto, los últimos 6 meses incluido el actual */
export function PantallaEstadisticas() {
  const emp = useEmprendimientoActual();
  const [hasta, setHasta] = useState(mesActual);
  const [desde, setDesde] = useState(() => sumarMeses(mesActual(), -5));
  const [mesElegido, setMesElegido] = useState<string | undefined>();
  const rangoValido =
    mesesEntre(desde, hasta) >= 0 && mesesEntre(desde, hasta) < MAX_MESES_ESTADISTICAS;
  const consulta = useEstadisticas(emp.id, desde, hasta);
  // RF-73: monto de cada venta o cobro del mes elegido
  const detalle = useMovimientos(emp.id, { mes: mesElegido, tipo: 'INGRESO' }, Boolean(mesElegido));
  const plurales = PLURALES[emp.tipo];

  const tarjetas = consulta.data
    ? [
        {
          titulo: plurales.INGRESO,
          valor: formatearPesos(consulta.data.totales.ingresosCentavos),
          clase: 'text-verde',
        },
        {
          titulo: 'Gastos',
          valor: formatearPesos(consulta.data.totales.gastosCentavos),
          clase: 'text-rojo',
        },
        {
          titulo: `Cantidad de ${plurales.INGRESO.toLowerCase()}`,
          valor: String(consulta.data.totales.cantidadIngresos),
          clase: 'text-tinta',
        },
        {
          titulo: 'Saldo',
          valor: formatearPesos(consulta.data.totales.saldoCentavos),
          clase: 'total-al-pie font-mano text-2xl leading-none sm:text-3xl text-tinta',
        },
      ]
    : [];
  const sinDatos = consulta.data?.meses.every(
    (m) => m.ingresosCentavos === 0 && m.gastosCentavos === 0,
  );

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-4">
        <SelectorMes etiqueta="Desde" valor={desde} alCambiar={setDesde} />
        <SelectorMes etiqueta="Hasta" valor={hasta} alCambiar={setHasta} />
      </div>
      {!rangoValido && (
        <p role="alert" className="font-bold text-rojo">
          ✗ Elegí un rango de 1 a {MAX_MESES_ESTADISTICAS} meses, con «Desde» antes que «Hasta».
        </p>
      )}

      {rangoValido && consulta.isPending && <Cargando />}
      {rangoValido && consulta.isError && (
        <MensajeError error={consulta.error} reintentar={() => void consulta.refetch()} />
      )}
      {rangoValido && consulta.data && (
        <>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-trazo-2 border border-linea bg-cuadricula shadow-nota sm:grid-cols-4">
            {tarjetas.map((t) => (
              <div
                key={t.titulo}
                className="flex flex-col justify-between gap-1 bg-hoja p-3 sm:p-4"
              >
                <dt className="text-sm text-lapiz">{t.titulo}</dt>
                <dd className="montos text-base font-bold break-words sm:text-xl">
                  <span className={t.clase}>{t.valor}</span>
                </dd>
              </div>
            ))}
          </dl>
          {sinDatos ? (
            <Vacio>
              No hay movimientos entre {formatearMes(desde)} y {formatearMes(hasta)}.
            </Vacio>
          ) : (
            <GraficoMensual
              datos={consulta.data.meses}
              etiquetaIngresos={plurales.INGRESO}
              etiquetaGastos="Gastos"
              alElegirMes={setMesElegido}
            />
          )}
          <TablaMeses
            estadisticas={consulta.data}
            etiquetaIngresos={plurales.INGRESO}
            etiquetaCantidad="Cantidad"
            mesElegido={mesElegido}
            alElegirMes={setMesElegido}
          />
        </>
      )}

      {mesElegido && (
        <section aria-labelledby="detalle-mes" className="flex flex-col gap-3">
          <h2 id="detalle-mes" className="font-mano text-3xl font-bold text-cafe">
            {plurales.INGRESO} de {formatearMes(mesElegido)}
          </h2>
          {detalle.isPending && <Cargando />}
          {detalle.isError && <MensajeError error={detalle.error} />}
          {detalle.data && detalle.data.data.length === 0 && (
            <Vacio>No hubo ingresos ese mes.</Vacio>
          )}
          {detalle.data && detalle.data.data.length > 0 && (
            <ListaMovimientos movimientos={detalle.data.data} tipoNegocio={emp.tipo} />
          )}
        </section>
      )}
    </section>
  );
}
