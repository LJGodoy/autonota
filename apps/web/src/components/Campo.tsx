import { useId, type InputHTMLAttributes, type Ref } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string;
  error?: string;
  ayuda?: string;
  ref?: Ref<HTMLInputElement>;
}

/** Campo de texto sin caja, escrito sobre un renglón inferior (Parte 6, sección 5.3) */
export function Campo({ etiqueta, error, ayuda, id, className = '', ref, ...resto }: Props) {
  const generado = useId();
  const idCampo = id ?? generado;
  const idAyuda = `${idCampo}-ayuda`;
  const idError = `${idCampo}-error`;
  const descripciones = [ayuda ? idAyuda : null, error ? idError : null].filter(Boolean).join(' ');

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={idCampo} className="text-sm font-bold text-lapiz">
        {etiqueta}
      </label>
      <input
        ref={ref}
        id={idCampo}
        aria-invalid={error ? true : undefined}
        aria-describedby={descripciones || undefined}
        className={`w-full border-0 border-b-2 bg-transparent px-1 py-2 text-base text-grafito outline-none placeholder:text-lapiz/70 focus:border-madera ${error ? 'border-cafe border-dashed' : 'border-grafito'}`}
        {...resto}
      />
      {ayuda && (
        <p id={idAyuda} className="text-sm text-lapiz">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} role="alert" className="text-sm font-bold text-cafe">
          ✗ {error}
        </p>
      )}
    </div>
  );
}
