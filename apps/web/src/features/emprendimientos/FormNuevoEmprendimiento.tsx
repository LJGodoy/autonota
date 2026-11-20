import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router';
import {
  esquemaCrearEmprendimiento,
  NOMBRE_TIPO_EMPRENDIMIENTO,
  TIPOS_EMPRENDIMIENTO,
  type CrearEmprendimientoInput,
} from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { Campo } from '../../components/Campo';
import { IconoTipo } from '../../components/IconoTipo';
import { aplicarErroresApi } from '../../lib/formularios';
import { useCrearEmprendimiento } from './api';

const DESCRIPCION_TIPO = {
  TURNERO: 'Turnos de clientes, cobros e insumos',
  CLASES: 'Clases, alumnos y pagos por mes',
  VENTAS: 'Anotaciones de pedidos, ventas y gastos',
} as const;

/** Qué se puede hacer con cada tipo y para qué negocios sirve (según las pestañas de cada uno) */
const INFO_TIPO = {
  TURNERO: [
    'Turnos por día y por semana',
    'Clientes y horarios de atención',
    'Cobros y gastos, con estadísticas',
    'Ideal para peluquerías, barberías, tatuadores, masajistas y consultorios',
  ],
  CLASES: [
    'Calendario de clases individuales o grupales',
    'Alumnos y pagos por mes',
    'Cobros y gastos, con estadísticas',
    'Ideal para profesores particulares, academias y entrenadores',
  ],
  VENTAS: [
    'Anotaciones de pedidos con prioridad',
    'Ventas y gastos, con estadísticas',
    'Ideal para comida, ropa, artesanías y locales chicos',
  ],
} as const;

/** CU-04 (RF-02): nombre y tipo de negocio. El tipo no se puede cambiar después. */
export function FormNuevoEmprendimiento({ alCancelar }: { alCancelar?: () => void }) {
  const crear = useCrearEmprendimiento();
  const navegar = useNavigate();
  const [errorGeneral, setErrorGeneral] = useState('');
  const [infoAbierta, setInfoAbierta] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState } = useForm<CrearEmprendimientoInput>({
    resolver: zodResolver(esquemaCrearEmprendimiento),
  });

  const alEnviar = handleSubmit(async (datos) => {
    setErrorGeneral('');
    try {
      const creado = await crear.mutateAsync(datos);
      navegar(`/emprendimientos/${creado.id}`);
    } catch (e) {
      setErrorGeneral(aplicarErroresApi(e, setError, ['nombre', 'tipo']));
    }
  });

  return (
    <form onSubmit={alEnviar} noValidate className="flex flex-col gap-5">
      <Campo
        etiqueta="Nombre"
        placeholder="Por ejemplo, Peluquería Laura"
        error={formState.errors.nombre?.message}
        {...register('nombre')}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-bold text-lapiz">
          Tipo de negocio (no se puede cambiar después)
        </legend>
        <div className="grid gap-3 md:grid-cols-3">
          {TIPOS_EMPRENDIMIENTO.map((tipo) => (
            <div
              key={tipo}
              className="relative flex flex-col rounded-trazo border border-linea has-[:checked]:border-cafe has-[:checked]:bg-arena has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-cafe"
            >
              <label className="flex flex-1 cursor-pointer flex-col gap-2 p-3 pr-12">
                <input type="radio" value={tipo} className="sr-only" {...register('tipo')} />
                <span className="text-cafe">
                  <IconoTipo tipo={tipo} />
                </span>
                <span className="block font-bold">{NOMBRE_TIPO_EMPRENDIMIENTO[tipo]}</span>
                <span className="block text-sm text-lapiz">{DESCRIPCION_TIPO[tipo]}</span>
              </label>
              <button
                type="button"
                aria-label={`Más información sobre ${NOMBRE_TIPO_EMPRENDIMIENTO[tipo]}`}
                aria-expanded={infoAbierta === tipo}
                onClick={() => setInfoAbierta(infoAbierta === tipo ? null : tipo)}
                className="absolute top-1 right-1 inline-flex size-11 cursor-pointer items-center justify-center rounded-trazo font-mano text-xl font-bold text-cafe hover:bg-arena"
              >
                <span
                  aria-hidden="true"
                  className="flex size-6 items-center justify-center rounded-full border-2 border-current text-sm leading-none"
                >
                  i
                </span>
              </button>
              {infoAbierta === tipo && (
                <ul className="mx-3 mb-3 list-disc border-t border-linea pt-2 pl-5 text-sm text-lapiz">
                  {INFO_TIPO[tipo].map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
        {formState.errors.tipo && (
          <p role="alert" className="text-sm font-bold text-rojo">
            ✗ {formState.errors.tipo.message}
          </p>
        )}
      </fieldset>
      {errorGeneral && (
        <p role="alert" className="font-bold text-rojo">
          ✗ {errorGeneral}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Boton type="submit" cargando={formState.isSubmitting}>
          Crear
        </Boton>
        {alCancelar && (
          <Boton variante="secundario" onClick={alCancelar}>
            Cancelar
          </Boton>
        )}
      </div>
    </form>
  );
}
