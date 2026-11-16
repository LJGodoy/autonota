// Verifica que existan los objetos que Prisma no modela (ADR-004; Parte 6, sección 6)
// y que las restricciones de la base se comporten como dice la Parte 3.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

async function crearEmprendimiento(tipo: 'TURNERO' | 'CLASES' | 'VENTAS') {
  const usuario = await prisma.usuario.create({
    data: {
      nombre: 'Esquema',
      email: `esquema-${Date.now()}-${Math.random()}@mail.com`,
      passwordHash: 'x',
      politicaAceptadaEn: new Date(),
    },
  });
  return prisma.emprendimiento.create({ data: { usuarioId: usuario.id, nombre: 'E', tipo } });
}

describe('esquema de la base de datos', () => {
  it('debería tener la columna calculada mes_imputacion', async () => {
    const filas = await prisma.$queryRaw<{ is_generated: string; generation_expression: string }[]>`
      SELECT is_generated, generation_expression FROM information_schema.columns
      WHERE table_name = 'movimientos' AND column_name = 'mes_imputacion'`;
    expect(filas[0]?.is_generated).toBe('ALWAYS');
  });

  it('debería tener el índice único parcial de turnos que excluye los cancelados', async () => {
    const filas = await prisma.$queryRaw<{ indexdef: string }[]>`
      SELECT indexdef FROM pg_indexes WHERE indexname = 'ux_turnos_mismo_inicio'`;
    expect(filas[0]?.indexdef).toMatch(/UNIQUE INDEX/);
    expect(filas[0]?.indexdef).toMatch(/WHERE \(estado <> 'CANCELADO'::estado_turno\)/);
  });

  it('debería tener los índices parciales de usuarios y movimientos', async () => {
    const filas = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes WHERE indexdef LIKE '%WHERE%' ORDER BY indexname`;
    expect(filas.map((f) => f.indexname)).toEqual(
      expect.arrayContaining([
        'ix_usuarios_demo_vencidos',
        'ix_movimientos_alumno',
        'ix_movimientos_turno',
        'ix_movimientos_tarea',
      ]),
    );
  });

  it('debería tener todas las restricciones CHECK del script SQL', async () => {
    const filas = await prisma.$queryRaw<{ tabla: string; cantidad: bigint }[]>`
      SELECT conrelid::regclass::text AS tabla, count(*) AS cantidad
      FROM pg_constraint WHERE contype = 'c' GROUP BY conrelid ORDER BY tabla`;
    const porTabla = Object.fromEntries(filas.map((f) => [f.tabla, Number(f.cantidad)]));
    expect(porTabla).toMatchObject({
      usuarios: 1,
      horarios_atencion: 2,
      bloqueos: 1,
      turnos: 1,
      clases: 1,
      movimientos: 5,
    });
  });

  it('debería calcular mes_imputacion con el mes correspondiente o el mes de la fecha', async () => {
    const emp = await crearEmprendimiento('CLASES');
    const alumno = await prisma.alumno.create({ data: { emprendimientoId: emp.id, nombre: 'A' } });
    await prisma.movimiento.create({
      data: {
        emprendimientoId: emp.id,
        tipo: 'INGRESO',
        montoCentavos: 4000000n,
        fecha: new Date('2026-12-03'),
        alumnoId: alumno.id,
        mesCorrespondiente: new Date('2026-11-01'),
      },
    });
    await prisma.movimiento.create({
      data: {
        emprendimientoId: emp.id,
        tipo: 'GASTO',
        montoCentavos: 100n,
        fecha: new Date('2026-12-15'),
      },
    });
    const filas = await prisma.$queryRaw<{ tipo: string; mes: string }[]>`
      SELECT tipo::text, to_char(mes_imputacion, 'YYYY-MM-DD') AS mes FROM movimientos
      WHERE emprendimiento_id = ${emp.id}::uuid ORDER BY mes_imputacion`;
    expect(filas).toEqual([
      { tipo: 'INGRESO', mes: '2026-11-01' },
      { tipo: 'GASTO', mes: '2026-12-01' },
    ]);
  });

  it('debería rechazar un pago de alumno sin mes, un monto no positivo y un gasto vinculado', async () => {
    const emp = await crearEmprendimiento('CLASES');
    const alumno = await prisma.alumno.create({ data: { emprendimientoId: emp.id, nombre: 'A' } });
    const base = { emprendimientoId: emp.id, fecha: new Date('2026-11-01') };
    await expect(
      prisma.movimiento.create({
        data: { ...base, tipo: 'INGRESO', montoCentavos: 1n, alumnoId: alumno.id },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.movimiento.create({ data: { ...base, tipo: 'GASTO', montoCentavos: 0n } }),
    ).rejects.toThrow();
    await expect(
      prisma.movimiento.create({
        data: {
          ...base,
          tipo: 'GASTO',
          montoCentavos: 1n,
          alumnoId: alumno.id,
          mesCorrespondiente: new Date('2026-11-01'),
        },
      }),
    ).rejects.toThrow();
  });

  it('debería permitir turnos superpuestos pero no dos que empiecen a la misma hora', async () => {
    const emp = await crearEmprendimiento('TURNERO');
    const cliente = await prisma.cliente.create({
      data: { emprendimientoId: emp.id, nombre: 'C' },
    });
    const turno = (
      inicio: string,
      fin: string,
      estado: 'PROGRAMADO' | 'CANCELADO' | 'AUSENTE' = 'PROGRAMADO',
    ) =>
      prisma.turno.create({
        data: {
          emprendimientoId: emp.id,
          clienteId: cliente.id,
          inicio: new Date(inicio),
          fin: new Date(fin),
          estado,
        },
      });
    await turno('2026-11-20T13:00:00Z', '2026-11-20T15:00:00Z', 'AUSENTE');
    await turno('2026-11-20T13:30:00Z', '2026-11-20T14:00:00Z'); // superpuesto: permitido
    await turno('2026-11-20T13:00:00Z', '2026-11-20T14:00:00Z', 'CANCELADO'); // cancelado: permitido
    await expect(turno('2026-11-20T13:00:00Z', '2026-11-20T13:45:00Z')).rejects.toThrow();
  });

  it('debería exigir vencimiento solo en las cuentas de demostración', async () => {
    await expect(
      prisma.usuario.create({
        data: {
          nombre: 'D',
          email: `d-${Date.now()}@mail.com`,
          passwordHash: 'x',
          esDemo: true,
          politicaAceptadaEn: new Date(),
        },
      }),
    ).rejects.toThrow();
  });
});
