import type { Clase } from '@autonota/shared';

/** Negro: nadie pagó (o no tiene alumnos); amarillo: pagaron algunos; verde: pagaron todos */
export function estadoPago(c: Pick<Clase, 'alumnos'>): 'debe' | 'parcial' | 'pagada' {
  const pagaron = c.alumnos.filter((a) => a.pagada).length;
  if (pagaron === 0) return 'debe';
  return pagaron === c.alumnos.length ? 'pagada' : 'parcial';
}
