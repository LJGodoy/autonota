import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { EventInput } from '@fullcalendar/core';
import type { Clase } from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { Calendario } from '../../components/Calendario';
import { Confirmacion } from '../../components/Confirmacion';
import { CopiarSemana } from '../../components/CopiarSemana';
import { Dialogo } from '../../components/Dialogo';
import { MensajeError } from '../../components/Estados';
import { formatearFechaHora } from '../../lib/fechas';
import { aHoraLocal, desdeFechaCalendario, horaCorta, lunesDe } from '../../lib/zona';
import { useEmprendimientoActual } from '../emprendimientos/LayoutEmprendimiento';
import { useBorrarClasesDelRango, useClases, useCopiarSemanaClases, useEliminarClase } from './api';
import { estadoPago } from './estadoPago';
import { FormClase } from './FormClase';
import { MarcaPago, PanelAlumnos } from './PantallaAlumnos';

const MARCA_ESTADO = { debe: '', parcial: '◐ ', pagada: '✓ ' } as const;

const tienePagos = (c: Clase) => c.alumnos.some((a) => a.pagada);

/** RF-33: calendario de clases por día y semana, con los alumnos al costado */
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
  const [borrando, setBorrando] = useState(false);
  const clases = useClases(emp.id, rango.desde, rango.hasta);
  const eliminar = useEliminarClase(emp.id);
  const borrar = useBorrarClasesDelRango(emp.id);
  const copiar = useCopiarSemanaClases(emp.id);
  const esDia = rango.desde && Date.parse(rango.hasta) - Date.parse(rango.desde) <= 86_400_000;
  // Mismo criterio que el servidor: las que empiezan en el rango visible
  const aBorrar = (clases.data ?? []).filter(
    (c) =>
      Date.parse(c.inicio) >= Date.parse(rango.desde) &&
      Date.parse(c.inicio) < Date.parse(rango.hasta),
  );
  const conPagos = aBorrar.filter(tienePagos).length;

  const eventos = useMemo<EventInput[]>(
    () =>
      (clases.data ?? []).map((c) => {
        const estado = estadoPago(c);
        return {
          id: c.id,
          title: `${c.titulo ?? (c.modalidad === 'INDIVIDUAL' ? 'Clase individual' : 'Clase grupal')} · ${c.alumnos.map((a) => a.nombre).join(', ')}`,
          start: aHoraLocal(c.inicio),
          end: aHoraLocal(c.fin),
          classNames: [`evento-clase-${estado}`],
          extendedProps: { estado },
        };
      }),
    [clases.data],
  );
  const clase = clases.data?.find((c) => c.id === elegida);
  const cerrar = () => {
    setElegida(null);
    setPaso('ver');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Boton
            onClick={() =>
              setNueva({ fecha: aHoraLocal(new Date().toISOString()).slice(0, 10), hora: '18:00' })
            }
          >
            + Nueva clase
          </Boton>
          <Boton
            variante="peligro"
            disabled={aBorrar.length === 0}
            onClick={() => setBorrando(true)}
          >
            {esDia ? 'Borrar clases del día' : 'Borrar clases de la semana'}
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
        <p className="text-sm text-lapiz">
          Negro: nadie pagó · ◐ Amarillo: pagaron algunos · ✓ Verde: pagaron todos
        </p>
        {clases.isError && (
          <MensajeError error={clases.error} reintentar={() => void clases.refetch()} />
        )}
        <Calendario
          vistas={['timeGridDay', 'timeGridWeek']}
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
            setNueva({
              fecha: local.slice(0, 10),
              hora: local.slice(11, 16),
              duracionMinutos: Math.round((fin.getTime() - inicio.getTime()) / 60000),
            });
          }}
          alTocarEvento={setElegida}
          contenidoEvento={(arg) => (
            <div
              className="h-full overflow-hidden px-1 leading-tight break-words"
              title={arg.event.title}
            >
              {MARCA_ESTADO[arg.event.extendedProps.estado as keyof typeof MARCA_ESTADO]}
              {arg.event.title}
            </div>
          )}
        />
      </section>

      <aside className="flex min-w-0 flex-col gap-3" aria-labelledby="titulo-alumnos">
        <h2 id="titulo-alumnos" className="font-mano text-2xl font-bold">
          Alumnos
        </h2>
        <PanelAlumnos eid={emp.id} />
      </aside>

      {borrando && (
        <Confirmacion
          titulo={esDia ? '¿Borrar las clases del día?' : '¿Borrar las clases de la semana?'}
          textoConfirmar={`Borrar ${aBorrar.length} ${aBorrar.length === 1 ? 'clase' : 'clases'}`}
          alConfirmar={() => borrar.mutateAsync({ desde: rango.desde, hasta: rango.hasta })}
          alCerrar={() => setBorrando(false)}
        >
          <p>
            Se van a borrar <strong>{aBorrar.length}</strong>{' '}
            {aBorrar.length === 1 ? 'clase' : 'clases'} {esDia ? 'de este día' : 'de esta semana'}.
            No se puede deshacer.
          </p>
          {conPagos > 0 && (
            <p>
              <strong>
                {conPagos} {conPagos === 1 ? 'tiene pagos' : 'tienen pagos'}.
              </strong>{' '}
              Los ingresos quedan en Movimientos, pero ya no van a figurar como pago de esas clases.
            </p>
          )}
        </Confirmacion>
      )}
      {nueva && <FormClase eid={emp.id} inicial={nueva} alCerrar={() => setNueva(null)} />}
      {clase && paso === 'editar' && <FormClase eid={emp.id} clase={clase} alCerrar={cerrar} />}
      {clase && paso === 'cancelar' && (
        <Confirmacion
          titulo="¿Cancelar la clase?"
          textoConfirmar="Cancelar clase"
          alConfirmar={() => eliminar.mutateAsync(clase.id)}
          alCerrar={cerrar}
        >
          <p>La clase del {formatearFechaHora(clase.inicio)} se borra. No se puede deshacer.</p>
          {tienePagos(clase) && (
            <p>
              <strong>La clase tiene pagos.</strong> Los ingresos quedan en Movimientos, pero ya no
              van a figurar como pago de esta clase.
            </p>
          )}
        </Confirmacion>
      )}
      {clase && paso === 'ver' && (
        <Dialogo abierto titulo={clase.titulo ?? 'Clase'} alCerrar={cerrar}>
          <p>
            {formatearFechaHora(clase.inicio)} a {horaCorta(clase.fin)} ·{' '}
            {clase.modalidad === 'INDIVIDUAL' ? 'Individual' : 'Grupal'}
          </p>
          <ul className="flex flex-col gap-1">
            {clase.alumnos.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2">
                <Link to={`alumnos/${a.id}`} className="font-bold">
                  {a.nombre}
                  {a.activo ? '' : ' (dado de baja)'}
                </Link>
                <MarcaPago pagada={a.pagada} />
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Boton onClick={() => setPaso('editar')}>Editar o reprogramar</Boton>
            <Boton variante="peligro" onClick={() => setPaso('cancelar')}>
              Cancelar clase
            </Boton>
          </div>
        </Dialogo>
      )}
    </div>
  );
}
