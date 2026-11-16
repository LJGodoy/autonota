import type { Request } from 'express';
import type { TipoEmprendimiento } from '@autonota/shared';

export interface UsuarioAutenticado {
  id: string;
}

export interface EmprendimientoDePeticion {
  id: string;
  usuarioId: string;
  nombre: string;
  tipo: TipoEmprendimiento;
}

/** Petición con los datos que agregan los guards */
export interface PeticionAutenticada extends Request {
  usuario?: UsuarioAutenticado;
  emprendimiento?: EmprendimientoDePeticion;
}
