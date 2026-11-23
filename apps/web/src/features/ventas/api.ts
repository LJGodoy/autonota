import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  CrearTareaInput,
  EditarTareaInput,
  EstadoTarea,
  Paginado,
  PrioridadTarea,
  Tarea,
  TareaDetalle,
} from '@autonota/shared';
import { api } from '../../lib/api';

export interface FiltroTareas {
  estado?: EstadoTarea;
  prioridad?: PrioridadTarea;
  orden: 'creadoEn' | 'prioridad';
  /** Solo las realizadas de los últimos N días */
  realizadasDias?: number;
}

const claveTareas = (eid: string) => ['emprendimientos', eid, 'tareas'] as const;

export function useTareas(eid: string, f: FiltroTareas) {
  return useQuery({
    queryKey: [...claveTareas(eid), 'lista', f],
    queryFn: () => {
      const q = new URLSearchParams({ orden: f.orden, pageSize: '100' });
      if (f.realizadasDias) q.set('realizadasDias', String(f.realizadasDias));
      if (f.estado) q.set('estado', f.estado);
      if (f.prioridad) q.set('prioridad', f.prioridad);
      return api<Paginado<Tarea>>(`/emprendimientos/${eid}/tareas?${q.toString()}`);
    },
    placeholderData: keepPreviousData,
  });
}

/** Realizadas por fecha de finalización, de a 10; se piden más con fetchNextPage */
export function useRealizadas(eid: string, prioridad: PrioridadTarea | undefined, activa: boolean) {
  return useInfiniteQuery({
    queryKey: [...claveTareas(eid), 'realizadas', prioridad],
    enabled: activa,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const q = new URLSearchParams({ page: String(pageParam), pageSize: '10' });
      if (prioridad) q.set('prioridad', prioridad);
      return api<Paginado<Tarea>>(`/emprendimientos/${eid}/tareas/realizadas?${q.toString()}`);
    },
    getNextPageParam: ({ meta }) =>
      meta.page * meta.pageSize < meta.total ? meta.page + 1 : undefined,
  });
}

export function useTarea(eid: string, id: string) {
  return useQuery({
    queryKey: [...claveTareas(eid), 'detalle', id],
    queryFn: () => api<TareaDetalle>(`/emprendimientos/${eid}/tareas/${id}`),
  });
}

function useInvalidar(eid: string) {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: ['emprendimientos', eid] });
}

export function useGuardarTarea(eid: string) {
  const invalidar = useInvalidar(eid);
  return useMutation({
    mutationFn: ({ id, datos }: { id?: string; datos: CrearTareaInput | EditarTareaInput }) =>
      id
        ? api<TareaDetalle>(`/emprendimientos/${eid}/tareas/${id}`, {
            method: 'PATCH',
            body: datos,
          })
        : api<TareaDetalle>(`/emprendimientos/${eid}/tareas`, { method: 'POST', body: datos }),
    onSuccess: invalidar,
  });
}

/**
 * CU-11: la vista se actualiza de inmediato (actualización optimista); si la API responde con
 * error, la tarea vuelve a su estado anterior.
 */
export function useCambiarEstadoTarea(eid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: EstadoTarea }) =>
      api<TareaDetalle>(`/emprendimientos/${eid}/tareas/${id}/estado`, {
        method: 'PATCH',
        body: { estado },
      }),
    onMutate: async ({ id, estado }) => {
      await qc.cancelQueries({ queryKey: claveTareas(eid) });
      const anteriores = qc.getQueriesData<Paginado<Tarea>>({
        queryKey: [...claveTareas(eid), 'lista'],
      });
      for (const [clave, datos] of anteriores) {
        if (datos)
          qc.setQueryData(clave, {
            ...datos,
            data: datos.data.map((t) => (t.id === id ? { ...t, estado } : t)),
          });
      }
      return { anteriores };
    },
    onError: (_e, _v, contexto) => {
      for (const [clave, datos] of contexto?.anteriores ?? []) qc.setQueryData(clave, datos);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: claveTareas(eid) }),
  });
}

export function useEliminarTarea(eid: string) {
  const invalidar = useInvalidar(eid);
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/emprendimientos/${eid}/tareas/${id}`, { method: 'DELETE' }),
    onSuccess: invalidar,
  });
}
