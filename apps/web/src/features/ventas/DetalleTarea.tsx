import { useState } from 'react';
import { NOMBRE_ESTADO_TAREA, NOMBRE_PRIORIDAD } from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { Confirmacion } from '../../components/Confirmacion';
import { Dialogo } from '../../components/Dialogo';
import { Cargando, MensajeError } from '../../components/Estados';
import { formatearPesos } from '../../lib/dinero';
import { formatearFechaHora } from '../../lib/fechas';
import { FormMovimiento } from '../movimientos/FormMovimiento';
import { ListaMovimientos } from '../movimientos/ListaMovimientos';
import { useEliminarTarea, useTarea } from './api';
import { FormTarea } from './FormTarea';

/** Detalle con historial de estados (RF-53) y ventas vinculadas (RF-55) */
export function DetalleTarea({
  eid,
  id,
  alCerrar,
}: {
  eid: string;
  id: string;
  alCerrar: () => void;
}) {
  const consulta = useTarea(eid, id);
  const eliminar = useEliminarTarea(eid);
  const [paso, setPaso] = useState<'ver' | 'editar' | 'venta' | 'eliminar'>('ver');
  const t = consulta.data;

  if (t && paso === 'editar')
    return <FormTarea eid={eid} tarea={t} alCerrar={() => setPaso('ver')} />;
  if (t && paso === 'venta')
    return (
      <FormMovimiento
        eid={eid}
        tipoNegocio="VENTAS"
        tipo="INGRESO"
        tareaId={t.id}
        descripcionInicial={t.titulo}
        alCerrar={() => setPaso('ver')}
      />
    );
  if (t && paso === 'eliminar') {
    return (
      <Confirmacion
        titulo="¿Eliminar la anotación?"
        textoConfirmar="Eliminar"
        alConfirmar={() => eliminar.mutateAsync(t.id)}
        alCerrar={alCerrar}
      >
        <p>
          Se borran «{t.titulo}» y su historial. Las ventas vinculadas se conservan y siguen
          contando en las estadísticas.
        </p>
      </Confirmacion>
    );
  }

  return (
    <Dialogo abierto titulo={t?.titulo ?? 'Anotación'} alCerrar={alCerrar}>
      {consulta.isPending && <Cargando />}
      {consulta.isError && <MensajeError error={consulta.error} />}
      {t && (
        <>
          <p className="text-sm text-lapiz">
            {NOMBRE_ESTADO_TAREA[t.estado]} · Prioridad{' '}
            {NOMBRE_PRIORIDAD[t.prioridad].toLowerCase()} · Cargada el{' '}
            {formatearFechaHora(t.creadoEn)}
          </p>
          {t.descripcion && <p>{t.descripcion}</p>}
          <section aria-labelledby="historial-tarea">
            <h3 id="historial-tarea" className="font-mano text-2xl font-bold text-cafe">
              Historial
            </h3>
            <ol className="flex flex-col gap-1 text-sm">
              {t.historial.map((h) => (
                <li key={h.cambiadoEn + h.estadoNuevo}>
                  {formatearFechaHora(h.cambiadoEn)}:{' '}
                  {h.estadoAnterior
                    ? `${NOMBRE_ESTADO_TAREA[h.estadoAnterior]} → `
                    : 'Creada como '}
                  {NOMBRE_ESTADO_TAREA[h.estadoNuevo]}
                </li>
              ))}
            </ol>
          </section>
          <section aria-labelledby="ventas-tarea" className="flex flex-col gap-2">
            <h3 id="ventas-tarea" className="font-mano text-2xl font-bold text-cafe">
              Ventas · <span className="montos">{formatearPesos(t.totalVendidoCentavos)}</span>
            </h3>
            {t.ventas.length > 0 && (
              <ListaMovimientos movimientos={t.ventas} tipoNegocio="VENTAS" />
            )}
          </section>
          <div className="flex flex-wrap gap-2">
            <Boton onClick={() => setPaso('venta')}>+ Venta o seña</Boton>
            <Boton variante="secundario" onClick={() => setPaso('editar')}>
              Editar
            </Boton>
            <Boton variante="peligro" onClick={() => setPaso('eliminar')}>
              Eliminar
            </Boton>
          </div>
        </>
      )}
    </Dialogo>
  );
}
