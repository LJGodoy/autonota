import { describe, expect, it } from 'vitest';
import { estadoPago } from './estadoPago';

const alumno = (pagada: boolean) => ({ id: 'a', nombre: 'A', activo: true, pagada });

describe('estadoPago', () => {
  it('debería pintar la clase según cuántos alumnos pagaron', () => {
    expect(estadoPago({ alumnos: [] })).toBe('debe');
    expect(estadoPago({ alumnos: [alumno(false), alumno(false)] })).toBe('debe');
    expect(estadoPago({ alumnos: [alumno(true), alumno(false)] })).toBe('parcial');
    expect(estadoPago({ alumnos: [alumno(true), alumno(true)] })).toBe('pagada');
  });
});
