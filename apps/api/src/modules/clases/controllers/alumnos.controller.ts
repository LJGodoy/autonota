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
import { z } from 'zod';
import {
  esquemaCrearPersona,
  esquemaEditarPersona,
  esquemaFiltroAlumnos,
  esquemaPaginacion,
  type Alumno,
  type Movimiento,
  type Paginado,
  type Persona,
} from '@autonota/shared';
import { EmprendimientoActual } from '../../../common/auth/decoradores';
import type { EmprendimientoDePeticion } from '../../../common/auth/peticion';
import {
  EmprendimientoGuard,
  TiposEmprendimiento,
} from '../../../common/emprendimiento/emprendimiento.guard';
import { AlumnosService } from '../services/alumnos.service';

class CrearAlumnoDto extends createZodDto(esquemaCrearPersona) {}
class EditarAlumnoDto extends createZodDto(esquemaEditarPersona) {}
class FiltroAlumnosDto extends createZodDto(esquemaFiltroAlumnos) {}
class PaginacionDto extends createZodDto(z.object(esquemaPaginacion).strict()) {}

/** Alumnos (Parte 4, sección 7.1; RF-30, RF-35, RF-38) */
@ApiTags('clases')
@ApiBearerAuth()
@Controller('emprendimientos/:eid/alumnos')
@UseGuards(EmprendimientoGuard)
@TiposEmprendimiento('CLASES')
export class AlumnosController {
  constructor(private readonly servicio: AlumnosService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lista alumnos; con mesPago agrega pagoEnMes; con sinPago=true solo los activos sin pago (RF-38)',
  })
  listar(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Query() f: FiltroAlumnosDto,
  ): Promise<Paginado<Alumno>> {
    return this.servicio.listarConPagos(emp.id, f);
  }

  @Post()
  @ApiOperation({ summary: 'Crea un alumno' })
  crear(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Body() dto: CrearAlumnoDto,
  ): Promise<Persona> {
    return this.servicio.crear(emp.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle' })
  obtener(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Param('id') id: string,
  ): Promise<Persona> {
    return this.servicio.obtener(emp.id, id);
  }

  @Get(':id/pagos')
  @ApiOperation({
    summary: 'Historial de pagos del alumno, del más reciente al más antiguo (RF-35)',
  })
  pagos(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Param('id') id: string,
    @Query() p: PaginacionDto,
  ): Promise<Paginado<Movimiento>> {
    return this.servicio.pagos(emp, id, p.page, p.pageSize);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita datos o reactiva (activo: true)' })
  editar(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Param('id') id: string,
    @Body() dto: EditarAlumnoDto,
  ): Promise<Persona> {
    return this.servicio.editar(emp.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Baja lógica (activo = false); conserva sus clases y pagos' })
  darDeBaja(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Param('id') id: string,
  ): Promise<void> {
    return this.servicio.darDeBaja(emp.id, id);
  }

  @Post(':id/anonimizar')
  @HttpCode(200)
  @ApiOperation({ summary: 'Borra los datos personales (CU-18). No se puede deshacer' })
  anonimizar(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Param('id') id: string,
  ): Promise<Persona> {
    return this.servicio.anonimizar(emp.id, id);
  }
}
