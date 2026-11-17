import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Movimiento, Paginado } from '@autonota/shared';
import { EmprendimientoActual } from '../../../common/auth/decoradores';
import type { EmprendimientoDePeticion } from '../../../common/auth/peticion';
import { EmprendimientoGuard } from '../../../common/emprendimiento/emprendimiento.guard';
import { ClaveIdempotencia } from '../../../common/http/clave-idempotencia.decorator';
import { MovimientosService } from '../services/movimientos.service';
import {
  CrearMovimientoDto,
  EditarMovimientoDto,
  FiltroMovimientosDto,
} from '../dto/movimiento.dto';

/** Ingresos y gastos de los tres tipos de negocio (Parte 4, sección 9) */
@ApiTags('movimientos')
@ApiBearerAuth()
@Controller('emprendimientos/:eid/movimientos')
@UseGuards(EmprendimientoGuard)
export class MovimientosController {
  constructor(private readonly servicio: MovimientosService) {}

  @Get()
  @ApiOperation({ summary: 'Listado filtrable por tipo y por mes de imputación (RF-73)' })
  @ApiResponse({ status: 200, description: 'Paginado' })
  listar(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Query() filtro: FiltroMovimientosDto,
  ): Promise<Paginado<Movimiento>> {
    return this.servicio.listar(emp, filtro);
  }

  @Post()
  @ApiOperation({ summary: 'Registra un ingreso o un gasto (RF-07)' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'UUID generado al abrir el formulario',
  })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 400, description: 'VALIDACION' })
  @ApiResponse({ status: 409, description: 'TIPO_INCOMPATIBLE' })
  crear(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Body() dto: CrearMovimientoDto,
    @ClaveIdempotencia() clave: string | undefined,
  ): Promise<Movimiento> {
    return this.servicio.crear(emp, dto, clave);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Corrige monto, fecha, descripción, medio de pago o mes (RF-07)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'NO_ENCONTRADO' })
  editar(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Param('id') id: string,
    @Body() dto: EditarMovimientoDto,
  ): Promise<Movimiento> {
    return this.servicio.editar(emp, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Elimina un movimiento cargado por error (RF-07)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'NO_ENCONTRADO' })
  eliminar(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Param('id') id: string,
  ): Promise<void> {
    return this.servicio.eliminar(emp, id);
  }
}
