import type { ButtonHTMLAttributes } from 'react';

type Variante = 'primario' | 'secundario' | 'peligro' | 'texto';

const ESTILOS: Record<Variante, string> = {
  primario:
    'border-birome bg-birome text-hoja shadow-nota hover:border-birome-oscura hover:bg-birome-oscura active:translate-y-px',
  secundario:
    'border-linea bg-hoja text-tinta hover:border-tinta hover:bg-celeste active:translate-y-px',
  peligro: 'border-rojo bg-hoja text-rojo hover:bg-rojo hover:text-hoja active:translate-y-px',
  texto:
    'border-transparent bg-transparent text-birome underline decoration-1 underline-offset-4 hover:bg-celeste hover:text-birome-oscura',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  cargando?: boolean;
}

/** Botón de la identidad de cuaderno: birome azul para la acción principal, línea fina para el resto */
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
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-trazo border px-4 py-2 font-sans font-bold transition-[background-color,color,border-color,transform] duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none ${ESTILOS[variante]} ${className}`}
    >
      {cargando ? 'Guardando…' : children}
    </button>
  );
}
