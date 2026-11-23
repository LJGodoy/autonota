-- Cancelar una clase la conserva como registro (decisión del dueño); borrarla sigue borrándola.
ALTER TABLE clases ADD COLUMN cancelada_en TIMESTAMPTZ;
ALTER TABLE clases ADD COLUMN motivo_cancelacion VARCHAR(200);
