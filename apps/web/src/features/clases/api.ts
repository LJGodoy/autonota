import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Clase,
  ClaseDeAlumno,
  CrearClaseInput,
  EditarClaseInput,
  Movimiento,
  PagoClasesInput,
  Paginado,
  Persona,
  ResultadoCopiaClases,
} from '@autonota/shared';
import { api } from '../../lib/api';

const base = (eid: string) => `/emprendimientos/${eid}`;
const rango = (desde: string, hasta: string) =>
  `desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`;

export function useClases(eid: string, desde: string, hasta: string) {
  return useQuery({
    queryKey: ['emprendimientos', eid, 'clases', desde, hasta],
    queryFn: () => api<Clase[]>(`${base(eid)}/clases?${rango(desde, hasta)}`),
    placeholderData: keepPreviousData,
    enabled: Boolean(desde && hasta),
  });
}

export function useAlumno(eid: string, alumnoId: string) {
  return useQuery({
    queryKey: ['emprendimientos', eid, 'alumnos', alumnoId],
    queryFn: () => api<Persona>(`${base(eid)}/alumnos/${alumnoId}`),
  });
}

/** Clases del alumno que empiezan en el mes (AAAA-MM), o todas las impagas */
export function useClasesAlumno(
  eid: string,
  alumnoId: string,
  filtro: { mes: string } | 'impagas',
) {
  const query = filtro === 'impagas' ? 'impagas=true' : `mes=${filtro.mes}`;
  return useQuery({
    queryKey: ['emprendimientos', eid, 'clases', 'alumno', alumnoId, query],
    queryFn: () => api<ClaseDeAlumno[]>(`${base(eid)}/alumnos/${alumnoId}/clases?${query}`),
    placeholderData: keepPreviousData,
    enabled: Boolean(alumnoId),
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

/** Cancela la clase sin borrarla */
export function useCancelarClase(eid: string) {
  const invalidar = useInvalidar(eid);
  return useMutation({
    // Cuerpo vacío: la API valida un objeto (el motivo es opcional) y rechaza el POST sin cuerpo
    mutationFn: (id: string) =>
      api<Clase>(`${base(eid)}/clases/${id}/cancelar`, { method: 'POST', body: {} }),
    onSuccess: invalidar,
  });
}

/** Revierte la cancelación de la clase */
export function useReactivarClase(eid: string) {
  const invalidar = useInvalidar(eid);
  return useMutation({
    mutationFn: (id: string) =>
      api<Clase>(`${base(eid)}/clases/${id}/reactivar`, { method: 'POST' }),
    onSuccess: invalidar,
  });
}

/** Borra la clase; los ingresos quedan */
export function useEliminarClase(eid: string) {
  const invalidar = useInvalidar(eid);
  return useMutation({
    mutationFn: (id: string) => api<void>(`${base(eid)}/clases/${id}`, { method: 'DELETE' }),
    onSuccess: invalidar,
  });
}

export function useBorrarClasesDelRango(eid: string) {
  const invalidar = useInvalidar(eid);
  return useMutation({
    mutationFn: ({ desde, hasta }: { desde: string; hasta: string }) =>
      api<{ borradas: number }>(`${base(eid)}/clases?${rango(desde, hasta)}`, { method: 'DELETE' }),
    onSuccess: invalidar,
  });
}

/** Pago por clase, con Idempotency-Key generada al abrir el formulario */
export function useRegistrarPago(eid: string) {
  const invalidar = useInvalidar(eid);
  return useMutation({
    mutationFn: ({
      alumnoId,
      datos,
      clave,
    }: {
      alumnoId: string;
      datos: PagoClasesInput;
      clave: string;
    }) =>
      api<Movimiento>(`${base(eid)}/alumnos/${alumnoId}/pagos`, {
        method: 'POST',
        body: datos,
        idempotencyKey: clave,
      }),
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
