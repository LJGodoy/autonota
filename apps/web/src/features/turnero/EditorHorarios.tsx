import { useEffect, useState } from 'react';
import { esquemaHorarios, NOMBRE_DIA, type DetalleError, type Franja } from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { Cargando, MensajeError } from '../../components/Estados';
import { Tarjeta } from '../../components/Tarjeta';
import { ErrorApi } from '../../lib/api';
import { useFranjas, useGuardarFranjas } from './api';
import { DialogoAfectados } from './DialogoAfectados';

/** RF-10: días y horarios de atención. Las franjas contiguas cuentan como una sola. */
export function EditorHorarios({ eid }: { eid: string }) {
  const consulta = useFranjas(eid);
  const guardar = useGuardarFranjas(eid);
  const [franjas, setFranjas] = useState<Franja[]>([]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [afectados, setAfectados] = useState<DetalleError[] | null>(null);

  useEffect(() => {
    if (consulta.data)
      setFranjas(
        consulta.data.map(({ diaSemana, horaInicio, horaFin }) => ({
          diaSemana,
          horaInicio,
          horaFin,
        })),
      );
  }, [consulta.data]);

  if (consulta.isPending) return <Cargando />;
  if (consulta.isError)
    return <MensajeError error={consulta.error} reintentar={() => void consulta.refetch()} />;

  const cambiar = (i: number, campo: 'horaInicio' | 'horaFin', valor: string) =>
    setFranjas((fs) => fs.map((f, k) => (k === i ? { ...f, [campo]: valor } : f)));

  async function enviar(confirmar: boolean) {
    setError('');
    setOk(false);
    const validas = esquemaHorarios.safeParse(franjas);
    if (!validas.success) {
      setError(validas.error.issues[0]?.message ?? 'Revisá los horarios.');
      return;
    }
    try {
      await guardar.mutateAsync({ franjas, confirmar });
      setOk(true);
    } catch (e) {
      if (e instanceof ErrorApi && e.code === 'TURNOS_AFECTADOS') setAfectados(e.details);
      else
        setError(
          e instanceof ErrorApi
            ? (e.details[0]?.message ?? e.message)
            : 'No se pudieron guardar los horarios.',
        );
    }
  }

  return (
    <Tarjeta className="flex flex-col gap-4">
      <h2 className="font-mano text-3xl font-bold text-cafe">Horarios de atención</h2>
      <p className="text-sm text-lapiz">
        Podés cargar varias franjas por día, por ejemplo de 9 a 13 y de 16 a 20. Si son seguidas (9
        a 13 y 13 a 17) cuentan como una sola.
      </p>
      <ul className="flex flex-col gap-3">
        {[1, 2, 3, 4, 5, 6, 7].map((dia) => (
          <li
            key={dia}
            className="flex flex-wrap items-center gap-2 border-b border-cuadricula pb-3"
          >
            <span className="w-24 font-bold">{NOMBRE_DIA[dia]}</span>
            <div className="flex flex-1 flex-col gap-2">
              {franjas.map((f, i) =>
                f.diaSemana === dia ? (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <input
                      type="time"
                      aria-label={`${NOMBRE_DIA[dia]}, desde`}
                      value={f.horaInicio}
                      onChange={(e) => cambiar(i, 'horaInicio', e.target.value)}
                      className="border-0 border-b-2 border-tinta bg-transparent"
                    />
                    <span>a</span>
                    <input
                      type="time"
                      aria-label={`${NOMBRE_DIA[dia]}, hasta`}
                      value={f.horaFin}
                      onChange={(e) => cambiar(i, 'horaFin', e.target.value)}
                      className="border-0 border-b-2 border-tinta bg-transparent"
                    />
                    <Boton
                      variante="texto"
                      className="min-h-9 px-2 text-sm"
                      aria-label={`Quitar franja del ${NOMBRE_DIA[dia]}`}
                      onClick={() => setFranjas((fs) => fs.filter((_, k) => k !== i))}
                    >
                      Quitar
                    </Boton>
                  </div>
                ) : null,
              )}
              {!franjas.some((f) => f.diaSemana === dia) && (
                <span className="text-sm text-lapiz">Cerrado</span>
              )}
            </div>
            <Boton
              variante="texto"
              className="min-h-9 px-2 text-sm"
              onClick={() =>
                setFranjas((fs) => [
                  ...fs,
                  { diaSemana: dia, horaInicio: '09:00', horaFin: '13:00' },
                ])
              }
            >
              + Franja
            </Boton>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="font-bold text-rojo">
          ✗ {error}
        </p>
      )}
      {ok && (
        <p role="status" className="font-bold text-cafe">
          ✓ Horarios guardados
        </p>
      )}
      <div>
        <Boton cargando={guardar.isPending} onClick={() => void enviar(false)}>
          Guardar horarios
        </Boton>
      </div>
      {afectados && (
        <DialogoAfectados
          afectados={afectados}
          alConfirmar={async () => {
            await guardar.mutateAsync({ franjas, confirmar: true });
            setOk(true);
          }}
          alCerrar={() => setAfectados(null)}
        />
      )}
    </Tarjeta>
  );
}
