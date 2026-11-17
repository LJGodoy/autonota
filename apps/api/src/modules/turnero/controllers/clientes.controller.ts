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
import type { Paginado, Persona } from '@autonota/shared';
import { EmprendimientoActual } from '../../../common/auth/decoradores';
import type { EmprendimientoDePeticion } from '../../../common/auth/peticion';
import {
  EmprendimientoGuard,
  TiposEmprendimiento,
} from '../../../common/emprendimiento/emprendimiento.guard';
import { ClientesService } from '../services/clientes.service';
import { CrearClienteDto, EditarClienteDto, FiltroClientesDto } from '../dto/turnero.dto';

/** Clientes del turnero (Parte 4, sección 6.2; RF-19) */
@ApiTags('turnero')
@ApiBearerAuth()
@Controller('emprendimientos/:eid/clientes')
@UseGuards(EmprendimientoGuard)
@TiposEmprendimiento('TURNERO')
export class ClientesController {
  constructor(private readonly servicio: ClientesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista clientes; q busca por nombre o teléfono; activo por defecto true',
  })
  listar(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Query() f: FiltroClientesDto,
  ): Promise<Paginado<Persona>> {
    return this.servicio.listar(emp.id, f);
  }

  @Post()
  @ApiOperation({ summary: 'Crea un cliente' })
  crear(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Body() dto: CrearClienteDto,
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

  @Patch(':id')
  @ApiOperation({ summary: 'Edita datos o reactiva (activo: true)' })
  editar(
    @EmprendimientoActual() emp: EmprendimientoDePeticion,
    @Param('id') id: string,
    @Body() dto: EditarClienteDto,
  ): Promise<Persona> {
    return this.servicio.editar(emp.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Baja lógica (activo = false); conserva sus turnos' })
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
