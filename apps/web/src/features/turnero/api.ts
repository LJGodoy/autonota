import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Bloqueo,
  CobroTurnoInput,
  CrearBloqueoInput,
  CrearTurnoInput,
  EditarTurnoInput,
  Franja,
  FranjaGuardada,
  Movimiento,
  ResultadoCopiaTurnos,
  Turno,
} from '@autonota/shared';
import { api } from '../../lib/api';

const base = (eid: string) => `/emprendimientos/${eid}`;
const clave = (eid: string, recurso: string) => ['emprendimientos', eid, recurso] as const;

export function useFranjas(eid: string) {
  return useQuery({
    queryKey: clave(eid, 'horarios'),
    queryFn: () => api<FranjaGuardada[]>(`${base(eid)}/horarios-atencion`),
  });
}

export function useBloqueos(eid: string, desde: string, hasta: string) {
  return useQuery({
    queryKey: [...clave(eid, 'bloqueos'), desde, hasta],
    queryFn: () =>
      api<Bloqueo[]>(
        `${base(eid)}/bloqueos?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`,
      ),
    placeholderData: keepPreviousData,
    enabled: Boolean(desde && hasta),
  });
}

export function useTurnos(eid: string, desde: string, hasta: string) {
  return useQuery({
    queryKey: [...clave(eid, 'turnos'), desde, hasta],
    queryFn: () =>
      api<Turno[]>(
        `${base(eid)}/turnos?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`,
      ),
    placeholderData: keepPreviousData,
    enabled: Boolean(desde && hasta),
  });
}

/** Cualquier cambio en el turnero actualiza agenda, movimientos y estadísticas */
function useInvalidar(eid: string) {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: ['emprendimientos', eid] });
}

export function useGuardarFranjas(eid: string) {
  const invalidar = useInvalidar(eid);
  return useMutation({
    mutationFn: ({ franjas, confirmar }: { franjas: Franja[]; confirmar: boolean }) =>
      api<FranjaGuardada[]>(`${base(eid)}/horarios-atencion${confirmar ? '?confirmar=true' : ''}`, {
        method: 'PUT',
        body: franjas,
      }),
    onSuccess: invalidar,
  });
}

export function useCrearBloqueo(eid: string) {
  const invalidar = useInvalidar(eid);
  return useMutation({
    mutationFn: ({ datos, confirmar }: { datos: CrearBloqueoInput; confirmar: boolean }) =>
      api<Bloqueo>(`${base(eid)}/bloqueos${confirmar ? '?confirmar=true' : ''}`, {
        method: 'POST',
        body: datos,
      }),
    onSuccess: invalidar,
  });
}

export function useEliminarBloqueo(eid: string) {
  const invalidar = useInvalidar(eid);
  return useMutation({
    mutationFn: (id: string) => api<void>(`${base(eid)}/bloqueos/${id}`, { method: 'DELETE' }),
    onSuccess: invalidar,
  });
}

export function useGuardarTurno(eid: string) {
  const invalidar = useInvalidar(eid);
  return useMutation({
    mutationFn: ({ id, datos }: { id?: string; datos: CrearTurnoInput | EditarTurnoInput }) =>
      id
        ? api<Turno>(`${base(eid)}/turnos/${id}`, { method: 'PATCH', body: datos })
        : api<Turno>(`${base(eid)}/turnos`, { method: 'POST', body: datos }),
    onSuccess: invalidar,
  });
}

export function useAccionTurno(eid: string) {
  const invalidar = useInvalidar(eid);
  return useMutation({
    mutationFn: ({ id, accion }: { id: string; accion: 'cancelar' | 'ausente' }) =>
      api<Turno>(`${base(eid)}/turnos/${id}/${accion}`, { method: 'POST' }),
    onSuccess: invalidar,
  });
}

/** CU-08: realizar con cobro opcional, o registrar un cobro suelto del turno; con Idempotency-Key */
export function useCobrarTurno(eid: string) {
  const invalidar = useInvalidar(eid);
  return useMutation({
    mutationFn: ({
      id,
      cobro,
      realizar,
      clave,
    }: {
      id: string;
      cobro?: CobroTurnoInput;
      realizar: boolean;
      clave: string;
    }): Promise<Turno | Movimiento> =>
      realizar
        ? api<Turno>(`${base(eid)}/turnos/${id}/realizar`, {
            method: 'POST',
            body: cobro ? { cobro } : {},
            idempotencyKey: clave,
          })
        : api<Movimiento>(`${base(eid)}/turnos/${id}/cobros`, {
            method: 'POST',
            body: cobro,
            idempotencyKey: clave,
          }),
    onSuccess: invalidar,
  });
}

export function useCopiarSemanaTurnos(eid: string) {
  const invalidar = useInvalidar(eid);
  return useMutation({
    mutationFn: (datos: { semanaOrigen: string; forzar: boolean }) =>
      api<ResultadoCopiaTurnos>(`${base(eid)}/turnos/copiar-semana`, {
        method: 'POST',
        body: datos,
      }),
    onSuccess: invalidar,
  });
}
