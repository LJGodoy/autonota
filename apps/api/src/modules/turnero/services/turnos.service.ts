import { Injectable } from '@nestjs/common';
import type {
  CobroTurnoInput,
  CopiarSemanaInput,
  CrearTurnoInput,
  EditarTurnoInput,
  FiltroTurnos,
  Movimiento,
  MotivoOmisionTurno,
  RealizarTurnoInput,
  ResultadoCopiaTurnos,
  Turno,
} from '@autonota/shared';
import { DomainException } from '../../../common/errors/domain.exception';
import { esViolacionUnica } from '../../../common/prisma/prisma.service';
import { estaDentroDeHorario, MS_SEMANA, seCruzan } from '../../../common/utils/agenda';
import { desdeHoraArgentina, hoyEnArgentina } from '../../../common/utils/fechas';
import { MovimientosService } from '../../movimientos/services/movimientos.service';
import { desdeTextoFecha } from '../../movimientos/dto/movimiento.dto';
import { AgendaRepository } from '../repositories/agenda.repository';
import {
  TurnosRepository,
  type NuevoTurno,
  type TurnoConDatos,
} from '../repositories/turnos.repository';
import { ClientesService } from './clientes.service';
import { aTurnoDto } from '../dto/turnero.dto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sumarMinutos = (d: Date, min: number) => new Date(d.getTime() + min * 60000);

@Injectable()
export class TurnosService {
  constructor(
    private readonly repo: TurnosRepository,
    private readonly agenda: AgendaRepository,
    private readonly clientes: ClientesService,
    private readonly movimientos: MovimientosService,
  ) {}

  /** RF-17 */
  async listar(emprendimientoId: string, f: FiltroTurnos): Promise<Turno[]> {
    return (
      await this.repo.listar(emprendimientoId, new Date(f.desde), new Date(f.hasta), f.estado)
    ).map(aTurnoDto);
  }

  async obtener(emprendimientoId: string, id: string): Promise<Turno> {
    return aTurnoDto(await this.buscarOFallar(emprendimientoId, id));
  }

  /** CU-06 (RF-12, RF-13): se aceptan fechas pasadas y turnos superpuestos */
  async crear(emprendimientoId: string, input: CrearTurnoInput): Promise<Turno> {
    await this.validarCliente(emprendimientoId, input.clienteId);
    const inicio = new Date(input.inicio);
    const fin = sumarMinutos(inicio, input.duracionMinutos);
    await this.validarHorario(emprendimientoId, inicio, fin);
    return aTurnoDto(
      await this.conMismoInicio(() =>
        this.repo.crear({
          emprendimientoId,
          clienteId: input.clienteId,
          inicio,
          fin,
          descripcion: input.descripcion || null,
        }),
      ),
    );
  }

  /** CU-07 (RF-15): reubica o edita un turno PROGRAMADO, con las mismas validaciones de CU-06 */
  async editar(emprendimientoId: string, id: string, input: EditarTurnoInput): Promise<Turno> {
    const actual = await this.buscarOFallar(emprendimientoId, id);
    if (actual.estado !== 'PROGRAMADO')
      throw new DomainException(
        'ESTADO_INVALIDO',
        'Solo se puede reubicar o editar un turno programado.',
      );
    if (input.clienteId && input.clienteId !== actual.clienteId)
      await this.validarCliente(emprendimientoId, input.clienteId);
    const inicio = input.inicio ? new Date(input.inicio) : actual.inicio;
    const duracion =
      input.duracionMinutos ?? Math.round((actual.fin.getTime() - actual.inicio.getTime()) / 60000);
    const fin = sumarMinutos(inicio, duracion);
    if (input.inicio || input.duracionMinutos)
      await this.validarHorario(emprendimientoId, inicio, fin);
    return aTurnoDto(
      await this.conMismoInicio(() =>
        this.repo.actualizar(actual.id, {
          clienteId: input.clienteId,
          inicio,
          fin,
          descripcion: input.descripcion === undefined ? undefined : input.descripcion || null,
        }),
      ),
    );
  }

  /** CU-07 (RF-14): solo un turno PROGRAMADO se cancela; su hora de inicio queda libre */
  async cancelar(emprendimientoId: string, id: string): Promise<Turno> {
    const actual = await this.buscarOFallar(emprendimientoId, id);
    if (actual.estado !== 'PROGRAMADO')
      throw new DomainException('ESTADO_INVALIDO', 'Solo se puede cancelar un turno programado.');
    return aTurnoDto(await this.repo.actualizar(actual.id, { estado: 'CANCELADO' }));
  }

  /** RF-14: ausente se aplica a turnos no cancelados, para poder corregir errores */
  async marcarAusente(emprendimientoId: string, id: string): Promise<Turno> {
    const actual = await this.buscarOFallar(emprendimientoId, id);
    if (actual.estado === 'CANCELADO')
      throw new DomainException('ESTADO_INVALIDO', 'Un turno cancelado no cambia de estado.');
    return aTurnoDto(await this.repo.actualizar(actual.id, { estado: 'AUSENTE' }));
  }

  /** CU-08 (RF-16): realizado con o sin cobro; el cambio de estado y el cobro van en una transacción */
  async realizar(
    emprendimientoId: string,
    id: string,
    input: RealizarTurnoInput,
    clave?: string,
  ): Promise<Turno> {
    const actual = await this.buscarOFallar(emprendimientoId, id);
    const cobro = input.cobro
      ? {
          montoCentavos: BigInt(input.cobro.montoCentavos),
          fecha: input.cobro.fecha ? desdeTextoFecha(input.cobro.fecha) : hoyEnArgentina(),
          medioPago: input.cobro.medioPago ?? null,
          descripcion: input.cobro.descripcion || null,
          claveIdempotencia: clave ?? null,
        }
      : null;
    const realizado = await this.repo.realizar(actual.id, emprendimientoId, cobro);
    if (!realizado)
      throw new DomainException('ESTADO_INVALIDO', 'Un turno cancelado no cambia de estado.');
    return aTurnoDto(realizado);
  }

  /** RF-16: seña, pago parcial o total, en cualquier estado del turno */
  async registrarCobro(
    emprendimientoId: string,
    id: string,
    input: CobroTurnoInput,
    clave?: string,
  ): Promise<Movimiento> {
    const actual = await this.buscarOFallar(emprendimientoId, id);
    return this.movimientos.registrarCobroTurno(emprendimientoId, actual.id, input, clave);
  }

  /** CU-13 (RF-21): copia la semana como PROGRAMADO y sin cobros, omitiendo lo que no se puede copiar */
  async copiarSemana(
    emprendimientoId: string,
    input: CopiarSemanaInput,
  ): Promise<ResultadoCopiaTurnos> {
    const [a, m, d] = input.semanaOrigen.split('-').map(Number) as [number, number, number];
    const origen = desdeHoraArgentina(a, m, d);
    const destino = new Date(origen.getTime() + MS_SEMANA);
    const finDestino = new Date(destino.getTime() + MS_SEMANA);

    const existentes = await this.repo.noCanceladosQueEmpiezanEn(
      emprendimientoId,
      destino,
      finDestino,
    );
    if (existentes.length > 0 && !input.forzar) throw new DomainException('SEMANA_DESTINO_OCUPADA');

    const fuente = await this.repo.noCanceladosQueEmpiezanEn(emprendimientoId, origen, destino);
    const franjas = await this.agenda.listarFranjas(emprendimientoId);
    const bloqueos = await this.agenda.listarBloqueos(emprendimientoId, destino, finDestino);
    const ocupados = new Set(existentes.map((t) => t.inicio.getTime()));

    const nuevos: NuevoTurno[] = [];
    const omitidos: ResultadoCopiaTurnos['omitidos'] = [];
    for (const t of fuente) {
      const inicio = new Date(t.inicio.getTime() + MS_SEMANA);
      const fin = new Date(t.fin.getTime() + MS_SEMANA);
      let motivo: MotivoOmisionTurno | null = null;
      if (!t.cliente.activo) motivo = 'CLIENTE_INACTIVO';
      else if (!estaDentroDeHorario(inicio, fin, franjas)) motivo = 'FUERA_DE_HORARIO';
      else if (bloqueos.some((b) => seCruzan(inicio, fin, b.inicio, b.fin))) motivo = 'EN_BLOQUEO';
      else if (ocupados.has(inicio.getTime())) motivo = 'TURNO_MISMO_INICIO';
      if (motivo) {
        omitidos.push({
          turnoOrigenId: t.id,
          inicio: inicio.toISOString(),
          cliente: t.cliente.nombre,
          motivo,
        });
        continue;
      }
      ocupados.add(inicio.getTime());
      nuevos.push({
        emprendimientoId,
        clienteId: t.clienteId,
        inicio,
        fin,
        descripcion: t.descripcion,
      });
    }
    const creados = nuevos.length
      ? await this.conMismoInicio(() => this.repo.crearVarios(nuevos))
      : [];
    return { creados: creados.map(aTurnoDto), omitidos };
  }

  private async buscarOFallar(emprendimientoId: string, id: string): Promise<TurnoConDatos> {
    const t = UUID.test(id) ? await this.repo.buscar(id, emprendimientoId) : null;
    if (!t) throw new DomainException('NO_ENCONTRADO');
    return t;
  }

  /** El cliente debe estar activo y pertenecer al emprendimiento (400 VALIDACION) */
  private async validarCliente(emprendimientoId: string, clienteId: string): Promise<void> {
    const cliente = await this.clientes
      .buscarDelEmprendimiento(emprendimientoId, clienteId)
      .catch(() => null);
    if (!cliente || !cliente.activo) {
      throw new DomainException('VALIDACION', 'El cliente no existe o está dado de baja.', [
        { field: 'clienteId', message: 'Elegí un cliente activo' },
      ]);
    }
  }

  /** RF-13: dentro del horario de atención (franjas contiguas unidas) y fuera de los bloqueos */
  private async validarHorario(emprendimientoId: string, inicio: Date, fin: Date): Promise<void> {
    const franjas = await this.agenda.listarFranjas(emprendimientoId);
    if (!estaDentroDeHorario(inicio, fin, franjas)) throw new DomainException('FUERA_DE_HORARIO');
    const bloqueos = await this.agenda.listarBloqueos(emprendimientoId, inicio, fin);
    if (bloqueos.length > 0) throw new DomainException('EN_BLOQUEO');
  }

  /** La base garantiza que dos turnos no cancelados no empiecen a la misma hora (ux_turnos_mismo_inicio) */
  private async conMismoInicio<T>(operacion: () => Promise<T>): Promise<T> {
    try {
      return await operacion();
    } catch (error) {
      if (esViolacionUnica(error)) throw new DomainException('TURNO_MISMO_INICIO');
      throw error;
    }
  }
}
