import type { Clase } from '@autonota/shared';

/** Gris: cancelada; negro: nadie pagó (o no tiene alumnos); amarillo: pagaron algunos; verde: todos */
export function estadoPago(
  c: Pick<Clase, 'alumnos' | 'cancelada'>,
): 'cancelada' | 'debe' | 'parcial' | 'pagada' {
  if (c.cancelada) return 'cancelada';
  const pagaron = c.alumnos.filter((a) => a.pagada).length;
  if (pagaron === 0) return 'debe';
  return pagaron === c.alumnos.length ? 'pagada' : 'parcial';
}
