import { NOMBRE_MEDIO_PAGO, type Movimiento, type TipoEmprendimiento } from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { formatearPesos } from '../../lib/dinero';
import { formatearFechaCorta, formatearMes } from '../../lib/meses';
import { origenMovimiento } from './etiquetas';

interface Props {
  movimientos: Movimiento[];
  tipoNegocio: TipoEmprendimiento;
  alEditar?: (m: Movimiento) => void;
  alEliminar?: (m: Movimiento) => void;
  /** Cuenta al pie de la hoja: lo que entró, lo que salió y lo que queda */
  cuenta?: { titulo: string; ingresos: number; gastos: number };
}

/** Renglones de cuaderno con cada movimiento. El signo y la marca indican si entra o sale dinero. */
export function ListaMovimientos({
  movimientos,
  tipoNegocio,
  alEditar,
  alEliminar,
  cuenta,
}: Props) {
  return (
    <div className="fondo-cuaderno overflow-hidden rounded-trazo-2 border border-linea shadow-nota">
      <ul className="flex flex-col py-1 pr-3 pl-10">
        {movimientos.map((m) => {
          const esIngreso = m.tipo === 'INGRESO';
          const detalle = [
            formatearFechaCorta(m.fecha),
            m.medioPago ? NOMBRE_MEDIO_PAGO[m.medioPago] : null,
            m.mesCorrespondiente ? `corresponde a ${formatearMes(m.mesCorrespondiente)}` : null,
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <li
              key={m.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-cuadricula py-2.5 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">
                  {m.descripcion || origenMovimiento(m, tipoNegocio)}
                </p>
                <p className="text-sm text-lapiz">
                  {m.descripcion ? `${origenMovimiento(m, tipoNegocio)} · ` : ''}
                  {detalle}
                </p>
              </div>
              <p
                className={`montos font-bold whitespace-nowrap ${esIngreso ? 'text-verde' : 'text-rojo'}`}
              >
                <span className="sr-only">{esIngreso ? 'Ingreso de ' : 'Gasto de '}</span>
                <span aria-hidden="true">{esIngreso ? '+ ' : '− '}</span>
                {formatearPesos(m.montoCentavos)}
              </p>
              {(alEditar || alEliminar) && (
                <div className="flex w-full justify-end gap-1 sm:w-auto">
                  {alEditar && (
                    <Boton
                      variante="texto"
                      className="min-h-9 px-2 text-sm"
                      onClick={() => alEditar(m)}
                    >
                      Corregir
                    </Boton>
                  )}
                  {alEliminar && (
                    <Boton
                      variante="texto"
                      className="min-h-9 px-2 text-sm"
                      onClick={() => alEliminar(m)}
                    >
                      Eliminar
                    </Boton>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {cuenta && (
        <dl
          aria-label={cuenta.titulo}
          className="montos ml-10 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t border-tinta/70 py-3 pr-3 text-right"
        >
          <dt className="text-lapiz">Entró</dt>
          <dd className="font-bold text-verde">+ {formatearPesos(cuenta.ingresos)}</dd>
          <dt className="text-lapiz">Salió</dt>
          <dd className="font-bold text-rojo">− {formatearPesos(cuenta.gastos)}</dd>
          <dt className="self-end font-bold">Queda</dt>
          <dd>
            <span className="total-al-pie font-mano text-2xl leading-none font-bold text-tinta">
              {cuenta.ingresos - cuenta.gastos < 0 ? '− ' : ''}
              {formatearPesos(Math.abs(cuenta.ingresos - cuenta.gastos))}
            </span>
          </dd>
        </dl>
      )}
    </div>
  );
}
