import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router';
import { esquemaLogin, type LoginInput } from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { CasillaVerificacion } from '../../components/CasillaVerificacion';
import { Campo } from '../../components/Campo';
import { aplicarErroresApi } from '../../lib/formularios';
import { useSesion } from '../../lib/sesion';
import { ingresar } from './api';

const CLAVE_CORREO = 'autonota.correo';

function leerCorreo() {
  try {
    return localStorage.getItem(CLAVE_CORREO) ?? '';
  } catch {
    return '';
  }
}

function guardarCorreo(correo: string | null) {
  try {
    if (correo) localStorage.setItem(CLAVE_CORREO, correo);
    else localStorage.removeItem(CLAVE_CORREO);
  } catch {
    // sin almacenamiento: simplemente no se recuerda
  }
}

/** CU-01: formulario de ingreso, usado en /ingresar y en el inicio. Nunca guarda la contraseña */
export function FormIngreso() {
  const { iniciar } = useSesion();
  const navegar = useNavigate();
  const [errorGeneral, setErrorGeneral] = useState('');
  const [correoGuardado] = useState(leerCorreo);
  const [recordar, setRecordar] = useState(correoGuardado !== '');
  const { register, handleSubmit, setError, formState } = useForm<LoginInput>({
    resolver: zodResolver(esquemaLogin),
    defaultValues: { email: correoGuardado },
  });
  const { errors, isSubmitting } = formState;

  const alEnviar = handleSubmit(async (datos) => {
    setErrorGeneral('');
    try {
      iniciar(await ingresar(datos));
      guardarCorreo(recordar ? datos.email : null);
      navegar('/emprendimientos');
    } catch (e) {
      setErrorGeneral(aplicarErroresApi(e, setError, ['email', 'password']));
    }
  });

  return (
    <div className="flex flex-col gap-5">
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
        <CasillaVerificacion checked={recordar} onChange={(e) => setRecordar(e.target.checked)}>
          Recordar mi correo
        </CasillaVerificacion>
        {errorGeneral && (
          <p role="alert" className="font-bold text-rojo">
            ✗ {errorGeneral}
          </p>
        )}
        <Boton type="submit" cargando={isSubmitting}>
          Ingresar
        </Boton>
      </form>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 text-sm">
        <Link to="/recuperar">Me olvidé la contraseña</Link>
        <span>
          ¿No tenés cuenta? <Link to="/registro">Crear cuenta</Link>
        </span>
      </div>
    </div>
  );
}

export function PantallaIngresar() {
  return (
    <section className="mx-auto flex max-w-sm flex-col gap-6 py-6">
      <h1 className="font-mano text-5xl font-bold text-cafe">Ingresar</h1>
      <FormIngreso />
    </section>
  );
}
