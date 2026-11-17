import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { esquemaCrearPersona, type CrearPersonaInput, type Persona } from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { Campo } from '../../components/Campo';
import { Dialogo } from '../../components/Dialogo';
import { aplicarErroresApi } from '../../lib/formularios';
import { useGuardarPersona, type Recurso } from './api';

interface Props {
  eid: string;
  recurso: Recurso;
  persona?: Persona;
  alCerrar: (creada?: Persona) => void;
}

/** Alta y edición de clientes (RF-19) y alumnos (RF-30): nombre, teléfono y notas */
export function FormPersona({ eid, recurso, persona, alCerrar }: Props) {
  const guardar = useGuardarPersona(eid, recurso);
  const [errorGeneral, setErrorGeneral] = useState('');
  const { register, handleSubmit, setError, formState } = useForm<CrearPersonaInput>({
    resolver: zodResolver(esquemaCrearPersona),
    defaultValues: {
      nombre: persona?.nombre ?? '',
      telefono: persona?.telefono ?? '',
      notas: persona?.notas ?? '',
    },
  });
  const singular = recurso === 'clientes' ? 'cliente' : 'alumno';

  const alEnviar = handleSubmit(async (d) => {
    setErrorGeneral('');
    try {
      const datos = { nombre: d.nombre, telefono: d.telefono || null, notas: d.notas || null };
      alCerrar(await guardar.mutateAsync({ id: persona?.id, datos }));
    } catch (e) {
      setErrorGeneral(aplicarErroresApi(e, setError, ['nombre', 'telefono', 'notas']));
    }
  });

  return (
    <Dialogo
      abierto
      titulo={persona ? `Editar ${singular}` : `Nuevo ${singular}`}
      alCerrar={() => alCerrar()}
    >
      <form onSubmit={alEnviar} noValidate className="flex flex-col gap-4">
        <Campo
          etiqueta="Nombre"
          autoComplete="off"
          error={formState.errors.nombre?.message}
          {...register('nombre')}
        />
        <Campo
          etiqueta="Teléfono (opcional)"
          type="tel"
          autoComplete="off"
          error={formState.errors.telefono?.message}
          {...register('telefono')}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="notas-persona" className="text-sm font-bold text-lapiz">
            Notas (opcional)
          </label>
          <textarea
            id="notas-persona"
            rows={3}
            aria-describedby="aviso-notas"
            className="w-full border-0 border-b-2 border-tinta bg-transparent px-1 py-2 focus:border-birome"
            {...register('notas')}
          />
          {/* RNF-07 */}
          <p id="aviso-notas" className="text-sm text-lapiz">
            No cargues información sensible que no haga falta, como datos de salud.
          </p>
          {formState.errors.notas && (
            <p role="alert" className="text-sm font-bold text-rojo">
              ✗ {formState.errors.notas.message}
            </p>
          )}
        </div>
        {errorGeneral && (
          <p role="alert" className="font-bold text-rojo">
            ✗ {errorGeneral}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <Boton variante="secundario" onClick={() => alCerrar()}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={formState.isSubmitting}>
            Guardar
          </Boton>
        </div>
      </form>
    </Dialogo>
  );
}
