import { useState, type ReactNode } from 'react';
import { ErrorApi } from '../lib/api';
import { Boton } from './Boton';
import { Dialogo } from './Dialogo';

interface Props {
  titulo: string;
  textoConfirmar: string;
  children: ReactNode;
  alConfirmar: () => Promise<unknown>;
  alCerrar: () => void;
}

/** Confirmación antes de toda acción destructiva o irreversible (Parte 6, sección 5.2) */
export function Confirmacion({ titulo, textoConfirmar, children, alConfirmar, alCerrar }: Props) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function confirmar() {
    setCargando(true);
    setError('');
    try {
      await alConfirmar();
      alCerrar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'Algo salió mal. Probá de nuevo.');
      setCargando(false);
    }
  }

  return (
    <Dialogo abierto titulo={titulo} alCerrar={alCerrar}>
      <div className="flex flex-col gap-2">{children}</div>
      {error && (
        <p role="alert" className="font-bold text-cafe">
          ✗ {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <Boton variante="secundario" onClick={alCerrar}>
          Volver
        </Boton>
        <Boton onClick={confirmar} cargando={cargando}>
          {textoConfirmar}
        </Boton>
      </div>
    </Dialogo>
  );
}
