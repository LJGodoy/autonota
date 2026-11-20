import type { Movimiento, TipoEmprendimiento, TipoMovimiento } from '@autonota/shared';

/** Qué cuenta como ingreso y como gasto en cada tipo de negocio (Parte 1, sección 6.5) */
export const ETIQUETAS: Record<TipoEmprendimiento, Record<TipoMovimiento, string>> = {
  TURNERO: { INGRESO: 'Cobro', GASTO: 'Gasto' },
  CLASES: { INGRESO: 'Cobro', GASTO: 'Gasto' },
  VENTAS: { INGRESO: 'Venta', GASTO: 'Gasto' },
};

export const PLURALES: Record<TipoEmprendimiento, Record<TipoMovimiento, string>> = {
  TURNERO: { INGRESO: 'Cobros', GASTO: 'Compras de insumos' },
  CLASES: { INGRESO: 'Pagos', GASTO: 'Gastos' },
  VENTAS: { INGRESO: 'Ventas', GASTO: 'Gastos' },
};

/** Nombre del origen de un movimiento ya cargado */
export function origenMovimiento(m: Movimiento, tipo: TipoEmprendimiento): string {
  if (m.turnoId) return 'Cobro de turno';
  if (m.alumnoId) return 'Pago de alumno';
  if (m.tareaId) return 'Venta de un pedido';
  return ETIQUETAS[tipo][m.tipo];
}
