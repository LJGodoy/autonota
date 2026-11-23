import { useState } from 'react';
import { Link } from 'react-router';
import { MAX_EMPRENDIMIENTOS, type Emprendimiento } from '@autonota/shared';
import { MenuAcciones } from '../../components/MenuAcciones';
import { Dialogo } from '../../components/Dialogo';
import { Cargando, MensajeError } from '../../components/Estados';
import { EtiquetaTipo, TAPA } from '../../components/EtiquetaEstado';
import { formatearFechaLarga } from '../../lib/fechas';
import { useSesion } from '../../lib/sesion';
import { useEmprendimientos } from './api';
import { FormNuevoEmprendimiento } from './FormNuevoEmprendimiento';
import { DialogoEliminar, DialogoRenombrar } from './DialogosEmprendimiento';

/** RF-04: lista de emprendimientos para elegir en cuál trabajar */
export function PantallaEmprendimientos() {
  const { usuario } = useSesion();
  const consulta = useEmprendimientos();
  const [creando, setCreando] = useState(false);
  const [renombrando, setRenombrando] = useState<Emprendimiento | null>(null);
  const [eliminando, setEliminando] = useState<Emprendimiento | null>(null);

  if (consulta.isPending) return <Cargando />;
  if (consulta.isError)
    return <MensajeError error={consulta.error} reintentar={() => void consulta.refetch()} />;

  const lista = consulta.data;
  const hayCupo = lista.length < MAX_EMPRENDIMIENTOS;

  return (
    <section className="flex flex-col gap-6 py-2">
      <div>
        <p className="font-mano text-2xl text-lapiz first-letter:uppercase">
          {formatearFechaLarga()}
        </p>
        <h1 className="font-mano text-5xl font-bold text-cafe">Hola, {usuario?.nombre}</h1>
      </div>

      {lista.length === 0 && (
        <p className="text-lapiz">
          Todavía no tenés emprendimientos. Creá el primero para empezar a anotar.
        </p>
      )}

      {lista.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {lista.map((e) => (
            <li
              key={e.id}
              className="relative flex min-h-28 items-start gap-4 rounded-trazo-2 border border-linea bg-hoja p-4 shadow-nota transition-colors hover:bg-arena"
            >
              {/* Tapa del cuaderno en miniatura, con el color del tipo de negocio */}
              <span
                aria-hidden="true"
                className={`relative mt-1 h-14 w-10 shrink-0 rounded-[3px_6px_6px_3px] shadow-nota ${TAPA[e.tipo].fondo}`}
              >
                <span className="absolute inset-x-1.5 top-3.5 h-3.5 rounded-[2px] bg-hoja/90" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                {/* after:inset-0 estira el enlace sobre toda la tarjeta; el menú queda por encima (z-10) */}
                <Link
                  to={`/emprendimientos/${e.id}`}
                  className="text-lg font-bold text-tinta after:absolute after:inset-0 after:content-['']"
                >
                  {e.nombre}
                </Link>
                <EtiquetaTipo tipo={e.tipo} />
              </div>
              <div className="relative z-10 -mt-2 -mr-2">
                <MenuAcciones
                  etiqueta={`Acciones de ${e.nombre}`}
                  opciones={[
                    { texto: 'Renombrar', alElegir: () => setRenombrando(e) },
                    { texto: 'Eliminar', alElegir: () => setEliminando(e), peligro: true },
                  ]}
                />
              </div>
            </li>
          ))}
          {/* CU-04: la SPA oculta la tarjeta cuando ya hay 3; la API valida igual la regla */}
          {hayCupo && (
            <li className="flex">
              <button
                type="button"
                onClick={() => setCreando(true)}
                className="flex min-h-28 w-full cursor-pointer flex-col items-center justify-center rounded-trazo-2 border border-dashed border-linea bg-hoja p-4 text-cafe transition-colors hover:bg-arena"
              >
                <span aria-hidden="true" className="font-mano text-5xl leading-none font-bold">
                  +
                </span>
                <span className="sr-only">Nuevo emprendimiento</span>
              </button>
            </li>
          )}
        </ul>
      )}

      <p className="text-sm text-lapiz">
        Usás {lista.length} de {MAX_EMPRENDIMIENTOS} emprendimientos.
      </p>

      <Dialogo
        abierto={creando}
        titulo="Nuevo emprendimiento"
        alCerrar={() => setCreando(false)}
        ancho="max-w-4xl"
      >
        <FormNuevoEmprendimiento alCancelar={() => setCreando(false)} />
      </Dialogo>

      {renombrando && (
        <DialogoRenombrar emprendimiento={renombrando} alCerrar={() => setRenombrando(null)} />
      )}
      {eliminando && (
        <DialogoEliminar emprendimiento={eliminando} alCerrar={() => setEliminando(null)} />
      )}
    </section>
  );
}
