import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import type {
  BusinessHoursInput,
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventContentArg,
  EventDropArg,
  EventInput,
} from '@fullcalendar/core';
import type { ReactNode } from 'react';
import { aHoraLocal } from '../lib/zona';

interface Props {
  eventos: EventInput[];
  vistas: string[];
  vistaInicial: string;
  alCambiarRango: (desde: Date, hasta: Date, inicioVista: Date) => void;
  alElegirHueco?: (inicio: Date, fin: Date) => void;
  alTocarEvento?: (id: string) => void;
  alMoverEvento?: (id: string, inicio: Date, revertir: () => void) => void;
  horarioAtencion?: BusinessHoursInput;
  contenidoEvento?: (arg: EventContentArg) => ReactNode;
}

/**
 * Agenda y calendario (RF-17, RF-33) con FullCalendar. Trabaja en "UTC" con la hora de Argentina
 * (ver lib/zona.ts) para no depender de la zona horaria del navegador.
 */
export function Calendario(props: Props) {
  const esCelular = typeof window !== 'undefined' && window.innerWidth < 640;
  return (
    <div className="calendario-cuaderno rounded-trazo-2 border-2 border-grafito bg-papel p-2">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        locale={esLocale}
        timeZone="UTC"
        // "Hoy" y la línea de la hora actual usan la hora de Argentina, no la de UTC
        now={() => aHoraLocal(new Date().toISOString())}
        initialView={
          esCelular && props.vistaInicial === 'timeGridWeek' ? 'timeGridDay' : props.vistaInicial
        }
        headerToolbar={{ left: 'prev,next today', center: 'title', right: props.vistas.join(',') }}
        buttonText={{ today: 'Hoy', day: 'Día', week: 'Semana', month: 'Mes' }}
        height="auto"
        expandRows
        allDaySlot={false}
        nowIndicator
        slotMinTime="07:00:00"
        slotMaxTime="23:00:00"
        slotDuration="00:30:00"
        firstDay={1}
        events={props.eventos}
        businessHours={props.horarioAtencion}
        selectable={Boolean(props.alElegirHueco)}
        selectMirror
        editable={Boolean(props.alMoverEvento)}
        eventDurationEditable={false}
        datesSet={(a: DatesSetArg) => props.alCambiarRango(a.start, a.end, a.view.currentStart)}
        select={(a: DateSelectArg) => props.alElegirHueco?.(a.start, a.end)}
        eventClick={(a: EventClickArg) => {
          if (a.event.display !== 'background') props.alTocarEvento?.(a.event.id);
        }}
        eventDrop={(a: EventDropArg) => {
          if (a.event.start) props.alMoverEvento?.(a.event.id, a.event.start, a.revert);
        }}
        eventContent={props.contenidoEvento}
      />
    </div>
  );
}
