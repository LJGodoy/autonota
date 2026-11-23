import { useEffect } from 'react';
import { Link, Navigate, NavLink, Outlet, useOutletContext, useParams } from 'react-router';
import type { Emprendimiento, TipoEmprendimiento } from '@autonota/shared';
import { Cargando, MensajeError } from '../../components/Estados';
import { EtiquetaTipo } from '../../components/EtiquetaEstado';
import { useEmprendimiento } from './api';

/** Emprendimiento elegido, para las pantallas hijas */
export function useEmprendimientoActual(): Emprendimiento {
  return useOutletContext<Emprendimiento>();
}

/** Pestañas de cada tipo de negocio; la primera es la que se abre al entrar */
export const PESTANIAS: Record<TipoEmprendimiento, { ruta: string; texto: string }[]> = {
  TURNERO: [
    { ruta: 'agenda', texto: 'Agenda' },
    { ruta: 'movimientos', texto: 'Movimientos' },
    { ruta: 'clientes', texto: 'Clientes' },
    { ruta: 'horarios', texto: 'Horarios' },
    { ruta: 'estadisticas', texto: 'Estadísticas' },
  ],
  CLASES: [
    { ruta: 'calendario', texto: 'Calendario' },
    { ruta: 'alumnos', texto: 'Alumnos' },
    { ruta: 'movimientos', texto: 'Movimientos' },
    { ruta: 'estadisticas', texto: 'Estadísticas' },
  ],
  VENTAS: [
    { ruta: 'anotaciones', texto: 'Anotaciones' },
    { ruta: 'movimientos', texto: 'Movimientos' },
    { ruta: 'estadisticas', texto: 'Estadísticas' },
  ],
};

/** Al entrar a un emprendimiento se abre la primera pestaña de su tipo */
export function InicioEmprendimiento() {
  const emp = useEmprendimientoActual();
  return <Navigate to={PESTANIAS[emp.tipo][0]!.ruta} replace />;
}

/** Evita abrir por URL una pestaña de otro tipo de negocio */
export function SoloTipo({
  tipo,
  children,
}: {
  tipo: TipoEmprendimiento;
  children: React.ReactNode;
}) {
  const emp = useEmprendimientoActual();
  return emp.tipo === tipo ? children : <InicioEmprendimiento />;
}

/** Pantalla de trabajo de un emprendimiento: encabezado, pestañas y la sección elegida */
export function LayoutEmprendimiento() {
  const { eid = '' } = useParams();
  const consulta = useEmprendimiento(eid);
  const tipo = consulta.data?.tipo;

  // La tapa del cuaderno toma el color del tipo de negocio mientras el emprendimiento está abierto
  useEffect(() => {
    if (!tipo) return;
    const raiz = document.documentElement;
    raiz.dataset.tapa = tipo;
    return () => {
      delete raiz.dataset.tapa;
    };
  }, [tipo]);

  if (consulta.isPending) return <Cargando />;
  if (consulta.isError) {
    return (
      <div className="flex flex-col gap-4 py-4">
        <MensajeError error={consulta.error} />
        <Link to="/emprendimientos">Volver a mis emprendimientos</Link>
      </div>
    );
  }

  const emp = consulta.data;
  const pestania = ({ isActive }: { isActive: boolean }) =>
    `shrink-0 rounded-t-trazo px-3 pt-2 pb-2.5 font-bold no-underline transition-colors duration-150 sm:px-4 ${
      isActive ? 'text-tinta' : 'text-lapiz hover:bg-arena hover:text-tinta'
    }`;

  return (
    <section className="flex flex-col gap-4 py-2">
      <Link to="/emprendimientos" className="text-sm">
        ← Mis emprendimientos
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col items-start gap-2">
          <h1 className="font-mano text-4xl leading-tight font-bold text-cafe sm:text-5xl">
            {emp.nombre}
          </h1>
          <EtiquetaTipo tipo={emp.tipo} />
        </div>
      </div>

      <nav
        aria-label="Secciones del emprendimiento"
        className="-mx-4 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-linea px-4 [scrollbar-width:none] sm:mx-0 sm:px-0"
      >
        {PESTANIAS[emp.tipo].map((p) => (
          <NavLink key={p.ruta} to={p.ruta} className={pestania}>
            {({ isActive }) => (
              <span className={isActive ? 'resaltado px-1' : 'px-1'}>{p.texto}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <Outlet context={emp} />
    </section>
  );
}
