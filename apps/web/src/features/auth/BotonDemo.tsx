import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Boton } from '../../components/Boton';
import { ErrorApi } from '../../lib/api';
import { useSesion } from '../../lib/sesion';
import { probarDemo } from './api';

/** CU-15: crea una cuenta de demostración propia y entra directamente */
export function BotonDemo() {
  const { iniciar } = useSesion();
  const navegar = useNavigate();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function alProbar() {
    setCargando(true);
    setError('');
    try {
      iniciar(await probarDemo());
      navegar('/emprendimientos');
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No pudimos crear la demo. Probá de nuevo.');
      setCargando(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Boton variante="secundario" onClick={alProbar} disabled={cargando}>
        {cargando ? 'Preparando la demo…' : 'Probar demo'}
      </Boton>
      <p className="text-sm text-lapiz">
        Al probar la demo aceptás la <Link to="/privacidad">política de privacidad</Link> y los{' '}
        <Link to="/terminos">términos y condiciones</Link>. La cuenta de prueba se borra sola a las
        48 horas.
      </p>
      {error && (
        <p role="alert" className="text-sm font-bold text-rojo">
          ✗ {error}
        </p>
      )}
    </div>
  );
}
