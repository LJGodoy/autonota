// Única utilidad de conversión a la hora de Argentina (ADR-008; Parte 6, sección 4.2)
import { TZDate } from '@date-fns/tz';
import { addDays, format } from 'date-fns';

export const ZONA_ARGENTINA = 'America/Argentina/Buenos_Aires';

/** Fecha y hora local de Argentina convertida al instante UTC */
export function desdeHoraArgentina(
  anio: number,
  mes: number,
  dia: number,
  hora = 0,
  minuto = 0,
): Date {
  return new Date(new TZDate(anio, mes - 1, dia, hora, minuto, ZONA_ARGENTINA).getTime());
}

/** Componentes de un instante en la hora de Argentina */
export function aHoraArgentina(instante: Date): {
  anio: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  diaSemanaIso: number;
} {
  const local = new TZDate(instante.getTime(), ZONA_ARGENTINA);
  const diaSemana = local.getDay();
  return {
    anio: local.getFullYear(),
    mes: local.getMonth() + 1,
    dia: local.getDate(),
    hora: local.getHours(),
    minuto: local.getMinutes(),
    diaSemanaIso: diaSemana === 0 ? 7 : diaSemana,
  };
}

/** Día actual en Argentina, como fecha DATE (medianoche UTC del mismo día calendario) */
export function hoyEnArgentina(ahora: Date = new Date()): Date {
  const { anio, mes, dia } = aHoraArgentina(ahora);
  return fechaSinHora(anio, mes, dia);
}

/** Fecha sin hora para columnas DATE */
export function fechaSinHora(anio: number, mes: number, dia: number): Date {
  return new Date(Date.UTC(anio, mes - 1, dia));
}

/** Primer día del mes, para mes_correspondiente (ADR-008) */
export function primerDiaDelMes(fecha: Date): Date {
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1));
}

/** Lunes de la semana de una fecha DATE */
export function lunesDeLaSemana(fecha: Date): Date {
  const dia = fecha.getUTCDay();
  return addDays(fecha, dia === 0 ? -6 : 1 - dia);
}

/** Formato AAAA-MM-DD de una fecha DATE */
export function formatearFecha(fecha: Date): string {
  return format(
    new Date(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
    'yyyy-MM-dd',
  );
}
