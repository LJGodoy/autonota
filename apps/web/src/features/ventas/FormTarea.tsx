import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  esquemaCrearTarea,
  NOMBRE_PRIORIDAD,
  PRIORIDADES_TAREA,
  type CrearTareaInput,
  type Tarea,
} from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { Campo } from '../../components/Campo';
import { Dialogo } from '../../components/Dialogo';
import { aplicarErroresApi } from '../../lib/formularios';
import { useGuardarTarea } from './api';

/** RF-50: título, descripción opcional y prioridad. La fecha de carga la registra el sistema. */
export function FormTarea({
  eid,
  tarea,
  alCerrar,
}: {
  eid: string;
  tarea?: Tarea;
  alCerrar: () => void;
}) {
  const guardar = useGuardarTarea(eid);
  const [errorGeneral, setErrorGeneral] = useState('');
  const { register, handleSubmit, setError, formState } = useForm<CrearTareaInput>({
    resolver: zodResolver(esquemaCrearTarea),
    defaultValues: {
      titulo: tarea?.titulo ?? '',
      descripcion: tarea?.descripcion ?? '',
      prioridad: tarea?.prioridad ?? 'MEDIA',
    },
  });

  const alEnviar = handleSubmit(async (d) => {
    setErrorGeneral('');
    try {
      await guardar.mutateAsync({
        id: tarea?.id,
        datos: { titulo: d.titulo, descripcion: d.descripcion || null, prioridad: d.prioridad },
      });
      alCerrar();
    } catch (e) {
      setErrorGeneral(aplicarErroresApi(e, setError, ['titulo', 'descripcion', 'prioridad']));
    }
  });

  return (
    <Dialogo abierto titulo={tarea ? 'Editar anotación' : 'Nueva anotación'} alCerrar={alCerrar}>
      <form onSubmit={alEnviar} noValidate className="flex flex-col gap-4">
        <Campo
          etiqueta="Título"
          placeholder="Torta de cumpleaños para Marta"
          autoComplete="off"
          error={formState.errors.titulo?.message}
          {...register('titulo')}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="descripcion-tarea" className="text-sm font-bold text-lapiz">
            Descripción (opcional)
          </label>
          <textarea
            id="descripcion-tarea"
            rows={3}
            className="w-full border-0 border-b-2 border-tinta bg-transparent px-1 py-2 focus:border-birome"
            {...register('descripcion')}
          />
        </div>
        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-1 text-sm font-bold text-lapiz">Prioridad</legend>
          {PRIORIDADES_TAREA.map((p) => (
            <label
              key={p}
              className="flex items-center gap-2 rounded-trazo border border-linea px-3 py-2 has-[:checked]:bg-celeste"
            >
              <input type="radio" value={p} className="accent-birome" {...register('prioridad')} />
              {NOMBRE_PRIORIDAD[p]}
            </label>
          ))}
        </fieldset>
        {errorGeneral && (
          <p role="alert" className="font-bold text-rojo">
            ✗ {errorGeneral}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <Boton variante="secundario" onClick={alCerrar}>
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
