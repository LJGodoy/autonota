import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Boton } from '../../components/Boton';
import { CasillaVerificacion } from '../../components/CasillaVerificacion';
import { Cargando, MensajeError, Vacio } from '../../components/Estados';
import { SelectorMes } from '../../components/SelectorMes';
import { formatearFechaHora } from '../../lib/fechas';
import { mesActual } from '../../lib/meses';
import { useEmprendimientoActual } from '../emprendimientos/LayoutEmprendimiento';
import { ListaMovimientos } from '../movimientos/ListaMovimientos';
import { PantallaPersonas } from '../personas/PantallaPersonas';
import { useAlumno, useClasesAlumno, usePagosAlumno } from './api';
import { FormPago } from './FormPago';

export function MarcaPago({ pagada, detalle }: { pagada: boolean; detalle?: string }) {
  return pagada ? (
    <span className="rounded-trazo border border-verde bg-verde px-2 text-sm font-bold text-hoja">
      ✓ Pagada
    </span>
  ) : (
    <span
      title={detalle}
      className="rounded-trazo border-2 border-dotted border-rojo px-2 text-sm font-bold text-rojo"
    >
      Debe
    </span>
  );
}

/** RF-30 y RF-38 (CU-14): alumnos junto al calendario; tocar uno abre su perfil */
export function PanelAlumnos({ eid }: { eid: string }) {
  const navegar = useNavigate();
  const [debe, setDebe] = useState(false);
  return (
    <PantallaPersonas
      eid={eid}
      recurso="alumnos"
      filtro={{ debe }}
      alAbrir={(a) => void navegar(`alumnos/${a.id}`)}
      filtrosExtra={
        <CasillaVerificacion checked={debe} onChange={(e) => setDebe(e.target.checked)}>
          Solo los que deben
        </CasillaVerificacion>
      }
      marca={(a) =>
        a.activo && a.clasesAdeudadas > 0 ? (
          <MarcaPago
            pagada={false}
            detalle={`${a.clasesAdeudadas} ${a.clasesAdeudadas === 1 ? 'clase dictada' : 'clases dictadas'} sin pagar`}
          />
        ) : null
      }
    />
  );
}

/** Perfil del alumno: sus datos, sus clases del mes con el estado de pago y sus pagos (RF-35) */
export function PantallaPerfilAlumno() {
  const emp = useEmprendimientoActual();
  const { aid = '' } = useParams();
  const [mes, setMes] = useState(mesActual());
  const [pagando, setPagando] = useState(false);
  const alumno = useAlumno(emp.id, aid);
  const clases = useClasesAlumno(emp.id, aid, { mes });
  const pagos = usePagosAlumno(emp.id, aid);

  if (alumno.isPending) return <Cargando />;
  if (alumno.isError)
    return <MensajeError error={alumno.error} reintentar={() => void alumno.refetch()} />;
  const a = alumno.data;

  return (
    <section className="flex flex-col gap-5">
      <Link to={`/emprendimientos/${emp.id}/calendario`} className="font-bold">
        ← Volver al calendario
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-mano text-3xl font-bold">{a.nombre}</h2>
          <p className="text-lapiz">
            {[a.telefono, a.notas].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
            {a.activo ? '' : ' · Dado de baja'}
          </p>
        </div>
        <Boton onClick={() => setPagando(true)}>Registrar pago</Boton>
      </div>

      <div className="flex flex-col gap-3">
        <SelectorMes etiqueta="Clases del mes" valor={mes} alCambiar={setMes} />
        {clases.isError && (
          <MensajeError error={clases.error} reintentar={() => void clases.refetch()} />
        )}
        {clases.data?.length === 0 && <Vacio>No tiene clases este mes.</Vacio>}
        {clases.data && clases.data.length > 0 && (
          <ul className="fondo-cuaderno flex flex-col rounded-trazo-2 border border-linea py-2 pr-3 pl-9">
            {clases.data.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-cuadricula py-2 last:border-b-0"
              >
                <span>
                  <b>{formatearFechaHora(c.inicio)}</b> · {c.titulo ?? 'Clase'}
                </span>
                <MarcaPago pagada={c.pagada} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-mano text-2xl font-bold">Pagos</h3>
        {pagos.data?.data.length === 0 && <Vacio>Todavía no tiene pagos registrados.</Vacio>}
        {pagos.data && pagos.data.data.length > 0 && (
          <ListaMovimientos movimientos={pagos.data.data} tipoNegocio="CLASES" />
        )}
      </div>

      {pagando && <FormPago eid={emp.id} alumnoId={a.id} alCerrar={() => setPagando(false)} />}
    </section>
  );
}
