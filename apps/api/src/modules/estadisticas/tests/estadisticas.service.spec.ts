import { EstadisticasService, listarMeses } from '../services/estadisticas.service';
import type { EstadisticasRepository } from '../repositories/estadisticas.repository';

describe('listarMeses', () => {
  it('debería listar los meses incluidos y cruzar el cambio de año', () => {
    expect(listarMeses('2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
    expect(listarMeses('2026-11', '2026-11')).toEqual(['2026-11']);
  });
});

describe('EstadisticasService', () => {
  it('debería completar con ceros los meses sin movimientos y calcular saldos y totales (CU-12)', async () => {
    const repo = {
      totalesPorMes: jest.fn().mockResolvedValue([
        { mes: '2026-09', tipo: 'INGRESO', total: 52000000n, cantidad: 31n },
        { mes: '2026-09', tipo: 'GASTO', total: 8000000n, cantidad: 2n },
        { mes: '2026-10', tipo: 'INGRESO', total: 61000000n, cantidad: 36n },
        { mes: '2026-10', tipo: 'GASTO', total: 9500000n, cantidad: 3n },
      ]),
    };
    const servicio = new EstadisticasService(repo as unknown as EstadisticasRepository);
    const r = await servicio.obtener('e1', { desde: '2026-09', hasta: '2026-11' });

    expect(repo.totalesPorMes).toHaveBeenCalledWith(
      'e1',
      new Date('2026-09-01T00:00:00Z'),
      new Date('2026-11-01T00:00:00Z'),
    );
    // Los valores del ejemplo de la Parte 4, sección 10
    expect(r).toEqual({
      meses: [
        {
          mes: '2026-09',
          ingresosCentavos: 52000000,
          gastosCentavos: 8000000,
          saldoCentavos: 44000000,
          cantidadIngresos: 31,
          cantidadGastos: 2,
        },
        {
          mes: '2026-10',
          ingresosCentavos: 61000000,
          gastosCentavos: 9500000,
          saldoCentavos: 51500000,
          cantidadIngresos: 36,
          cantidadGastos: 3,
        },
        {
          mes: '2026-11',
          ingresosCentavos: 0,
          gastosCentavos: 0,
          saldoCentavos: 0,
          cantidadIngresos: 0,
          cantidadGastos: 0,
        },
      ],
      totales: {
        ingresosCentavos: 113000000,
        gastosCentavos: 17500000,
        saldoCentavos: 95500000,
        cantidadIngresos: 67,
        cantidadGastos: 5,
      },
    });
  });

  it('debería admitir saldos negativos', async () => {
    const repo = {
      totalesPorMes: jest
        .fn()
        .mockResolvedValue([{ mes: '2026-11', tipo: 'GASTO', total: 100n, cantidad: 1n }]),
    };
    const r = await new EstadisticasService(repo as unknown as EstadisticasRepository).obtener(
      'e1',
      {
        desde: '2026-11',
        hasta: '2026-11',
      },
    );
    expect(r.totales.saldoCentavos).toBe(-100);
  });
});
