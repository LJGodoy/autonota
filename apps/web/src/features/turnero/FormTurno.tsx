import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { esquemaFecha, type Turno } from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { Campo } from '../../components/Campo';
import { Dialogo } from '../../components/Dialogo';
import { aplicarErroresApi } from '../../lib/formularios';
import { aIsoArgentina, separarFechaHora } from '../../lib/zona';
import { usePersonas } from '../personas/api';
import { FormPersona } from '../personas/FormPersona';
import { useGuardarTurno } from './api';

const esquema = z.object({
  clienteId: z.string().uuid('Elegí un cliente'),
  fecha: esquemaFecha,
  hora: z.string().regex(/^\d{2}:\d{2}$/, 'Ingresá la hora'),
  duracionMinutos: z.coerce.number().int().min(5, 'Mínimo 5 minutos').max(720, 'Máximo 12 horas'),
  descripcion: z.string().max(1000),
});
type Datos = z.infer<typeof esquema>;

interface Props {
  eid: string;
  turno?: Turno;
  /** Fecha y hora de Argentina elegidas en la agenda */
  inicial?: { fecha: string; hora: string; duracionMinutos?: number };
  alCerrar: () => void;
}

/** CU-06 y CU-07: alta de un turno o reubicación de uno programado */
export function FormTurno({ eid, turno, inicial, alCerrar }: Props) {
  const clientes = usePersonas(eid, 'clientes', { pageSize: 100 });
  const guardar = useGuardarTurno(eid);
  const [nuevoCliente, setNuevoCliente] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState('');
  const fechaHora = turno ? separarFechaHora(turno.inicio) : inicial;
  const { register, handleSubmit, setError, setValue, formState } = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: {
      clienteId: turno?.cliente.id ?? '',
      fecha: fechaHora?.fecha ?? '',
      hora: fechaHora?.hora ?? '10:00',
      duracionMinutos: turno?.duracionMinutos ?? inicial?.duracionMinutos ?? 60,
      descripcion: turno?.descripcion ?? '',
    },
  });

  const alEnviar = handleSubmit(async (d) => {
    setErrorGeneral('');
    try {
      await guardar.mutateAsync({
        id: turno?.id,
        datos: {
          clienteId: d.clienteId,
          inicio: aIsoArgentina(d.fecha, d.hora),
          duracionMinutos: d.duracionMinutos,
          descripcion: d.descripcion.trim() || null,
        },
      });
      alCerrar();
    } catch (e) {
      setErrorGeneral(
        aplicarErroresApi(e, setError, ['clienteId', 'duracionMinutos', 'descripcion']),
      );
    }
  });

  return (
    <Dialogo abierto titulo={turno ? 'Reubicar turno' : 'Nuevo turno'} alCerrar={alCerrar}>
      <form onSubmit={alEnviar} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="cliente-turno" className="text-sm font-bold text-lapiz">
            Cliente
          </label>
          <div className="flex gap-2">
            <select
              id="cliente-turno"
              className="min-h-11 flex-1 border-0 border-b-2 border-grafito bg-transparent px-1 focus:border-madera"
              {...register('clienteId')}
            >
              <option value="">Elegí un cliente…</option>
              {clientes.data?.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <Boton variante="secundario" className="px-3" onClick={() => setNuevoCliente(true)}>
              + Nuevo
            </Boton>
          </div>
          {formState.errors.clienteId && (
            <p role="alert" className="text-sm font-bold text-cafe">
              ✗ {formState.errors.clienteId.message}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo
            etiqueta="Fecha"
            type="date"
            error={formState.errors.fecha?.message}
            {...register('fecha')}
          />
          <Campo
            etiqueta="Hora de inicio"
            type="time"
            step={300}
            error={formState.errors.hora?.message}
            {...register('hora')}
          />
        </div>
        <Campo
          etiqueta="Duración estimada (minutos)"
          type="number"
          inputMode="numeric"
          min={5}
          max={720}
          step={5}
          error={formState.errors.duracionMinutos?.message}
          {...register('duracionMinutos')}
        />
        <Campo
          etiqueta="Descripción del trabajo (opcional)"
          autoComplete="off"
          placeholder="Tintura y corte"
          {...register('descripcion')}
        />
        {errorGeneral && (
          <p role="alert" className="font-bold text-cafe">
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
      {nuevoCliente && (
        <FormPersona
          eid={eid}
          recurso="clientes"
          alCerrar={(creado) => {
            setNuevoCliente(false);
            if (creado) setValue('clienteId', creado.id, { shouldValidate: true });
          }}
        />
      )}
    </Dialogo>
  );
}
