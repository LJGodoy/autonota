import { useState } from 'react';
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router';
import type { Emprendimiento, TipoEmprendimiento } from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { Cargando, MensajeError } from '../../components/Estados';
import { EtiquetaTipo } from '../../components/EtiquetaEstado';
import { useEmprendimiento } from './api';
import { DialogoEliminar, DialogoRenombrar } from './DialogosEmprendimiento';

/** Emprendimiento elegido, para las pantallas hijas */
export function useEmprendimientoActual(): Emprendimiento {
  return useOutletContext<Emprendimiento>();
}

/** Pestañas de cada tipo de negocio; la primera es la que se abre al entrar */
export const PESTANIAS: Record<TipoEmprendimiento, { ruta: string; texto: string }[]> = {
  TURNERO: [
    { ruta: 'agenda', texto: 'Agenda' },
    { ruta: 'clientes', texto: 'Clientes' },
    { ruta: 'horarios', texto: 'Horarios' },
    { ruta: 'movimientos', texto: 'Movimientos' },
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
  const navegar = useNavigate();
  const consulta = useEmprendimiento(eid);
  const [dialogo, setDialogo] = useState<'renombrar' | 'eliminar' | null>(null);

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
    `-mb-0.5 rounded-t-[10px] border-2 px-4 py-2 font-bold no-underline ${
      isActive
        ? 'border-grafito border-b-papel bg-papel text-cafe'
        : 'border-transparent text-lapiz hover:text-cafe'
    }`;

  return (
    <section className="flex flex-col gap-5 py-2">
      <Link to="/emprendimientos" className="text-sm">
        ← Mis emprendimientos
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col items-start gap-2">
          <h1 className="font-mano text-5xl font-bold text-cafe">{emp.nombre}</h1>
          <EtiquetaTipo tipo={emp.tipo} />
        </div>
        <div className="flex gap-1">
          <Boton variante="texto" className="text-sm" onClick={() => setDialogo('renombrar')}>
            Renombrar
          </Boton>
          <Boton variante="texto" className="text-sm" onClick={() => setDialogo('eliminar')}>
            Eliminar
          </Boton>
        </div>
      </div>

      <nav
        aria-label="Secciones del emprendimiento"
        className="flex gap-1 overflow-x-auto overflow-y-hidden border-b-2 border-grafito [scrollbar-width:none]"
      >
        {PESTANIAS[emp.tipo].map((p) => (
          <NavLink key={p.ruta} to={p.ruta} className={pestania}>
            {p.texto}
          </NavLink>
        ))}
      </nav>

      <Outlet context={emp} />

      {dialogo === 'renombrar' && (
        <DialogoRenombrar emprendimiento={emp} alCerrar={() => setDialogo(null)} />
      )}
      {dialogo === 'eliminar' && (
        <DialogoEliminar
          emprendimiento={emp}
          alCerrar={() => setDialogo(null)}
          alEliminar={() => navegar('/emprendimientos')}
        />
      )}
    </section>
  );
}
