import { describe, expect, it } from 'vitest';
import {
  formatearFechaCorta,
  formatearMes,
  formatearMesCorto,
  hoyArgentina,
  mesActual,
  sumarMeses,
} from './meses';

describe('meses', () => {
  it('debería usar el día de Argentina aunque en UTC ya sea el día siguiente', () => {
    const ahora = new Date('2026-12-01T01:30:00Z'); // 30/11 22:30 en Argentina
    expect(hoyArgentina(ahora)).toBe('2026-11-30');
    expect(mesActual(ahora)).toBe('2026-11');
  });

  it('debería sumar y restar meses cruzando el año', () => {
    expect(sumarMeses('2026-11', 2)).toBe('2027-01');
    expect(sumarMeses('2026-01', -1)).toBe('2025-12');
    expect(sumarMeses('2026-11', -5)).toBe('2026-06');
  });

  it('debería formatear meses y fechas en español', () => {
    expect(formatearMes('2026-11')).toBe('noviembre de 2026');
    expect(formatearMesCorto('2026-09')).toBe('sep. 26');
    expect(formatearFechaCorta('2026-11-14')).toBe('14/11/2026');
  });
});
