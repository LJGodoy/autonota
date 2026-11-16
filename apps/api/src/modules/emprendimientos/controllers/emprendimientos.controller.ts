import { Body, Controller, Delete, Get, HttpCode, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Emprendimiento } from '@autonota/shared';
import { EmprendimientoActual, UsuarioActual } from '../../../common/auth/decoradores';
import type { EmprendimientoDePeticion, UsuarioAutenticado } from '../../../common/auth/peticion';
import { EmprendimientoGuard } from '../../../common/emprendimiento/emprendimiento.guard';
import { EmprendimientosService } from '../services/emprendimientos.service';
import {
  CrearEmprendimientoDto,
  EditarEmprendimientoDto,
  EliminarEmprendimientoDto,
} from '../dto/emprendimiento.dto';

@ApiTags('emprendimientos')
@ApiBearerAuth()
@Controller('emprendimientos')
export class EmprendimientosController {
  constructor(private readonly servicio: EmprendimientosService) {}

  @Get()
  @ApiOperation({ summary: 'Lista los emprendimientos del usuario (RF-04)' })
  @ApiResponse({ status: 200 })
  listar(@UsuarioActual() usuario: UsuarioAutenticado): Promise<Emprendimiento[]> {
    return this.servicio.listar(usuario.id);
  }

  @Post()
  @ApiOperation({ summary: 'Crea un emprendimiento (RF-02, CU-04)' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 409, description: 'LIMITE_EMPRENDIMIENTOS' })
  crear(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: CrearEmprendimientoDto,
  ): Promise<Emprendimiento> {
    return this.servicio.crear(usuario.id, dto);
  }

  @Get(':eid')
  @UseGuards(EmprendimientoGuard)
  @ApiOperation({ summary: 'Detalle de un emprendimiento' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'NO_ENCONTRADO' })
  obtener(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
  ): Promise<Emprendimiento> {
    return this.servicio.obtener(emp.id, usuario.id);
  }

  @Patch(':eid')
  @UseGuards(EmprendimientoGuard)
  @ApiOperation({ summary: 'Cambia el nombre (RF-05). El tipo no se puede cambiar' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'NO_ENCONTRADO' })
  renombrar(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Body() dto: EditarEmprendimientoDto,
  ): Promise<Emprendimiento> {
    return this.servicio.renombrar(emp.id, dto.nombre);
  }

  @Delete(':eid')
  @HttpCode(204)
  @UseGuards(EmprendimientoGuard)
  @ApiOperation({ summary: 'Elimina el emprendimiento y todos sus datos (RF-06, CU-05)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 400, description: 'VALIDACION (el nombre no coincide)' })
  @ApiResponse({ status: 404, description: 'NO_ENCONTRADO' })
  eliminar(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Body() dto: EliminarEmprendimientoDto,
  ): Promise<void> {
    return this.servicio.eliminar(emp, dto.confirmarNombre);
  }
}
