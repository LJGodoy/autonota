// Variables de entorno validadas con Zod al arrancar (Parte 6, sección 4.2; SDD 0.6).
// Si falta una obligatoria, la API no inicia.
import { z } from 'zod';

const opcional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== '' ? v : undefined));

export const esquemaEnv = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().url(),
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET debe tener al menos 32 caracteres'),
    REFRESH_TOKEN_DIAS: z.coerce.number().int().positive().default(30),
    APP_URL: z.string().url(),
    GMAIL_CLIENT_ID: opcional,
    GMAIL_CLIENT_SECRET: opcional,
    GMAIL_REFRESH_TOKEN: opcional,
    MAIL_FROM: z.string().min(3),
    SENTRY_DSN: opcional,
  })
  .superRefine((env, ctx) => {
    // En producción el envío de mails es obligatorio (ADR-011)
    if (env.NODE_ENV === 'production') {
      for (const clave of [
        'GMAIL_CLIENT_ID',
        'GMAIL_CLIENT_SECRET',
        'GMAIL_REFRESH_TOKEN',
      ] as const) {
        if (!env[clave]) {
          ctx.addIssue({
            code: 'custom',
            path: [clave],
            message: `${clave} es obligatoria en producción`,
          });
        }
      }
    }
  });

export type Env = z.infer<typeof esquemaEnv>;

export function validarEnv(config: Record<string, unknown>): Env {
  const resultado = esquemaEnv.safeParse(config);
  if (!resultado.success) {
    const problemas = resultado.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`Configuración inválida:\n${problemas.join('\n')}`);
  }
  return resultado.data;
}
