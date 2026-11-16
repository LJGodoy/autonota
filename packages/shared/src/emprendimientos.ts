// Esquemas de /emprendimientos (Parte 4, sección 5)
import { z } from 'zod';
import { esquemaTipoEmprendimiento, type TipoEmprendimiento } from './enums';

const esquemaNombreEmprendimiento = z
  .string({ required_error: 'Ingresá un nombre' })
  .trim()
  .min(1, 'Ingresá un nombre')
  .max(100, 'Usá como máximo 100 caracteres');

export const esquemaCrearEmprendimiento = z
  .object({
    nombre: esquemaNombreEmprendimiento,
    tipo: esquemaTipoEmprendimiento,
  })
  .strict();
export type CrearEmprendimientoInput = z.infer<typeof esquemaCrearEmprendimiento>;

/** RF-05: solo se puede cambiar el nombre; el tipo no se modifica */
export const esquemaEditarEmprendimiento = z
  .object({ nombre: esquemaNombreEmprendimiento })
  .strict();
export type EditarEmprendimientoInput = z.infer<typeof esquemaEditarEmprendimiento>;

/** RF-06: la eliminación exige escribir el nombre */
export const esquemaEliminarEmprendimiento = z
  .object({
    confirmarNombre: z.string({ required_error: 'Escribí el nombre del emprendimiento' }).max(200),
  })
  .strict();
export type EliminarEmprendimientoInput = z.infer<typeof esquemaEliminarEmprendimiento>;

export interface Emprendimiento {
  id: string;
  nombre: string;
  tipo: TipoEmprendimiento;
  creadoEn: string;
}
