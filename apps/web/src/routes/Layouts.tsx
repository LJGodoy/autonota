import { Link, Navigate, NavLink, Outlet } from 'react-router';
import { Logo } from '../components/Logo';
import { Cargando } from '../components/Estados';
import { useSesion } from '../lib/sesion';
import { BannerDemo } from '../features/auth/BannerDemo';

function PieDePagina({ ancho }: { ancho: string }) {
  return (
    <footer className="border-t border-cuadricula">
      <div
        className={`mx-auto flex w-full ${ancho} flex-wrap gap-x-6 gap-y-2 px-4 py-6 text-sm text-lapiz`}
      >
        <span>AutoNota · gratis, en pesos argentinos</span>
        <Link to="/privacidad">Política de privacidad</Link>
        <Link to="/terminos">Términos y condiciones</Link>
      </div>
    </footer>
  );
}

/** Pantallas públicas: inicio, ingreso, registro, recuperación y textos legales */
export function LayoutPublico() {
  const { estado } = useSesion();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 pt-5 pb-3">
        <Logo destino={estado === 'autenticado' ? '/emprendimientos' : '/'} />
        {estado === 'anonimo' && (
          <Link to="/ingresar" className="font-bold">
            Ingresar
          </Link>
        )}
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-10">
        <Outlet />
      </main>
      <PieDePagina ancho="max-w-5xl" />
    </div>
  );
}

/** Pantallas que requieren sesión: la tapa del cuaderno arriba, con el color del emprendimiento */
export function LayoutApp() {
  const { estado, salidaVoluntaria } = useSesion();
  if (estado === 'cargando') return <Cargando texto="Abriendo tu cuaderno…" />;
  // Si la sesión venció, al ingreso; si el usuario salió por su cuenta, al inicio
  if (estado === 'anonimo') return <Navigate to={salidaVoluntaria ? '/' : '/ingresar'} replace />;

  const claseEnlace = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap rounded-trazo px-2.5 py-1.5 font-bold text-hoja no-underline transition-colors duration-150 hover:bg-hoja/15 hover:text-hoja ${
      isActive ? 'bg-hoja/20 shadow-[inset_0_-2px_0_var(--color-resaltador)]' : 'text-hoja/85'
    }`;

  return (
    <div className="flex min-h-dvh flex-col">
      <BannerDemo />
      <header className="bg-tapa text-hoja transition-colors duration-300">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Logo destino="/emprendimientos" sobreTapa />
          <nav aria-label="Principal" className="flex gap-1 text-sm sm:gap-2 sm:text-base">
            <NavLink to="/emprendimientos" end className={claseEnlace}>
              Emprendimientos
            </NavLink>
            <NavLink to="/cuenta" className={claseEnlace}>
              Mi cuenta
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-10">
        <Outlet />
      </main>
      <PieDePagina ancho="max-w-5xl" />
    </div>
  );
}

/** Rutas de ingreso y registro: si ya hay sesión, va directo a los emprendimientos */
export function SoloSinSesion() {
  const { estado } = useSesion();
  if (estado === 'cargando') return <Cargando />;
  if (estado === 'autenticado') return <Navigate to="/emprendimientos" replace />;
  return <Outlet />;
}
