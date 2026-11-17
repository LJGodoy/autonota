import { describe, expect, it } from 'vitest';
import {
  aHoraLocal,
  aIsoArgentina,
  desdeFechaCalendario,
  lunesDe,
  separarFechaHora,
  sumarDias,
} from './zona';

describe('zona horaria de Argentina', () => {
  it('debería pasar un instante UTC a la hora de Argentina', () => {
    expect(aHoraLocal('2026-11-20T13:00:00.000Z')).toBe('2026-11-20T10:00:00');
    expect(aHoraLocal('2026-11-21T02:30:00.000Z')).toBe('2026-11-20T23:30:00');
  });

  it('debería armar el ISO con zona para la API y separarlo de nuevo', () => {
    const iso = aIsoArgentina('2026-11-20', '10:00');
    expect(iso).toBe('2026-11-20T10:00:00-03:00');
    expect(separarFechaHora(new Date(iso).toISOString())).toEqual({
      fecha: '2026-11-20',
      hora: '10:00',
    });
  });

  it('debería convertir la fecha de FullCalendar (hora de Argentina en campos UTC)', () => {
    expect(desdeFechaCalendario(new Date('2026-11-20T10:30:00Z'))).toBe(
      '2026-11-20T10:30:00-03:00',
    );
  });

  it('debería calcular el lunes de la semana y sumar días', () => {
    expect(lunesDe('2026-11-22')).toBe('2026-11-16');
    expect(lunesDe('2026-11-16')).toBe('2026-11-16');
    expect(sumarDias('2026-11-30', 1)).toBe('2026-12-01');
  });
});
