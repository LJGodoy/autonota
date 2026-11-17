import { useState } from 'react';
import { Boton } from './Boton';
import { Confirmacion } from './Confirmacion';
import { Dialogo } from './Dialogo';
import { ErrorApi } from '../lib/api';
import { formatearFechaCorta } from '../lib/meses';
import { sumarDias } from '../lib/zona';

export interface ResultadoCopia {
  creados: number;
  omitidos: { clave: string; texto: string }[];
}

interface Props {
  /** Lunes AAAA-MM-DD de la semana que se está viendo (destino) */
  lunesDestino: string;
  copiar: (semanaOrigen: string, forzar: boolean) => Promise<ResultadoCopia>;
  nombre: 'turnos' | 'clases';
}

/** RF-21 y RF-37 (CU-10, CU-13): copiar la semana anterior a la que se está viendo */
export function CopiarSemana({ lunesDestino, copiar, nombre }: Props) {
  const [paso, setPaso] = useState<'nada' | 'ocupada' | 'resultado'>('nada');
  const [resultado, setResultado] = useState<ResultadoCopia | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const origen = sumarDias(lunesDestino, -7);

  async function ejecutar(forzar: boolean) {
    setError('');
    setCargando(true);
    try {
      setResultado(await copiar(origen, forzar));
      setPaso('resultado');
    } catch (e) {
      if (e instanceof ErrorApi && e.code === 'SEMANA_DESTINO_OCUPADA' && !forzar)
        setPaso('ocupada');
      else setError(e instanceof ErrorApi ? e.message : 'No se pudo copiar la semana.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <Boton variante="secundario" cargando={cargando} onClick={() => void ejecutar(false)}>
        Copiar semana anterior
      </Boton>
      {error && (
        <p role="alert" className="w-full font-bold text-rojo">
          ✗ {error}
        </p>
      )}
      {paso === 'ocupada' && (
        <Confirmacion
          titulo="La semana ya tiene registros"
          textoConfirmar="Copiar igual"
          alConfirmar={() => ejecutar(true)}
          alCerrar={() => setPaso((p) => (p === 'ocupada' ? 'nada' : p))}
        >
          <p>
            La semana del {formatearFechaCorta(lunesDestino)} ya tiene {nombre}. Si copiás igual,
            los {nombre} de la semana del {formatearFechaCorta(origen)} se suman a los que ya están.
          </p>
        </Confirmacion>
      )}
      {paso === 'resultado' && resultado && (
        <Dialogo abierto titulo="Semana copiada" alCerrar={() => setPaso('nada')}>
          <p>
            Se {resultado.creados === 1 ? 'creó' : 'crearon'} <strong>{resultado.creados}</strong>{' '}
            {nombre === 'turnos' ? 'turno' : 'clase'}
            {resultado.creados === 1 ? '' : 's'} a partir de la semana del{' '}
            {formatearFechaCorta(origen)}.
          </p>
          {resultado.omitidos.length > 0 && (
            <>
              <p>No se {resultado.omitidos.length === 1 ? 'copió' : 'copiaron'}:</p>
              <ul className="list-disc pl-6">
                {resultado.omitidos.map((o) => (
                  <li key={o.clave}>{o.texto}</li>
                ))}
              </ul>
            </>
          )}
          <div className="flex justify-end">
            <Boton onClick={() => setPaso('nada')}>Listo</Boton>
          </div>
        </Dialogo>
      )}
    </>
  );
}
