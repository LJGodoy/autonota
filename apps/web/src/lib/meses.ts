// Fechas sin hora y meses en la zona horaria de Argentina (ADR-008)
import { ZONA_ARGENTINA } from './fechas';

const partes = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_ARGENTINA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Día de hoy en Argentina, AAAA-MM-DD */
export function hoyArgentina(ahora: Date = new Date()): string {
  return partes.format(ahora);
}

/** Mes en curso en Argentina, AAAA-MM */
export function mesActual(ahora: Date = new Date()): string {
  return hoyArgentina(ahora).slice(0, 7);
}

/** Suma (o resta) meses a un mes AAAA-MM */
export function sumarMeses(mes: string, cantidad: number): string {
  const [a, m] = mes.split('-').map(Number) as [number, number];
  const fecha = new Date(Date.UTC(a, m - 1 + cantidad, 1));
  return fecha.toISOString().slice(0, 7);
}

export const NOMBRES_MES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

/** "noviembre de 2026" */
export function formatearMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number) as [number, number];
  return `${NOMBRES_MES[m - 1]} de ${a}`;
}

/** "nov. 26", para ejes de gráficos */
export function formatearMesCorto(mes: string): string {
  const [a, m] = mes.split('-').map(Number) as [number, number];
  return `${NOMBRES_MES[m - 1]?.slice(0, 3)}. ${String(a).slice(2)}`;
}

/** "14/11/2026" desde AAAA-MM-DD */
export function formatearFechaCorta(fecha: string): string {
  const [a, m, d] = fecha.split('-');
  return `${d}/${m}/${a}`;
}
