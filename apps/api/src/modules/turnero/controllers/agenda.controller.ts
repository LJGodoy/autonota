import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Bloqueo, FranjaGuardada } from '@autonota/shared';
import { EmprendimientoActual } from '../../../common/auth/decoradores';
import type { EmprendimientoDePeticion } from '../../../common/auth/peticion';
import {
  EmprendimientoGuard,
  TiposEmprendimiento,
} from '../../../common/emprendimiento/emprendimiento.guard';
import { AgendaService } from '../services/agenda.service';
import { ConfirmarDto, CrearBloqueoDto, HorariosDto, RangoBloqueosDto } from '../dto/turnero.dto';

/** Horarios de atención y bloqueos (Parte 4, sección 6.1) */
@ApiTags('turnero')
@ApiBearerAuth()
@Controller('emprendimientos/:eid')
@UseGuards(EmprendimientoGuard)
@TiposEmprendimiento('TURNERO')
export class AgendaController {
  constructor(private readonly servicio: AgendaService) {}

  @Get('horarios-atencion')
  @ApiOperation({ summary: 'Franjas de atención de la semana' })
  listarFranjas(@EmprendimientoActual() emp: EmprendimientoDePeticion): Promise<FranjaGuardada[]> {
    return this.servicio.listarFranjas(emp.id);
  }

  @Put('horarios-atencion')
  @ApiOperation({
    summary: 'Reemplaza las franjas (RF-10). 409 TURNOS_AFECTADOS; ?confirmar=true guarda igual',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 409, description: 'TURNOS_AFECTADOS' })
  reemplazarFranjas(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Body() franjas: HorariosDto,
    @Query() q: ConfirmarDto,
  ): Promise<FranjaGuardada[]> {
    return this.servicio.reemplazarFranjas(
      emp.id,
      franjas as unknown as FranjaGuardada[],
      q.confirmar,
    );
  }

  @Get('bloqueos')
  @ApiOperation({ summary: 'Bloqueos en un rango de fechas' })
  listarBloqueos(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Query() q: RangoBloqueosDto,
  ): Promise<Bloqueo[]> {
    return this.servicio.listarBloqueos(emp.id, q.desde, q.hasta);
  }

  @Post('bloqueos')
  @ApiOperation({
    summary: 'Crea un bloqueo (RF-11). 409 TURNOS_AFECTADOS; ?confirmar=true guarda igual',
  })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 409, description: 'TURNOS_AFECTADOS' })
  crearBloqueo(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Body() dto: CrearBloqueoDto,
    @Query() q: ConfirmarDto,
  ): Promise<Bloqueo> {
    return this.servicio.crearBloqueo(emp.id, dto, q.confirmar);
  }

  @Delete('bloqueos/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Elimina un bloqueo' })
  eliminarBloqueo(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Param('id') id: string,
  ): Promise<void> {
    return this.servicio.eliminarBloqueo(emp.id, id);
  }
}
