import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { TipoEmprendimiento } from '@autonota/shared';
import { DomainException } from '../errors/domain.exception';
import type { PeticionAutenticada } from '../auth/peticion';
import { EmprendimientoAccesoRepository } from './emprendimiento-acceso.repository';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const CLAVE_TIPOS = 'tiposEmprendimiento';

/** Restringe un controlador o ruta a ciertos tipos de negocio (409 TIPO_INCOMPATIBLE) */
export const TiposEmprendimiento = (...tipos: TipoEmprendimiento[]) =>
  SetMetadata(CLAVE_TIPOS, tipos);

/**
 * Guard de propiedad y de tipo de emprendimiento (Parte 5, sección 3, paso 4; Parte 6, sección 9).
 * Un emprendimiento ajeno o inexistente responde 404, sin distinguir los casos (RNF-02).
 */
@Injectable()
export class EmprendimientoGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly repo: EmprendimientoAccesoRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<PeticionAutenticada>();
    const eid: unknown = req.params.eid;
    if (!req.usuario) throw new DomainException('NO_AUTENTICADO');
    if (typeof eid !== 'string' || !UUID.test(eid)) throw new DomainException('NO_ENCONTRADO');

    const emprendimiento = await this.repo.buscarDelUsuario(eid, req.usuario.id);
    if (!emprendimiento) throw new DomainException('NO_ENCONTRADO');

    const tipos = this.reflector.getAllAndOverride<TipoEmprendimiento[] | undefined>(CLAVE_TIPOS, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (tipos && !tipos.includes(emprendimiento.tipo)) {
      throw new DomainException('TIPO_INCOMPATIBLE');
    }

    req.emprendimiento = emprendimiento;
    return true;
  }
}
