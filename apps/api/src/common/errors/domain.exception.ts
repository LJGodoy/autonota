import {
  ESTADO_HTTP_ERROR,
  MENSAJE_ERROR,
  type CodigoError,
  type DetalleError,
} from '@autonota/shared';

/** Error de negocio con el código de la API (Parte 4, sección 3; Parte 6, sección 4.2) */
export class DomainException extends Error {
  readonly status: number;

  constructor(
    readonly code: CodigoError,
    message?: string,
    readonly details: DetalleError[] = [],
  ) {
    super(message ?? MENSAJE_ERROR[code]);
    this.status = ESTADO_HTTP_ERROR[code];
  }
}
