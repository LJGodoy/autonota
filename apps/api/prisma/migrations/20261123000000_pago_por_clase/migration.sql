-- Pago por clase (decisión del dueño, noviembre de 2026).
-- Escrita a mano: no toca la columna calculada movimientos.mes_imputacion.

-- 1. Cancelar una clase ahora la borra: se eliminan las canceladas y el estado deja de existir
DELETE FROM clases WHERE estado = 'CANCELADA';
ALTER TABLE clases DROP COLUMN estado;
DROP TYPE estado_clase;

-- 2. Los pagos nuevos de alumnos no tienen mes correspondiente. Los pagos mensuales anteriores
--    se conservan (siguen contando en su mes); solo un pago de alumno puede tener mes.
ALTER TABLE movimientos DROP CONSTRAINT movimientos_check;
ALTER TABLE movimientos ADD CONSTRAINT movimientos_mes_solo_alumno_check
  CHECK (alumno_id IS NOT NULL OR mes_correspondiente IS NULL);

-- 3. Qué clases de qué alumno paga cada ingreso. La clave primaria impide pagar dos veces
--    la misma clase del mismo alumno. Borrar la clase, sacar al alumno de la clase o borrar
--    el movimiento borra solo el vínculo.
CREATE TABLE pagos_clase (
  clase_id      UUID NOT NULL,
  alumno_id     UUID NOT NULL,
  movimiento_id UUID NOT NULL REFERENCES movimientos(id) ON DELETE CASCADE,
  PRIMARY KEY (clase_id, alumno_id),
  FOREIGN KEY (clase_id, alumno_id) REFERENCES clase_alumnos(clase_id, alumno_id) ON DELETE CASCADE
);
CREATE INDEX ix_pagos_clase_movimiento ON pagos_clase (movimiento_id);
