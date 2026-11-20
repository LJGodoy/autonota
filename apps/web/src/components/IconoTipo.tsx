import type { TipoEmprendimiento } from '@autonota/shared';

/** Trazos de 24×24: tijera (turnero), birrete (clases), bolsa de compras (ventas) */
const TRAZOS: Record<TipoEmprendimiento, string[]> = {
  TURNERO: [
    'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    'M8.1 8.1 20 20M8.1 15.9 20 4M14.5 14.5 12 12',
  ],
  CLASES: ['M2 9l10-5 10 5-10 5-10-5z', 'M6 11.2V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.8M22 9v6'],
  VENTAS: ['M5 7h14l-1 13H6L5 7z', 'M9 10V6a3 3 0 0 1 6 0v4'],
};

export function IconoTipo({
  tipo,
  className = 'size-8',
}: {
  tipo: TipoEmprendimiento;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {TRAZOS[tipo].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
