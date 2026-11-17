import type { DetalleError } from '@autonota/shared';
import { Confirmacion } from '../../components/Confirmacion';

/**
 * CU-16: el cambio de horarios o el bloqueo deja afuera turnos programados. Se listan y el usuario
 * decide si guardar igual; los turnos no se modifican y después puede reubicarlos o cancelarlos.
 */
export function DialogoAfectados({
  afectados,
  alConfirmar,
  alCerrar,
}: {
  afectados: DetalleError[];
  alConfirmar: () => Promise<unknown>;
  alCerrar: () => void;
}) {
  return (
    <Confirmacion
      titulo="Hay turnos afectados"
      textoConfirmar="Guardar igual"
      alConfirmar={alConfirmar}
      alCerrar={alCerrar}
    >
      <p>Estos turnos programados quedarían fuera del horario o dentro del bloqueo:</p>
      <ul className="list-disc pl-6">
        {afectados.map((a) => (
          <li key={a.field}>{a.message}</li>
        ))}
      </ul>
      <p className="text-sm text-lapiz">
        Si guardás igual, los turnos no se modifican: después podés reubicarlos o cancelarlos.
      </p>
    </Confirmacion>
  );
}
