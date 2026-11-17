import { Link, Navigate, NavLink, Outlet } from 'react-router';
import { Logo } from '../components/Logo';
import { Cargando } from '../components/Estados';
import { useSesion } from '../lib/sesion';
import { BannerDemo } from '../features/auth/BannerDemo';

function PieDePagina() {
  return (
    <footer className="mx-auto flex w-full max-w-3xl flex-wrap gap-x-6 gap-y-2 px-4 py-6 text-sm text-lapiz">
      <span>AutoNota · gratis, en pesos argentinos</span>
      <Link to="/privacidad">Política de privacidad</Link>
      <Link to="/terminos">Términos y condiciones</Link>
    </footer>
  );
}

/** Pantallas públicas: inicio, ingreso, registro, recuperación y textos legales */
export function LayoutPublico() {
  const { estado } = useSesion();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-4">
        <Logo destino={estado === 'autenticado' ? '/emprendimientos' : '/'} />
        {estado === 'anonimo' && (
          <Link to="/ingresar" className="font-bold">
            Ingresar
          </Link>
        )}
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-8">
        <Outlet />
      </main>
      <PieDePagina />
    </div>
  );
}

/** Pantallas que requieren sesión */
export function LayoutApp() {
  const { estado, salidaVoluntaria } = useSesion();
  if (estado === 'cargando') return <Cargando texto="Abriendo tu cuaderno…" />;
  // Si la sesión venció, al ingreso; si el usuario salió por su cuenta, al inicio
  if (estado === 'anonimo') return <Navigate to={salidaVoluntaria ? '/' : '/ingresar'} replace />;

  const claseEnlace = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap font-bold ${isActive ? 'text-cafe no-underline' : ''}`;

  return (
    <div className="flex min-h-dvh flex-col">
      <BannerDemo />
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-4">
        <Logo destino="/emprendimientos" />
        <nav aria-label="Principal" className="flex gap-3 text-sm sm:gap-4 sm:text-base">
          <NavLink to="/emprendimientos" end className={claseEnlace}>
            Emprendimientos
          </NavLink>
          <NavLink to="/cuenta" className={claseEnlace}>
            Mi cuenta
          </NavLink>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-8">
        <Outlet />
      </main>
      <PieDePagina />
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
