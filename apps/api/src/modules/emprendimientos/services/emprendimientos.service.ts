import { Injectable } from '@nestjs/common';
import {
  MAX_EMPRENDIMIENTOS,
  type CrearEmprendimientoInput,
  type Emprendimiento,
} from '@autonota/shared';
import { DomainException } from '../../../common/errors/domain.exception';
import { EmprendimientosRepository } from '../repositories/emprendimientos.repository';
import { aEmprendimientoDto } from '../dto/emprendimiento.dto';

@Injectable()
export class EmprendimientosService {
  constructor(private readonly repo: EmprendimientosRepository) {}

  /** RF-04 */
  async listar(usuarioId: string): Promise<Emprendimiento[]> {
    return (await this.repo.listarDelUsuario(usuarioId)).map(aEmprendimientoDto);
  }

  async obtener(id: string, usuarioId: string): Promise<Emprendimiento> {
    const e = await this.repo.buscarDelUsuario(id, usuarioId);
    if (!e) throw new DomainException('NO_ENCONTRADO');
    return aEmprendimientoDto(e);
  }

  /** CU-04 (RF-02, RF-03) */
  async crear(usuarioId: string, input: CrearEmprendimientoInput): Promise<Emprendimiento> {
    const creado = await this.repo.crearConLimite(usuarioId, input, MAX_EMPRENDIMIENTOS);
    if (!creado) throw new DomainException('LIMITE_EMPRENDIMIENTOS');
    return aEmprendimientoDto(creado);
  }

  /** RF-05: solo cambia el nombre */
  async renombrar(id: string, nombre: string): Promise<Emprendimiento> {
    return aEmprendimientoDto(await this.repo.renombrar(id, nombre));
  }

  /** CU-05 (RF-06): el nombre escrito debe coincidir con el del emprendimiento */
  async eliminar(
    emprendimiento: { id: string; nombre: string },
    confirmarNombre: string,
  ): Promise<void> {
    if (confirmarNombre.trim() !== emprendimiento.nombre.trim()) {
      throw new DomainException('VALIDACION', 'El nombre no coincide con el del emprendimiento.', [
        { field: 'confirmarNombre', message: 'El nombre no coincide' },
      ]);
    }
    await this.repo.eliminar(emprendimiento.id);
  }
}
