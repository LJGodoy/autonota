import { Module } from '@nestjs/common';
import { MovimientosController } from './controllers/movimientos.controller';
import { MovimientosService } from './services/movimientos.service';
import { MovimientosRepository } from './repositories/movimientos.repository';

/**
 * Ingresos y gastos, comunes a los tres tipos de negocio (Parte 3, sección 4.1; Parte 4, sección 9).
 * Los módulos turnero, clases y ventas lo usan a través de MovimientosService (ADR-005).
 */
@Module({
  controllers: [MovimientosController],
  providers: [MovimientosService, MovimientosRepository],
  exports: [MovimientosService],
})
export class MovimientosModule {}
