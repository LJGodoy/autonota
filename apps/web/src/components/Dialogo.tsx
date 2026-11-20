import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  abierto: boolean;
  titulo: string;
  alCerrar: () => void;
  children: ReactNode;
  /** Clase de ancho máximo; por defecto max-w-md */
  ancho?: string;
}

/** Modal accesible sobre el elemento nativo dialog: se cierra con Escape, con la X o tocando afuera */
export function Dialogo({ abierto, titulo, alCerrar, children, ancho = 'max-w-md' }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal?.();
    if (!abierto && dialogo.open) dialogo.close?.();
  }, [abierto]);

  return (
    // El clic afuera es solo un atajo de mouse: con teclado ya cierran Escape y el botón X
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      onClose={alCerrar}
      // El fondo oscuro es parte del propio dialog: un clic directo sobre él es un clic afuera
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close?.();
      }}
      aria-labelledby="dialogo-titulo"
      className={`m-auto w-[calc(100%-2rem)] ${ancho} rounded-trazo-2 border border-linea bg-hoja p-0 text-tinta shadow-nota backdrop:bg-tinta/40`}
    >
      {abierto && (
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 id="dialogo-titulo" className="font-mano text-3xl font-bold text-cafe">
              {titulo}
            </h2>
            <button
              type="button"
              onClick={() => ref.current?.close?.()}
              aria-label="Cerrar"
              className="-mt-1 -mr-2 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-trazo text-rojo transition-colors duration-150 hover:bg-arena"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
