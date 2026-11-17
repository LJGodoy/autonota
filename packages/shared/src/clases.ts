// Esquemas del calendario de clases (Parte 4, sección 7)
import { z } from 'zod';
import {
  esquemaBooleanoQuery,
  esquemaDuracion,
  esquemaFechaHora,
  esquemaPaginacion,
  esquemaRango,
  type Persona,
} from './comunes';
import { esquemaMes } from './movimientos';

export const MODALIDADES_CLASE = ['INDIVIDUAL', 'GRUPAL'] as const;
export type ModalidadClase = (typeof MODALIDADES_CLASE)[number];
export const ESTADOS_CLASE = ['PROGRAMADA', 'CANCELADA'] as const;
export type EstadoClase = (typeof ESTADOS_CLASE)[number];

const esquemaAlumnoIds = z
  .array(z.string().uuid('Alumno inválido'), { required_error: 'Elegí al menos un alumno' })
  .min(1, 'Elegí al menos un alumno')
  .max(50, 'Una clase puede tener hasta 50 alumnos')
  .refine((ids) => new Set(ids).size === ids.length, 'Hay alumnos repetidos');

/** RF-31: INDIVIDUAL con exactamente un alumno; GRUPAL con al menos uno */
function validarModalidad(
  d: { modalidad?: ModalidadClase; alumnoIds?: string[] },
  ctx: z.RefinementCtx,
) {
  if (d.modalidad === 'INDIVIDUAL' && d.alumnoIds && d.alumnoIds.length !== 1) {
    ctx.addIssue({
      code: 'custom',
      path: ['alumnoIds'],
      message: 'Una clase individual tiene exactamente un alumno',
    });
  }
}

export const esquemaCrearClase = z
  .object({
    titulo: z.string().trim().max(100, 'Usá como máximo 100 caracteres').nullish(),
    modalidad: z.enum(MODALIDADES_CLASE, {
      errorMap: () => ({ message: 'Elegí individual o grupal' }),
    }),
    inicio: esquemaFechaHora,
    duracionMinutos: esquemaDuracion,
    alumnoIds: esquemaAlumnoIds,
  })
  .strict()
  .superRefine(validarModalidad);
export type CrearClaseInput = z.infer<typeof esquemaCrearClase>;

export const esquemaEditarClase = z
  .object({
    titulo: z.string().trim().max(100).nullish(),
    modalidad: z.enum(MODALIDADES_CLASE).optional(),
    inicio: esquemaFechaHora.optional(),
    duracionMinutos: esquemaDuracion.optional(),
    alumnoIds: esquemaAlumnoIds.optional(),
  })
  .strict()
  .superRefine(validarModalidad)
  .refine((d) => Object.keys(d).length > 0, { message: 'No hay cambios para guardar' });
export type EditarClaseInput = z.infer<typeof esquemaEditarClase>;

/** RF-33: rango máximo de 42 días, para la vista mensual */
export const esquemaFiltroClases = esquemaRango(42);

/** RF-38: con mesPago, cada alumno indica si tiene un pago para ese mes; con sinPago, solo los que no */
export const esquemaFiltroAlumnos = z
  .object({
    q: z.string().trim().max(100).optional(),
    activo: esquemaBooleanoQuery.default('true'),
    mesPago: esquemaMes.optional(),
    sinPago: esquemaBooleanoQuery.optional(),
    ...esquemaPaginacion,
  })
  .strict()
  .refine((d) => !d.sinPago || d.mesPago, {
    path: ['mesPago'],
    message: 'Indicá el mes para ver quién no pagó',
  });
export type FiltroAlumnos = z.infer<typeof esquemaFiltroAlumnos>;

export interface Alumno extends Persona {
  /** Solo cuando se pide con mesPago */
  pagoEnMes?: boolean;
}

export interface Clase {
  id: string;
  titulo: string | null;
  modalidad: ModalidadClase;
  inicio: string;
  fin: string;
  duracionMinutos: number;
  estado: EstadoClase;
  alumnos: { id: string; nombre: string; activo: boolean }[];
}

export interface ResultadoCopiaClases {
  creadas: Clase[];
  omitidas: {
    claseOrigenId: string;
    inicio: string;
    titulo: string | null;
    motivo: 'SIN_ALUMNOS';
  }[];
}
