/** Mensaje de correo saliente */
export interface MensajeMail {
  para: string;
  asunto: string;
  texto: string;
  html: string;
}

/**
 * Interfaz propia de envío de correos (ADR-011). Permite cambiar de proveedor
 * (por ejemplo, a Resend) cambiando solo la implementación.
 */
export abstract class MailService {
  abstract enviar(mensaje: MensajeMail): Promise<void>;
}
