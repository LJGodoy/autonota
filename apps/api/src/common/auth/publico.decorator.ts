import { SetMetadata } from '@nestjs/common';

export const CLAVE_PUBLICO = 'esPublico';

/** Marca una ruta como pública: no requiere access token */
export const Publico = () => SetMetadata(CLAVE_PUBLICO, true);
