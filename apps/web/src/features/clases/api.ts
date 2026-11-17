import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Clase,
  CrearClaseInput,
  EditarClaseInput,
  Movimiento,
  Paginado,
  ResultadoCopiaClases,
} from '@autonota/shared';
import { api } from '../../lib/api';

const base = (eid: string) => `/emprendimientos/${eid}`;

export function useClases(eid: string, desde: string, hasta: string) {
  return useQuery({
    queryKey: ['emprendimientos', eid, 'clases', desde, hasta],
    queryFn: () =>
      api<Clase[]>(
        `${base(eid)}/clases?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`,
      ),
    placeholderData: keepPreviousData,
    enabled: Boolean(desde && hasta),
  });
}

/** RF-35 */
export function usePagosAlumno(eid: string, alumnoId: string) {
  return useQuery({
    queryKey: ['emprendimientos', eid, 'movimientos', 'alumno', alumnoId],
    queryFn: () => api<Paginado<Movimiento>>(`${base(eid)}/alumnos/${alumnoId}/pagos?pageSize=100`),
  });
}

function useInvalidar(eid: string) {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: ['emprendimientos', eid] });
}

export function useGuardarClase(eid: string) {
  const invalidar = useInvalidar(eid);
  return useMutation({
    mutationFn: ({ id, datos }: { id?: string; datos: CrearClaseInput | EditarClaseInput }) =>
      id
        ? api<Clase>(`${base(eid)}/clases/${id}`, { method: 'PATCH', body: datos })
        : api<Clase>(`${base(eid)}/clases`, { method: 'POST', body: datos }),
    onSuccess: invalidar,
  });
}

export function useCancelarClase(eid: string) {
  const invalidar = useInvalidar(eid);
  return useMutation({
    mutationFn: (id: string) =>
      api<Clase>(`${base(eid)}/clases/${id}/cancelar`, { method: 'POST' }),
    onSuccess: invalidar,
  });
}

export function useCopiarSemanaClases(eid: string) {
  const invalidar = useInvalidar(eid);
  return useMutation({
    mutationFn: (datos: { semanaOrigen: string; forzar: boolean }) =>
      api<ResultadoCopiaClases>(`${base(eid)}/clases/copiar-semana`, {
        method: 'POST',
        body: datos,
      }),
    onSuccess: invalidar,
  });
}
