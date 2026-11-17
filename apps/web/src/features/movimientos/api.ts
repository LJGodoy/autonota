import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CrearMovimientoInput,
  EditarMovimientoInput,
  Estadisticas,
  Movimiento,
  Paginado,
  TipoMovimiento,
} from '@autonota/shared';
import { api } from '../../lib/api';

export interface FiltroLista {
  mes?: string;
  tipo?: TipoMovimiento;
  pageSize?: number;
}

const claveMovimientos = (eid: string) => ['emprendimientos', eid, 'movimientos'] as const;
const claveEstadisticas = (eid: string) => ['emprendimientos', eid, 'estadisticas'] as const;

function aQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v));
  const texto = q.toString();
  return texto ? `?${texto}` : '';
}

/** RF-73: movimientos por mes de imputación */
export function useMovimientos(eid: string, filtro: FiltroLista, activo = true) {
  return useQuery({
    enabled: activo,
    queryKey: [...claveMovimientos(eid), filtro],
    queryFn: () =>
      api<Paginado<Movimiento>>(
        `/emprendimientos/${eid}/movimientos${aQuery({ mes: filtro.mes, tipo: filtro.tipo, pageSize: filtro.pageSize ?? 100 })}`,
      ),
    placeholderData: keepPreviousData,
  });
}

/** CU-12 */
export function useEstadisticas(eid: string, desde: string, hasta: string) {
  return useQuery({
    queryKey: [...claveEstadisticas(eid), desde, hasta],
    queryFn: () =>
      api<Estadisticas>(`/emprendimientos/${eid}/estadisticas${aQuery({ desde, hasta })}`),
    placeholderData: keepPreviousData,
  });
}

function useInvalidar(eid: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: claveMovimientos(eid) });
    void qc.invalidateQueries({ queryKey: claveEstadisticas(eid) });
  };
}

/** RF-07: el Idempotency-Key se genera al abrir el formulario, así un doble clic no duplica */
export function useCrearMovimiento(eid: string) {
  const invalidar = useInvalidar(eid);
  return useMutation({
    mutationFn: ({ datos, clave }: { datos: CrearMovimientoInput; clave: string }) =>
      api<Movimiento>(`/emprendimientos/${eid}/movimientos`, {
        method: 'POST',
        body: datos,
        idempotencyKey: clave,
      }),
    onSuccess: invalidar,
  });
}

export function useEditarMovimiento(eid: string) {
  const invalidar = useInvalidar(eid);
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: EditarMovimientoInput }) =>
      api<Movimiento>(`/emprendimientos/${eid}/movimientos/${id}`, {
        method: 'PATCH',
        body: datos,
      }),
    onSuccess: invalidar,
  });
}

export function useEliminarMovimiento(eid: string) {
  const invalidar = useInvalidar(eid);
  return useMutation({
    mutationFn: (id: string) =>
      api<void>(`/emprendimientos/${eid}/movimientos/${id}`, { method: 'DELETE' }),
    onSuccess: invalidar,
  });
}
