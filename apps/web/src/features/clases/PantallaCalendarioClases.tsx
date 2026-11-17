import { useMemo, useState } from 'react';
import type { EventInput } from '@fullcalendar/core';
import { Boton } from '../../components/Boton';
import { Calendario } from '../../components/Calendario';
import { Confirmacion } from '../../components/Confirmacion';
import { CopiarSemana } from '../../components/CopiarSemana';
import { Dialogo } from '../../components/Dialogo';
import { MensajeError } from '../../components/Estados';
import { formatearFechaHora } from '../../lib/fechas';
import { aHoraLocal, desdeFechaCalendario, horaCorta, lunesDe } from '../../lib/zona';
import { useEmprendimientoActual } from '../emprendimientos/LayoutEmprendimiento';
import { useCancelarClase, useClases, useCopiarSemanaClases } from './api';
import { FormClase } from './FormClase';

/** RF-33: calendario de clases por día, semana y mes */
export function PantallaCalendarioClases() {
  const emp = useEmprendimientoActual();
  const [rango, setRango] = useState({ desde: '', hasta: '', lunes: '' });
  const [nueva, setNueva] = useState<{
    fecha: string;
    hora: string;
    duracionMinutos?: number;
  } | null>(null);
  const [elegida, setElegida] = useState<string | null>(null);
  const [paso, setPaso] = useState<'ver' | 'editar' | 'cancelar'>('ver');
  const clases = useClases(emp.id, rango.desde, rango.hasta);
  const cancelar = useCancelarClase(emp.id);
  const copiar = useCopiarSemanaClases(emp.id);

  const eventos = useMemo<EventInput[]>(
    () =>
      (clases.data ?? []).map((c) => ({
        id: c.id,
        title: `${c.titulo ?? (c.modalidad === 'INDIVIDUAL' ? 'Clase individual' : 'Clase grupal')} · ${c.alumnos.map((a) => a.nombre).join(', ')}`,
        start: aHoraLocal(c.inicio),
        end: aHoraLocal(c.fin),
        classNames: [c.estado === 'CANCELADA' ? 'evento-cancelado' : 'evento-programado'],
      })),
    [clases.data],
  );
  const clase = clases.data?.find((c) => c.id === elegida);
  const cerrar = () => {
    setElegida(null);
    setPaso('ver');
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Boton
          onClick={() =>
            setNueva({ fecha: aHoraLocal(new Date().toISOString()).slice(0, 10), hora: '18:00' })
          }
        >
          + Nueva clase
        </Boton>
        {rango.lunes && (
          <CopiarSemana
            nombre="clases"
            lunesDestino={rango.lunes}
            copiar={async (semanaOrigen, forzar) => {
              const r = await copiar.mutateAsync({ semanaOrigen, forzar });
              return {
                creados: r.creadas.length,
                omitidos: r.omitidas.map((o) => ({
                  clave: o.claseOrigenId,
                  texto: `${o.titulo ?? 'Clase'}, ${formatearFechaHora(o.inicio)}: quedó sin alumnos activos`,
                })),
              };
            }}
          />
        )}
      </div>
      {clases.isError && (
        <MensajeError error={clases.error} reintentar={() => void clases.refetch()} />
      )}
      <Calendario
        vistas={['timeGridDay', 'timeGridWeek', 'dayGridMonth']}
        vistaInicial="timeGridWeek"
        eventos={eventos}
        alCambiarRango={(desde, hasta, inicioVista) =>
          setRango({
            desde: desdeFechaCalendario(desde),
            hasta: desdeFechaCalendario(hasta),
            lunes: lunesDe(inicioVista.toISOString().slice(0, 10)),
          })
        }
        alElegirHueco={(inicio, fin) => {
          const local = desdeFechaCalendario(inicio);
          const minutos = Math.round((fin.getTime() - inicio.getTime()) / 60000);
          setNueva({
            fecha: local.slice(0, 10),
            hora: minutos >= 1440 ? '18:00' : local.slice(11, 16),
            duracionMinutos: minutos >= 1440 ? 60 : minutos,
          });
        }}
        alTocarEvento={setElegida}
      />
      {nueva && <FormClase eid={emp.id} inicial={nueva} alCerrar={() => setNueva(null)} />}
      {clase && paso === 'editar' && <FormClase eid={emp.id} clase={clase} alCerrar={cerrar} />}
      {clase && paso === 'cancelar' && (
        <Confirmacion
          titulo="¿Cancelar la clase?"
          textoConfirmar="Cancelar clase"
          alConfirmar={() => cancelar.mutateAsync(clase.id)}
          alCerrar={cerrar}
        >
          <p>La clase del {formatearFechaHora(clase.inicio)} queda cancelada.</p>
        </Confirmacion>
      )}
      {clase && paso === 'ver' && (
        <Dialogo abierto titulo={clase.titulo ?? 'Clase'} alCerrar={cerrar}>
          <p>
            {formatearFechaHora(clase.inicio)} a {horaCorta(clase.fin)} ·{' '}
            {clase.modalidad === 'INDIVIDUAL' ? 'Individual' : 'Grupal'}
            {clase.estado === 'CANCELADA' ? ' · Cancelada' : ''}
          </p>
          <ul className="list-disc pl-6">
            {clase.alumnos.map((a) => (
              <li key={a.id}>
                {a.nombre}
                {a.activo ? '' : ' (dado de baja)'}
              </li>
            ))}
          </ul>
          {clase.estado === 'PROGRAMADA' && (
            <div className="flex flex-wrap gap-2">
              <Boton onClick={() => setPaso('editar')}>Editar o reprogramar</Boton>
              <Boton variante="peligro" onClick={() => setPaso('cancelar')}>
                Cancelar clase
              </Boton>
            </div>
          )}
        </Dialogo>
      )}
    </section>
  );
}
