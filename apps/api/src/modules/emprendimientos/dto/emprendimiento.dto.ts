import { createZodDto } from 'nestjs-zod';
import type { Emprendimiento as EmprendimientoDb } from '@prisma/client';
import {
  esquemaCrearEmprendimiento,
  esquemaEditarEmprendimiento,
  esquemaEliminarEmprendimiento,
  type Emprendimiento,
} from '@autonota/shared';

export class CrearEmprendimientoDto extends createZodDto(esquemaCrearEmprendimiento) {}
export class EditarEmprendimientoDto extends createZodDto(esquemaEditarEmprendimiento) {}
export class EliminarEmprendimientoDto extends createZodDto(esquemaEliminarEmprendimiento) {}

/** DTO de salida (Parte 4, sección 5) */
export function aEmprendimientoDto(e: EmprendimientoDb): Emprendimiento {
  return { id: e.id, nombre: e.nombre, tipo: e.tipo, creadoEn: e.creadoEn.toISOString() };
}
