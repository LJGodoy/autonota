import { useState } from 'react';
import type { CrearBloqueoInput, DetalleError } from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { Campo } from '../../components/Campo';
import { CasillaVerificacion } from '../../components/CasillaVerificacion';
import { Cargando, MensajeError, Vacio } from '../../components/Estados';
import { Tarjeta } from '../../components/Tarjeta';
import { ErrorApi } from '../../lib/api';
import { formatearFechaHora } from '../../lib/fechas';
import { hoyArgentina } from '../../lib/meses';
import { aIsoArgentina, sumarDias } from '../../lib/zona';
import { useBloqueos, useCrearBloqueo, useEliminarBloqueo } from './api';
import { DialogoAfectados } from './DialogoAfectados';

/** RF-11: bloqueos de días u horarios (feriados, vacaciones) de hoy en adelante */
export function GestorBloqueos({ eid }: { eid: string }) {
  const hoy = hoyArgentina();
  const lista = useBloqueos(
    eid,
    aIsoArgentina(hoy, '00:00'),
    aIsoArgentina(sumarDias(hoy, 365), '00:00'),
  );
  const crear = useCrearBloqueo(eid);
  const eliminar = useEliminarBloqueo(eid);
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [diaCompleto, setDiaCompleto] = useState(true);
  const [horaDesde, setHoraDesde] = useState('09:00');
  const [horaHasta, setHoraHasta] = useState('13:00');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [afectados, setAfectados] = useState<{
    datos: CrearBloqueoInput;
    detalle: DetalleError[];
  } | null>(null);

  async function agregar() {
    setError('');
    const datos: CrearBloqueoInput = {
      inicio: aIsoArgentina(desde, diaCompleto ? '00:00' : horaDesde),
      fin: diaCompleto
        ? aIsoArgentina(sumarDias(hasta, 1), '00:00')
        : aIsoArgentina(desde, horaHasta),
      motivo: motivo.trim() || null,
    };
    try {
      await crear.mutateAsync({ datos, confirmar: false });
      setMotivo('');
    } catch (e) {
      if (e instanceof ErrorApi && e.code === 'TURNOS_AFECTADOS')
        setAfectados({ datos, detalle: e.details });
      else
        setError(
          e instanceof ErrorApi
            ? (e.details[0]?.message ?? e.message)
            : 'No se pudo crear el bloqueo.',
        );
    }
  }

  return (
    <Tarjeta className="flex flex-col gap-4">
      <h2 className="font-mano text-3xl font-bold text-cafe">Días bloqueados</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo
          etiqueta={diaCompleto ? 'Desde el día' : 'Día'}
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
        />
        {diaCompleto ? (
          <Campo
            etiqueta="Hasta el día (incluido)"
            type="date"
            value={hasta}
            min={desde}
            onChange={(e) => setHasta(e.target.value)}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Campo
              etiqueta="Desde"
              type="time"
              value={horaDesde}
              onChange={(e) => setHoraDesde(e.target.value)}
            />
            <Campo
              etiqueta="Hasta"
              type="time"
              value={horaHasta}
              onChange={(e) => setHoraHasta(e.target.value)}
            />
          </div>
        )}
      </div>
      <CasillaVerificacion checked={diaCompleto} onChange={(e) => setDiaCompleto(e.target.checked)}>
        Días completos
      </CasillaVerificacion>
      <Campo
        etiqueta="Motivo (opcional)"
        placeholder="Feriado, vacaciones…"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
      />
      {error && (
        <p role="alert" className="font-bold text-rojo">
          ✗ {error}
        </p>
      )}
      <div>
        <Boton cargando={crear.isPending} onClick={() => void agregar()}>
          Bloquear
        </Boton>
      </div>

      {lista.isPending && <Cargando />}
      {lista.isError && <MensajeError error={lista.error} />}
      {lista.data?.length === 0 && <Vacio>No hay bloqueos de hoy en adelante.</Vacio>}
      {lista.data && lista.data.length > 0 && (
        <ul className="flex flex-col">
          {lista.data.map((b) => (
            <li
              key={b.id}
              className="flex flex-wrap items-center gap-2 border-b border-cuadricula py-2"
            >
              <span className="flex-1">
                {formatearFechaHora(b.inicio)} → {formatearFechaHora(b.fin)}
                {b.motivo ? ` · ${b.motivo}` : ''}
              </span>
              <Boton
                variante="texto"
                className="min-h-9 px-2 text-sm"
                onClick={() => eliminar.mutate(b.id)}
              >
                Quitar
              </Boton>
            </li>
          ))}
        </ul>
      )}
      {afectados && (
        <DialogoAfectados
          afectados={afectados.detalle}
          alConfirmar={() => crear.mutateAsync({ datos: afectados.datos, confirmar: true })}
          alCerrar={() => setAfectados(null)}
        />
      )}
    </Tarjeta>
  );
}
