import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router';
import { esquemaRecuperar, type RecuperarInput } from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { Campo } from '../../components/Campo';
import { Tarjeta } from '../../components/Tarjeta';
import { aplicarErroresApi } from '../../lib/formularios';
import { pedirRecuperacion } from './api';

/** CU-03, pasos 1 a 4 */
export function PantallaRecuperar() {
  const [enviado, setEnviado] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState('');
  const { register, handleSubmit, setError, formState } = useForm<RecuperarInput>({
    resolver: zodResolver(esquemaRecuperar),
  });

  const alEnviar = handleSubmit(async (datos) => {
    setErrorGeneral('');
    try {
      await pedirRecuperacion(datos);
      setEnviado(true);
    } catch (e) {
      setErrorGeneral(aplicarErroresApi(e, setError, ['email']));
    }
  });

  return (
    <section className="mx-auto flex max-w-sm flex-col gap-6 py-6">
      <h1 className="font-mano text-5xl font-bold text-cafe">Recuperar contraseña</h1>
      {enviado ? (
        <Tarjeta nota>
          <p>
            Si el email está registrado, en unos minutos te llega un link para elegir una contraseña
            nueva. Revisá también la carpeta de spam. El link vence en 1 hora.
          </p>
        </Tarjeta>
      ) : (
        <form onSubmit={alEnviar} noValidate className="flex flex-col gap-5">
          <p className="text-lapiz">Escribí el email de tu cuenta y te mandamos un link.</p>
          <Campo
            etiqueta="Email"
            type="email"
            autoComplete="email"
            error={formState.errors.email?.message}
            {...register('email')}
          />
          {errorGeneral && (
            <p role="alert" className="font-bold text-cafe">
              ✗ {errorGeneral}
            </p>
          )}
          <Boton type="submit" cargando={formState.isSubmitting}>
            Enviar link
          </Boton>
        </form>
      )}
      <Link to="/ingresar" className="text-sm">
        Volver a ingresar
      </Link>
    </section>
  );
}
