import { useState } from 'react';
import type { Emprendimiento } from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { Campo } from '../../components/Campo';
import { Dialogo } from '../../components/Dialogo';
import { ErrorApi } from '../../lib/api';
import { useEliminarEmprendimiento, useRenombrarEmprendimiento } from './api';

interface Props {
  emprendimiento: Emprendimiento;
  alCerrar: () => void;
}

function mensaje(e: unknown): string {
  return e instanceof ErrorApi
    ? (e.details[0]?.message ?? e.message)
    : 'Algo salió mal. Probá de nuevo.';
}

/** RF-05: cambiar el nombre */
export function DialogoRenombrar({ emprendimiento, alCerrar }: Props) {
  const renombrar = useRenombrarEmprendimiento();
  const [nombre, setNombre] = useState(emprendimiento.nombre);
  const [error, setError] = useState('');

  async function alGuardar() {
    setError('');
    try {
      await renombrar.mutateAsync({ id: emprendimiento.id, nombre });
      alCerrar();
    } catch (e) {
      setError(mensaje(e));
    }
  }

  return (
    <Dialogo abierto titulo="Cambiar el nombre" alCerrar={alCerrar}>
      <Campo
        etiqueta="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        error={error || undefined}
      />
      <div className="flex flex-wrap justify-end gap-3">
        <Boton variante="secundario" onClick={alCerrar}>
          Cancelar
        </Boton>
        <Boton onClick={alGuardar} cargando={renombrar.isPending}>
          Guardar
        </Boton>
      </div>
    </Dialogo>
  );
}

/** CU-05 (RF-06): eliminación definitiva, confirmando con el nombre */
export function DialogoEliminar({
  emprendimiento,
  alCerrar,
  alEliminar,
}: Props & { alEliminar?: () => void }) {
  const eliminar = useEliminarEmprendimiento();
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState('');
  const coincide = confirmacion.trim() === emprendimiento.nombre.trim();

  async function alConfirmar() {
    setError('');
    try {
      await eliminar.mutateAsync({ id: emprendimiento.id, confirmarNombre: confirmacion });
      alCerrar();
      alEliminar?.();
    } catch (e) {
      setError(mensaje(e));
    }
  }

  return (
    <Dialogo abierto titulo="¿Eliminar el emprendimiento?" alCerrar={alCerrar}>
      <p>
        Se borran para siempre <strong>{emprendimiento.nombre}</strong> y todos sus datos. No se
        puede deshacer, y se libera uno de tus 3 lugares.
      </p>
      <Campo
        etiqueta={`Escribí «${emprendimiento.nombre}» para confirmar`}
        value={confirmacion}
        onChange={(e) => setConfirmacion(e.target.value)}
        autoComplete="off"
        error={error || undefined}
      />
      <div className="flex flex-wrap justify-end gap-3">
        <Boton variante="secundario" onClick={alCerrar}>
          Cancelar
        </Boton>
        <Boton onClick={alConfirmar} disabled={!coincide} cargando={eliminar.isPending}>
          Eliminar para siempre
        </Boton>
      </div>
    </Dialogo>
  );
}
