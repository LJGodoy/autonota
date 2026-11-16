import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router';
import { esquemaRegistro, type RegistroInput } from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { Campo } from '../../components/Campo';
import { CasillaVerificacion } from '../../components/CasillaVerificacion';
import { aplicarErroresApi } from '../../lib/formularios';
import { useSesion } from '../../lib/sesion';
import { registrar } from './api';

/** RF-01; aceptación obligatoria de la política y los términos (RNF-06, RNF-08) */
export function PantallaRegistro() {
  const { iniciar } = useSesion();
  const navegar = useNavigate();
  const [errorGeneral, setErrorGeneral] = useState('');
  const { register, handleSubmit, setError, formState } = useForm<RegistroInput>({
    resolver: zodResolver(esquemaRegistro),
  });
  const { errors, isSubmitting } = formState;

  const alEnviar = handleSubmit(async (datos) => {
    setErrorGeneral('');
    try {
      iniciar(await registrar(datos));
      navegar('/emprendimientos');
    } catch (e) {
      setErrorGeneral(
        aplicarErroresApi(e, setError, ['nombre', 'email', 'password', 'aceptaPolitica']),
      );
    }
  });

  return (
    <section className="mx-auto flex max-w-sm flex-col gap-6 py-6">
      <h1 className="font-mano text-5xl font-bold text-cafe">Crear cuenta</h1>
      <form onSubmit={alEnviar} noValidate className="flex flex-col gap-5">
        <Campo
          etiqueta="Tu nombre"
          autoComplete="name"
          error={errors.nombre?.message}
          {...register('nombre')}
        />
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
          autoComplete="new-password"
          ayuda="De 8 a 72 caracteres, con al menos una letra y un número."
          error={errors.password?.message}
          {...register('password')}
        />
        <CasillaVerificacion error={errors.aceptaPolitica?.message} {...register('aceptaPolitica')}>
          Leí y acepto la{' '}
          <Link to="/privacidad" target="_blank">
            política de privacidad
          </Link>{' '}
          y los{' '}
          <Link to="/terminos" target="_blank">
            términos y condiciones
          </Link>
          .
        </CasillaVerificacion>
        {errorGeneral && (
          <p role="alert" className="font-bold text-cafe">
            ✗ {errorGeneral}
          </p>
        )}
        <Boton type="submit" cargando={isSubmitting}>
          Crear cuenta
        </Boton>
      </form>
      <p className="text-sm">
        ¿Ya tenés cuenta? <Link to="/ingresar">Ingresá</Link>
      </p>
    </section>
  );
}
