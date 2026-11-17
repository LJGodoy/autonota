import { describe, expect, it } from 'vitest';
import {
  esquemaCrearMovimiento,
  esquemaEditarMovimiento,
  esquemaFecha,
  esquemaRangoEstadisticas,
  mesesEntre,
} from './movimientos';

const base = { tipo: 'INGRESO', montoCentavos: 850050, fecha: '2026-11-15' } as const;

describe('esquemaCrearMovimiento', () => {
  it('debería aceptar un ingreso sin medio de pago (RF-07)', () => {
    expect(esquemaCrearMovimiento.safeParse(base).success).toBe(true);
  });

  it('debería rechazar montos con decimales, cero o negativos', () => {
    for (const montoCentavos of [10.5, 0, -100]) {
      expect(esquemaCrearMovimiento.safeParse({ ...base, montoCentavos }).success).toBe(false);
    }
  });

  it('debería exigir alumno y mes juntos (RF-34)', () => {
    const alumnoId = '6f1c2a54-1d1e-4e47-9a43-1f2e3d4c5b6a';
    expect(esquemaCrearMovimiento.safeParse({ ...base, alumnoId }).success).toBe(false);
    expect(
      esquemaCrearMovimiento.safeParse({ ...base, mesCorrespondiente: '2026-11' }).success,
    ).toBe(false);
    expect(
      esquemaCrearMovimiento.safeParse({ ...base, alumnoId, mesCorrespondiente: '2026-11' })
        .success,
    ).toBe(true);
  });

  it('debería rechazar un gasto vinculado a una tarea', () => {
    const r = esquemaCrearMovimiento.safeParse({
      ...base,
      tipo: 'GASTO',
      tareaId: '6f1c2a54-1d1e-4e47-9a43-1f2e3d4c5b6a',
    });
    expect(r.success).toBe(false);
  });
});

describe('esquemaFecha', () => {
  it('debería rechazar fechas que no existen', () => {
    expect(esquemaFecha.safeParse('2026-02-30').success).toBe(false);
    expect(esquemaFecha.safeParse('2024-02-29').success).toBe(true);
  });
});

describe('esquemaEditarMovimiento', () => {
  it('debería rechazar una edición vacía o que cambie el tipo', () => {
    expect(esquemaEditarMovimiento.safeParse({}).success).toBe(false);
    expect(esquemaEditarMovimiento.safeParse({ tipo: 'GASTO' }).success).toBe(false);
    expect(esquemaEditarMovimiento.safeParse({ medioPago: null }).success).toBe(true);
  });
});

describe('esquemaRangoEstadisticas', () => {
  it('debería aceptar hasta 24 meses y rechazar rangos invertidos', () => {
    expect(mesesEntre('2025-12', '2026-11')).toBe(11);
    expect(esquemaRangoEstadisticas.safeParse({ desde: '2024-12', hasta: '2026-11' }).success).toBe(
      true,
    );
    expect(esquemaRangoEstadisticas.safeParse({ desde: '2024-11', hasta: '2026-11' }).success).toBe(
      false,
    );
    expect(esquemaRangoEstadisticas.safeParse({ desde: '2026-11', hasta: '2026-10' }).success).toBe(
      false,
    );
  });
});
