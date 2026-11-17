import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { DomainException } from '../errors/domain.exception';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validación del encabezado, separada para poder probarla sin Nest */
export function leerClaveIdempotencia(valor: unknown): string | undefined {
  if (valor === undefined || valor === '') return undefined;
  if (typeof valor !== 'string' || !UUID.test(valor)) {
    throw new DomainException('VALIDACION', 'El encabezado Idempotency-Key debe ser un UUID.', [
      { field: 'Idempotency-Key', message: 'Debe ser un UUID' },
    ]);
  }
  return valor.toLowerCase();
}

/**
 * Encabezado Idempotency-Key de los POST que registran dinero (Parte 4, sección 2; RF-07).
 * Es opcional; si llega, debe ser un UUID.
 */
export const ClaveIdempotencia = createParamDecorator(
  (_dato: unknown, ctx: ExecutionContext): string | undefined =>
    leerClaveIdempotencia(ctx.switchToHttp().getRequest<Request>().headers['idempotency-key']),
);
