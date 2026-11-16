// Tipos enumerados del dominio (Parte 3, sección 6)
import { z } from 'zod';

export const TIPOS_EMPRENDIMIENTO = ['TURNERO', 'CLASES', 'VENTAS'] as const;
export const esquemaTipoEmprendimiento = z.enum(TIPOS_EMPRENDIMIENTO, {
  errorMap: () => ({ message: 'Elegí un tipo de negocio' }),
});
export type TipoEmprendimiento = z.infer<typeof esquemaTipoEmprendimiento>;

export const ESTADOS_TURNO = ['PROGRAMADO', 'REALIZADO', 'AUSENTE', 'CANCELADO'] as const;
export type EstadoTurno = (typeof ESTADOS_TURNO)[number];

export const ESTADOS_TAREA = ['PENDIENTE', 'EN_CURSO', 'REALIZADA'] as const;
export type EstadoTarea = (typeof ESTADOS_TAREA)[number];

export const PRIORIDADES_TAREA = ['BAJA', 'MEDIA', 'ALTA'] as const;
export type PrioridadTarea = (typeof PRIORIDADES_TAREA)[number];

export const MEDIOS_PAGO = [
  'EFECTIVO',
  'TRANSFERENCIA',
  'TARJETA',
  'BILLETERA_VIRTUAL',
  'OTRO',
] as const;
export type MedioPago = (typeof MEDIOS_PAGO)[number];

/** RF-03: máximo de emprendimientos por usuario */
export const MAX_EMPRENDIMIENTOS = 3;

/** Nombre visible de cada tipo de negocio (Parte 3, sección 2) */
export const NOMBRE_TIPO_EMPRENDIMIENTO: Record<TipoEmprendimiento, string> = {
  TURNERO: 'Turnero',
  CLASES: 'Calendario de clases',
  VENTAS: 'Ventas',
};
