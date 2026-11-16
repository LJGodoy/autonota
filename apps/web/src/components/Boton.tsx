import type { ButtonHTMLAttributes } from 'react';

type Variante = 'primario' | 'secundario' | 'peligro' | 'texto';

const ESTILOS: Record<Variante, string> = {
  primario: 'bg-cafe text-papel border-grafito hover:bg-grafito',
  secundario: 'bg-papel text-grafito border-grafito hover:bg-kraft-claro',
  peligro: 'bg-papel text-cafe border-cafe border-dashed hover:bg-kraft-claro',
  texto:
    'bg-transparent text-madera border-transparent underline underline-offset-4 hover:text-cafe',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  cargando?: boolean;
}

/** Botón con borde de 2 px en grafito y esquinas irregulares (Parte 6, sección 5.3) */
export function Boton({
  variante = 'primario',
  cargando = false,
  className = '',
  children,
  disabled,
  ...resto
}: Props) {
  return (
    <button
      type="button"
      {...resto}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-trazo border-2 px-5 py-2 font-sans font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${ESTILOS[variante]} ${className}`}
    >
      {cargando ? 'Guardando…' : children}
    </button>
  );
}
