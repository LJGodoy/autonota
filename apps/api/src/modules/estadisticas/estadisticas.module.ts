import { Module } from '@nestjs/common';
import { EstadisticasController } from './controllers/estadisticas.controller';
import { EstadisticasService } from './services/estadisticas.service';
import { EstadisticasRepository } from './repositories/estadisticas.repository';

/** Cálculos mensuales de ingresos, gastos y ventas (ADR-005) */
@Module({
  controllers: [EstadisticasController],
  providers: [EstadisticasService, EstadisticasRepository],
})
export class EstadisticasModule {}
