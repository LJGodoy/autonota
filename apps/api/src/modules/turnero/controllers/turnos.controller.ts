import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Movimiento, ResultadoCopiaTurnos, Turno } from '@autonota/shared';
import { EmprendimientoActual } from '../../../common/auth/decoradores';
import type { EmprendimientoDePeticion } from '../../../common/auth/peticion';
import {
  EmprendimientoGuard,
  TiposEmprendimiento,
} from '../../../common/emprendimiento/emprendimiento.guard';
import { ClaveIdempotencia } from '../../../common/http/clave-idempotencia.decorator';
import { TurnosService } from '../services/turnos.service';
import {
  CobroTurnoDto,
  CopiarSemanaDto,
  CrearTurnoDto,
  EditarTurnoDto,
  FiltroTurnosDto,
  RealizarTurnoDto,
} from '../dto/turnero.dto';

const ENCABEZADO_CLAVE = {
  name: 'Idempotency-Key',
  required: false,
  description: 'UUID generado al abrir el formulario',
};

/** Turnos (Parte 4, sección 6.3) */
@ApiTags('turnero')
@ApiBearerAuth()
@Controller('emprendimientos/:eid/turnos')
@UseGuards(EmprendimientoGuard)
@TiposEmprendimiento('TURNERO')
export class TurnosController {
  constructor(private readonly servicio: TurnosService) {}

  @Get()
  @ApiOperation({ summary: 'Turnos del rango para la agenda (RF-17). Rango máximo: 31 días' })
  listar(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Query() f: FiltroTurnosDto,
  ): Promise<Turno[]> {
    return this.servicio.listar(emp.id, f);
  }

  @Post()
  @ApiOperation({ summary: 'Crea un turno (RF-12, RF-13, CU-06)' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 409, description: 'FUERA_DE_HORARIO, EN_BLOQUEO o TURNO_MISMO_INICIO' })
  crear(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Body() dto: CrearTurnoDto,
  ): Promise<Turno> {
    return this.servicio.crear(emp.id, dto);
  }

  @Post('copiar-semana')
  @ApiOperation({
    summary: 'Copia los turnos no cancelados de una semana a la siguiente (RF-21, CU-13)',
  })
  @ApiResponse({ status: 201, description: '{ creados, omitidos }' })
  @ApiResponse({ status: 409, description: 'SEMANA_DESTINO_OCUPADA' })
  copiarSemana(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Body() dto: CopiarSemanaDto,
  ): Promise<ResultadoCopiaTurnos> {
    return this.servicio.copiarSemana(emp.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle, con cliente, cobros y total cobrado' })
  obtener(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Param('id') id: string,
  ): Promise<Turno> {
    return this.servicio.obtener(emp.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Reubica o edita un turno PROGRAMADO (RF-15, CU-07)' })
  @ApiResponse({
    status: 409,
    description: 'ESTADO_INVALIDO, FUERA_DE_HORARIO, EN_BLOQUEO o TURNO_MISMO_INICIO',
  })
  editar(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Param('id') id: string,
    @Body() dto: EditarTurnoDto,
  ): Promise<Turno> {
    return this.servicio.editar(emp.id, id, dto);
  }

  @Post(':id/cancelar')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancela un turno PROGRAMADO (RF-14)' })
  cancelar(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Param('id') id: string,
  ): Promise<Turno> {
    return this.servicio.cancelar(emp.id, id);
  }

  @Post(':id/ausente')
  @HttpCode(200)
  @ApiOperation({ summary: 'Marca el turno como AUSENTE (RF-14)' })
  ausente(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Param('id') id: string,
  ): Promise<Turno> {
    return this.servicio.marcarAusente(emp.id, id);
  }

  @Post(':id/realizar')
  @HttpCode(200)
  @ApiHeader(ENCABEZADO_CLAVE)
  @ApiOperation({
    summary:
      'Marca el turno como REALIZADO, con cobro opcional en la misma transacción (RF-16, CU-08)',
  })
  realizar(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Param('id') id: string,
    @Body() dto: RealizarTurnoDto,
    @ClaveIdempotencia() clave: string | undefined,
  ): Promise<Turno> {
    return this.servicio.realizar(emp.id, id, dto, clave);
  }

  @Post(':id/cobros')
  @ApiHeader(ENCABEZADO_CLAVE)
  @ApiOperation({ summary: 'Registra un cobro del turno: seña, pago parcial o total (RF-16)' })
  @ApiResponse({ status: 201, description: 'Movimiento' })
  cobrar(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Param('id') id: string,
    @Body() dto: CobroTurnoDto,
    @ClaveIdempotencia() clave: string | undefined,
  ): Promise<Movimiento> {
    return this.servicio.registrarCobro(emp.id, id, dto, clave);
  }
}
