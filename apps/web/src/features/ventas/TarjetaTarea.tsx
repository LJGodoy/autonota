import { ESTADOS_TAREA, NOMBRE_ESTADO_TAREA, type EstadoTarea, type Tarea } from '@autonota/shared';
import { MarcaPrioridad } from '../../components/EtiquetaEstado';
import { formatearFechaCorta } from '../../lib/meses';

interface Props {
  tarea: Tarea;
  alCambiarEstado: (estado: EstadoTarea) => void;
  alAbrir: () => void;
}

/** Post-it de color por prioridad (rojo, amarillo, verde pastel); la prioridad también va escrita en el margen */
const FONDO_POSTIT: Record<Tarea['prioridad'], string> = {
  ALTA: 'bg-postit-alta',
  MEDIA: 'bg-postit-media',
  BAJA: 'bg-postit-baja',
};

/** Anotación con la prioridad en el margen; las realizadas se tachan y su casilla queda marcada */
export function TarjetaTarea({ tarea, alCambiarEstado, alAbrir }: Props) {
  const hecha = tarea.estado === 'REALIZADA';
  return (
    <li
      className={`flex gap-2 rounded-[3px] p-3 text-tinta shadow-nota ${FONDO_POSTIT[tarea.prioridad]}`}
    >
      <div className="w-8 shrink-0 text-center">
        <MarcaPrioridad prioridad={tarea.prioridad} />
      </div>
      <input
        type="checkbox"
        checked={hecha}
        onChange={() => alCambiarEstado(hecha ? 'PENDIENTE' : 'REALIZADA')}
        aria-label={
          hecha
            ? `Marcar «${tarea.titulo}» como pendiente`
            : `Marcar «${tarea.titulo}» como realizada`
        }
        className="mt-1 size-5 shrink-0 accent-cafe"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <button
          type="button"
          onClick={alAbrir}
          className={`text-left font-bold ${hecha ? 'text-lapiz line-through' : 'text-tinta'}`}
        >
          {tarea.titulo}
        </button>
        {tarea.descripcion && (
          <p className={`text-sm text-lapiz ${hecha ? 'line-through' : ''}`}>{tarea.descripcion}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-mano text-lg text-lapiz">
            {formatearFechaCorta(tarea.creadoEn.slice(0, 10))}
          </span>
          <label className="sr-only" htmlFor={`estado-${tarea.id}`}>
            Estado
          </label>
          <select
            id={`estado-${tarea.id}`}
            value={tarea.estado}
            onChange={(e) => alCambiarEstado(e.target.value as EstadoTarea)}
            className="border-0 border-b-2 border-tinta bg-transparent text-sm"
          >
            {ESTADOS_TAREA.map((e) => (
              <option key={e} value={e}>
                {NOMBRE_ESTADO_TAREA[e]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </li>
  );
}
