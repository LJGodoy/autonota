// Sentry (ADR-013). Se importa antes que todo lo demás en main.ts.
// No se envían datos personales: sin datos del usuario, cuerpos, cookies ni encabezados de autenticación.
import * as Sentry from '@sentry/nestjs';

const dsn = process.env.SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(evento) {
      if (evento.request) {
        delete evento.request.data;
        delete evento.request.cookies;
        delete evento.request.query_string;
        if (evento.request.headers) {
          delete evento.request.headers.authorization;
          delete evento.request.headers.cookie;
        }
      }
      delete evento.user;
      return evento;
    },
  });
}
