import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  abierto: boolean;
  titulo: string;
  alCerrar: () => void;
  children: ReactNode;
}

/** Modal accesible sobre el elemento nativo dialog (foco atrapado y cierre con Escape) */
export function Dialogo({ abierto, titulo, alCerrar, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal?.();
    if (!abierto && dialogo.open) dialogo.close?.();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      onClose={alCerrar}
      aria-labelledby="dialogo-titulo"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-trazo-2 border border-linea bg-hoja p-0 text-tinta shadow-nota backdrop:bg-tinta/40"
    >
      {abierto && (
        <div className="flex flex-col gap-4 p-5">
          <h2 id="dialogo-titulo" className="font-mano text-3xl font-bold text-birome">
            {titulo}
          </h2>
          {children}
        </div>
      )}
    </dialog>
  );
}
