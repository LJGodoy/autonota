import { Module } from '@nestjs/common';
import { MovimientosModule } from '../movimientos/movimientos.module';
import { AlumnosController } from './controllers/alumnos.controller';
import { ClasesController } from './controllers/clases.controller';
import { AlumnosService } from './services/alumnos.service';
import { ClasesService } from './services/clases.service';
import { AlumnosRepository } from './repositories/alumnos.repository';
import { ClasesRepository } from './repositories/clases.repository';

/** Alumnos, clases semanales y pagos (ADR-005). Los pagos y gastos usan MovimientosService. */
@Module({
  imports: [MovimientosModule],
  controllers: [AlumnosController, ClasesController],
  providers: [AlumnosService, ClasesService, AlumnosRepository, ClasesRepository],
})
export class ClasesModule {}
