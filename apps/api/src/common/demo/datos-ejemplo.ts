// Función reutilizable de datos de ejemplo (Parte 6, sección 6; ADR-014).
// La usan POST /auth/demo y el script de seed local. Las fechas se calculan desde el día actual.
import { randomUUID } from 'node:crypto';
import { addDays, addMonths } from 'date-fns';
import type { Prisma } from '@prisma/client';
import type { ClienteDb } from '../prisma/prisma.service';
import {
  aHoraArgentina,
  desdeHoraArgentina,
  fechaSinHora,
  hoyEnArgentina,
  lunesDeLaSemana,
  primerDiaDelMes,
} from '../utils/fechas';
import { pesosACentavos } from '../utils/dinero';

/** Generador pseudoaleatorio con semilla, para que los datos sean reproducibles */
function crearAzar(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const DIAS_ATRAS = 120;
const MEDIOS = ['EFECTIVO', 'TRANSFERENCIA', 'BILLETERA_VIRTUAL', 'TARJETA', null] as const;

function inicioLocal(fecha: Date, hora: number, minuto = 0): Date {
  return desdeHoraArgentina(
    fecha.getUTCFullYear(),
    fecha.getUTCMonth() + 1,
    fecha.getUTCDate(),
    hora,
    minuto,
  );
}

function diaIso(fecha: Date): number {
  const d = fecha.getUTCDay();
  return d === 0 ? 7 : d;
}

function hora(h: number, m = 0): Date {
  return new Date(Date.UTC(1970, 0, 1, h, m));
}

export interface ResultadoDatosEjemplo {
  emprendimientoIds: { turnero: string; clases: string; ventas: string };
}

/** Carga un emprendimiento de cada tipo con datos de ejemplo para el usuario indicado */
export async function cargarDatosEjemplo(
  db: ClienteDb,
  usuarioId: string,
  ahora: Date = new Date(),
): Promise<ResultadoDatosEjemplo> {
  const azar = crearAzar(ahora.getUTCDate() * 31 + ahora.getUTCMonth());
  const hoy = hoyEnArgentina(ahora);
  const elegir = <T>(lista: readonly T[]): T => lista[Math.floor(azar() * lista.length)] as T;

  const turnero = await cargarTurnero(db, usuarioId, hoy, ahora, azar, elegir);
  const clases = await cargarClases(db, usuarioId, hoy, azar, elegir);
  const ventas = await cargarVentas(db, usuarioId, hoy, ahora, azar, elegir);
  return { emprendimientoIds: { turnero, clases, ventas } };
}

type Azar = () => number;
type Elegir = <T>(lista: readonly T[]) => T;

async function cargarTurnero(
  db: ClienteDb,
  usuarioId: string,
  hoy: Date,
  ahora: Date,
  azar: Azar,
  elegir: Elegir,
): Promise<string> {
  const emp = await db.emprendimiento.create({
    data: { usuarioId, nombre: 'Peluquería de ejemplo', tipo: 'TURNERO' },
  });

  // RF-10: de lunes a viernes, dos franjas contiguas (9 a 13 y 13 a 18); sábados de 9 a 13
  const horarios: Prisma.HorarioAtencionCreateManyInput[] = [];
  for (let dia = 1; dia <= 5; dia++) {
    horarios.push({
      emprendimientoId: emp.id,
      diaSemana: dia,
      horaInicio: hora(9),
      horaFin: hora(13),
    });
    horarios.push({
      emprendimientoId: emp.id,
      diaSemana: dia,
      horaInicio: hora(13),
      horaFin: hora(18),
    });
  }
  horarios.push({ emprendimientoId: emp.id, diaSemana: 6, horaInicio: hora(9), horaFin: hora(13) });
  await db.horarioAtencion.createMany({ data: horarios });

  // RF-11: un bloqueo de día completo dentro de 10 días
  const diaBloqueado = addDays(hoy, 10);
  await db.bloqueo.create({
    data: {
      emprendimientoId: emp.id,
      inicio: inicioLocal(diaBloqueado, 0),
      fin: inicioLocal(addDays(diaBloqueado, 1), 0),
      motivo: 'Capacitación',
    },
  });

  const nombres = [
    'Ana Gómez',
    'Lucía Fernández',
    'Martín Ríos',
    'Sofía Herrera',
    'Diego Castro',
    'Valeria Luna',
  ];
  const clientes = nombres.map((nombre, i) => ({
    id: randomUUID(),
    emprendimientoId: emp.id,
    nombre,
    telefono: `11 5${String(100 + i * 37).padStart(3, '0')}-${String(2000 + i * 113)}`,
    notas: i === 0 ? 'Prefiere turnos a la mañana' : null,
  }));
  await db.cliente.createMany({ data: clientes });

  const trabajos = ['Corte', 'Corte y peinado', 'Tintura y corte', 'Mechas', 'Brushing', 'Alisado'];
  const turnos: Prisma.TurnoCreateManyInput[] = [];
  const cobros: Prisma.MovimientoCreateManyInput[] = [];

  for (let d = -DIAS_ATRAS; d <= 14; d++) {
    const fecha = addDays(hoy, d);
    const dia = diaIso(fecha);
    if (dia === 7 || fecha.getTime() === diaBloqueado.getTime()) continue;
    const horas =
      dia === 6
        ? [[10, 0]]
        : [
            [10, 0],
            [11, 30],
            [15, 0],
            [16, 30],
          ];
    for (const [h, m] of horas) {
      if (azar() < 0.35) continue;
      const inicio = inicioLocal(fecha, h as number, m as number);
      const duracion = elegir([45, 60, 90]);
      const fin = new Date(inicio.getTime() + duracion * 60000);
      const esPasado = fin < ahora;
      let estado: 'PROGRAMADO' | 'REALIZADO' | 'AUSENTE' | 'CANCELADO' = 'PROGRAMADO';
      if (esPasado) {
        const r = azar();
        estado = r < 0.84 ? 'REALIZADO' : r < 0.92 ? 'AUSENTE' : 'CANCELADO';
      } else if (azar() < 0.05) {
        estado = 'CANCELADO';
      }
      const id = randomUUID();
      turnos.push({
        id,
        emprendimientoId: emp.id,
        clienteId: elegir(clientes).id,
        inicio,
        fin,
        descripcion: elegir(trabajos),
        estado,
      });
      const monto = pesosACentavos(elegir([12000, 15000, 18000, 25000, 35000]));
      if (estado === 'REALIZADO' && azar() < 0.93) {
        cobros.push({
          emprendimientoId: emp.id,
          tipo: 'INGRESO',
          montoCentavos: monto,
          fecha,
          turnoId: id,
          medioPago: elegir(MEDIOS),
        });
      } else if (estado === 'PROGRAMADO' && azar() < 0.2) {
        // RF-16: seña antes del trabajo
        cobros.push({
          emprendimientoId: emp.id,
          tipo: 'INGRESO',
          montoCentavos: monto / 2n,
          fecha: hoy,
          turnoId: id,
          descripcion: 'Seña',
          medioPago: 'TRANSFERENCIA',
        });
      }
    }
  }
  await db.turno.createMany({ data: turnos });

  // RF-18 y RF-20: compras de insumos y cobros sueltos de cada mes
  const extras: Prisma.MovimientoCreateManyInput[] = [];
  for (let m = 0; m < 5; m++) {
    const mes = primerDiaDelMes(addMonths(hoy, -m));
    const fechaCompra = addDays(mes, 4);
    if (fechaCompra <= hoy) {
      extras.push({
        emprendimientoId: emp.id,
        tipo: 'GASTO',
        montoCentavos: pesosACentavos(elegir([45000, 60000, 80000])),
        fecha: fechaCompra,
        descripcion: 'Tinturas y oxidantes',
        medioPago: 'TARJETA',
      });
    }
    const fechaVenta = addDays(mes, 12);
    if (fechaVenta <= hoy) {
      extras.push({
        emprendimientoId: emp.id,
        tipo: 'INGRESO',
        montoCentavos: pesosACentavos(9500),
        fecha: fechaVenta,
        descripcion: 'Venta de shampoo',
        medioPago: 'EFECTIVO',
      });
    }
  }
  await db.movimiento.createMany({ data: [...cobros, ...extras] });
  return emp.id;
}

async function cargarClases(
  db: ClienteDb,
  usuarioId: string,
  hoy: Date,
  azar: Azar,
  elegir: Elegir,
): Promise<string> {
  const emp = await db.emprendimiento.create({
    data: { usuarioId, nombre: 'Clases de tenis de ejemplo', tipo: 'CLASES' },
  });

  const nombres = [
    'Julián Paz',
    'Camila Torres',
    'Tomás Medina',
    'Florencia Ruiz',
    'Nicolás Vega',
    'Paula Sosa',
  ];
  const alumnos = nombres.map((nombre, i) => ({
    id: randomUUID(),
    emprendimientoId: emp.id,
    nombre,
    telefono: `11 4${String(200 + i * 41).padStart(3, '0')}-${String(3000 + i * 97)}`,
    activo: i !== 5,
  }));
  await db.alumno.createMany({ data: alumnos });
  const activos = alumnos.filter((a) => a.activo);

  // RF-31: clases semanales desde 3 semanas atrás hasta la semana que viene
  const grupo = activos.slice(0, 3).map((a) => a.id);
  const grupo2 = activos.slice(2, 5).map((a) => a.id);
  const plantilla = [
    { dia: 0, h: 18, titulo: 'Tenis inicial', modalidad: 'GRUPAL' as const, alumnos: grupo },
    { dia: 2, h: 18, titulo: 'Tenis intermedio', modalidad: 'GRUPAL' as const, alumnos: grupo2 },
    {
      dia: 3,
      h: 10,
      titulo: 'Clase particular',
      modalidad: 'INDIVIDUAL' as const,
      alumnos: [activos[3]!.id],
    },
  ];
  const lunesActual = lunesDeLaSemana(hoy);
  const clases: Prisma.ClaseCreateManyInput[] = [];
  const participantes: Prisma.ClaseAlumnoCreateManyInput[] = [];
  for (let semana = -3; semana <= 1; semana++) {
    for (const p of plantilla) {
      const fecha = addDays(lunesActual, semana * 7 + p.dia);
      const inicio = inicioLocal(fecha, p.h);
      const id = randomUUID();
      clases.push({
        id,
        emprendimientoId: emp.id,
        titulo: p.titulo,
        modalidad: p.modalidad,
        inicio,
        fin: new Date(inicio.getTime() + 60 * 60000),
        estado: semana === -1 && p.dia === 2 ? 'CANCELADA' : 'PROGRAMADA',
      });
      for (const alumnoId of p.alumnos) participantes.push({ claseId: id, alumnoId });
    }
  }
  await db.clase.createMany({ data: clases });
  await db.claseAlumno.createMany({ data: participantes });

  // RF-34: pagos por mes correspondiente; en el mes actual algunos alumnos todavía no pagaron
  const pagos: Prisma.MovimientoCreateManyInput[] = [];
  for (let m = 4; m >= 0; m--) {
    const mes = primerDiaDelMes(addMonths(hoy, -m));
    for (const [i, alumno] of activos.entries()) {
      if (m === 0 && i >= 2) continue;
      // El primero de cada mes paga a principios del mes siguiente (cuenta en el mes asignado)
      const fecha =
        i === 0 && m > 0 ? addDays(primerDiaDelMes(addMonths(mes, 1)), 2) : addDays(mes, 3 + i);
      if (fecha > hoy) continue;
      pagos.push({
        emprendimientoId: emp.id,
        tipo: 'INGRESO',
        montoCentavos: pesosACentavos(40000),
        fecha,
        alumnoId: alumno.id,
        mesCorrespondiente: mes,
        descripcion: 'Cuota mensual',
        medioPago: elegir(MEDIOS),
      });
    }
    // RF-36: gastos del profesor
    const fechaGasto = addDays(mes, 1);
    if (fechaGasto <= hoy) {
      pagos.push({
        emprendimientoId: emp.id,
        tipo: 'GASTO',
        montoCentavos: pesosACentavos(Math.round(60000 + azar() * 20000)),
        fecha: fechaGasto,
        descripcion: 'Alquiler de cancha',
        medioPago: 'TRANSFERENCIA',
      });
    }
  }
  await db.movimiento.createMany({ data: pagos });
  return emp.id;
}

async function cargarVentas(
  db: ClienteDb,
  usuarioId: string,
  hoy: Date,
  ahora: Date,
  azar: Azar,
  elegir: Elegir,
): Promise<string> {
  const emp = await db.emprendimiento.create({
    data: { usuarioId, nombre: 'Pastelería de ejemplo', tipo: 'VENTAS' },
  });

  const definiciones = [
    {
      titulo: 'Torta de cumpleaños para Marta',
      descripcion: 'Chocolate, 2 kg',
      estado: 'EN_CURSO',
      prioridad: 'ALTA',
      dias: 2,
    },
    {
      titulo: 'Pedir harina al proveedor',
      descripcion: '50 kg',
      estado: 'PENDIENTE',
      prioridad: 'ALTA',
      dias: 1,
    },
    {
      titulo: 'Docena de alfajores',
      descripcion: null,
      estado: 'REALIZADA',
      prioridad: 'MEDIA',
      dias: 6,
    },
    {
      titulo: 'Mesa dulce para evento',
      descripcion: 'Sábado, 40 personas',
      estado: 'PENDIENTE',
      prioridad: 'MEDIA',
      dias: 3,
    },
    {
      titulo: 'Comprar cajas para envíos',
      descripcion: null,
      estado: 'PENDIENTE',
      prioridad: 'BAJA',
      dias: 4,
    },
    {
      titulo: 'Budines para la feria',
      descripcion: '12 unidades',
      estado: 'REALIZADA',
      prioridad: 'BAJA',
      dias: 12,
    },
  ] as const;

  const tareas: Prisma.TareaCreateManyInput[] = [];
  const historial: Prisma.TareaHistorialCreateManyInput[] = [];
  const ventas: Prisma.MovimientoCreateManyInput[] = [];
  for (const def of definiciones) {
    const id = randomUUID();
    const creadoEn = new Date(ahora.getTime() - def.dias * 86400000);
    tareas.push({
      id,
      emprendimientoId: emp.id,
      titulo: def.titulo,
      descripcion: def.descripcion,
      estado: def.estado,
      prioridad: def.prioridad,
      creadoEn,
    });
    // RF-53: historial desde la creación
    historial.push({
      tareaId: id,
      estadoAnterior: null,
      estadoNuevo: 'PENDIENTE',
      cambiadoEn: creadoEn,
    });
    if (def.estado !== 'PENDIENTE') {
      historial.push({
        tareaId: id,
        estadoAnterior: 'PENDIENTE',
        estadoNuevo: 'EN_CURSO',
        cambiadoEn: new Date(creadoEn.getTime() + 3600000),
      });
    }
    if (def.estado === 'REALIZADA') {
      const cambiadoEn = new Date(creadoEn.getTime() + 86400000);
      historial.push({
        tareaId: id,
        estadoAnterior: 'EN_CURSO',
        estadoNuevo: 'REALIZADA',
        cambiadoEn,
      });
      // RF-55: venta vinculada a la tarea
      ventas.push({
        emprendimientoId: emp.id,
        tipo: 'INGRESO',
        montoCentavos: pesosACentavos(elegir([18000, 24000, 32000])),
        fecha: hoyEnArgentina(cambiadoEn),
        descripcion: def.titulo,
        tareaId: id,
        medioPago: elegir(MEDIOS),
      });
    }
    if (def.titulo.startsWith('Torta')) {
      // Seña de un pedido en curso
      ventas.push({
        emprendimientoId: emp.id,
        tipo: 'INGRESO',
        montoCentavos: pesosACentavos(15000),
        fecha: hoy,
        descripcion: 'Seña torta',
        tareaId: id,
        medioPago: 'TRANSFERENCIA',
      });
    }
  }
  await db.tarea.createMany({ data: tareas });
  await db.tareaHistorial.createMany({ data: historial });

  // RF-55 y RF-56: ventas sueltas y gastos de los últimos meses
  const { dia: diaHoy } = aHoraArgentina(ahora);
  for (let m = 0; m < 5; m++) {
    const mes = primerDiaDelMes(addMonths(hoy, -m));
    const cantidad = m === 0 ? Math.min(8, diaHoy) : 10 + Math.floor(azar() * 6);
    for (let i = 0; i < cantidad; i++) {
      const fecha = fechaSinHora(
        mes.getUTCFullYear(),
        mes.getUTCMonth() + 1,
        1 + Math.floor(azar() * 27),
      );
      if (fecha > hoy) continue;
      ventas.push({
        emprendimientoId: emp.id,
        tipo: 'INGRESO',
        montoCentavos: pesosACentavos(elegir([3500, 5200, 8000, 12000])),
        fecha,
        descripcion: elegir(['Medialunas', 'Torta individual', 'Alfajores', 'Cookies', null]),
        medioPago: elegir(MEDIOS),
      });
    }
    const fechaGasto = addDays(mes, 2);
    if (fechaGasto <= hoy) {
      ventas.push({
        emprendimientoId: emp.id,
        tipo: 'GASTO',
        montoCentavos: pesosACentavos(Math.round(50000 + azar() * 30000)),
        fecha: fechaGasto,
        descripcion: 'Materia prima',
        medioPago: 'EFECTIVO',
      });
    }
  }
  await db.movimiento.createMany({ data: ventas });
  return emp.id;
}
