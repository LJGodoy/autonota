// Esquemas de /auth (Parte 4, sección 4)
import { z } from 'zod';

const esquemaEmail = z
  .string({ required_error: 'Ingresá tu email' })
  .trim()
  .min(1, 'Ingresá tu email')
  .max(254, 'El email es demasiado largo')
  .email('Formato inválido');

/** 8 a 72 caracteres, con al menos una letra y un número */
export const esquemaPassword = z
  .string({ required_error: 'Ingresá una contraseña' })
  .min(8, 'Usá al menos 8 caracteres')
  .max(72, 'Usá como máximo 72 caracteres')
  .regex(/\p{L}/u, 'Incluí al menos una letra')
  .regex(/\d/, 'Incluí al menos un número');

const esquemaAceptaPolitica = z.literal(true, {
  errorMap: () => ({
    message: 'Tenés que aceptar la política de privacidad y los términos y condiciones',
  }),
});

export const esquemaRegistro = z
  .object({
    nombre: z
      .string({ required_error: 'Ingresá tu nombre' })
      .trim()
      .min(1, 'Ingresá tu nombre')
      .max(100, 'Usá como máximo 100 caracteres'),
    email: esquemaEmail,
    password: esquemaPassword,
    aceptaPolitica: esquemaAceptaPolitica,
  })
  .strict();
export type RegistroInput = z.infer<typeof esquemaRegistro>;

export const esquemaLogin = z
  .object({
    email: esquemaEmail,
    password: z
      .string({ required_error: 'Ingresá tu contraseña' })
      .min(1, 'Ingresá tu contraseña')
      .max(200),
  })
  .strict();
export type LoginInput = z.infer<typeof esquemaLogin>;

export const esquemaRecuperar = z.object({ email: esquemaEmail }).strict();
export type RecuperarInput = z.infer<typeof esquemaRecuperar>;

export const esquemaRestablecer = z
  .object({
    token: z.string().min(1, 'Falta el token').max(200),
    password: esquemaPassword,
  })
  .strict();
export type RestablecerInput = z.infer<typeof esquemaRestablecer>;

export const esquemaDemo = z.object({ aceptaPolitica: esquemaAceptaPolitica }).strict();
export type DemoInput = z.infer<typeof esquemaDemo>;

export const esquemaEliminarCuenta = z
  .object({
    password: z
      .string({ required_error: 'Ingresá tu contraseña' })
      .min(1, 'Ingresá tu contraseña')
      .max(200),
  })
  .strict();
export type EliminarCuentaInput = z.infer<typeof esquemaEliminarCuenta>;

/** Usuario que devuelve la API. esDemo y expiraEn amplían el contrato de la Parte 4. */
export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  esDemo: boolean;
  expiraEn: string | null;
}

export interface CuerpoSesion {
  usuario: Usuario;
  accessToken: string;
}
