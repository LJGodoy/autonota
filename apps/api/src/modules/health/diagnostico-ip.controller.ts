import { Controller, Get, Req } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { Publico } from '../../common/auth/publico.decorator';

/**
 * TEMPORAL (fase 3): muestra la cadena de proxies que llega a la API para ajustar trust proxy.
 * Solo devuelve datos de la propia petición. Se elimina después de verificar el límite de intentos.
 */
@ApiExcludeController()
@Controller('health')
export class DiagnosticoIpController {
  @Get('diagnostico-ip')
  @Publico()
  diagnostico(@Req() req: Request) {
    const h = (n: string) => req.headers[n] ?? null;
    return {
      ip: req.ip,
      ips: req.ips,
      socket: req.socket.remoteAddress,
      xForwardedFor: h('x-forwarded-for'),
      xRealIp: h('x-real-ip'),
      xVercelForwardedFor: h('x-vercel-forwarded-for'),
      xVercelId: h('x-vercel-id') ? 'presente' : null,
      cfConnectingIp: h('cf-connecting-ip'),
      trueClientIp: h('true-client-ip'),
    };
  }
}
