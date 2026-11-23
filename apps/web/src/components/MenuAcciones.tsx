import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export interface OpcionMenu {
  texto: string;
  alElegir: () => void;
  peligro?: boolean;
}

interface Props {
  /** Nombre accesible del botón, p. ej. "Acciones de Ana" */
  etiqueta: string;
  opciones: OpcionMenu[];
  /** Contenido del botón; por defecto el ⋮ */
  disparador?: ReactNode;
  className?: string;
  /** Clases extra del botón (p. ej. color de texto sobre la tapa oscura) */
  claseBoton?: string;
}

/** Menú desplegable de acciones (⋮): mismo patrón para filas, tarjetas y la cuenta */
export function MenuAcciones({
  etiqueta,
  opciones,
  disparador = '⋮',
  className = '',
  claseBoton = 'text-lapiz hover:bg-arena hover:text-tinta',
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!abierto) return;
    const alTocarFuera = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierto(false);
    };
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('pointerdown', alTocarFuera);
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('pointerdown', alTocarFuera);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [abierto]);

  return (
    <div ref={raiz} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={etiqueta}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={id}
        // Dentro de una fila o tarjeta clickeable, el menú no debe abrir el destino
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setAbierto((v) => !v);
        }}
        className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-trazo px-2 font-bold transition-colors duration-150 ${claseBoton}`}
      >
        {disparador}
      </button>
      {abierto && (
        <ul
          id={id}
          role="menu"
          className="absolute right-0 z-30 mt-1 min-w-44 rounded-trazo border border-linea bg-hoja py-1 shadow-nota"
        >
          {opciones.map((o) => (
            <li key={o.texto} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setAbierto(false);
                  o.alElegir();
                }}
                className={`block min-h-11 w-full px-4 py-2 text-left font-bold hover:bg-arena ${
                  o.peligro ? 'text-rojo' : 'text-tinta'
                }`}
              >
                {o.texto}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
