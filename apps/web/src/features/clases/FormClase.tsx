import { useState } from 'react';
import type { Clase, ModalidadClase } from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { Campo } from '../../components/Campo';
import { Dialogo } from '../../components/Dialogo';
import { ErrorApi } from '../../lib/api';
import { aIsoArgentina, separarFechaHora } from '../../lib/zona';
import { usePersonas } from '../personas/api';
import { useGuardarClase } from './api';

interface Props {
  eid: string;
  clase?: Clase;
  inicial?: { fecha: string; hora: string; duracionMinutos?: number };
  alCerrar: () => void;
}

/** RF-31 y RF-32: alta, edición y reprogramación de una clase individual o grupal */
export function FormClase({ eid, clase, inicial, alCerrar }: Props) {
  const alumnos = usePersonas(eid, 'alumnos', { pageSize: 100 });
  const guardar = useGuardarClase(eid);
  const fh = clase ? separarFechaHora(clase.inicio) : inicial;
  const [titulo, setTitulo] = useState(clase?.titulo ?? '');
  const [modalidad, setModalidad] = useState<ModalidadClase>(clase?.modalidad ?? 'GRUPAL');
  const [fecha, setFecha] = useState(fh?.fecha ?? '');
  const [hora, setHora] = useState(fh?.hora ?? '18:00');
  const [duracion, setDuracion] = useState(
    String(clase?.duracionMinutos ?? inicial?.duracionMinutos ?? 60),
  );
  const [elegidos, setElegidos] = useState<string[]>(clase?.alumnos.map((a) => a.id) ?? []);
  const [error, setError] = useState('');

  function alternar(id: string) {
    if (modalidad === 'INDIVIDUAL') setElegidos([id]);
    else setElegidos((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]));
  }

  async function enviar() {
    setError('');
    if (elegidos.length === 0) return setError('Elegí al menos un alumno.');
    if (modalidad === 'INDIVIDUAL' && elegidos.length !== 1)
      return setError('Una clase individual tiene exactamente un alumno.');
    if (!fecha || !hora) return setError('Indicá fecha y hora.');
    try {
      await guardar.mutateAsync({
        id: clase?.id,
        datos: {
          titulo: titulo.trim() || null,
          modalidad,
          inicio: aIsoArgentina(fecha, hora),
          duracionMinutos: Number(duracion),
          alumnoIds: elegidos,
        },
      });
      alCerrar();
    } catch (e) {
      setError(
        e instanceof ErrorApi
          ? (e.details[0]?.message ?? e.message)
          : 'No se pudo guardar la clase.',
      );
    }
  }

  return (
    <Dialogo abierto titulo={clase ? 'Editar clase' : 'Nueva clase'} alCerrar={alCerrar}>
      <div className="flex flex-col gap-4">
        <Campo
          etiqueta="Nombre de la clase (opcional)"
          placeholder="Tenis inicial"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <fieldset className="flex gap-2">
          <legend className="mb-1 text-sm font-bold text-lapiz">Modalidad</legend>
          {(['GRUPAL', 'INDIVIDUAL'] as const).map((m) => (
            <label
              key={m}
              className="flex items-center gap-2 rounded-trazo border-2 border-grafito px-3 py-2 has-[:checked]:bg-kraft-claro"
            >
              <input
                type="radio"
                name="modalidad"
                checked={modalidad === m}
                onChange={() => {
                  setModalidad(m);
                  if (m === 'INDIVIDUAL') setElegidos((e) => e.slice(0, 1));
                }}
                className="accent-cafe"
              />
              {m === 'GRUPAL' ? 'Grupal' : 'Individual'}
            </label>
          ))}
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <Campo
            etiqueta="Fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
          <Campo
            etiqueta="Hora"
            type="time"
            step={300}
            value={hora}
            onChange={(e) => setHora(e.target.value)}
          />
        </div>
        <Campo
          etiqueta="Duración (minutos)"
          type="number"
          min={5}
          max={720}
          step={5}
          value={duracion}
          onChange={(e) => setDuracion(e.target.value)}
        />
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm font-bold text-lapiz">
            Alumnos {modalidad === 'INDIVIDUAL' ? '(uno)' : ''}
          </legend>
          {alumnos.data?.data.length === 0 && (
            <p className="text-sm text-lapiz">Primero cargá alumnos en la pestaña Alumnos.</p>
          )}
          <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
            {alumnos.data?.data.map((a) => (
              <label key={a.id} className="flex items-center gap-2">
                <input
                  type={modalidad === 'INDIVIDUAL' ? 'radio' : 'checkbox'}
                  name="alumnos"
                  checked={elegidos.includes(a.id)}
                  onChange={() => alternar(a.id)}
                  className="size-5 accent-cafe"
                />
                {a.nombre}
              </label>
            ))}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="font-bold text-cafe">
            ✗ {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <Boton variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton cargando={guardar.isPending} onClick={() => void enviar()}>
            Guardar
          </Boton>
        </div>
      </div>
    </Dialogo>
  );
}
