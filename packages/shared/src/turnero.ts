// Esquemas del turnero (Parte 4, sección 6)
import { z } from 'zod';
import { ESTADOS_TURNO, type EstadoTurno } from './enums';
import { esquemaDuracion, esquemaFechaHora, esquemaRango } from './comunes';
import {
  esquemaFecha,
  esquemaMedioPago,
  esquemaMontoCentavos,
  type Movimiento,
} from './movimientos';

const esquemaHora = z
  .string({ required_error: 'Ingresá la hora' })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Usá el formato HH:MM');

/** Minutos desde la medianoche de una hora HH:MM */
export function aMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export const esquemaFranja = z
  .object({
    diaSemana: z
      .number()
      .int()
      .min(1, 'Día de 1 (lunes) a 7 (domingo)')
      .max(7, 'Día de 1 (lunes) a 7 (domingo)'),
    horaInicio: esquemaHora,
    horaFin: esquemaHora,
  })
  .strict()
  .refine((f) => aMinutos(f.horaFin) > aMinutos(f.horaInicio), {
    path: ['horaFin'],
    message: 'La hora de fin debe ser posterior a la de inicio',
  });
export type Franja = z.infer<typeof esquemaFranja>;

/** RF-10: las franjas de un mismo día no se superponen, pero pueden ser contiguas */
export const esquemaHorarios = z
  .array(esquemaFranja)
  .max(70, 'Demasiadas franjas')
  .superRefine((franjas, ctx) => {
    for (let dia = 1; dia <= 7; dia++) {
      const delDia = franjas
        .map((f, i) => ({ ...f, i }))
        .filter((f) => f.diaSemana === dia)
        .sort((a, b) => aMinutos(a.horaInicio) - aMinutos(b.horaInicio));
      for (let k = 1; k < delDia.length; k++) {
        const previa = delDia[k - 1]!;
        const actual = delDia[k]!;
        if (aMinutos(actual.horaInicio) < aMinutos(previa.horaFin)) {
          ctx.addIssue({
            code: 'custom',
            path: [actual.i, 'horaInicio'],
            message: 'Se superpone con otra franja del mismo día',
          });
        }
      }
    }
  });

export const esquemaConfirmar = z
  .object({
    confirmar: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => v === 'true'),
  })
  .strict();

export const esquemaCrearBloqueo = z
  .object({
    inicio: esquemaFechaHora,
    fin: esquemaFechaHora,
    motivo: z.string().trim().max(200, 'Usá como máximo 200 caracteres').nullish(),
  })
  .strict()
  .refine((b) => Date.parse(b.fin) > Date.parse(b.inicio), {
    path: ['fin'],
    message: 'El fin debe ser posterior al inicio',
  });
export type CrearBloqueoInput = z.infer<typeof esquemaCrearBloqueo>;

export const esquemaRangoBloqueos = esquemaRango(366);

export const esquemaCrearTurno = z
  .object({
    clienteId: z.string({ required_error: 'Elegí un cliente' }).uuid('Elegí un cliente'),
    inicio: esquemaFechaHora,
    duracionMinutos: esquemaDuracion,
    descripcion: z.string().trim().max(1000, 'Usá como máximo 1000 caracteres').nullish(),
  })
  .strict();
export type CrearTurnoInput = z.infer<typeof esquemaCrearTurno>;

export const esquemaEditarTurno = esquemaCrearTurno
  .partial()
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'No hay cambios para guardar' });
export type EditarTurnoInput = z.infer<typeof esquemaEditarTurno>;

/** RF-17: rango máximo de 31 días */
export const esquemaFiltroTurnos = esquemaRango(31).and(
  z.object({ estado: z.enum(ESTADOS_TURNO).optional() }),
);
export type FiltroTurnos = z.infer<typeof esquemaFiltroTurnos>;

/** RF-16: un cobro del turno (seña, pago parcial o total); la fecha por defecto es hoy */
export const esquemaCobroTurno = z
  .object({
    montoCentavos: esquemaMontoCentavos,
    fecha: esquemaFecha.optional(),
    medioPago: esquemaMedioPago.nullish(),
    descripcion: z.string().trim().max(500).nullish(),
  })
  .strict();
export type CobroTurnoInput = z.infer<typeof esquemaCobroTurno>;

export const esquemaRealizarTurno = z.object({ cobro: esquemaCobroTurno.optional() }).strict();
export type RealizarTurnoInput = z.infer<typeof esquemaRealizarTurno>;

export interface FranjaGuardada extends Franja {
  id: string;
}

export interface Bloqueo {
  id: string;
  inicio: string;
  fin: string;
  motivo: string | null;
}

export interface Turno {
  id: string;
  cliente: { id: string; nombre: string };
  inicio: string;
  fin: string;
  duracionMinutos: number;
  descripcion: string | null;
  estado: EstadoTurno;
  cobros: Movimiento[];
  totalCobradoCentavos: number;
}

/** Turnos que quedan afectados por un cambio de horarios o un bloqueo (CU-16) */
export interface TurnoAfectado {
  id: string;
  inicio: string;
  cliente: string;
}

export const MOTIVOS_OMISION_TURNO = [
  'CLIENTE_INACTIVO',
  'FUERA_DE_HORARIO',
  'EN_BLOQUEO',
  'TURNO_MISMO_INICIO',
] as const;
export type MotivoOmisionTurno = (typeof MOTIVOS_OMISION_TURNO)[number];

export interface ResultadoCopiaTurnos {
  creados: Turno[];
  omitidos: {
    turnoOrigenId: string;
    inicio: string;
    cliente: string;
    motivo: MotivoOmisionTurno;
  }[];
}

export const TEXTO_MOTIVO_OMISION: Record<MotivoOmisionTurno, string> = {
  CLIENTE_INACTIVO: 'el cliente está dado de baja',
  FUERA_DE_HORARIO: 'queda fuera del horario de atención',
  EN_BLOQUEO: 'cae en un período bloqueado',
  TURNO_MISMO_INICIO: 'ya hay otro turno a esa hora',
};

export const NOMBRE_ESTADO_TURNO: Record<EstadoTurno, string> = {
  PROGRAMADO: 'Programado',
  REALIZADO: 'Realizado',
  AUSENTE: 'Ausente',
  CANCELADO: 'Cancelado',
};

export const NOMBRE_DIA = [
  '',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const;
