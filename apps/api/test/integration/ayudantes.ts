import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../../src/app.module';
import { configurarApp } from '../../src/configurar-app';

export const API = '/api/v1';

export async function crearApp(): Promise<NestExpressApplication> {
  const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = modulo.createNestApplication<NestExpressApplication>({ logger: false });
  configurarApp(app);
  await app.init();
  return app;
}

let ultimaIp = 0;
/** IP distinta por prueba, enviada en X-Forwarded-For, para no compartir el límite de intentos */
export function ipNueva(): string {
  ultimaIp += 1;
  return `10.${Math.floor(ultimaIp / 65536) % 256}.${Math.floor(ultimaIp / 256) % 256}.${ultimaIp % 256}`;
}

export function emailNuevo(): string {
  return `prueba-${randomUUID()}@mail.com`;
}

/** Extrae el valor de la cookie refresh_token de una respuesta */
export function cookieRefresh(res: request.Response): string | undefined {
  const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  const cookie = cookies.find((c) => c.startsWith('refresh_token='));
  return cookie?.split(';')[0];
}

export interface SesionDePrueba {
  accessToken: string;
  cookie: string;
  usuarioId: string;
  email: string;
  password: string;
}

export async function registrar(app: NestExpressApplication): Promise<SesionDePrueba> {
  const email = emailNuevo();
  const password = 'Tintura2026';
  const res = await request(app.getHttpServer())
    .post(`${API}/auth/registro`)
    .set('X-Forwarded-For', ipNueva())
    .send({ nombre: 'Persona de prueba', email, password, aceptaPolitica: true })
    .expect(201);
  return {
    accessToken: res.body.accessToken,
    cookie: cookieRefresh(res) ?? '',
    usuarioId: res.body.usuario.id,
    email,
    password,
  };
}
