import { NOMBRE_PRIORIDAD, type Tarea } from '@autonota/shared';
import { formatearFechaCorta } from '../../lib/meses';

interface Props {
  tarea: Tarea;
  alAbrir: () => void;
}

/** Post-it de color por prioridad (rojo, amarillo, verde pastel); la prioridad se lee con lector de pantalla */
const FONDO_POSTIT: Record<Tarea['prioridad'], string> = {
  ALTA: 'bg-postit-alta',
  MEDIA: 'bg-postit-media',
  BAJA: 'bg-postit-baja',
};

/** Anotación arrastrable entre columnas (cambia su estado); las realizadas se tachan  */
export function TarjetaTarea({ tarea, alAbrir }: Props) {
  const hecha = tarea.estado === 'REALIZADA';
  return (
    <li
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', tarea.id)}
      className={`flex gap-2 cursor-grab rounded-[3px] p-3 text-tinta shadow-nota ${FONDO_POSTIT[tarea.prioridad]}`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <button
          type="button"
          onClick={alAbrir}
          className={`text-left font-bold ${hecha ? 'text-lapiz line-through' : 'text-tinta'}`}
        >
          {tarea.titulo}
          <span className="sr-only">
            {' '}
            (prioridad {NOMBRE_PRIORIDAD[tarea.prioridad].toLowerCase()})
          </span>
        </button>
        {tarea.descripcion && (
          <p className={`text-sm text-lapiz ${hecha ? 'line-through' : ''}`}>{tarea.descripcion}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-mano text-lg text-lapiz">
            {formatearFechaCorta(tarea.creadoEn.slice(0, 10))}
          </span>
        </div>
      </div>
    </li>
  );
}
