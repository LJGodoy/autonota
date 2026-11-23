import { describe, expect, it } from 'vitest';
import { estadoPago } from './estadoPago';

const alumno = (pagada: boolean) => ({ id: 'a', nombre: 'A', activo: true, pagada });

describe('estadoPago', () => {
  it('debería pintar la clase según cuántos alumnos pagaron', () => {
    expect(estadoPago({ cancelada: false, alumnos: [] })).toBe('debe');
    expect(estadoPago({ cancelada: false, alumnos: [alumno(false), alumno(false)] })).toBe('debe');
    expect(estadoPago({ cancelada: false, alumnos: [alumno(true), alumno(false)] })).toBe(
      'parcial',
    );
    expect(estadoPago({ cancelada: false, alumnos: [alumno(true), alumno(true)] })).toBe('pagada');
  });

  it('debería marcar cancelada sin importar los pagos', () => {
    expect(estadoPago({ cancelada: true, alumnos: [alumno(true)] })).toBe('cancelada');
  });
});
