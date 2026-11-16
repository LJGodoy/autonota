import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsuariosRepository } from '../repositories/usuarios.repository';

/** ADR-014: tarea programada que corre cada hora y elimina las cuentas de demostración vencidas */
@Injectable()
export class DemoLimpiezaService {
  private readonly logger = new Logger(DemoLimpiezaService.name);

  constructor(private readonly usuarios: UsuariosRepository) {}

  @Cron(CronExpression.EVERY_HOUR, { name: 'limpiar-demos-vencidas' })
  async limpiar(ahora: Date = new Date()): Promise<number> {
    const eliminadas = await this.usuarios.eliminarDemosVencidos(ahora);
    if (eliminadas > 0) this.logger.log(`Cuentas de demostración eliminadas: ${eliminadas}`);
    return eliminadas;
  }
}
