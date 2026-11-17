import { Module } from '@nestjs/common';
import { TareasController } from './controllers/tareas.controller';
import { TareasService } from './services/tareas.service';
import { TareasRepository } from './repositories/tareas.repository';

/** Tareas (anotaciones) e historial de estados (ADR-005). Las ventas y gastos usan /movimientos. */
@Module({
  controllers: [TareasController],
  providers: [TareasService, TareasRepository],
})
export class VentasModule {}
