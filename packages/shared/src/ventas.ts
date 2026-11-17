// Esquemas de ventas y anotaciones (Parte 4, sección 8)
import { z } from 'zod';
import { ESTADOS_TAREA, PRIORIDADES_TAREA, type EstadoTarea, type PrioridadTarea } from './enums';
import { esquemaPaginacion } from './comunes';
import type { Movimiento } from './movimientos';

const esquemaPrioridad = z.enum(PRIORIDADES_TAREA, {
  errorMap: () => ({ message: 'Elegí una prioridad' }),
});
const esquemaEstado = z.enum(ESTADOS_TAREA, { errorMap: () => ({ message: 'Elegí un estado' }) });

export const esquemaCrearTarea = z
  .object({
    titulo: z
      .string({ required_error: 'Ingresá un título' })
      .trim()
      .min(1, 'Ingresá un título')
      .max(150, 'Usá como máximo 150 caracteres'),
    descripcion: z.string().trim().max(2000, 'Usá como máximo 2000 caracteres').nullish(),
    prioridad: esquemaPrioridad.optional(),
  })
  .strict();
export type CrearTareaInput = z.infer<typeof esquemaCrearTarea>;

export const esquemaEditarTarea = esquemaCrearTarea
  .partial()
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'No hay cambios para guardar' });
export type EditarTareaInput = z.infer<typeof esquemaEditarTarea>;

export const esquemaEstadoTarea = z.object({ estado: esquemaEstado }).strict();
export type EstadoTareaInput = z.infer<typeof esquemaEstadoTarea>;

/** RF-54: filtros por estado y prioridad; orden por fecha de carga (más nuevas primero) o prioridad */
export const esquemaFiltroTareas = z
  .object({
    estado: esquemaEstado.optional(),
    prioridad: esquemaPrioridad.optional(),
    orden: z.enum(['creadoEn', 'prioridad']).default('creadoEn'),
    ...esquemaPaginacion,
  })
  .strict();
export type FiltroTareas = z.infer<typeof esquemaFiltroTareas>;

export interface Tarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  estado: EstadoTarea;
  prioridad: PrioridadTarea;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CambioEstadoTarea {
  estadoAnterior: EstadoTarea | null;
  estadoNuevo: EstadoTarea;
  cambiadoEn: string;
}

export interface TareaDetalle extends Tarea {
  historial: CambioEstadoTarea[];
  ventas: Movimiento[];
  totalVendidoCentavos: number;
}

export const NOMBRE_ESTADO_TAREA: Record<EstadoTarea, string> = {
  PENDIENTE: 'Pendiente',
  EN_CURSO: 'En curso',
  REALIZADA: 'Realizada',
};

export const NOMBRE_PRIORIDAD: Record<PrioridadTarea, string> = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
};
