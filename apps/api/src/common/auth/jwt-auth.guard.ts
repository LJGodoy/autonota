import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { DomainException } from '../errors/domain.exception';
import { CLAVE_PUBLICO } from './publico.decorator';
import type { PeticionAutenticada } from './peticion';

/** Valida el access token JWT del encabezado Authorization (ADR-006; patrón general, paso 2) */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const esPublico = this.reflector.getAllAndOverride<boolean>(CLAVE_PUBLICO, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (esPublico) return true;

    const req = context.switchToHttp().getRequest<PeticionAutenticada>();
    const [esquema, token] = (req.headers.authorization ?? '').split(' ');
    if (esquema !== 'Bearer' || !token) throw new DomainException('NO_AUTENTICADO');

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      req.usuario = { id: payload.sub };
      return true;
    } catch {
      throw new DomainException('NO_AUTENTICADO');
    }
  }
}
