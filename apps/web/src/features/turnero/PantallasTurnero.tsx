import { useEmprendimientoActual } from '../emprendimientos/LayoutEmprendimiento';
import { PantallaPersonas } from '../personas/PantallaPersonas';
import { EditorHorarios } from './EditorHorarios';
import { GestorBloqueos } from './GestorBloqueos';

/** RF-10 y RF-11 */
export function PantallaHorarios() {
  const emp = useEmprendimientoActual();
  return (
    <div className="flex flex-col gap-5">
      <EditorHorarios eid={emp.id} />
      <GestorBloqueos eid={emp.id} />
    </div>
  );
}

/** RF-19 */
export function PantallaClientes() {
  const emp = useEmprendimientoActual();
  return <PantallaPersonas eid={emp.id} recurso="clientes" />;
}
