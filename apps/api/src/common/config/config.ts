import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './env';

/** Acceso tipado a la configuración validada */
@Injectable()
export class AppConfig {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get<K extends keyof Env>(clave: K): Env[K] {
    return this.config.get(clave, { infer: true });
  }

  get esProduccion(): boolean {
    return this.get('NODE_ENV') === 'production';
  }
}
