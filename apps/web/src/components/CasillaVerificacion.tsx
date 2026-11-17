import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  children: ReactNode;
  error?: string;
  ref?: Ref<HTMLInputElement>;
}

/** Casilla dibujada a mano; marcada muestra una tilde */
export function CasillaVerificacion({ children, error, id, ref, ...resto }: Props) {
  const generado = useId();
  const idCampo = id ?? generado;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-3">
        <input
          ref={ref}
          id={idCampo}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${idCampo}-error` : undefined}
          className="mt-0.5 size-6 shrink-0 cursor-pointer appearance-none rounded-[4px] border-2 border-tinta bg-hoja transition-colors duration-150 checked:border-birome checked:bg-birome hover:border-birome checked:bg-[url('data:image/svg+xml;utf8,<svg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2024%2024%22><path%20d=%22M5%2013l4%204L19%207%22%20fill=%22none%22%20stroke=%22%23FCFDFF%22%20stroke-width=%223%22%20stroke-linecap=%22round%22/></svg>')] checked:bg-center checked:bg-no-repeat"
          {...resto}
        />
        <label htmlFor={idCampo} className="text-sm leading-6 text-tinta">
          {children}
        </label>
      </div>
      {error && (
        <p id={`${idCampo}-error`} role="alert" className="text-sm font-bold text-rojo">
          ✗ {error}
        </p>
      )}
    </div>
  );
}
