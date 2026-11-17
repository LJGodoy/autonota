import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router';
import { esquemaLogin, type LoginInput } from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { Campo } from '../../components/Campo';
import { aplicarErroresApi } from '../../lib/formularios';
import { useSesion } from '../../lib/sesion';
import { ingresar } from './api';

/** CU-01 */
export function PantallaIngresar() {
  const { iniciar } = useSesion();
  const navegar = useNavigate();
  const [errorGeneral, setErrorGeneral] = useState('');
  const { register, handleSubmit, setError, formState } = useForm<LoginInput>({
    resolver: zodResolver(esquemaLogin),
  });
  const { errors, isSubmitting } = formState;

  const alEnviar = handleSubmit(async (datos) => {
    setErrorGeneral('');
    try {
      iniciar(await ingresar(datos));
      navegar('/emprendimientos');
    } catch (e) {
      setErrorGeneral(aplicarErroresApi(e, setError, ['email', 'password']));
    }
  });

  return (
    <section className="mx-auto flex max-w-sm flex-col gap-6 py-6">
      <h1 className="font-mano text-5xl font-bold text-cafe">Ingresar</h1>
      <form onSubmit={alEnviar} noValidate className="flex flex-col gap-5">
        <Campo
          etiqueta="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Campo
          etiqueta="Contraseña"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {errorGeneral && (
          <p role="alert" className="font-bold text-rojo">
            ✗ {errorGeneral}
          </p>
        )}
        <Boton type="submit" cargando={isSubmitting}>
          Ingresar
        </Boton>
      </form>
      <div className="flex flex-col gap-2 text-sm">
        <Link to="/recuperar">Me olvidé la contraseña</Link>
        <span>
          ¿No tenés cuenta? <Link to="/registro">Creala acá</Link>
        </span>
      </div>
    </section>
  );
}
