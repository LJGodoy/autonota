import { useState, type ReactNode } from 'react';
import type { Alumno, Persona } from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { Confirmacion } from '../../components/Confirmacion';
import { Cargando, MensajeError, Vacio } from '../../components/Estados';
import { MenuAcciones } from '../../components/MenuAcciones';
import {
  useAnonimizarPersona,
  useBajaPersona,
  useGuardarPersona,
  usePersonas,
  type FiltroPersonas,
  type Recurso,
} from './api';
import { FormPersona } from './FormPersona';

interface Props {
  eid: string;
  recurso: Recurso;
  /** Filtros extra arriba de la lista (por ejemplo, los alumnos que deben) */
  filtrosExtra?: ReactNode;
  filtro?: FiltroPersonas;
  marca?: (p: Alumno) => ReactNode;
  /** Qué abre tocar la fila; por defecto, el formulario de edición */
  alAbrir?: (p: Alumno) => void;
}

type Accion = { tipo: 'editar' | 'baja' | 'anonimizar'; persona: Persona } | { tipo: 'nueva' };

/** Clientes (RF-19) y alumnos (RF-30): lista, alta, edición, baja, reactivación y anonimización */
export function PantallaPersonas({ eid, recurso, filtrosExtra, filtro, marca, alAbrir }: Props) {
  const [q, setQ] = useState('');
  const [activo, setActivo] = useState(true);
  const [accion, setAccion] = useState<Accion | null>(null);
  const consulta = usePersonas(eid, recurso, { q, activo, ...filtro });
  const baja = useBajaPersona(eid, recurso);
  const anonimizar = useAnonimizarPersona(eid, recurso);
  const reactivar = useGuardarPersona(eid, recurso);
  const singular = recurso === 'clientes' ? 'cliente' : 'alumno';
  const plural = recurso === 'clientes' ? 'clientes' : 'alumnos';

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <label htmlFor="buscar-persona" className="text-sm font-bold text-lapiz">
            Buscar por nombre o teléfono
          </label>
          <input
            id="buscar-persona"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="border-0 border-b-2 border-tinta bg-transparent px-1 py-2 focus:border-cafe"
          />
        </div>
        <Boton onClick={() => setAccion({ tipo: 'nueva' })}>+ Nuevo {singular}</Boton>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div role="group" aria-label="Mostrar" className="flex gap-1">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              aria-pressed={activo === v}
              onClick={() => setActivo(v)}
              className={`rounded-trazo border px-3 py-1 text-sm font-bold ${activo === v ? 'border-cafe bg-cafe text-hoja' : 'border-tinta bg-hoja'}`}
            >
              {v ? 'Activos' : 'Dados de baja'}
            </button>
          ))}
        </div>
        {filtrosExtra}
      </div>

      {consulta.isPending && <Cargando />}
      {consulta.isError && (
        <MensajeError error={consulta.error} reintentar={() => void consulta.refetch()} />
      )}
      {consulta.data && consulta.data.data.length === 0 && (
        <Vacio>No hay {plural} para mostrar.</Vacio>
      )}
      {consulta.data && consulta.data.data.length > 0 && (
        <ul className="fondo-cuaderno flex flex-col rounded-trazo-2 border border-linea py-2 pr-3 pl-9">
          {consulta.data.data.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-cuadricula py-2 last:border-b-0"
            >
              <button
                type="button"
                onClick={() => (alAbrir ? alAbrir(p) : setAccion({ tipo: 'editar', persona: p }))}
                className="min-h-11 min-w-0 flex-1 rounded-trazo text-left hover:bg-arena"
              >
                <p className="font-bold">{p.nombre}</p>
                <p className="text-sm text-lapiz">
                  {[p.telefono, p.notas].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                </p>
              </button>
              {marca?.(p)}
              <MenuAcciones
                etiqueta={`Acciones de ${p.nombre}`}
                opciones={[
                  { texto: 'Editar', alElegir: () => setAccion({ tipo: 'editar', persona: p }) },
                  p.activo
                    ? {
                        texto: 'Eliminar',
                        peligro: true,
                        alElegir: () => setAccion({ tipo: 'baja', persona: p }),
                      }
                    : {
                        texto: 'Reactivar',
                        alElegir: () => reactivar.mutate({ id: p.id, datos: { activo: true } }),
                      },
                  {
                    texto: 'Borrar datos',
                    peligro: true,
                    alElegir: () => setAccion({ tipo: 'anonimizar', persona: p }),
                  },
                ]}
              />
            </li>
          ))}
        </ul>
      )}

      {accion?.tipo === 'nueva' && (
        <FormPersona eid={eid} recurso={recurso} alCerrar={() => setAccion(null)} />
      )}
      {accion?.tipo === 'editar' && (
        <FormPersona
          eid={eid}
          recurso={recurso}
          persona={accion.persona}
          alCerrar={() => setAccion(null)}
        />
      )}
      {accion?.tipo === 'baja' && (
        <Confirmacion
          titulo={`¿Eliminar a ${accion.persona.nombre}?`}
          textoConfirmar="Eliminar"
          alConfirmar={() => baja.mutateAsync(accion.persona.id)}
          alCerrar={() => setAccion(null)}
        >
          <p>
            Deja de aparecer en la lista de activos. Se conserva todo su historial y lo podés
            reactivar desde «Dados de baja» cuando quieras.
          </p>
        </Confirmacion>
      )}
      {accion?.tipo === 'anonimizar' && (
        <Confirmacion
          titulo="¿Borrar sus datos personales?"
          textoConfirmar="Borrar datos"
          alConfirmar={() => anonimizar.mutateAsync(accion.persona.id)}
          alCerrar={() => setAccion(null)}
        >
          <p>
            Se reemplaza el nombre de <strong>{accion.persona.nombre}</strong> por «
            {recurso === 'clientes' ? 'Cliente' : 'Alumno'} anónimo» y se borran su teléfono y sus
            notas. Se conservan sus {recurso === 'clientes' ? 'turnos y cobros' : 'clases y pagos'},
            así que tus estadísticas no cambian. <strong>No se puede deshacer.</strong>
          </p>
        </Confirmacion>
      )}
    </section>
  );
}
