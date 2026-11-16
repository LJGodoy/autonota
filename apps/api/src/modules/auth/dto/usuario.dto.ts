import type { Usuario as UsuarioDb } from '@prisma/client';
import type { CuerpoSesion, Usuario } from '@autonota/shared';

/** DTO de salida: nunca expone password_hash (Parte 6, sección 4.2) */
export function aUsuarioDto(u: UsuarioDb): Usuario {
  return {
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    esDemo: u.esDemo,
    expiraEn: u.expiraEn ? u.expiraEn.toISOString() : null,
  };
}

/** Sesión emitida: el cuerpo para el cliente y el refresh token para la cookie */
export interface SesionEmitida {
  cuerpo: CuerpoSesion;
  refreshToken: string;
  refreshExpiraEn: Date;
}
