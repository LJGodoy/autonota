import { Injectable } from '@nestjs/common';
import { NOMBRE_ANONIMO } from '@autonota/shared';
import { PersonasService } from '../../../common/personas/personas.service';
import { ClientesRepository } from '../repositories/clientes.repository';

/** RF-19: lista de clientes, baja lógica y anonimización (CU-18) */
@Injectable()
export class ClientesService extends PersonasService {
  constructor(repo: ClientesRepository) {
    super(repo, NOMBRE_ANONIMO.CLIENTE);
  }

  /** Para crear un turno: el cliente debe existir en el emprendimiento */
  buscarDelEmprendimiento(emprendimientoId: string, id: string) {
    return this.buscarOFallar(emprendimientoId, id);
  }
}
