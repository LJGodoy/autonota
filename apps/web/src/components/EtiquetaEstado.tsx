import type { EstadoTurno, PrioridadTarea, TipoEmprendimiento } from '@autonota/shared';
import { NOMBRE_TIPO_EMPRENDIMIENTO } from '@autonota/shared';

const BASE =
  'inline-flex items-center gap-1 rounded-trazo border-2 px-2.5 py-0.5 text-sm font-bold';

/**
 * Cada estado se distingue por su forma y no solo por el color (Parte 6, sección 5.3):
 * realizado relleno en café con tilde, ausente con borde punteado en madera, cancelado tachado en lápiz.
 */
const ESTADOS_TURNO: Record<EstadoTurno, { clase: string; texto: string; marca?: string }> = {
  PROGRAMADO: { clase: 'border-grafito text-grafito bg-papel', texto: 'Programado' },
  REALIZADO: { clase: 'border-cafe bg-cafe text-papel', texto: 'Realizado', marca: '✓' },
  AUSENTE: { clase: 'border-dotted border-madera text-madera bg-papel', texto: 'Ausente' },
  CANCELADO: { clase: 'border-lapiz text-lapiz line-through bg-papel', texto: 'Cancelado' },
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

const SIGNOS: Record<PrioridadTarea, { signos: string; texto: string }> = {
  BAJA: { signos: '!', texto: 'Prioridad baja' },
  MEDIA: { signos: '!!', texto: 'Prioridad media' },
  ALTA: { signos: '!!!', texto: 'Prioridad alta' },
};

/** Prioridad marcada en el margen con signos de exclamación escritos a mano */
export function MarcaPrioridad({ prioridad }: { prioridad: PrioridadTarea }) {
  const p = SIGNOS[prioridad];
  return (
    <span
      className="font-mano text-2xl font-bold leading-none text-cafe"
      role="img"
      aria-label={p.texto}
    >
      {p.signos}
    </span>
  );
}

export function EtiquetaTipo({ tipo }: { tipo: TipoEmprendimiento }) {
  return (
    <span className={`${BASE} border-madera bg-papel text-madera`}>
      {NOMBRE_TIPO_EMPRENDIMIENTO[tipo]}
    </span>
  );
}
