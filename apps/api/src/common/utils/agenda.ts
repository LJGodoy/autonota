// Reglas de agenda del turnero (RF-10, RF-11, RF-13), sin acceso a datos para poder probarlas solas
import { aMinutos, type Franja } from '@autonota/shared';
import { aHoraArgentina } from './fechas';

export interface Intervalo {
  desde: number;
  hasta: number;
}

/** RF-10: une las franjas contiguas o superpuestas de cada día (9 a 13 y 13 a 17 cuentan como 9 a 17) */
export function unirFranjas(franjas: Franja[]): Map<number, Intervalo[]> {
  const porDia = new Map<number, Intervalo[]>();
  for (let dia = 1; dia <= 7; dia++) {
    const intervalos = franjas
      .filter((f) => f.diaSemana === dia)
      .map((f) => ({ desde: aMinutos(f.horaInicio), hasta: aMinutos(f.horaFin) }))
      .sort((a, b) => a.desde - b.desde);
    const unidos: Intervalo[] = [];
    for (const i of intervalos) {
      const ultimo = unidos.at(-1);
      if (ultimo && i.desde <= ultimo.hasta) ultimo.hasta = Math.max(ultimo.hasta, i.hasta);
      else unidos.push({ ...i });
    }
    if (unidos.length) porDia.set(dia, unidos);
  }
  return porDia;
}

/**
 * RF-13 y CU-06, pasos 4 y 5: el turno completo debe caer dentro de una franja de su día,
 * en hora de Argentina. Un turno que pasa la medianoche queda fuera de horario.
 */
export function estaDentroDeHorario(inicio: Date, fin: Date, franjas: Franja[]): boolean {
  const a = aHoraArgentina(inicio);
  const b = aHoraArgentina(new Date(fin.getTime() - 1));
  if (a.anio !== b.anio || a.mes !== b.mes || a.dia !== b.dia) return false;
  const desde = a.hora * 60 + a.minuto;
  const hasta = desde + Math.round((fin.getTime() - inicio.getTime()) / 60000);
  const intervalos = unirFranjas(franjas).get(a.diaSemanaIso) ?? [];
  return intervalos.some((i) => desde >= i.desde && hasta <= i.hasta);
}

/** RF-11 y RF-13: dos períodos se cruzan si uno empieza antes de que termine el otro */
export function seCruzan(inicioA: Date, finA: Date, inicioB: Date, finB: Date): boolean {
  return inicioA < finB && inicioB < finA;
}

export const MS_SEMANA = 7 * 24 * 60 * 60 * 1000;
