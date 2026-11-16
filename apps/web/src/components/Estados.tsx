import { useEffect, useState, type ReactNode } from 'react';
import { alCambiarDemora, ErrorApi } from '../lib/api';
import { Boton } from './Boton';

/** Estado de carga (Parte 6, sección 5.2) */
export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <p role="status" className="py-8 text-center font-mano text-2xl text-lapiz">
      {texto}
    </p>
  );
}

/** Estado de error con mensaje en español y opción de reintentar */
export function MensajeError({ error, reintentar }: { error: unknown; reintentar?: () => void }) {
  const mensaje =
    error instanceof ErrorApi ? error.message : 'Algo salió mal. Probá de nuevo en un rato.';
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-trazo-2 border-2 border-dashed border-cafe p-4"
    >
      <p className="font-bold text-cafe">✗ {mensaje}</p>
      {reintentar && (
        <Boton variante="secundario" onClick={reintentar}>
          Reintentar
        </Boton>
      )}
    </div>
  );
}

/** Estado vacío */
export function Vacio({ children }: { children: ReactNode }) {
  return <div className="py-6 text-center text-lapiz">{children}</div>;
}

/** Aviso de arranque lento del servidor (ADR-010) */
export function AvisoServidorLento() {
  const [lento, setLento] = useState(false);
  useEffect(() => alCambiarDemora(setLento), []);
  if (!lento) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-trazo-2 border-2 border-grafito bg-kraft-claro p-3 text-center shadow-nota"
    >
      El servidor se está despertando. Puede tardar unos segundos…
    </div>
  );
}
