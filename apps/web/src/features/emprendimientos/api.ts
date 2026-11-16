import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CrearEmprendimientoInput, Emprendimiento } from '@autonota/shared';
import { api } from '../../lib/api';

const CLAVE = ['emprendimientos'] as const;

export function useEmprendimientos() {
  return useQuery({ queryKey: CLAVE, queryFn: () => api<Emprendimiento[]>('/emprendimientos') });
}

export function useEmprendimiento(eid: string) {
  return useQuery({
    queryKey: [...CLAVE, eid],
    queryFn: () => api<Emprendimiento>(`/emprendimientos/${eid}`),
  });
}

export function useCrearEmprendimiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datos: CrearEmprendimientoInput) =>
      api<Emprendimiento>('/emprendimientos', { method: 'POST', body: datos }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLAVE }),
  });
}

export function useRenombrarEmprendimiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, nombre }: { id: string; nombre: string }) =>
      api<Emprendimiento>(`/emprendimientos/${id}`, { method: 'PATCH', body: { nombre } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLAVE }),
  });
}

export function useEliminarEmprendimiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, confirmarNombre }: { id: string; confirmarNombre: string }) =>
      api<void>(`/emprendimientos/${id}`, { method: 'DELETE', body: { confirmarNombre } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLAVE }),
  });
}
