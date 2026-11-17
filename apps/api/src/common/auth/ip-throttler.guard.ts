import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { obtenerIpCliente } from './ip-cliente';

/** Límite de intentos por la IP real del visitante, también detrás del proxy de Vercel */
@Injectable()
export class IpThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    return obtenerIpCliente(req as unknown as Request);
  }
}
