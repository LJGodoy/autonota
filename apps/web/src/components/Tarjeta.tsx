import type { HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  /** Nota destacada: hoja celeste, como un papel pegado sobre la página */
  nota?: boolean;
}

/** Hoja suelta con línea fina y sombra de papel */
export function Tarjeta({ nota = false, className = '', ...resto }: Props) {
  return (
    <div
      className={`rounded-trazo-2 border p-4 sm:p-5 ${nota ? 'border-celeste bg-celeste' : 'border-linea bg-hoja shadow-nota'} ${className}`}
      {...resto}
    />
  );
}
