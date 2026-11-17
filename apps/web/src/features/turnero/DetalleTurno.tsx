import { useState } from 'react';
import type { Turno } from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { Confirmacion } from '../../components/Confirmacion';
import { Dialogo } from '../../components/Dialogo';
import { EtiquetaEstadoTurno } from '../../components/EtiquetaEstado';
import { formatearPesos } from '../../lib/dinero';
import { formatearFechaHora } from '../../lib/fechas';
import { horaCorta } from '../../lib/zona';
import { useAccionTurno } from './api';
import { FormCobro } from './FormCobro';
import { FormTurno } from './FormTurno';
import { ListaMovimientos } from '../movimientos/ListaMovimientos';

type Paso = 'realizar' | 'cobro' | 'reubicar' | 'cancelar' | null;

/** CU-07 y CU-08: acciones sobre un turno */
export function DetalleTurno({
  eid,
  turno,
  alCerrar,
}: {
  eid: string;
  turno: Turno;
  alCerrar: () => void;
}) {
  const [paso, setPaso] = useState<Paso>(null);
  const accion = useAccionTurno(eid);
  const cancelado = turno.estado === 'CANCELADO';

  if (paso === 'realizar' || paso === 'cobro') {
    return <FormCobro eid={eid} turno={turno} realizar={paso === 'realizar'} alCerrar={alCerrar} />;
  }
  if (paso === 'reubicar') return <FormTurno eid={eid} turno={turno} alCerrar={alCerrar} />;
  if (paso === 'cancelar') {
    return (
      <Confirmacion
        titulo="¿Cancelar el turno?"
        textoConfirmar="Cancelar turno"
        alConfirmar={() => accion.mutateAsync({ id: turno.id, accion: 'cancelar' })}
        alCerrar={alCerrar}
      >
        <p>
          El turno de <strong>{turno.cliente.nombre}</strong> del {formatearFechaHora(turno.inicio)}{' '}
          queda cancelado y ese horario se libera.
        </p>
      </Confirmacion>
    );
  }

  return (
    <Dialogo abierto titulo={turno.cliente.nombre} alCerrar={alCerrar}>
      <div className="flex flex-col gap-1">
        <p>
          {formatearFechaHora(turno.inicio)} a {horaCorta(turno.fin)} · {turno.duracionMinutos} min
        </p>
        {turno.descripcion && <p className="text-lapiz">{turno.descripcion}</p>}
        <div>
          <EtiquetaEstadoTurno estado={turno.estado} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="montos font-bold">Cobrado: {formatearPesos(turno.totalCobradoCentavos)}</p>
        {turno.cobros.length > 0 && (
          <ListaMovimientos movimientos={turno.cobros} tipoNegocio="TURNERO" />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {!cancelado && <Boton onClick={() => setPaso('realizar')}>Realizado</Boton>}
        <Boton variante="secundario" onClick={() => setPaso('cobro')}>
          + Cobro o seña
        </Boton>
        {!cancelado && turno.estado !== 'AUSENTE' && (
          <Boton
            variante="secundario"
            cargando={accion.isPending}
            onClick={() =>
              void accion.mutateAsync({ id: turno.id, accion: 'ausente' }).then(alCerrar)
            }
          >
            No vino
          </Boton>
        )}
        {turno.estado === 'PROGRAMADO' && (
          <>
            <Boton variante="secundario" onClick={() => setPaso('reubicar')}>
              Reubicar
            </Boton>
            <Boton variante="peligro" onClick={() => setPaso('cancelar')}>
              Cancelar turno
            </Boton>
          </>
        )}
      </div>
      <p className="text-sm text-lapiz">
        Los cobros se corrigen o eliminan desde la pestaña Movimientos.
      </p>
    </Dialogo>
  );
}
