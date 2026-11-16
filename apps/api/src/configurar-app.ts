import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { cleanupOpenApiDoc } from 'nestjs-zod';

export const PREFIJO_API = 'api/v1';

/** Configuración común de la aplicación, usada por main.ts y por las pruebas de integración */
export function configurarApp(app: NestExpressApplication): void {
  // ADR-010: la API recibe todo desde el proxy de Vercel (y el balanceador de Render) y toma la IP
  // real de X-Forwarded-For para el límite de intentos. En producción se confía en esos dos saltos.
  app.set('trust proxy', process.env.NODE_ENV === 'production' ? 2 : 1);
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
