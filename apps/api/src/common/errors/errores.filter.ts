import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import * as Sentry from '@sentry/nestjs';
import { ZodValidationException } from 'nestjs-zod';
import type { ZodError } from 'zod';
import type { Response } from 'express';
import {
  MENSAJE_ERROR,
  type CodigoError,
  type CuerpoError,
  type DetalleError,
} from '@autonota/shared';
import { DomainException } from './domain.exception';

function detallesZod(error: unknown): DetalleError[] {
  const issues = (error as Partial<ZodError> | undefined)?.issues ?? [];
  return issues.map((i) => ({
    field: i.path.join('.') || '(cuerpo)',
    message:
      i.code === 'unrecognized_keys' ? `Campos no permitidos: ${i.keys.join(', ')}` : i.message,
  }));
}

/** Convierte cualquier error al formato único de la API (Parte 4, sección 3; CU patrón paso 6) */
@Catch()
export class ErroresFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErroresFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const { status, cuerpo } = this.traducir(exception);
    res.status(status).json(cuerpo);
  }

  private traducir(exception: unknown): { status: number; cuerpo: CuerpoError } {
    const armar = (code: CodigoError, message?: string, details: DetalleError[] = []) => ({
      error: { code, message: message ?? MENSAJE_ERROR[code], details },
    });

    if (exception instanceof DomainException) {
      return {
        status: exception.status,
        cuerpo: armar(exception.code, exception.message, exception.details),
      };
    }
    if (exception instanceof ZodValidationException) {
      return {
        status: HttpStatus.BAD_REQUEST,
        cuerpo: armar('VALIDACION', undefined, detallesZod(exception.getZodError())),
      };
    }
    if (exception instanceof ThrottlerException) {
      return { status: HttpStatus.TOO_MANY_REQUESTS, cuerpo: armar('DEMASIADAS_PETICIONES') };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status === HttpStatus.NOT_FOUND) return { status, cuerpo: armar('NO_ENCONTRADO') };
      if (status === HttpStatus.UNAUTHORIZED) return { status, cuerpo: armar('NO_AUTENTICADO') };
      if (status === HttpStatus.TOO_MANY_REQUESTS) {
        return { status, cuerpo: armar('DEMASIADAS_PETICIONES') };
      }
      if (status >= 400 && status < 500) {
        // Errores de parseo (JSON mal formado, UUID inválido en la ruta, etc.)
        return { status: HttpStatus.BAD_REQUEST, cuerpo: armar('VALIDACION') };
      }
    }

    // Error no previsto: el detalle va a los logs y a Sentry, nunca a la respuesta
    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    Sentry.captureException(exception);
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, cuerpo: armar('ERROR_INTERNO') };
  }
}
