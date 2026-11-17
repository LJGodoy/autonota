import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { SALTOS_PROXY_PRODUCCION } from './common/auth/ip-cliente';

export const PREFIJO_API = 'api/v1';

/** Configuración común de la aplicación, usada por main.ts y por las pruebas de integración */
export function configurarApp(app: NestExpressApplication): void {
  // ADR-010: en producción se confía en los 3 saltos de Render (proxy local, balanceador y
  // Cloudflare); la IP del visitante detrás de Vercel la resuelve obtenerIpCliente. En local, 1 salto.
  app.set('trust proxy', process.env.NODE_ENV === 'production' ? SALTOS_PROXY_PRODUCCION : 1);
  app.use(helmet());
  app.use(cookieParser());
  app.setGlobalPrefix(PREFIJO_API);

  // Documentación OpenAPI generada desde los esquemas Zod (ADR-003, ADR-012)
  const documento = cleanupOpenApiDoc(
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('AutoNota API')
        .setDescription('API REST de AutoNota (SDD, Parte 4)')
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    ),
  );
  SwaggerModule.setup('api/docs', app, documento);
}
