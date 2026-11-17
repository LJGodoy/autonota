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
}

/** Renglones de cuaderno con cada movimiento. El signo y la marca indican si entra o sale dinero. */
export function ListaMovimientos({ movimientos, tipoNegocio, alEditar, alEliminar }: Props) {
  return (
    <ul className="fondo-cuaderno flex flex-col rounded-trazo-2 border-2 border-grafito py-2 pr-3 pl-9">
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
            className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-renglon py-2 last:border-b-0"
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
              className={`montos font-bold whitespace-nowrap ${esIngreso ? 'text-cafe' : 'text-madera'}`}
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
  );
}
