import { describe, expect, it } from 'vitest';
import { formatearPesos, pesosACentavos } from './dinero';

describe('pesosACentavos', () => {
  it('debería convertir montos escritos de distintas formas sin errores de redondeo', () => {
    expect(pesosACentavos('8500')).toBe(850000);
    expect(pesosACentavos('8.500,50')).toBe(850050);
    expect(pesosACentavos('8500,5')).toBe(850050);
    expect(pesosACentavos('$ 0,10')).toBe(10);
    expect(pesosACentavos('1.234.567,89')).toBe(123456789);
  });

  it('debería rechazar textos inválidos, cero y más de dos decimales', () => {
    expect(pesosACentavos('')).toBeNull();
    expect(pesosACentavos('abc')).toBeNull();
    expect(pesosACentavos('0')).toBeNull();
    expect(pesosACentavos('10,555')).toBeNull();
    expect(pesosACentavos('-5')).toBeNull();
  });
});

describe('formatearPesos', () => {
  it('debería formatear centavos como pesos argentinos', () => {
    expect(formatearPesos(850050).replace(/\s/g, ' ')).toBe('$ 8.500,50');
  });
});
