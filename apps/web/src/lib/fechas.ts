// Formato de fechas en la zona horaria de Argentina (ADR-008)
export const ZONA_ARGENTINA = 'America/Argentina/Buenos_Aires';

const fechaHora = new Intl.DateTimeFormat('es-AR', {
  timeZone: ZONA_ARGENTINA,
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

const fechaLarga = new Intl.DateTimeFormat('es-AR', {
  timeZone: ZONA_ARGENTINA,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/** "17 de noviembre, 18:00" */
export function formatearFechaHora(iso: string): string {
  return fechaHora.format(new Date(iso));
}

/** "lunes, 17 de noviembre" */
export function formatearFechaLarga(fecha: Date = new Date()): string {
  return fechaLarga.format(fecha);
}
