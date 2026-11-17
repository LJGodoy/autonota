// Esquemas de /movimientos y /estadisticas (Parte 4, secciones 9 y 10)
import { z } from 'zod';
import { MEDIOS_PAGO, type MedioPago } from './enums';

export const TIPOS_MOVIMIENTO = ['INGRESO', 'GASTO'] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

/** Montos en centavos, enteros y mayores que cero (ADR-007, RNF-04) */
export const MAX_MONTO_CENTAVOS = 99_999_999_999; // $ 999.999.999,99

export const esquemaMontoCentavos = z
  .number({ required_error: 'Ingresá un monto', invalid_type_error: 'Ingresá un monto' })
  .int('El monto debe estar en centavos enteros')
  .positive('El monto debe ser mayor que cero')
  .max(MAX_MONTO_CENTAVOS, 'El monto es demasiado grande');

function esFechaValida(texto: string): boolean {
  const [a, m, d] = texto.split('-').map(Number);
  const fecha = new Date(Date.UTC(a ?? 0, (m ?? 1) - 1, d ?? 0));
  return fecha.getUTCFullYear() === a && fecha.getUTCMonth() + 1 === m && fecha.getUTCDate() === d;
}

/** Fecha sin hora AAAA-MM-DD (ADR-008) */
export const esquemaFecha = z
  .string({ required_error: 'Ingresá una fecha' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usá el formato AAAA-MM-DD')
  .refine(esFechaValida, 'La fecha no existe');

/** Mes AAAA-MM */
export const esquemaMes = z
  .string({ required_error: 'Elegí un mes' })
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Usá el formato AAAA-MM');

export const esquemaDescripcion = z.string().trim().max(500, 'Usá como máximo 500 caracteres');
export const esquemaMedioPago = z.enum(MEDIOS_PAGO, {
  errorMap: () => ({ message: 'Elegí un medio de pago válido' }),
});
const esquemaUuid = (campo: string) => z.string().uuid(`${campo} inválido`);

export const esquemaCrearMovimiento = z
  .object({
    tipo: z.enum(TIPOS_MOVIMIENTO, { errorMap: () => ({ message: 'Elegí ingreso o gasto' }) }),
    montoCentavos: esquemaMontoCentavos,
    fecha: esquemaFecha,
    descripcion: esquemaDescripcion.nullish(),
    medioPago: esquemaMedioPago.nullish(),
    alumnoId: esquemaUuid('Alumno').optional(),
    mesCorrespondiente: esquemaMes.optional(),
    tareaId: esquemaUuid('Tarea').optional(),
  })
  .strict()
  .superRefine((d, ctx) => {
    // RF-34: alumnoId y mesCorrespondiente van siempre juntos; la API no completa el mes
    if (d.alumnoId && !d.mesCorrespondiente) {
      ctx.addIssue({
        code: 'custom',
        path: ['mesCorrespondiente'],
        message: 'Elegí el mes al que corresponde el pago',
      });
    }
    if (d.mesCorrespondiente && !d.alumnoId) {
      ctx.addIssue({
        code: 'custom',
        path: ['alumnoId'],
        message: 'Elegí el alumno que hizo el pago',
      });
    }
    // Un gasto no se vincula con alumnos ni tareas
    if (d.tipo === 'GASTO' && (d.alumnoId || d.tareaId)) {
      ctx.addIssue({
        code: 'custom',
        path: ['tipo'],
        message: 'Un gasto no se vincula con alumnos ni tareas',
      });
    }
    if (d.alumnoId && d.tareaId) {
      ctx.addIssue({
        code: 'custom',
        path: ['tareaId'],
        message: 'Un movimiento se vincula con un alumno o con una tarea, no con ambos',
      });
    }
  });
export type CrearMovimientoInput = z.infer<typeof esquemaCrearMovimiento>;

/** RF-07: corrige monto, fecha, descripción, medio de pago o mes. El tipo y los vínculos no cambian. */
export const esquemaEditarMovimiento = z
  .object({
    montoCentavos: esquemaMontoCentavos.optional(),
    fecha: esquemaFecha.optional(),
    descripcion: esquemaDescripcion.nullable().optional(),
    medioPago: esquemaMedioPago.nullable().optional(),
    mesCorrespondiente: esquemaMes.optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'No hay cambios para guardar' });
export type EditarMovimientoInput = z.infer<typeof esquemaEditarMovimiento>;

const esquemaPagina = z.coerce.number().int().min(1).default(1);
const esquemaTamanioPagina = z.coerce.number().int().min(1).max(100).default(20);

/** RF-73: listado filtrable por tipo y por mes de imputación */
export const esquemaFiltroMovimientos = z
  .object({
    tipo: z.enum(TIPOS_MOVIMIENTO).optional(),
    mes: esquemaMes.optional(),
    medioPago: esquemaMedioPago.optional(),
    alumnoId: z.string().uuid().optional(),
    tareaId: z.string().uuid().optional(),
    page: esquemaPagina,
    pageSize: esquemaTamanioPagina,
  })
  .strict();
export type FiltroMovimientos = z.infer<typeof esquemaFiltroMovimientos>;

/** Diferencia en meses entre dos meses AAAA-MM */
export function mesesEntre(desde: string, hasta: string): number {
  const [ad, md] = desde.split('-').map(Number);
  const [ah, mh] = hasta.split('-').map(Number);
  return ((ah ?? 0) - (ad ?? 0)) * 12 + ((mh ?? 0) - (md ?? 0));
}

export const MAX_MESES_ESTADISTICAS = 24;

/** RF-70 a RF-72: totales por mes entre dos meses, máximo 24 meses */
export const esquemaRangoEstadisticas = z
  .object({ desde: esquemaMes, hasta: esquemaMes })
  .strict()
  .superRefine((d, ctx) => {
    const meses = mesesEntre(d.desde, d.hasta) + 1;
    if (meses < 1)
      ctx.addIssue({
        code: 'custom',
        path: ['hasta'],
        message: 'El mes final no puede ser anterior al inicial',
      });
    if (meses > MAX_MESES_ESTADISTICAS)
      ctx.addIssue({
        code: 'custom',
        path: ['desde'],
        message: `El rango puede ser de hasta ${MAX_MESES_ESTADISTICAS} meses`,
      });
  });
export type RangoEstadisticas = z.infer<typeof esquemaRangoEstadisticas>;

export interface Movimiento {
  id: string;
  tipo: TipoMovimiento;
  montoCentavos: number;
  fecha: string;
  descripcion: string | null;
  medioPago: MedioPago | null;
  turnoId: string | null;
  alumnoId: string | null;
  tareaId: string | null;
  /** AAAA-MM; solo en pagos de alumnos */
  mesCorrespondiente: string | null;
  /** AAAA-MM: mes en el que cuenta para las estadísticas (Parte 3, sección 4.2) */
  mesImputacion: string;
  creadoEn: string;
}

export interface Paginado<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
}

export interface TotalesMes {
  ingresosCentavos: number;
  gastosCentavos: number;
  saldoCentavos: number;
  cantidadIngresos: number;
}

export interface Estadisticas {
  meses: (TotalesMes & { mes: string })[];
  totales: TotalesMes;
}

export const NOMBRE_MEDIO_PAGO: Record<MedioPago, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  TARJETA: 'Tarjeta',
  BILLETERA_VIRTUAL: 'Billetera virtual',
  OTRO: 'Otro',
};
