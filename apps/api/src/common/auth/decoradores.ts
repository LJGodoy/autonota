import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { DomainException } from '../errors/domain.exception';
import type { EmprendimientoDePeticion, PeticionAutenticada, UsuarioAutenticado } from './peticion';

/** Usuario autenticado de la petición */
export const UsuarioActual = createParamDecorator(
  (_dato: unknown, ctx: ExecutionContext): UsuarioAutenticado => {
    const req = ctx.switchToHttp().getRequest<PeticionAutenticada>();
    if (!req.usuario) throw new DomainException('NO_AUTENTICADO');
    return req.usuario;
  },
);

/** Emprendimiento ya verificado por EmprendimientoGuard */
export const EmprendimientoActual = createParamDecorator(
  (_dato: unknown, ctx: ExecutionContext): EmprendimientoDePeticion => {
    const req = ctx.switchToHttp().getRequest<PeticionAutenticada>();
    if (!req.emprendimiento) throw new DomainException('NO_ENCONTRADO');
    return req.emprendimiento;
  },
);
