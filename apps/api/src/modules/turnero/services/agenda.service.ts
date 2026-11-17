import { Injectable } from '@nestjs/common';
import type { Bloqueo, CrearBloqueoInput, Franja, FranjaGuardada } from '@autonota/shared';
import { DomainException } from '../../../common/errors/domain.exception';
import { estaDentroDeHorario, seCruzan } from '../../../common/utils/agenda';
import {
  aHoraArgentina,
  desdeHoraArgentina,
  formatearFechaHoraCorta,
} from '../../../common/utils/fechas';
import { AgendaRepository } from '../repositories/agenda.repository';
import { TurnosRepository, type TurnoConDatos } from '../repositories/turnos.repository';
import { aBloqueoDto, aTurnoAfectado } from '../dto/turnero.dto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Comienzo del día de hoy en Argentina: CU-16 mira los turnos desde hoy en adelante */
export function comienzoDeHoy(ahora: Date = new Date()): Date {
  const { anio, mes, dia } = aHoraArgentina(ahora);
  return desdeHoraArgentina(anio, mes, dia);
}

/** Horarios de atención y bloqueos (RF-10, RF-11; CU-16) */
@Injectable()
export class AgendaService {
  constructor(
    private readonly agenda: AgendaRepository,
    private readonly turnos: TurnosRepository,
  ) {}

  listarFranjas(emprendimientoId: string): Promise<FranjaGuardada[]> {
    return this.agenda.listarFranjas(emprendimientoId);
  }

  /** CU-16: si el cambio deja afuera turnos programados, avisa; con confirmar=true guarda igual */
  async reemplazarFranjas(
    emprendimientoId: string,
    franjas: Franja[],
    confirmar: boolean,
  ): Promise<FranjaGuardada[]> {
    if (!confirmar) {
      const programados = await this.turnos.programadosDesde(emprendimientoId, comienzoDeHoy());
      this.avisarAfectados(
        programados.filter((t) => !estaDentroDeHorario(t.inicio, t.fin, franjas)),
      );
    }
    return this.agenda.reemplazarFranjas(emprendimientoId, franjas);
  }

  async listarBloqueos(emprendimientoId: string, desde: string, hasta: string): Promise<Bloqueo[]> {
    return (
      await this.agenda.listarBloqueos(emprendimientoId, new Date(desde), new Date(hasta))
    ).map(aBloqueoDto);
  }

  /** CU-16: si el bloqueo se cruza con turnos programados, avisa; con confirmar=true guarda igual */
  async crearBloqueo(
    emprendimientoId: string,
    input: CrearBloqueoInput,
    confirmar: boolean,
  ): Promise<Bloqueo> {
    const inicio = new Date(input.inicio);
    const fin = new Date(input.fin);
    if (!confirmar) {
      const programados = await this.turnos.programadosDesde(emprendimientoId, comienzoDeHoy());
      this.avisarAfectados(programados.filter((t) => seCruzan(t.inicio, t.fin, inicio, fin)));
    }
    const creado = await this.agenda.crearBloqueo({
      emprendimientoId,
      inicio,
      fin,
      motivo: input.motivo || null,
    });
    return aBloqueoDto(creado);
  }

  async eliminarBloqueo(emprendimientoId: string, id: string): Promise<void> {
    const b = UUID.test(id) ? await this.agenda.buscarBloqueo(id, emprendimientoId) : null;
    if (!b) throw new DomainException('NO_ENCONTRADO');
    await this.agenda.eliminarBloqueo(b.id);
  }

  /** Los turnos afectados no se modifican: el usuario decide si los reubica o los cancela */
  private avisarAfectados(afectados: TurnoConDatos[]): void {
    if (afectados.length === 0) return;
    const lista = afectados.map(aTurnoAfectado);
    throw new DomainException(
      'TURNOS_AFECTADOS',
      `El cambio deja afuera ${lista.length} turno${lista.length === 1 ? '' : 's'} programado${lista.length === 1 ? '' : 's'}.`,
      lista.map((t) => ({
        field: t.id,
        message: `${formatearFechaHoraCorta(new Date(t.inicio))} · ${t.cliente}`,
      })),
    );
  }
}
