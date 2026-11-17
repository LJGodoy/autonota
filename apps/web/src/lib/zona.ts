// Conversión entre instantes UTC de la API y la "hora de pared" de Argentina (ADR-008).
// Argentina usa UTC-3 todo el año (no tiene horario de verano desde 2009). FullCalendar trabaja en
// "UTC" con fechas sin zona que representan la hora de Argentina, así no depende de la zona del navegador.
import { ZONA_ARGENTINA } from './fechas';

export const DESFASE_ARGENTINA = '-03:00';

const partes = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_ARGENTINA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/** "2026-11-20T10:00:00" (hora de Argentina) desde un instante ISO de la API */
export function aHoraLocal(iso: string): string {
  const p = Object.fromEntries(partes.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
}

/** ISO con zona para la API, desde fecha AAAA-MM-DD y hora HH:MM de Argentina */
export function aIsoArgentina(fecha: string, hora: string): string {
  return `${fecha}T${hora}:00${DESFASE_ARGENTINA}`;
}

/** Fecha que entrega FullCalendar (hora de Argentina guardada en los campos UTC) a ISO con zona */
export function desdeFechaCalendario(d: Date): string {
  const iso = d.toISOString(); // AAAA-MM-DDTHH:MM:SS.sssZ con la hora de Argentina
  return `${iso.slice(0, 19)}${DESFASE_ARGENTINA}`;
}

/** Fecha y hora de Argentina por separado, para formularios */
export function separarFechaHora(iso: string): { fecha: string; hora: string } {
  const local = aHoraLocal(iso);
  return { fecha: local.slice(0, 10), hora: local.slice(11, 16) };
}

/** Lunes (AAAA-MM-DD) de la semana de una fecha AAAA-MM-DD */
export function lunesDe(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  const dia = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (dia === 0 ? -6 : 1 - dia));
  return d.toISOString().slice(0, 10);
}

/** Suma días a una fecha AAAA-MM-DD */
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** "10:00" en hora de Argentina */
export function horaCorta(iso: string): string {
  return aHoraLocal(iso).slice(11, 16);
}
