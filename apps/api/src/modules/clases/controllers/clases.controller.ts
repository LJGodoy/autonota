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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import {
  esquemaBorrarClases,
  esquemaCopiarSemana,
  esquemaCrearClase,
  esquemaEditarClase,
  esquemaFiltroClases,
  type Clase,
  type ResultadoCopiaClases,
} from '@autonota/shared';
import { EmprendimientoActual } from '../../../common/auth/decoradores';
import type { EmprendimientoDePeticion } from '../../../common/auth/peticion';
import {
  EmprendimientoGuard,
  TiposEmprendimiento,
} from '../../../common/emprendimiento/emprendimiento.guard';
import { ClasesService } from '../services/clases.service';

class CrearClaseDto extends createZodDto(esquemaCrearClase) {}
class EditarClaseDto extends createZodDto(esquemaEditarClase) {}
class FiltroClasesDto extends createZodDto(esquemaFiltroClases) {}
class CopiarSemanaClasesDto extends createZodDto(esquemaCopiarSemana) {}
class BorrarClasesDto extends createZodDto(esquemaBorrarClases) {}

/** Clases (Parte 4, sección 7.2) */
@ApiTags('clases')
@ApiBearerAuth()
@Controller('emprendimientos/:eid/clases')
@UseGuards(EmprendimientoGuard)
@TiposEmprendimiento('CLASES')
export class ClasesController {
  constructor(private readonly servicio: ClasesService) {}

  @Get()
  @ApiOperation({
    summary:
      'Clases del rango para la vista diaria o semanal (RF-33), con el pago de cada alumno. Máximo 42 días',
  })
  listar(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Query() f: FiltroClasesDto,
  ): Promise<Clase[]> {
    return this.servicio.listar(emp.id, f.desde, f.hasta);
  }

  @Post()
  @ApiOperation({ summary: 'Crea una clase individual o grupal (RF-31)' })
  crear(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Body() dto: CrearClaseDto,
  ): Promise<Clase> {
    return this.servicio.crear(emp.id, dto);
  }

  @Post('copiar-semana')
  @ApiOperation({ summary: 'Copia las clases a la semana siguiente (RF-37, CU-10)' })
  @ApiResponse({ status: 201, description: '{ creadas, omitidas }' })
  @ApiResponse({ status: 409, description: 'SEMANA_DESTINO_OCUPADA' })
  copiarSemana(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Body() dto: CopiarSemanaClasesDto,
  ): Promise<ResultadoCopiaClases> {
    return this.servicio.copiarSemana(emp.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle con alumnos' })
  obtener(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Param('id') id: string,
  ): Promise<Clase> {
    return this.servicio.obtener(emp.id, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edita o reprograma una clase, incluida la lista de alumnos (RF-32)',
  })
  editar(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Param('id') id: string,
    @Body() dto: EditarClaseDto,
  ): Promise<Clase> {
    return this.servicio.editar(emp.id, id, dto);
  }

  @Delete()
  @ApiOperation({
    summary:
      'Borra las clases que empiezan en el rango (día o semana): { borradas }. Los ingresos quedan',
  })
  borrarDelRango(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Query() dto: BorrarClasesDto,
  ): Promise<{ borradas: number }> {
    return this.servicio.borrarDelRango(emp.id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Cancelar = borrar la clase (RF-32). Sus pagos pierden el vínculo; el ingreso queda',
  })
  eliminar(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Param('id') id: string,
  ): Promise<void> {
    return this.servicio.eliminar(emp.id, id);
  }
}
