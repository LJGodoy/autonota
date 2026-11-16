import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { TipoEmprendimiento } from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { Cargando, MensajeError } from '../../components/Estados';
import { EtiquetaTipo } from '../../components/EtiquetaEstado';
import { Tarjeta } from '../../components/Tarjeta';
import { useEmprendimiento } from './api';
import { DialogoEliminar, DialogoRenombrar } from './DialogosEmprendimiento';

/** Lo que trae cada tipo de negocio en las próximas fases (SDD 0.4, fases 4 a 7) */
const PROXIMAMENTE: Record<TipoEmprendimiento, string[]> = {
  TURNERO: [
    'Agenda diaria y semanal',
    'Clientes',
    'Horarios de atención y bloqueos',
    'Cobros e insumos',
    'Estadísticas',
  ],
  CLASES: ['Calendario de clases', 'Alumnos', 'Pagos por mes', 'Gastos', 'Estadísticas'],
  VENTAS: ['Anotaciones por estado y prioridad', 'Ventas', 'Gastos', 'Estadísticas'],
};

/** Pantalla de trabajo de un emprendimiento. Los módulos de cada tipo llegan en las fases 4 a 7. */
export function PantallaEmprendimiento() {
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
  return (
    <section className="flex flex-col gap-6 py-2">
      <Link to="/emprendimientos" className="text-sm">
        ← Mis emprendimientos
      </Link>
      <div className="flex flex-col items-start gap-2">
        <h1 className="font-mano text-5xl font-bold text-cafe">{emp.nombre}</h1>
        <EtiquetaTipo tipo={emp.tipo} />
      </div>

      <Tarjeta nota className="flex flex-col gap-2">
        <h2 className="font-mano text-3xl font-bold text-cafe">En preparación</h2>
        <p>Muy pronto vas a poder usar desde acá:</p>
        <ul className="list-disc pl-6">
          {PROXIMAMENTE[emp.tipo].map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Tarjeta>

      <div className="flex flex-wrap gap-3">
        <Boton variante="secundario" onClick={() => setDialogo('renombrar')}>
          Cambiar el nombre
        </Boton>
        <Boton variante="peligro" onClick={() => setDialogo('eliminar')}>
          Eliminar emprendimiento
        </Boton>
      </div>

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
