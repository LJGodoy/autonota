-- Migración inicial de AutoNota.
-- Copia fiel del script DDL del SDD, Parte 3, sección 6 (versión 1.3).
-- Incluye los objetos que Prisma no modela y que esta migración crea con SQL:
--   restricciones CHECK, índice único parcial ux_turnos_mismo_inicio, índices parciales
--   y la columna calculada movimientos.mes_imputacion (GENERATED STORED).
-- La prueba test/integration/esquema.int-spec.ts verifica que sigan existiendo.

-- AutoNota: esquema de base de datos (PostgreSQL 16)

CREATE EXTENSION IF NOT EXISTS citext;

-- Tipos enumerados
CREATE TYPE tipo_emprendimiento AS ENUM ('TURNERO', 'CLASES', 'VENTAS');
CREATE TYPE estado_turno        AS ENUM ('PROGRAMADO', 'REALIZADO', 'AUSENTE', 'CANCELADO');
CREATE TYPE estado_clase        AS ENUM ('PROGRAMADA', 'CANCELADA');
CREATE TYPE modalidad_clase     AS ENUM ('INDIVIDUAL', 'GRUPAL');
CREATE TYPE estado_tarea        AS ENUM ('PENDIENTE', 'EN_CURSO', 'REALIZADA');
CREATE TYPE prioridad_tarea     AS ENUM ('BAJA', 'MEDIA', 'ALTA');
CREATE TYPE tipo_movimiento     AS ENUM ('INGRESO', 'GASTO');
CREATE TYPE medio_pago          AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'BILLETERA_VIRTUAL', 'OTRO');

-- Cuenta
CREATE TABLE usuarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          VARCHAR(100) NOT NULL,
  email           CITEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  es_demo         BOOLEAN NOT NULL DEFAULT false,
  expira_en       TIMESTAMPTZ,
  politica_aceptada_en TIMESTAMPTZ NOT NULL,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- RF-08: solo las cuentas de demostración vencen
  CHECK (es_demo = (expira_en IS NOT NULL))
);
CREATE INDEX ix_usuarios_demo_vencidos ON usuarios (expira_en) WHERE es_demo;

CREATE TABLE refresh_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  expira_en    TIMESTAMPTZ NOT NULL,
  revocado_en  TIMESTAMPTZ,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tokens_recuperacion (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expira_en   TIMESTAMPTZ NOT NULL,
  usado_en    TIMESTAMPTZ,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE emprendimientos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre          VARCHAR(100) NOT NULL,
  tipo            tipo_emprendimiento NOT NULL,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_emprendimientos_usuario ON emprendimientos (usuario_id);

-- Turnero
CREATE TABLE horarios_atencion (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emprendimiento_id UUID NOT NULL REFERENCES emprendimientos(id) ON DELETE CASCADE,
  dia_semana        SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
  hora_inicio       TIME NOT NULL,
  hora_fin          TIME NOT NULL,
  CHECK (hora_fin > hora_inicio)
);
CREATE INDEX ix_horarios_emprendimiento ON horarios_atencion (emprendimiento_id, dia_semana);

CREATE TABLE bloqueos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emprendimiento_id UUID NOT NULL REFERENCES emprendimientos(id) ON DELETE CASCADE,
  inicio            TIMESTAMPTZ NOT NULL,
  fin               TIMESTAMPTZ NOT NULL,
  motivo            VARCHAR(200),
  CHECK (fin > inicio)
);
CREATE INDEX ix_bloqueos_emprendimiento ON bloqueos (emprendimiento_id, inicio);

CREATE TABLE clientes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emprendimiento_id UUID NOT NULL REFERENCES emprendimientos(id) ON DELETE CASCADE,
  nombre            VARCHAR(100) NOT NULL,
  telefono          VARCHAR(30),
  notas             TEXT,
  activo            BOOLEAN NOT NULL DEFAULT true,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_clientes_emprendimiento ON clientes (emprendimiento_id);

CREATE TABLE turnos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emprendimiento_id UUID NOT NULL REFERENCES emprendimientos(id) ON DELETE CASCADE,
  cliente_id        UUID NOT NULL REFERENCES clientes(id),
  inicio            TIMESTAMPTZ NOT NULL,
  fin               TIMESTAMPTZ NOT NULL,
  descripcion       TEXT,
  estado            estado_turno NOT NULL DEFAULT 'PROGRAMADO',
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (fin > inicio)
);
-- RF-13: los turnos pueden superponerse, pero dos turnos no cancelados
-- del mismo emprendimiento no pueden empezar a la misma hora
CREATE UNIQUE INDEX ux_turnos_mismo_inicio ON turnos (emprendimiento_id, inicio)
  WHERE estado <> 'CANCELADO';
CREATE INDEX ix_turnos_emprendimiento_inicio ON turnos (emprendimiento_id, inicio);

-- Calendario de clases
CREATE TABLE alumnos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emprendimiento_id UUID NOT NULL REFERENCES emprendimientos(id) ON DELETE CASCADE,
  nombre            VARCHAR(100) NOT NULL,
  telefono          VARCHAR(30),
  notas             TEXT,
  activo            BOOLEAN NOT NULL DEFAULT true,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_alumnos_emprendimiento ON alumnos (emprendimiento_id);

CREATE TABLE clases (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emprendimiento_id UUID NOT NULL REFERENCES emprendimientos(id) ON DELETE CASCADE,
  titulo            VARCHAR(100),
  modalidad         modalidad_clase NOT NULL,
  inicio            TIMESTAMPTZ NOT NULL,
  fin               TIMESTAMPTZ NOT NULL,
  estado            estado_clase NOT NULL DEFAULT 'PROGRAMADA',
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (fin > inicio)
);
CREATE INDEX ix_clases_emprendimiento_inicio ON clases (emprendimiento_id, inicio);

CREATE TABLE clase_alumnos (
  clase_id   UUID NOT NULL REFERENCES clases(id) ON DELETE CASCADE,
  alumno_id  UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  PRIMARY KEY (clase_id, alumno_id)
);
CREATE INDEX ix_clase_alumnos_alumno ON clase_alumnos (alumno_id);

-- Ventas
CREATE TABLE tareas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emprendimiento_id UUID NOT NULL REFERENCES emprendimientos(id) ON DELETE CASCADE,
  titulo            VARCHAR(150) NOT NULL,
  descripcion       TEXT,
  estado            estado_tarea NOT NULL DEFAULT 'PENDIENTE',
  prioridad         prioridad_tarea NOT NULL DEFAULT 'MEDIA',
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_tareas_emprendimiento ON tareas (emprendimiento_id, estado, prioridad);

CREATE TABLE tareas_historial (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id         UUID NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  estado_anterior  estado_tarea,
  estado_nuevo     estado_tarea NOT NULL,
  cambiado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_tareas_historial_tarea ON tareas_historial (tarea_id, cambiado_en);

-- Movimientos de dinero (los tres tipos de negocio)
CREATE TABLE movimientos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emprendimiento_id   UUID NOT NULL REFERENCES emprendimientos(id) ON DELETE CASCADE,
  tipo                tipo_movimiento NOT NULL,
  monto_centavos      BIGINT NOT NULL CHECK (monto_centavos > 0),
  fecha               DATE NOT NULL,
  descripcion         TEXT,
  medio_pago          medio_pago,
  clave_idempotencia  UUID UNIQUE,
  turno_id            UUID REFERENCES turnos(id),
  alumno_id           UUID REFERENCES alumnos(id),
  tarea_id            UUID REFERENCES tareas(id) ON DELETE SET NULL,
  mes_correspondiente DATE,
  mes_imputacion      DATE GENERATED ALWAYS AS (
                        COALESCE(mes_correspondiente, date_trunc('month', fecha::timestamp)::date)
                      ) STORED,
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- RF-34: el mes del pago es obligatorio si y solo si el movimiento es el pago de un alumno
  CHECK ((alumno_id IS NULL) = (mes_correspondiente IS NULL)),
  CHECK (mes_correspondiente IS NULL OR EXTRACT(DAY FROM mes_correspondiente) = 1),
  -- un movimiento se vincula a lo sumo con un turno, un alumno o una tarea
  CHECK (num_nonnulls(turno_id, alumno_id, tarea_id) <= 1),
  -- cobros de turnos, pagos de alumnos y ventas de tareas son siempre ingresos
  CHECK (tipo = 'INGRESO' OR num_nonnulls(turno_id, alumno_id, tarea_id) = 0)
);
CREATE INDEX ix_movimientos_estadisticas ON movimientos (emprendimiento_id, mes_imputacion, tipo);
CREATE INDEX ix_movimientos_alumno ON movimientos (alumno_id) WHERE alumno_id IS NOT NULL;
CREATE INDEX ix_movimientos_turno ON movimientos (turno_id) WHERE turno_id IS NOT NULL;
CREATE INDEX ix_movimientos_tarea ON movimientos (tarea_id) WHERE tarea_id IS NOT NULL;
