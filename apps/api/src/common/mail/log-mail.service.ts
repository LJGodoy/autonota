import { Injectable, Logger } from '@nestjs/common';
import { MailService, type MensajeMail } from './mail.service';

/**
 * Implementación para desarrollo y pruebas, cuando no hay credenciales de Gmail:
 * escribe el texto del mail en el log de la API. Nunca se usa en producción
 * (la configuración exige las credenciales de Gmail en ese entorno).
 */
@Injectable()
export class LogMailService extends MailService {
  private readonly logger = new Logger('Mail');
  readonly enviados: MensajeMail[] = [];

  async enviar(mensaje: MensajeMail): Promise<void> {
    this.enviados.push(mensaje);
    if (process.env.NODE_ENV !== 'test') {
      this.logger.log(`Mail para ${mensaje.para}: ${mensaje.asunto}\n${mensaje.texto}`);
    }
  }
}
