import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';
import { validarEnv, type Env } from './common/config/env';
import { CommonModule } from './common/common.module';
import { ErroresFilter } from './common/errors/errores.filter';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { EmprendimientosModule } from './modules/emprendimientos/emprendimientos.module';
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validarEnv, cache: true }),
    // Logs estructurados en JSON. Nunca se registran tokens, cookies ni cuerpos (Parte 6, sección 4.2)
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
          remove: true,
        },
        serializers: {
          req: (req: { id: unknown; method: string; url: string }) => ({
            id: req.id,
            method: req.method,
            // Sin query string: puede llevar datos (por ejemplo, búsquedas)
            url: req.url.split('?')[0],
          }),
        },
      },
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
        signOptions: { expiresIn: '15m' }, // ADR-006
      }),
    }),
    // Límite de intentos por IP (Parte 4, sección 4): 5 por minuto en auth y 3 demos por hora
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'auth', ttl: 60_000, limit: 5 },
        { name: 'demo', ttl: 3_600_000, limit: 3 },
      ],
    }),
    ScheduleModule.forRoot(),
    CommonModule,
    AuthModule,
    EmprendimientosModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: ErroresFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
