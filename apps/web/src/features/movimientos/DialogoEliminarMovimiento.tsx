import { useState } from 'react';
import type { Movimiento } from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { Dialogo } from '../../components/Dialogo';
import { ErrorApi } from '../../lib/api';
import { formatearPesos } from '../../lib/dinero';
import { formatearFechaCorta } from '../../lib/meses';
import { useEliminarMovimiento } from './api';

/** Confirmación antes de eliminar un movimiento (Parte 6, sección 5.2) */
export function DialogoEliminarMovimiento({
  eid,
  movimiento,
  alCerrar,
}: {
  eid: string;
  movimiento: Movimiento;
  alCerrar: () => void;
}) {
  const eliminar = useEliminarMovimiento(eid);
  const [error, setError] = useState('');

  async function alConfirmar() {
    setError('');
    try {
      await eliminar.mutateAsync(movimiento.id);
      alCerrar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo eliminar.');
    }
  }

  return (
    <Dialogo abierto titulo="¿Eliminar el movimiento?" alCerrar={alCerrar}>
      <p>
        Vas a eliminar {movimiento.tipo === 'INGRESO' ? 'el ingreso' : 'el gasto'} de{' '}
        <strong className="montos">{formatearPesos(movimiento.montoCentavos)}</strong> del{' '}
        {formatearFechaCorta(movimiento.fecha)}
        {movimiento.descripcion ? ` («${movimiento.descripcion}»)` : ''}. No se puede deshacer.
      </p>
      {error && (
        <p role="alert" className="font-bold text-cafe">
          ✗ {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <Boton variante="secundario" onClick={alCerrar}>
          Cancelar
        </Boton>
        <Boton onClick={alConfirmar} cargando={eliminar.isPending}>
          Eliminar
        </Boton>
      </div>
    </Dialogo>
  );
}
