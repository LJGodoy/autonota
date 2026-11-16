import { Global, Module } from '@nestjs/common';
import { AppConfig } from './config/config';
import { PrismaService } from './prisma/prisma.service';
import { EmprendimientoAccesoRepository } from './emprendimiento/emprendimiento-acceso.repository';
import { EmprendimientoGuard } from './emprendimiento/emprendimiento.guard';
import { MailService } from './mail/mail.service';
import { GmailMailService } from './mail/gmail-mail.service';
import { LogMailService } from './mail/log-mail.service';

/** Código común: configuración, Prisma, guard de emprendimiento y MailService (Parte 6, sección 4.1) */
@Global()
@Module({
  providers: [
    AppConfig,
    PrismaService,
    EmprendimientoAccesoRepository,
    EmprendimientoGuard,
    {
      provide: MailService,
      inject: [AppConfig],
      useFactory: (config: AppConfig): MailService => {
        const clientId = config.get('GMAIL_CLIENT_ID');
        const clientSecret = config.get('GMAIL_CLIENT_SECRET');
        const refreshToken = config.get('GMAIL_REFRESH_TOKEN');
        if (clientId && clientSecret && refreshToken) {
          return new GmailMailService({
            clientId,
            clientSecret,
            refreshToken,
            remitente: config.get('MAIL_FROM'),
          });
        }
        return new LogMailService();
      },
    },
  ],
  exports: [
    AppConfig,
    PrismaService,
    EmprendimientoAccesoRepository,
    EmprendimientoGuard,
    MailService,
  ],
})
export class CommonModule {}
