import { createHash, randomBytes } from 'node:crypto';

/** Token aleatorio para refresh y recuperación de contraseña (en claro solo viaja al cliente) */
export function generarTokenAleatorio(): string {
  return randomBytes(32).toString('base64url');
}

/** Hash con el que se guarda el token: el token en claro nunca se guarda (Parte 3, sección 5.2) */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
