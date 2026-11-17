import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Alumno,
  CrearPersonaInput,
  EditarPersonaInput,
  Paginado,
  Persona,
} from '@autonota/shared';
import { api } from '../../lib/api';

/** Clientes del turnero y alumnos del calendario de clases comparten rutas y reglas */
export type Recurso = 'clientes' | 'alumnos';

export interface FiltroPersonas {
  q?: string;
  activo?: boolean;
  mesPago?: string;
  sinPago?: boolean;
  pageSize?: number;
}

const clave = (eid: string, recurso: Recurso) => ['emprendimientos', eid, recurso] as const;

export function usePersonas(eid: string, recurso: Recurso, f: FiltroPersonas = {}) {
  return useQuery({
    queryKey: [...clave(eid, recurso), f],
    queryFn: () => {
      const q = new URLSearchParams({
        pageSize: String(f.pageSize ?? 100),
        activo: String(f.activo ?? true),
      });
      if (f.q) q.set('q', f.q);
      if (f.mesPago) q.set('mesPago', f.mesPago);
      if (f.sinPago) q.set('sinPago', 'true');
      return api<Paginado<Alumno>>(`/emprendimientos/${eid}/${recurso}?${q.toString()}`);
    },
    placeholderData: keepPreviousData,
  });
}

function useInvalidar(eid: string) {
  const qc = useQueryClient();
  // También cambian los nombres que muestran la agenda y el calendario
  return () => void qc.invalidateQueries({ queryKey: ['emprendimientos', eid] });
}

export function useGuardarPersona(eid: string, recurso: Recurso) {
  const invalidar = useInvalidar(eid);
  return useMutation({
    mutationFn: ({ id, datos }: { id?: string; datos: CrearPersonaInput | EditarPersonaInput }) =>
      id
        ? api<Persona>(`/emprendimientos/${eid}/${recurso}/${id}`, { method: 'PATCH', body: datos })
        : api<Persona>(`/emprendimientos/${eid}/${recurso}`, { method: 'POST', body: datos }),
    onSuccess: invalidar,
  });
}

export function useBajaPersona(eid: string, recurso: Recurso) {
  const invalidar = useInvalidar(eid);
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/emprendimientos/${eid}/${recurso}/${id}`, { method: 'DELETE' }),
    onSuccess: invalidar,
  });
}

export function useAnonimizarPersona(eid: string, recurso: Recurso) {
  const invalidar = useInvalidar(eid);
  return useMutation({
    mutationFn: (id: string) =>
      api<Persona>(`/emprendimientos/${eid}/${recurso}/${id}/anonimizar`, { method: 'POST' }),
    onSuccess: invalidar,
  });
}
