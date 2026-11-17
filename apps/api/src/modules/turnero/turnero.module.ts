import { Module } from '@nestjs/common';
import { MovimientosModule } from '../movimientos/movimientos.module';
import { AgendaController } from './controllers/agenda.controller';
import { ClientesController } from './controllers/clientes.controller';
import { TurnosController } from './controllers/turnos.controller';
import { AgendaService } from './services/agenda.service';
import { ClientesService } from './services/clientes.service';
import { TurnosService } from './services/turnos.service';
import { AgendaRepository } from './repositories/agenda.repository';
import { ClientesRepository } from './repositories/clientes.repository';
import { TurnosRepository } from './repositories/turnos.repository';

/** Horarios de atención, bloqueos, clientes, turnos y cobros (ADR-005) */
@Module({
  imports: [MovimientosModule],
  controllers: [AgendaController, ClientesController, TurnosController],
  providers: [
    AgendaService,
    ClientesService,
    TurnosService,
    AgendaRepository,
    ClientesRepository,
    TurnosRepository,
  ],
})
export class TurneroModule {}
