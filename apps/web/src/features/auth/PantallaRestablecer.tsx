import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router';
import { esquemaPassword } from '@autonota/shared';
import { z } from 'zod';
import { Boton } from '../../components/Boton';
import { Campo } from '../../components/Campo';
import { Tarjeta } from '../../components/Tarjeta';
import { ErrorApi } from '../../lib/api';
import { aplicarErroresApi } from '../../lib/formularios';
import { restablecerPassword } from './api';

const esquema = z
  .object({ password: esquemaPassword, repetir: z.string() })
  .refine((d) => d.password === d.repetir, {
    path: ['repetir'],
    message: 'Las contraseñas no coinciden',
  });
type Datos = z.infer<typeof esquema>;

/** CU-03, pasos 5 a 7 */
export function PantallaRestablecer() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [estado, setEstado] = useState<'form' | 'listo' | 'vencido'>(token ? 'form' : 'vencido');
  const [errorGeneral, setErrorGeneral] = useState('');
  const { register, handleSubmit, setError, formState } = useForm<Datos>({
    resolver: zodResolver(esquema),
  });

  const alEnviar = handleSubmit(async ({ password }) => {
    setErrorGeneral('');
    try {
      await restablecerPassword({ token, password });
      setEstado('listo');
    } catch (e) {
      if (e instanceof ErrorApi && e.code === 'TOKEN_VENCIDO') setEstado('vencido');
      else setErrorGeneral(aplicarErroresApi(e, setError, ['password']));
    }
  });

  return (
    <section className="mx-auto flex max-w-sm flex-col gap-6 py-6">
      <h1 className="font-mano text-5xl font-bold text-birome">Contraseña nueva</h1>
      {estado === 'listo' && (
        <Tarjeta nota className="flex flex-col gap-3">
          <p>Listo, cambiaste tu contraseña. Por seguridad cerramos todas tus sesiones.</p>
          <Link to="/ingresar">Ingresar con la contraseña nueva</Link>
        </Tarjeta>
      )}
      {estado === 'vencido' && (
        <Tarjeta nota className="flex flex-col gap-3">
          <p>El link venció o ya se usó.</p>
          <Link to="/recuperar">Pedir un link nuevo</Link>
        </Tarjeta>
      )}
      {estado === 'form' && (
        <form onSubmit={alEnviar} noValidate className="flex flex-col gap-5">
          <Campo
            etiqueta="Contraseña nueva"
            type="password"
            autoComplete="new-password"
            ayuda="De 8 a 72 caracteres, con al menos una letra y un número."
            error={formState.errors.password?.message}
            {...register('password')}
          />
          <Campo
            etiqueta="Repetí la contraseña"
            type="password"
            autoComplete="new-password"
            error={formState.errors.repetir?.message}
            {...register('repetir')}
          />
          {errorGeneral && (
            <p role="alert" className="font-bold text-rojo">
              ✗ {errorGeneral}
            </p>
          )}
          <Boton type="submit" cargando={formState.isSubmitting}>
            Guardar contraseña
          </Boton>
        </form>
      )}
    </section>
  );
}
