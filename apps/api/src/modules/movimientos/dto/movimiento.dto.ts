import { createZodDto } from 'nestjs-zod';
import type { Movimiento as MovimientoDb } from '@prisma/client';
import {
  esquemaCrearMovimiento,
  esquemaEditarMovimiento,
  esquemaFiltroMovimientos,
  type Movimiento,
} from '@autonota/shared';
import { centavosANumero } from '../../../common/utils/dinero';

export class CrearMovimientoDto extends createZodDto(esquemaCrearMovimiento) {}
export class EditarMovimientoDto extends createZodDto(esquemaEditarMovimiento) {}
export class FiltroMovimientosDto extends createZodDto(esquemaFiltroMovimientos) {}

/** AAAA-MM-DD de una columna DATE */
export const aTextoFecha = (fecha: Date): string => fecha.toISOString().slice(0, 10);
/** AAAA-MM de una columna DATE con el primer día del mes */
export const aTextoMes = (fecha: Date): string => fecha.toISOString().slice(0, 7);
/** Columna DATE desde AAAA-MM-DD */
export const desdeTextoFecha = (texto: string): Date => new Date(`${texto}T00:00:00Z`);
/** Primer día del mes desde AAAA-MM (ADR-008) */
export const desdeTextoMes = (texto: string): Date => new Date(`${texto}-01T00:00:00Z`);

/** DTO de salida (Parte 4, sección 9). BIGINT se convierte a number (Parte 6, sección 4.2). */
export function aMovimientoDto(
  m: MovimientoDb & { alumno?: { nombre: string } | null },
): Movimiento {
  const mesCorrespondiente = m.mesCorrespondiente ? aTextoMes(m.mesCorrespondiente) : null;
  return {
    id: m.id,
    tipo: m.tipo,
    montoCentavos: centavosANumero(m.montoCentavos),
    fecha: aTextoFecha(m.fecha),
    descripcion: m.descripcion,
    medioPago: m.medioPago,
    turnoId: m.turnoId,
    alumnoId: m.alumnoId,
    alumnoNombre: m.alumno?.nombre ?? null,
    tareaId: m.tareaId,
    mesCorrespondiente,
    mesImputacion: mesCorrespondiente ?? aTextoMes(m.fecha),
    creadoEn: m.creadoEn.toISOString(),
  };
}
