import type { EstadoTurno, TipoEmprendimiento } from '@autonota/shared';
import { NOMBRE_TIPO_EMPRENDIMIENTO } from '@autonota/shared';

const BASE =
  'inline-flex items-center gap-1 rounded-trazo border px-2 py-0.5 text-sm leading-5 font-bold';

/**
 * Cada estado se distingue por su forma y no solo por el color:
 * realizado relleno en cafe con tilde, ausente con borde punteado en rojo, cancelado tachado en lápiz.
 */
const ESTADOS_TURNO: Record<EstadoTurno, { clase: string; texto: string; marca?: string }> = {
  PROGRAMADO: { clase: 'border-linea bg-hoja text-tinta', texto: 'Programado' },
  REALIZADO: { clase: 'border-cafe bg-cafe text-hoja', texto: 'Realizado', marca: '✓' },
  AUSENTE: { clase: 'border-2 border-dotted border-rojo bg-hoja text-rojo', texto: 'Ausente' },
  CANCELADO: { clase: 'border-linea bg-hoja text-lapiz line-through', texto: 'Cancelado' },
};

export function EtiquetaEstadoTurno({ estado }: { estado: EstadoTurno }) {
  const e = ESTADOS_TURNO[estado];
  return (
    <span className={`${BASE} ${e.clase}`}>
      {e.marca && <span aria-hidden="true">{e.marca}</span>}
      {e.texto}
    </span>
  );
}

/** Color de tapa de cada tipo de negocio */
export const TAPA: Record<TipoEmprendimiento, { texto: string; fondo: string }> = {
  TURNERO: { texto: 'text-tapa-turnero', fondo: 'bg-tapa-turnero' },
  CLASES: { texto: 'text-tapa-clases', fondo: 'bg-tapa-clases' },
  VENTAS: { texto: 'text-tapa-ventas', fondo: 'bg-tapa-ventas' },
};

export function EtiquetaTipo({ tipo }: { tipo: TipoEmprendimiento }) {
  return (
    <span className={`${BASE} border-linea bg-hoja ${TAPA[tipo].texto}`}>
      <span aria-hidden="true" className={`size-2.5 rounded-[2px] ${TAPA[tipo].fondo}`} />
      {NOMBRE_TIPO_EMPRENDIMIENTO[tipo]}
    </span>
  );
}
