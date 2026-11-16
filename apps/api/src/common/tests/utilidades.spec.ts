import { centavosANumero, pesosACentavos } from '../utils/dinero';
import {
  aHoraArgentina,
  desdeHoraArgentina,
  formatearFecha,
  hoyEnArgentina,
  lunesDeLaSemana,
  primerDiaDelMes,
} from '../utils/fechas';
import { generarTokenAleatorio, hashToken } from '../utils/tokens';
import { validarEnv } from '../config/env';
import { GmailMailService } from '../mail/gmail-mail.service';

describe('utilidades de dinero', () => {
  it('debería convertir centavos bigint a number sin perder precisión', () => {
    expect(centavosANumero(850050n)).toBe(850050);
  });

  it('debería rechazar montos fuera del rango representable', () => {
    expect(() => centavosANumero(BigInt(Number.MAX_SAFE_INTEGER) + 1n)).toThrow();
  });

  it('debería convertir pesos enteros a centavos', () => {
    expect(pesosACentavos(35000)).toBe(3500000n);
    expect(() => pesosACentavos(1.5)).toThrow();
  });
});

describe('utilidades de fechas', () => {
  it('debería convertir la hora de Argentina a UTC', () => {
    expect(desdeHoraArgentina(2026, 11, 20, 10, 0).toISOString()).toBe('2026-11-20T13:00:00.000Z');
  });

  it('debería obtener los componentes en hora de Argentina y el día ISO', () => {
    const r = aHoraArgentina(new Date('2026-11-23T02:30:00Z')); // domingo 22 a las 23:30
    expect(r).toMatchObject({
      anio: 2026,
      mes: 11,
      dia: 22,
      hora: 23,
      minuto: 30,
      diaSemanaIso: 7,
    });
  });

  it('debería calcular el día actual en Argentina aunque en UTC ya sea el día siguiente', () => {
    expect(formatearFecha(hoyEnArgentina(new Date('2026-11-16T01:00:00Z')))).toBe('2026-11-15');
  });

  it('debería calcular el primer día del mes y el lunes de la semana', () => {
    const fecha = new Date(Date.UTC(2026, 10, 19)); // jueves 19/11
    expect(formatearFecha(primerDiaDelMes(fecha))).toBe('2026-11-01');
    expect(formatearFecha(lunesDeLaSemana(fecha))).toBe('2026-11-16');
    expect(formatearFecha(lunesDeLaSemana(new Date(Date.UTC(2026, 10, 22))))).toBe('2026-11-16');
  });
});

describe('tokens', () => {
  it('debería generar tokens distintos y un hash estable', () => {
    const a = generarTokenAleatorio();
    expect(a).not.toBe(generarTokenAleatorio());
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).not.toContain(a);
  });
});

describe('validarEnv', () => {
  const base = {
    DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
    JWT_ACCESS_SECRET: 'x'.repeat(32),
    APP_URL: 'http://localhost:5173',
    MAIL_FROM: 'AutoNota <a@b.com>',
  };

  it('debería aceptar una configuración de desarrollo sin credenciales de Gmail', () => {
    expect(validarEnv(base).REFRESH_TOKEN_DIAS).toBe(30);
  });

  it('debería impedir arrancar si falta una variable obligatoria', () => {
    expect(() => validarEnv({ ...base, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
  });

  it('debería exigir las credenciales de Gmail en producción', () => {
    expect(() => validarEnv({ ...base, NODE_ENV: 'production' })).toThrow(/GMAIL_CLIENT_ID/);
  });
});

describe('GmailMailService', () => {
  it('debería renovar el token de OAuth y enviar el mensaje con users.messages.send', async () => {
    const llamadas: string[] = [];
    const fetchFalso = jest.fn(async (url: string | URL | Request) => {
      llamadas.push(String(url));
      return String(url).includes('oauth2')
        ? new Response(JSON.stringify({ access_token: 'tok' }), { status: 200 })
        : new Response('{}', { status: 200 });
    });
    const servicio = new GmailMailService(
      { clientId: 'id', clientSecret: 's', refreshToken: 'r', remitente: 'AutoNota <a@b.com>' },
      fetchFalso as unknown as typeof fetch,
    );
    await servicio.enviar({
      para: 'x@y.com',
      asunto: 'Recuperá tu contraseña',
      texto: 't',
      html: '<p>t</p>',
    });
    expect(llamadas).toEqual([
      'https://oauth2.googleapis.com/token',
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    ]);
  });

  it('debería fallar si Gmail rechaza el envío', async () => {
    const fetchFalso = jest.fn(async (url: string | URL | Request) =>
      String(url).includes('oauth2')
        ? new Response(JSON.stringify({ access_token: 'tok' }), { status: 200 })
        : new Response('{}', { status: 403 }),
    );
    const servicio = new GmailMailService(
      { clientId: 'id', clientSecret: 's', refreshToken: 'r', remitente: 'a@b.com' },
      fetchFalso as unknown as typeof fetch,
    );
    await expect(
      servicio.enviar({ para: 'x@y.com', asunto: 'a', texto: 't', html: 'h' }),
    ).rejects.toThrow();
  });
});
