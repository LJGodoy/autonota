import { createZodDto } from 'nestjs-zod';
import type { Bloqueo as BloqueoDb } from '@prisma/client';
import {
  esquemaCobroTurno,
  esquemaConfirmar,
  esquemaCopiarSemana,
  esquemaCrearBloqueo,
  esquemaCrearPersona,
  esquemaCrearTurno,
  esquemaEditarPersona,
  esquemaEditarTurno,
  esquemaBorrarTurnos,
  esquemaFiltroPersonas,
  esquemaFiltroTurnos,
  esquemaHorarios,
  esquemaRangoBloqueos,
  esquemaRealizarTurno,
  type Bloqueo,
  type Turno,
  type TurnoAfectado,
} from '@autonota/shared';
import { centavosANumero } from '../../../common/utils/dinero';
import { aMovimientoDto } from '../../movimientos/dto/movimiento.dto';
import type { TurnoConDatos } from '../repositories/turnos.repository';

export class HorariosDto extends createZodDto(esquemaHorarios) {}
export class ConfirmarDto extends createZodDto(esquemaConfirmar) {}
export class CrearBloqueoDto extends createZodDto(esquemaCrearBloqueo) {}
export class RangoBloqueosDto extends createZodDto(esquemaRangoBloqueos) {}
export class CrearClienteDto extends createZodDto(esquemaCrearPersona) {}
export class EditarClienteDto extends createZodDto(esquemaEditarPersona) {}
export class FiltroClientesDto extends createZodDto(esquemaFiltroPersonas) {}
export class CrearTurnoDto extends createZodDto(esquemaCrearTurno) {}
export class EditarTurnoDto extends createZodDto(esquemaEditarTurno) {}
export class FiltroTurnosDto extends createZodDto(esquemaFiltroTurnos) {}
export class BorrarTurnosDto extends createZodDto(esquemaBorrarTurnos) {}
export class CobroTurnoDto extends createZodDto(esquemaCobroTurno) {}
export class RealizarTurnoDto extends createZodDto(esquemaRealizarTurno) {}
export class CopiarSemanaDto extends createZodDto(esquemaCopiarSemana) {}

export function aBloqueoDto(b: BloqueoDb): Bloqueo {
  return { id: b.id, inicio: b.inicio.toISOString(), fin: b.fin.toISOString(), motivo: b.motivo };
}

/** Turno con cliente, cobros y total cobrado (Parte 4, sección 6.3) */
export function aTurnoDto(t: TurnoConDatos): Turno {
  const cobros = t.cobros.map(aMovimientoDto);
  return {
    id: t.id,
    cliente: { id: t.cliente.id, nombre: t.cliente.nombre },
    inicio: t.inicio.toISOString(),
    fin: t.fin.toISOString(),
    duracionMinutos: Math.round((t.fin.getTime() - t.inicio.getTime()) / 60000),
    descripcion: t.descripcion,
    estado: t.estado,
    cobros,
    totalCobradoCentavos: t.cobros.reduce((s, c) => s + centavosANumero(c.montoCentavos), 0),
  };
}

export function aTurnoAfectado(t: TurnoConDatos): TurnoAfectado {
  return { id: t.id, inicio: t.inicio.toISOString(), cliente: t.cliente.nombre };
}
