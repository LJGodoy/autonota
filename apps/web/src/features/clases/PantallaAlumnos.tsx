import { useState } from 'react';
import type { Alumno } from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { CasillaVerificacion } from '../../components/CasillaVerificacion';
import { Dialogo } from '../../components/Dialogo';
import { Cargando, Vacio } from '../../components/Estados';
import { SelectorMes } from '../../components/SelectorMes';
import { mesActual } from '../../lib/meses';
import { useEmprendimientoActual } from '../emprendimientos/LayoutEmprendimiento';
import { ListaMovimientos } from '../movimientos/ListaMovimientos';
import { PantallaPersonas } from '../personas/PantallaPersonas';
import { usePagosAlumno } from './api';
import { FormPago } from './FormPago';

function HistorialPagos({
  eid,
  alumno,
  alCerrar,
}: {
  eid: string;
  alumno: Alumno;
  alCerrar: () => void;
}) {
  const pagos = usePagosAlumno(eid, alumno.id);
  return (
    <Dialogo abierto titulo={`Pagos de ${alumno.nombre}`} alCerrar={alCerrar}>
      {pagos.isPending && <Cargando />}
      {pagos.data?.data.length === 0 && <Vacio>Todavía no tiene pagos registrados.</Vacio>}
      {pagos.data && pagos.data.data.length > 0 && (
        <ListaMovimientos movimientos={pagos.data.data} tipoNegocio="CLASES" />
      )}
    </Dialogo>
  );
}

/** RF-30, RF-35 y RF-38 (CU-14): alumnos, sus pagos y quién no pagó un mes */
export function PantallaAlumnos() {
  const emp = useEmprendimientoActual();
  const [mes, setMes] = useState(mesActual());
  const [sinPago, setSinPago] = useState(false);
  const [pago, setPago] = useState<Alumno | null>(null);
  const [historial, setHistorial] = useState<Alumno | null>(null);

  return (
    <>
      <PantallaPersonas
        eid={emp.id}
        recurso="alumnos"
        filtro={{ mesPago: mes, sinPago }}
        filtrosExtra={
          <div className="flex flex-wrap items-end gap-4">
            <SelectorMes etiqueta="Pagos del mes" valor={mes} alCambiar={setMes} />
            <CasillaVerificacion checked={sinPago} onChange={(e) => setSinPago(e.target.checked)}>
              Solo los que no pagaron
            </CasillaVerificacion>
          </div>
        }
        marca={(a) =>
          a.activo && a.pagoEnMes !== undefined ? (
            a.pagoEnMes ? (
              <span className="rounded-trazo border border-birome bg-birome px-2 text-sm font-bold text-hoja">
                ✓ Pagó
              </span>
            ) : (
              <span className="rounded-trazo border-2 border-dotted border-rojo px-2 text-sm font-bold text-rojo">
                Sin pago
              </span>
            )
          ) : null
        }
        accionesExtra={(a) => (
          <>
            {a.activo && (
              <Boton variante="texto" className="min-h-9 px-2 text-sm" onClick={() => setPago(a)}>
                + Pago
              </Boton>
            )}
            <Boton
              variante="texto"
              className="min-h-9 px-2 text-sm"
              onClick={() => setHistorial(a)}
            >
              Pagos
            </Boton>
          </>
        )}
      />
      <p className="mt-3 text-sm text-lapiz">
        Se indica si el alumno tiene al menos un pago registrado para el mes; no se calculan montos
        adeudados.
      </p>
      {pago && <FormPago eid={emp.id} alumnoId={pago.id} alCerrar={() => setPago(null)} />}
      {historial && (
        <HistorialPagos eid={emp.id} alumno={historial} alCerrar={() => setHistorial(null)} />
      )}
    </>
  );
}
