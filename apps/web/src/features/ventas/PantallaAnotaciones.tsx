import { useState } from 'react';
import {
  ESTADOS_TAREA,
  NOMBRE_ESTADO_TAREA,
  NOMBRE_PRIORIDAD,
  PRIORIDADES_TAREA,
  type EstadoTarea,
  type PrioridadTarea,
} from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { Cargando, MensajeError, Vacio } from '../../components/Estados';
import { ErrorApi } from '../../lib/api';
import { useEmprendimientoActual } from '../emprendimientos/LayoutEmprendimiento';
import { useCambiarEstadoTarea, useTareas } from './api';
import { DetalleTarea } from './DetalleTarea';
import { FormTarea } from './FormTarea';
import { TarjetaTarea } from './TarjetaTarea';

const selector = 'min-h-10 border-0 border-b-2 border-tinta bg-transparent px-1';

/** RF-50 a RF-54: tablero de anotaciones por estado, con filtros por estado y prioridad */
export function PantallaAnotaciones() {
  const emp = useEmprendimientoActual();
  const [estado, setEstado] = useState<EstadoTarea | ''>('');
  const [prioridad, setPrioridad] = useState<PrioridadTarea | ''>('');
  const [orden, setOrden] = useState<'creadoEn' | 'prioridad'>('prioridad');
  const [nueva, setNueva] = useState(false);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');
  const consulta = useTareas(emp.id, {
    estado: estado || undefined,
    prioridad: prioridad || undefined,
    orden,
  });
  const cambiar = useCambiarEstadoTarea(emp.id);

  const alCambiarEstado = (id: string, nuevoEstado: EstadoTarea) => {
    setAviso('');
    cambiar.mutate(
      { id, estado: nuevoEstado },
      {
        onError: (e) =>
          setAviso(e instanceof ErrorApi ? e.message : 'No se pudo cambiar el estado.'),
      },
    );
  };
  const columnas = estado ? [estado] : ESTADOS_TAREA;
  const tareas = consulta.data?.data ?? [];

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Boton onClick={() => setNueva(true)}>+ Nueva anotación</Boton>
        <label className="flex flex-col text-sm font-bold text-lapiz">
          Estado
          <select
            className={selector}
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoTarea | '')}
          >
            <option value="">Todos</option>
            {ESTADOS_TAREA.map((e) => (
              <option key={e} value={e}>
                {NOMBRE_ESTADO_TAREA[e]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm font-bold text-lapiz">
          Prioridad
          <select
            className={selector}
            value={prioridad}
            onChange={(e) => setPrioridad(e.target.value as PrioridadTarea | '')}
          >
            <option value="">Todas</option>
            {PRIORIDADES_TAREA.map((p) => (
              <option key={p} value={p}>
                {NOMBRE_PRIORIDAD[p]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm font-bold text-lapiz">
          Ordenar por
          <select
            className={selector}
            value={orden}
            onChange={(e) => setOrden(e.target.value as 'creadoEn' | 'prioridad')}
          >
            <option value="prioridad">Prioridad</option>
            <option value="creadoEn">Más nuevas primero</option>
          </select>
        </label>
      </div>
      {aviso && (
        <p role="alert" className="font-bold text-rojo">
          ✗ {aviso}
        </p>
      )}
      {consulta.isPending && <Cargando />}
      {consulta.isError && (
        <MensajeError error={consulta.error} reintentar={() => void consulta.refetch()} />
      )}
      {consulta.isSuccess && tareas.length === 0 && (
        <Vacio>No hay anotaciones con esos filtros.</Vacio>
      )}
      {consulta.isSuccess && tareas.length > 0 && (
        <div className={`grid gap-4 ${columnas.length > 1 ? 'md:grid-cols-3' : ''}`}>
          {columnas.map((col) => {
            const delEstado = tareas.filter((t) => t.estado === col);
            return (
              <section
                key={col}
                aria-labelledby={`col-${col}`}
                className="flex flex-col gap-2 rounded-trazo-2 border border-linea bg-celeste/40 p-3"
              >
                <h2 id={`col-${col}`} className="font-mano text-3xl font-bold text-birome">
                  {NOMBRE_ESTADO_TAREA[col]}{' '}
                  <span className="text-xl text-lapiz">({delEstado.length})</span>
                </h2>
                <ul className="flex flex-col gap-2">
                  {delEstado.map((t) => (
                    <TarjetaTarea
                      key={t.id}
                      tarea={t}
                      alAbrir={() => setAbierta(t.id)}
                      alCambiarEstado={(e) => alCambiarEstado(t.id, e)}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      {nueva && <FormTarea eid={emp.id} alCerrar={() => setNueva(false)} />}
      {abierta && <DetalleTarea eid={emp.id} id={abierta} alCerrar={() => setAbierta(null)} />}
    </section>
  );
}
