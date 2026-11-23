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
import {
  esquemaDescripcion,
  esquemaFecha,
  esquemaMedioPago,
  esquemaMes,
  esquemaMontoCentavos,
} from './movimientos';

export const MODALIDADES_CLASE = ['INDIVIDUAL', 'GRUPAL'] as const;
export type ModalidadClase = (typeof MODALIDADES_CLASE)[number];

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

/** RF-33: rango máximo de 42 días */
export const esquemaFiltroClases = esquemaRango(42);

/** Borrado de las clases que empiezan en el rango (día o semana del calendario) */
export const esquemaBorrarClases = esquemaRango(31);
export type BorrarClasesInput = z.infer<typeof esquemaBorrarClases>;

/** Con debe=true, solo los alumnos activos con clases ya dictadas sin pagar */
export const esquemaFiltroAlumnos = z
  .object({
    q: z.string().trim().max(100).optional(),
    activo: esquemaBooleanoQuery.default('true'),
    debe: esquemaBooleanoQuery.optional(),
    /** Mira las clases de ese mes (AAAA-MM); sin mes, todas las ya empezadas */
    mes: esquemaMes.optional(),
    ...esquemaPaginacion,
  })
  .strict();
export type FiltroAlumnos = z.infer<typeof esquemaFiltroAlumnos>;

/** Clases de un alumno: las que empiezan en el mes, o todas las que no pagó */
export const esquemaFiltroClasesAlumno = z
  .object({ mes: esquemaMes.optional(), impagas: esquemaBooleanoQuery.optional() })
  .strict()
  .refine((d) => d.mes || d.impagas, { path: ['mes'], message: 'Indicá el mes' });
export type FiltroClasesAlumno = z.infer<typeof esquemaFiltroClasesAlumno>;

/** Pago por clase: el monto es el total de las clases elegidas (no hay precio por clase) */
export const esquemaPagoClases = z
  .object({
    montoCentavos: esquemaMontoCentavos,
    fecha: esquemaFecha.optional(),
    medioPago: esquemaMedioPago.nullish(),
    descripcion: esquemaDescripcion.nullish(),
    claseIds: z
      .array(z.string().uuid('Clase inválida'), { required_error: 'Elegí al menos una clase' })
      .min(1, 'Elegí al menos una clase')
      .max(100, 'Elegí hasta 100 clases')
      .refine((ids) => new Set(ids).size === ids.length, 'Hay clases repetidas'),
  })
  .strict();
export type PagoClasesInput = z.infer<typeof esquemaPagoClases>;

export interface Alumno extends Persona {
  /** Clases ya empezadas que todavía no pagó (del mes pedido, si hay) */
  clasesAdeudadas: number;
  /** Clases ya empezadas del mes pedido (o todas): 0 si no tuvo ninguna */
  clasesDelMes: number;
}

export interface Clase {
  id: string;
  titulo: string | null;
  modalidad: ModalidadClase;
  inicio: string;
  fin: string;
  duracionMinutos: number;
  alumnos: { id: string; nombre: string; activo: boolean; pagada: boolean }[];
}

/** Una clase vista desde el perfil del alumno */
export interface ClaseDeAlumno {
  id: string;
  titulo: string | null;
  modalidad: ModalidadClase;
  inicio: string;
  fin: string;
  pagada: boolean;
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
