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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import {
  esquemaCrearTarea,
  esquemaEditarTarea,
  esquemaEstadoTarea,
  esquemaFiltroRealizadas,
  esquemaFiltroTareas,
  type Paginado,
  type Tarea,
  type TareaDetalle,
} from '@autonota/shared';
import { EmprendimientoActual } from '../../../common/auth/decoradores';
import type { EmprendimientoDePeticion } from '../../../common/auth/peticion';
import {
  EmprendimientoGuard,
  TiposEmprendimiento,
} from '../../../common/emprendimiento/emprendimiento.guard';
import { TareasService } from '../services/tareas.service';

class CrearTareaDto extends createZodDto(esquemaCrearTarea) {}
class EditarTareaDto extends createZodDto(esquemaEditarTarea) {}
class EstadoTareaDto extends createZodDto(esquemaEstadoTarea) {}
class FiltroRealizadasDto extends createZodDto(esquemaFiltroRealizadas) {}
class FiltroTareasDto extends createZodDto(esquemaFiltroTareas) {}

/** Tareas, en la interfaz "anotaciones" (Parte 4, sección 8) */
@ApiTags('ventas')
@ApiBearerAuth()
@Controller('emprendimientos/:eid/tareas')
@UseGuards(EmprendimientoGuard)
@TiposEmprendimiento('VENTAS')
export class TareasController {
  constructor(private readonly servicio: TareasService) {}

  @Get()
  @ApiOperation({ summary: 'Lista y filtra tareas por estado y prioridad (RF-54)' })
  listar(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Query() f: FiltroTareasDto,
  ): Promise<Paginado<Tarea>> {
    return this.servicio.listar(emp.id, f);
  }

  @Get('realizadas')
  @ApiOperation({ summary: 'Tareas realizadas, la terminada más recientemente primero' })
  listarRealizadas(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Query() f: FiltroRealizadasDto,
  ): Promise<Paginado<Tarea>> {
    return this.servicio.listarRealizadas(emp.id, f);
  }

  @Post()
  @ApiOperation({ summary: 'Crea una tarea PENDIENTE y registra el primer historial (RF-50)' })
  crear(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Body() dto: CrearTareaDto,
  ): Promise<TareaDetalle> {
    return this.servicio.crear(emp.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle con historial de estados y ventas vinculadas (RF-53, RF-55)' })
  obtener(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Param('id') id: string,
  ): Promise<TareaDetalle> {
    return this.servicio.obtener(emp.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita título, descripción o prioridad' })
  editar(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Param('id') id: string,
    @Body() dto: EditarTareaDto,
  ): Promise<TareaDetalle> {
    return this.servicio.editar(emp.id, id, dto);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Cambia el estado y agrega un registro al historial (RF-53, CU-11)' })
  cambiarEstado(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Param('id') id: string,
    @Body() dto: EstadoTareaDto,
  ): Promise<TareaDetalle> {
    return this.servicio.cambiarEstado(emp.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Elimina la tarea y su historial; sus ventas se conservan, sin vínculo',
  })
  eliminar(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Param('id') id: string,
  ): Promise<void> {
    return this.servicio.eliminar(emp.id, id);
  }
}
