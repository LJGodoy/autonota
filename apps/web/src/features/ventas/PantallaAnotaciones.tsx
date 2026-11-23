import { useEffect, useRef, useState } from 'react';
import {
  ESTADOS_TAREA,
  NOMBRE_ESTADO_TAREA,
  NOMBRE_PRIORIDAD,
  PRIORIDADES_TAREA,
  type EstadoTarea,
  type PrioridadTarea,
} from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { Cargando, MensajeError } from '../../components/Estados';
import { ErrorApi } from '../../lib/api';
import { useEmprendimientoActual } from '../emprendimientos/LayoutEmprendimiento';
import { useCambiarEstadoTarea, useRealizadas, useTareas } from './api';
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
    realizadasDias: 7,
  });
  const [verTodas, setVerTodas] = useState(false);
  const [sobre, setSobre] = useState<EstadoTarea | null>(null);
  const todas = useRealizadas(emp.id, prioridad || undefined, verTodas);
  const centinela = useRef<HTMLLIElement>(null);
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
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = todas;
  useEffect(() => {
    const el = centinela.current;
    if (!el || !hasNextPage || isFetchingNextPage) return;
    const obs = new IntersectionObserver((e) => e[0]?.isIntersecting && void fetchNextPage());
    obs.observe(el);
    return () => obs.disconnect();
  });
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
      {/* El tablero se ve aunque esté vacío: cada columna muestra (0) y "Ver todas" sigue a mano */}
      {consulta.isSuccess && (
        <div className={`grid gap-4 ${columnas.length > 1 ? 'md:grid-cols-3' : ''}`}>
          {columnas.map((col) => {
            const conTodas = col === 'REALIZADA' && verTodas;
            const delEstado = conTodas
              ? (todas.data?.pages.flatMap((p) => p.data) ?? [])
              : tareas.filter((t) => t.estado === col);
            return (
              <section
                key={col}
                aria-labelledby={`col-${col}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setSobre(col);
                }}
                onDragLeave={() => setSobre(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setSobre(null);
                  const id = e.dataTransfer.getData('text/plain');
                  const t = [...tareas, ...(todas.data?.pages.flatMap((p) => p.data) ?? [])].find(
                    (x) => x.id === id,
                  );
                  if (t && t.estado !== col) alCambiarEstado(id, col);
                }}
                className={`flex flex-col gap-2 rounded-trazo-2 border p-3 ${
                  sobre === col ? 'border-cafe bg-arena' : 'border-linea bg-arena/40'
                }`}
              >
                <h2 id={`col-${col}`} className="font-mano text-3xl font-bold text-cafe">
                  {NOMBRE_ESTADO_TAREA[col]}{' '}
                  <span className="text-xl text-lapiz">({delEstado.length})</span>
                </h2>
                <ul className="flex flex-col gap-2">
                  {delEstado.map((t) => (
                    <TarjetaTarea key={t.id} tarea={t} alAbrir={() => setAbierta(t.id)} />
                  ))}
                  {conTodas && <li ref={centinela} aria-hidden />}
                </ul>
                {col === 'REALIZADA' && (
                  <div className="flex flex-wrap gap-2">
                    <Boton variante="secundario" onClick={() => setVerTodas(!verTodas)}>
                      {verTodas ? 'Ver solo la última semana' : 'Ver todas'}
                    </Boton>
                    {conTodas && todas.hasNextPage && (
                      <Boton
                        variante="secundario"
                        disabled={todas.isFetchingNextPage}
                        onClick={() => void todas.fetchNextPage()}
                      >
                        Cargar más
                      </Boton>
                    )}
                  </div>
                )}
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
