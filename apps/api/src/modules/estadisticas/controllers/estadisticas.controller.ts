import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { esquemaRangoEstadisticas, type Estadisticas } from '@autonota/shared';
import { EmprendimientoActual } from '../../../common/auth/decoradores';
import type { EmprendimientoDePeticion } from '../../../common/auth/peticion';
import { EmprendimientoGuard } from '../../../common/emprendimiento/emprendimiento.guard';
import { EstadisticasService } from '../services/estadisticas.service';

class RangoEstadisticasDto extends createZodDto(esquemaRangoEstadisticas) {}

@ApiTags('estadisticas')
@ApiBearerAuth()
@Controller('emprendimientos/:eid/estadisticas')
@UseGuards(EmprendimientoGuard)
export class EstadisticasController {
  constructor(private readonly servicio: EstadisticasService) {}

  @Get()
  @ApiOperation({
    summary: 'Totales por mes entre dos meses AAAA-MM, máximo 24 (RF-70, RF-71, RF-72)',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'VALIDACION' })
  obtener(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Query() rango: RangoEstadisticasDto,
  ): Promise<Estadisticas> {
    return this.servicio.obtener(emp.id, rango);
  }
}
