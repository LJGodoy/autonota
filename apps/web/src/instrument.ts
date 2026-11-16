// Sentry en el navegador (ADR-013), sin datos personales
import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    beforeSend(evento) {
      delete evento.user;
      if (evento.request) {
        delete evento.request.data;
        delete evento.request.cookies;
        delete evento.request.headers;
        delete evento.request.query_string;
      }
      return evento;
    },
  });
}
