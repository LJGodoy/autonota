import { Link } from 'react-router';
import { formatearFechaHora } from '../../lib/fechas';
import { useSesion } from '../../lib/sesion';

/** Recuerda que la cuenta de demostración se borra sola (RF-08) */
export function BannerDemo() {
  const { usuario } = useSesion();
  if (!usuario?.esDemo || !usuario.expiraEn) return null;
  return (
    <div className="border-b-2 border-dashed border-madera bg-kraft-claro px-4 py-2 text-center text-sm">
      Estás usando una cuenta de prueba. Se borra sola el {formatearFechaHora(usuario.expiraEn)}.{' '}
      <Link to="/registro">Crear una cuenta propia</Link>
    </div>
  );
}
