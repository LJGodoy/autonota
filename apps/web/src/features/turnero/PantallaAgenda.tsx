import { useMemo, useState } from 'react';
import type { EventInput } from '@fullcalendar/core';
import { TEXTO_MOTIVO_OMISION, type Turno } from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { Calendario } from '../../components/Calendario';
import { MensajeError } from '../../components/Estados';
import { ErrorApi } from '../../lib/api';
import { formatearFechaHora } from '../../lib/fechas';
import { aHoraLocal, desdeFechaCalendario, lunesDe } from '../../lib/zona';
import { useEmprendimientoActual } from '../emprendimientos/LayoutEmprendimiento';
import {
  useBloqueos,
  useBorrarTurnosDelRango,
  useCopiarSemanaTurnos,
  useFranjas,
  useGuardarTurno,
  useTurnos,
} from './api';
import { Confirmacion } from '../../components/Confirmacion';
import { CopiarSemana } from '../../components/CopiarSemana';
import { DetalleTurno } from './DetalleTurno';
import { FormTurno } from './FormTurno';

/** RF-17: agenda diaria y semanal del turnero */
export function PantallaAgenda() {
  const emp = useEmprendimientoActual();
  const [rango, setRango] = useState({ desde: '', hasta: '', lunes: '' });
  const [nuevo, setNuevo] = useState<{
    fecha: string;
    hora: string;
    duracionMinutos?: number;
  } | null>(null);
  const [elegido, setElegido] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');
  const [borrando, setBorrando] = useState(false);
  const turnos = useTurnos(emp.id, rango.desde, rango.hasta);
  const bloqueos = useBloqueos(emp.id, rango.desde, rango.hasta);
  const franjas = useFranjas(emp.id);
  const reubicar = useGuardarTurno(emp.id);
  const copiar = useCopiarSemanaTurnos(emp.id);
  const borrar = useBorrarTurnosDelRango(emp.id);
  const esDia = rango.desde && Date.parse(rango.hasta) - Date.parse(rango.desde) <= 86_400_000;
  // Mismo criterio que el servidor: PROGRAMADO sin cobros que empiezan en el rango visible
  const aBorrar = (turnos.data ?? []).filter(
    (t) =>
      t.estado === 'PROGRAMADO' &&
      t.cobros.length === 0 &&
      Date.parse(t.inicio) >= Date.parse(rango.desde) &&
      Date.parse(t.inicio) < Date.parse(rango.hasta),
  ).length;

  const eventos = useMemo<EventInput[]>(
    () => [
      ...(turnos.data ?? []).map((t: Turno) => ({
        id: t.id,
        title: `${t.cliente.nombre}${t.descripcion ? ` · ${t.descripcion}` : ''}`,
        start: aHoraLocal(t.inicio),
        end: aHoraLocal(t.fin),
        classNames: [`evento-${t.estado.toLowerCase()}`],
        editable: t.estado === 'PROGRAMADO',
        extendedProps: { estado: t.estado },
      })),
      ...(bloqueos.data ?? []).map((b) => ({
        id: `bloqueo-${b.id}`,
        title: b.motivo ?? 'Bloqueado',
        start: aHoraLocal(b.inicio),
        end: aHoraLocal(b.fin),
        display: 'background',
      })),
    ],
    [turnos.data, bloqueos.data],
  );
  const horario = (franjas.data ?? []).map((f) => ({
    daysOfWeek: [f.diaSemana % 7],
    startTime: f.horaInicio,
    endTime: f.horaFin,
  }));
  const turnoElegido = turnos.data?.find((t) => t.id === elegido);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Boton
          onClick={() =>
            setNuevo({ fecha: aHoraLocal(new Date().toISOString()).slice(0, 10), hora: '10:00' })
          }
        >
          + Nuevo turno
        </Boton>
        <Boton variante="peligro" disabled={aBorrar === 0} onClick={() => setBorrando(true)}>
          {esDia ? 'Borrar turnos del día' : 'Borrar turnos de la semana'}
        </Boton>
        {rango.lunes && (
          <CopiarSemana
            nombre="turnos"
            lunesDestino={rango.lunes}
            copiar={async (semanaOrigen, forzar) => {
              const r = await copiar.mutateAsync({ semanaOrigen, forzar });
              return {
                creados: r.creados.length,
                omitidos: r.omitidos.map((o) => ({
                  clave: o.turnoOrigenId,
                  texto: `${o.cliente}, ${formatearFechaHora(o.inicio)}: ${TEXTO_MOTIVO_OMISION[o.motivo]}`,
                })),
              };
            }}
          />
        )}
      </div>
      {franjas.data?.length === 0 && (
        <p className="rounded-trazo-2 border border-linea bg-arena p-3 text-sm">
          Todavía no cargaste tus horarios de atención. Cargalos en la pestaña Horarios para poder
          dar turnos.
        </p>
      )}
      {aviso && (
        <p role="alert" className="font-bold text-rojo">
          ✗ {aviso}
        </p>
      )}
      {turnos.isError && (
        <MensajeError error={turnos.error} reintentar={() => void turnos.refetch()} />
      )}
      <p className="text-sm text-lapiz">
        Tocá un horario libre para dar un turno, o arrastrá un turno programado para reubicarlo. ✓
        realizado · punteado: no vino.
      </p>
      <Calendario
        vistas={['timeGridDay', 'timeGridWeek']}
        vistaInicial="timeGridWeek"
        eventos={eventos}
        horarioAtencion={horario}
        alCambiarRango={(desde, hasta, inicioVista) =>
          setRango({
            desde: desdeFechaCalendario(desde),
            hasta: desdeFechaCalendario(hasta),
            lunes: lunesDe(inicioVista.toISOString().slice(0, 10)),
          })
        }
        alElegirHueco={(inicio, fin) => {
          const local = desdeFechaCalendario(inicio);
          setNuevo({
            fecha: local.slice(0, 10),
            hora: local.slice(11, 16),
            duracionMinutos: Math.round((fin.getTime() - inicio.getTime()) / 60000),
          });
        }}
        alTocarEvento={setElegido}
        alMoverEvento={(id, inicio, revertir) => {
          setAviso('');
          reubicar
            .mutateAsync({ id, datos: { inicio: desdeFechaCalendario(inicio) } })
            .catch((e: unknown) => {
              revertir();
              setAviso(e instanceof ErrorApi ? e.message : 'No se pudo reubicar el turno.');
            });
        }}
        contenidoEvento={(arg) => (
          <div className="truncate px-1 leading-tight" title={`${arg.timeText} ${arg.event.title}`}>
            <b>
              {arg.event.extendedProps.estado === 'REALIZADO' ? '✓ ' : ''}
              {arg.timeText}
            </b>{' '}
            {arg.event.title}
          </div>
        )}
      />
      {borrando && (
        <Confirmacion
          titulo={esDia ? '¿Borrar los turnos del día?' : '¿Borrar los turnos de la semana?'}
          textoConfirmar={`Borrar ${aBorrar} ${aBorrar === 1 ? 'turno' : 'turnos'}`}
          alConfirmar={() => borrar.mutateAsync({ desde: rango.desde, hasta: rango.hasta })}
          alCerrar={() => setBorrando(false)}
        >
          <p>
            Se van a borrar <strong>{aBorrar}</strong>{' '}
            {aBorrar === 1 ? 'turno programado' : 'turnos programados'}{' '}
            {esDia ? 'de este día' : 'de esta semana'}. No se puede deshacer. Los turnos realizados,
            los que no vino y los que tienen cobros no se tocan.
          </p>
        </Confirmacion>
      )}
      {nuevo && <FormTurno eid={emp.id} inicial={nuevo} alCerrar={() => setNuevo(null)} />}
      {turnoElegido && (
        <DetalleTurno eid={emp.id} turno={turnoElegido} alCerrar={() => setElegido(null)} />
      )}
    </section>
  );
}
