import { useState } from 'react';
import { useSearchParams } from 'react-router';
import type { Movimiento, TipoMovimiento } from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { Cargando, MensajeError, Vacio } from '../../components/Estados';
import { SelectorMes } from '../../components/SelectorMes';
import { formatearPesos } from '../../lib/dinero';
import { formatearMes, mesActual } from '../../lib/meses';
import { useEmprendimientoActual } from '../emprendimientos/LayoutEmprendimiento';
import { useMovimientos } from './api';
import { ETIQUETAS } from './etiquetas';
import { FormMovimiento } from './FormMovimiento';
import { ListaMovimientos } from './ListaMovimientos';
import { DialogoEliminarMovimiento } from './DialogoEliminarMovimiento';

type Filtro = TipoMovimiento | 'TODOS';

/** RF-07 y RF-73: ingresos y gastos del mes, con alta, corrección y eliminación */
export function PantallaMovimientos() {
  const emp = useEmprendimientoActual();
  const [params, setParams] = useSearchParams();
  const mes = params.get('mes') ?? mesActual();
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [formulario, setFormulario] = useState<{
    tipo: TipoMovimiento;
    movimiento?: Movimiento;
  } | null>(null);
  const [eliminando, setEliminando] = useState<Movimiento | null>(null);
  const consulta = useMovimientos(emp.id, { mes, tipo: filtro === 'TODOS' ? undefined : filtro });
  const etiquetas = ETIQUETAS[emp.tipo];

  const lista = consulta.data?.data ?? [];
  const ingresos = lista
    .filter((m) => m.tipo === 'INGRESO')
    .reduce((s, m) => s + m.montoCentavos, 0);
  const gastos = lista.filter((m) => m.tipo === 'GASTO').reduce((s, m) => s + m.montoCentavos, 0);
  const opciones: { valor: Filtro; texto: string }[] = [
    { valor: 'TODOS', texto: 'Todos' },
    { valor: 'INGRESO', texto: 'Ingresos' },
    { valor: 'GASTO', texto: 'Gastos' },
  ];

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SelectorMes
          etiqueta="Mes"
          valor={mes}
          alCambiar={(m) => setParams({ mes: m }, { replace: true })}
        />
        <div className="flex flex-wrap gap-2">
          <Boton onClick={() => setFormulario({ tipo: 'INGRESO' })}>+ {etiquetas.INGRESO}</Boton>
          <Boton variante="secundario" onClick={() => setFormulario({ tipo: 'GASTO' })}>
            + {etiquetas.GASTO}
          </Boton>
        </div>
      </div>

      <div role="group" aria-label="Filtrar por tipo" className="flex gap-1">
        {opciones.map((o) => (
          <button
            key={o.valor}
            type="button"
            aria-pressed={filtro === o.valor}
            onClick={() => setFiltro(o.valor)}
            className={`rounded-trazo border-2 px-3 py-1 text-sm font-bold ${filtro === o.valor ? 'border-cafe bg-cafe text-papel' : 'border-grafito bg-papel'}`}
          >
            {o.texto}
          </button>
        ))}
      </div>

      {consulta.isPending && <Cargando />}
      {consulta.isError && (
        <MensajeError error={consulta.error} reintentar={() => void consulta.refetch()} />
      )}
      {consulta.isSuccess && lista.length === 0 && (
        <Vacio>
          No hay movimientos en {formatearMes(mes)}. Cargá el primero con los botones de arriba.
        </Vacio>
      )}
      {consulta.isSuccess && lista.length > 0 && (
        <>
          <p className="montos text-sm text-lapiz">
            {formatearMes(mes)}: entraron{' '}
            <strong className="text-cafe">{formatearPesos(ingresos)}</strong> y salieron{' '}
            <strong className="text-madera">{formatearPesos(gastos)}</strong>.
            {consulta.data.meta.total > lista.length &&
              ` Se muestran ${lista.length} de ${consulta.data.meta.total}.`}
          </p>
          <ListaMovimientos
            movimientos={lista}
            tipoNegocio={emp.tipo}
            alEditar={(m) => setFormulario({ tipo: m.tipo, movimiento: m })}
            alEliminar={setEliminando}
          />
        </>
      )}

      {formulario && (
        <FormMovimiento
          eid={emp.id}
          tipoNegocio={emp.tipo}
          tipo={formulario.tipo}
          movimiento={formulario.movimiento}
          alCerrar={() => setFormulario(null)}
        />
      )}
      {eliminando && (
        <DialogoEliminarMovimiento
          eid={emp.id}
          movimiento={eliminando}
          alCerrar={() => setEliminando(null)}
        />
      )}
    </section>
  );
}
