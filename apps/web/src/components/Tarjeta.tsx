import type { HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  /** Nota destacada: papel kraft claro con sombra suave */
  nota?: boolean;
}

/** Tarjeta de papel con borde de grafito y esquinas irregulares (Parte 6, sección 5.3) */
export function Tarjeta({ nota = false, className = '', ...resto }: Props) {
  return (
    <div
      className={`rounded-trazo-2 border-2 border-grafito p-4 sm:p-5 ${nota ? 'bg-kraft-claro shadow-nota' : 'bg-papel'} ${className}`}
      {...resto}
    />
  );
}
