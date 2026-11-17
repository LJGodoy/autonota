import { estaDentroDeHorario, seCruzan, unirFranjas } from '../utils/agenda';
import { desdeHoraArgentina } from '../utils/fechas';

// Viernes 20/11/2026 (día ISO 5)
const turno = (h: number, m: number, duracion: number) => {
  const inicio = desdeHoraArgentina(2026, 11, 20, h, m);
  return [inicio, new Date(inicio.getTime() + duracion * 60000)] as const;
};
const franjasViernes = [
  { diaSemana: 5, horaInicio: '09:00', horaFin: '13:00' },
  { diaSemana: 5, horaInicio: '13:00', horaFin: '17:00' },
  { diaSemana: 5, horaInicio: '18:00', horaFin: '20:00' },
];

describe('unirFranjas', () => {
  it('debería unir las franjas contiguas de un mismo día y respetar los huecos (RF-10)', () => {
    expect(unirFranjas(franjasViernes).get(5)).toEqual([
      { desde: 540, hasta: 1020 },
      { desde: 1080, hasta: 1200 },
    ]);
    expect(unirFranjas(franjasViernes).has(1)).toBe(false);
  });
});

describe('estaDentroDeHorario', () => {
  it('debería aceptar un turno que cruza el límite entre dos franjas contiguas', () => {
    expect(estaDentroDeHorario(...turno(12, 0, 120), franjasViernes)).toBe(true);
  });

  it('debería aceptar un turno que termina justo al cierre', () => {
    expect(estaDentroDeHorario(...turno(16, 0, 60), franjasViernes)).toBe(true);
  });

  it('debería rechazar un turno que cae en el hueco entre franjas o fuera del día', () => {
    expect(estaDentroDeHorario(...turno(16, 30, 60), franjasViernes)).toBe(false);
    expect(estaDentroDeHorario(...turno(8, 30, 60), franjasViernes)).toBe(false);
  });

  it('debería usar la hora de Argentina y no la de UTC (13:00 UTC son las 10:00 en Argentina)', () => {
    const inicio = new Date('2026-11-20T13:00:00Z');
    expect(estaDentroDeHorario(inicio, new Date(inicio.getTime() + 3600000), franjasViernes)).toBe(
      true,
    );
  });

  it('debería rechazar un día sin franjas', () => {
    const inicio = desdeHoraArgentina(2026, 11, 22, 10, 0); // domingo
    expect(estaDentroDeHorario(inicio, new Date(inicio.getTime() + 3600000), franjasViernes)).toBe(
      false,
    );
  });

  it('debería rechazar un turno que pasa la medianoche', () => {
    const franjas = [
      { diaSemana: 5, horaInicio: '20:00', horaFin: '23:59' },
      { diaSemana: 6, horaInicio: '00:00', horaFin: '02:00' },
    ];
    expect(estaDentroDeHorario(...turno(23, 0, 120), franjas)).toBe(false);
  });
});

describe('seCruzan', () => {
  it('debería detectar cruces y aceptar períodos que solo se tocan', () => {
    const [a, b] = turno(10, 0, 60);
    expect(
      seCruzan(
        a,
        b,
        desdeHoraArgentina(2026, 11, 20, 10, 30),
        desdeHoraArgentina(2026, 11, 20, 12, 0),
      ),
    ).toBe(true);
    expect(seCruzan(a, b, b, desdeHoraArgentina(2026, 11, 20, 12, 0))).toBe(false);
  });
});
