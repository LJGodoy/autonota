// Piezas comunes a turnero, clases y ventas
import { z } from 'zod';

/** Fecha y hora ISO 8601 con zona horaria, por ejemplo 2026-11-20T10:00:00-03:00 (Parte 4, sección 2) */
export const esquemaFechaHora = z
  .string({ required_error: 'Ingresá fecha y hora' })
  .datetime({ offset: true, message: 'Usá fecha y hora ISO con zona horaria' });

/** Duración estimada de un turno o una clase, en minutos */
export const esquemaDuracion = z
  .number({ required_error: 'Ingresá la duración', invalid_type_error: 'Ingresá la duración' })
  .int('Usá minutos enteros')
  .min(5, 'La duración mínima es de 5 minutos')
  .max(720, 'La duración máxima es de 12 horas');

/** Parámetros de paginación (Parte 4, sección 2) */
export const esquemaPaginacion = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

/** Booleano en la query string ("true" o "false") */
export const esquemaBooleanoQuery = z.enum(['true', 'false']).transform((v) => v === 'true');

/** Clientes y alumnos tienen la misma estructura (Parte 3, sección 5.6) */
export const esquemaCrearPersona = z
  .object({
    nombre: z
      .string({ required_error: 'Ingresá el nombre' })
      .trim()
      .min(1, 'Ingresá el nombre')
      .max(100, 'Usá como máximo 100 caracteres'),
    telefono: z.string().trim().max(30, 'Usá como máximo 30 caracteres').nullish(),
    notas: z.string().trim().max(2000, 'Usá como máximo 2000 caracteres').nullish(),
  })
  .strict();
export type CrearPersonaInput = z.infer<typeof esquemaCrearPersona>;

export const esquemaEditarPersona = esquemaCrearPersona
  .partial()
  .extend({ activo: z.boolean().optional() })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'No hay cambios para guardar' });
export type EditarPersonaInput = z.infer<typeof esquemaEditarPersona>;

export const esquemaFiltroPersonas = z
  .object({
    q: z.string().trim().max(100).optional(),
    activo: esquemaBooleanoQuery.default('true'),
    ...esquemaPaginacion,
  })
  .strict();
export type FiltroPersonas = z.infer<typeof esquemaFiltroPersonas>;

export interface Persona {
  id: string;
  nombre: string;
  telefono: string | null;
  notas: string | null;
  activo: boolean;
  creadoEn: string;
}

/** Nombre que reemplaza al de una persona anonimizada (RF-19, RF-30) */
export const NOMBRE_ANONIMO = { CLIENTE: 'Cliente anónimo', ALUMNO: 'Alumno anónimo' } as const;

/** Copiar la semana anterior (RF-21, RF-37): semanaOrigen es un lunes */
export const esquemaCopiarSemana = z
  .object({
    semanaOrigen: z
      .string({ required_error: 'Indicá el lunes de la semana origen' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usá el formato AAAA-MM-DD')
      .refine(
        (t) => new Date(`${t}T12:00:00Z`).getUTCDay() === 1,
        'La semana origen debe empezar un lunes',
      ),
    forzar: z.boolean().default(false),
  })
  .strict();
export type CopiarSemanaInput = z.infer<typeof esquemaCopiarSemana>;

/** Rango de fechas y horas para agenda y calendario */
export function esquemaRango(maxDias: number) {
  return z.object({ desde: esquemaFechaHora, hasta: esquemaFechaHora }).superRefine((d, ctx) => {
    const ms = Date.parse(d.hasta) - Date.parse(d.desde);
    if (ms <= 0)
      ctx.addIssue({
        code: 'custom',
        path: ['hasta'],
        message: '«Hasta» debe ser posterior a «desde»',
      });
    if (ms > maxDias * 86_400_000)
      ctx.addIssue({
        code: 'custom',
        path: ['hasta'],
        message: `El rango máximo es de ${maxDias} días`,
      });
  });
}
