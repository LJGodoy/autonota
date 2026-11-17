import { Injectable } from '@nestjs/common';
import { MailService, type MensajeMail } from './mail.service';

export interface CredencialesGmail {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  remitente: string;
}

/**
 * Motivo del error que devuelve Google (por ejemplo invalid_grant o "Gmail API has not been used").
 * Solo se toman los campos de error y el texto se recorta: nunca incluye credenciales.
 */
async function motivoGoogle(res: Response): Promise<string> {
  try {
    const cuerpo = (await res.json()) as {
      error?: string | { status?: string; message?: string };
      error_description?: string;
    };
    const error = cuerpo.error;
    const texto =
      typeof error === 'string'
        ? `${error}${cuerpo.error_description ? ` (${cuerpo.error_description})` : ''}`
        : `${error?.status ?? ''} ${error?.message ?? ''}`.trim();
    return texto.slice(0, 300) || 'sin detalle';
  } catch {
    return 'sin detalle';
  }
}

/** Codifica un encabezado con caracteres no ASCII (RFC 2047) */
function encabezado(texto: string): string {
  // eslint-disable-next-line no-control-regex
  return /^[\x00-\x7F]*$/.test(texto)
    ? texto
    : `=?UTF-8?B?${Buffer.from(texto).toString('base64')}?=`;
}

/**
 * Envío con la API de Gmail por HTTPS (users.messages.send), autenticado con OAuth 2.0
 * y el permiso gmail.send (ADR-011). Usa el puerto 443, que Render no bloquea.
 */
@Injectable()
export class GmailMailService extends MailService {
  constructor(
    private readonly credenciales: CredencialesGmail,
    private readonly fetchFn: typeof fetch = fetch,
  ) {
    super();
  }

  async enviar(mensaje: MensajeMail): Promise<void> {
    const accessToken = await this.obtenerAccessToken();
    const limite = `autonota-${Date.now().toString(36)}`;
    const mime = [
      `From: ${this.credenciales.remitente}`,
      `To: ${mensaje.para}`,
      `Subject: ${encabezado(mensaje.asunto)}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${limite}"`,
      '',
      `--${limite}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(mensaje.texto).toString('base64'),
      `--${limite}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(mensaje.html).toString('base64'),
      `--${limite}--`,
    ].join('\r\n');

    const res = await this.fetchFn('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: Buffer.from(mime).toString('base64url') }),
    });
    if (!res.ok) {
      throw new Error(
        `Gmail respondió ${res.status} al enviar el mail: ${await motivoGoogle(res)}`,
      );
    }
  }

  private async obtenerAccessToken(): Promise<string> {
    const res = await this.fetchFn('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.credenciales.clientId,
        client_secret: this.credenciales.clientSecret,
        refresh_token: this.credenciales.refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) {
      throw new Error(
        `Google OAuth respondió ${res.status} al renovar el token: ${await motivoGoogle(res)}`,
      );
    }
    const datos = (await res.json()) as { access_token?: string };
    if (!datos.access_token) throw new Error('Google OAuth no devolvió access_token');
    return datos.access_token;
  }
}
