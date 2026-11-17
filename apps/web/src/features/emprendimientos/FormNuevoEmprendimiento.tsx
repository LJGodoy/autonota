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
import { Tarjeta } from '../../components/Tarjeta';
import { aplicarErroresApi } from '../../lib/formularios';
import { useCrearEmprendimiento } from './api';

const DESCRIPCION_TIPO = {
  TURNERO: 'Turnos de clientes, cobros e insumos',
  CLASES: 'Clases, alumnos y pagos por mes',
  VENTAS: 'Anotaciones de pedidos, ventas y gastos',
} as const;

/** CU-04 (RF-02): nombre y tipo de negocio. El tipo no se puede cambiar después. */
export function FormNuevoEmprendimiento({ alCancelar }: { alCancelar?: () => void }) {
  const crear = useCrearEmprendimiento();
  const navegar = useNavigate();
  const [errorGeneral, setErrorGeneral] = useState('');
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
    <Tarjeta>
      <form onSubmit={alEnviar} noValidate className="flex flex-col gap-5">
        <h2 className="font-mano text-3xl font-bold text-birome">Nuevo emprendimiento</h2>
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
          {TIPOS_EMPRENDIMIENTO.map((tipo) => (
            <label
              key={tipo}
              className="flex cursor-pointer items-start gap-3 rounded-trazo border border-linea p-3 has-[:checked]:bg-celeste has-[:checked]:border-birome"
            >
              <input
                type="radio"
                value={tipo}
                className="mt-1 size-4 accent-birome"
                {...register('tipo')}
              />
              <span>
                <span className="block font-bold">{NOMBRE_TIPO_EMPRENDIMIENTO[tipo]}</span>
                <span className="block text-sm text-lapiz">{DESCRIPCION_TIPO[tipo]}</span>
              </span>
            </label>
          ))}
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
    </Tarjeta>
  );
}
