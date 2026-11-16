import { Module } from '@nestjs/common';
import { EmprendimientosController } from './controllers/emprendimientos.controller';
import { EmprendimientosService } from './services/emprendimientos.service';
import { EmprendimientosRepository } from './repositories/emprendimientos.repository';

/** Alta, edición, baja y límite de 3 por usuario (ADR-005) */
@Module({
  controllers: [EmprendimientosController],
  providers: [EmprendimientosService, EmprendimientosRepository],
  exports: [EmprendimientosService],
})
export class EmprendimientosModule {}
