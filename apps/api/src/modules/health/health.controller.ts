import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Publico } from '../../common/auth/publico.decorator';

@ApiTags('salud')
@Controller('health')
export class HealthController {
  /** ADR-010: responde sin consultar la base, para no mantenerla activa sin necesidad */
  @Get()
  @Publico()
  @SkipThrottle()
  @ApiOperation({ summary: 'Salud de la API, para el ping periódico' })
  salud(): { estado: 'ok' } {
    return { estado: 'ok' };
  }
}
