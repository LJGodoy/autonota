import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Boton } from '../../components/Boton';
import { Campo } from '../../components/Campo';
import { Dialogo } from '../../components/Dialogo';
import { Tarjeta } from '../../components/Tarjeta';
import { ErrorApi } from '../../lib/api';
import { formatearFechaHora } from '../../lib/fechas';
import { useSesion } from '../../lib/sesion';
import { eliminarCuenta } from './api';

/** Datos de la cuenta, cierre de sesión y eliminación de la cuenta (CU-17) */
export function PantallaCuenta() {
  const { usuario, cerrar, olvidar } = useSesion();
  const navegar = useNavigate();
  const [dialogo, setDialogo] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [borrando, setBorrando] = useState(false);
  if (!usuario) return null;
  const esDemo = usuario.esDemo;

  async function alCerrarSesion() {
    await cerrar();
    navegar('/');
  }

  async function alEliminar() {
    setError('');
    if (!esDemo && !password) {
      setError('Ingresá tu contraseña');
      return;
    }
    setBorrando(true);
    try {
      // Las cuentas de demostración no tienen contraseña conocida: la API no la verifica
      await eliminarCuenta(esDemo ? 'demo' : password);
      olvidar();
      navegar('/');
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No pudimos eliminar la cuenta.');
      setBorrando(false);
    }
  }

  return (
    <section className="flex flex-col gap-6 py-2">
      <h1 className="font-mano text-5xl font-bold text-cafe">Mi cuenta</h1>
      <Tarjeta className="flex flex-col gap-1">
        <p className="font-bold">{usuario.nombre}</p>
        {!esDemo && <p className="text-lapiz">{usuario.email}</p>}
        {esDemo && usuario.expiraEn && (
          <p className="text-lapiz">
            Cuenta de prueba. Se borra sola el {formatearFechaHora(usuario.expiraEn)}.
          </p>
        )}
      </Tarjeta>
      <div>
        <Boton variante="secundario" onClick={alCerrarSesion}>
          Cerrar sesión
        </Boton>
      </div>

      <Tarjeta className="flex flex-col items-start gap-3 border-dashed">
        <h2 className="font-mano text-3xl font-bold text-cafe">Eliminar la cuenta</h2>
        <p className="text-lapiz">
          Se borran para siempre tu cuenta y todos tus emprendimientos, con sus clientes, alumnos,
          turnos, clases, anotaciones y movimientos. No se puede deshacer.
        </p>
        <Boton variante="peligro" onClick={() => setDialogo(true)}>
          Eliminar mi cuenta
        </Boton>
      </Tarjeta>

      <Dialogo abierto={dialogo} titulo="¿Eliminar tu cuenta?" alCerrar={() => setDialogo(false)}>
        <p>
          Vas a borrar para siempre la cuenta y todos sus datos. Esta acción no se puede deshacer.
        </p>
        {!esDemo && (
          <Campo
            etiqueta="Tu contraseña, para confirmar"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
        {error && (
          <p role="alert" className="font-bold text-cafe">
            ✗ {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <Boton variante="secundario" onClick={() => setDialogo(false)}>
            Cancelar
          </Boton>
          <Boton variante="primario" onClick={alEliminar} cargando={borrando}>
            Eliminar para siempre
          </Boton>
        </div>
      </Dialogo>
    </section>
  );
}
