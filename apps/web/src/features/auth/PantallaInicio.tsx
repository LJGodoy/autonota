import { Link } from 'react-router';
import { BotonDemo } from './BotonDemo';

const TIPOS = [
  {
    titulo: 'Turnero',
    texto: 'Para peluqueros, tatuadores o masajistas: turnos, clientes, cobros e insumos.',
    tapa: 'bg-tapa-turnero',
  },
  {
    titulo: 'Calendario de clases',
    texto: 'Para profesores: clases individuales o grupales, alumnos y pagos por mes.',
    tapa: 'bg-tapa-clases',
  },
  {
    titulo: 'Ventas',
    texto: 'Para locales y emprendimientos: anotaciones de pedidos, ventas y gastos.',
    tapa: 'bg-tapa-ventas',
  },
];

/** Hoja de ejemplo: muestra cómo se anota un día y cómo queda la cuenta al pie (datos inventados) */
const RENGLONES = [
  { hora: '09:00', texto: 'Sofía · corte', monto: '$ 8.000' },
  { hora: '10:30', texto: 'Marcos · barba', monto: '$ 5.500' },
  { hora: '12:00', texto: 'Tinturas', monto: '− $ 6.200', gasto: true },
  { hora: '15:00', texto: 'Juli · color', monto: '$ 14.000' },
];

function HojaDeEjemplo() {
  return (
    <figure className="relative">
      <div className="fondo-cuaderno overflow-hidden rounded-trazo-2 border border-linea shadow-nota">
        <div className="flex items-center justify-between bg-tapa-turnero px-4 py-2 text-hoja">
          <span className="font-mano text-xl font-bold">Peluquería Lu</span>
          <span className="text-sm">martes 17</span>
        </div>
        <ul className="py-1 pr-4 pl-10" aria-label="Turnos y movimientos del día de ejemplo">
          {RENGLONES.map((r) => (
            <li
              key={r.hora}
              className="flex items-baseline gap-3 border-b border-cuadricula py-2 last:border-b-0"
            >
              <span className="montos w-12 shrink-0 text-sm text-lapiz">{r.hora}</span>
              <span className="flex-1 truncate font-bold">{r.texto}</span>
              <span className={`montos font-bold ${r.gasto ? 'text-rojo' : 'text-birome'}`}>
                {r.monto}
              </span>
            </li>
          ))}
        </ul>
        <div className="ml-10 flex items-baseline justify-end gap-4 border-t border-tinta/70 py-3 pr-4">
          <span className="font-bold">Queda</span>
          <span className="montos total-al-pie font-mano text-3xl leading-none font-bold">
            $ 21.300
          </span>
        </div>
      </div>
      <figcaption className="mt-2 text-sm text-lapiz">
        Ejemplo con datos inventados. La cuenta la hace AutoNota.
      </figcaption>
    </figure>
  );
}

export function PantallaInicio() {
  return (
    <div className="flex flex-col gap-12 py-6 sm:py-10">
      <section className="grid items-center gap-8 md:grid-cols-[1.1fr_1fr] md:gap-12">
        <div className="flex flex-col gap-5">
          <h1 className="font-mano text-5xl leading-[1.05] font-bold text-birome sm:text-6xl">
            Tu cuaderno de trabajo, que hace{' '}
            <span className="resaltado text-tinta">solo las cuentas.</span>
          </h1>
          <p className="max-w-[46ch] text-lg text-lapiz">
            AutoNota es gratis y te ayuda a organizar turnos, clases o pedidos, y a saber cuánto
            entra y cuánto sale de tu emprendimiento cada mes.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <Link
              to="/registro"
              className="inline-flex min-h-11 items-center justify-center rounded-trazo border border-birome bg-birome px-5 py-2 font-bold text-hoja no-underline shadow-nota transition-colors duration-150 hover:bg-birome-oscura hover:text-hoja"
            >
              Crear mi cuenta
            </Link>
            <Link
              to="/ingresar"
              className="inline-flex min-h-11 items-center justify-center rounded-trazo border border-linea bg-hoja px-5 py-2 font-bold text-tinta no-underline transition-colors duration-150 hover:border-tinta hover:bg-celeste hover:text-tinta"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
        <HojaDeEjemplo />
      </section>

      <section className="grid gap-6 border-t border-cuadricula pt-10 md:grid-cols-[1fr_1.4fr] md:gap-12">
        <div className="flex flex-col gap-3">
          <h2 className="font-mano text-3xl font-bold text-birome">¿Querés verlo antes?</h2>
          <p>Probá una cuenta de ejemplo con los tres tipos de negocio cargados.</p>
          <BotonDemo />
        </div>

        <section aria-labelledby="tipos" className="flex flex-col gap-4">
          <h2 id="tipos" className="font-mano text-3xl font-bold text-birome">
            Tres tipos de negocio
          </h2>
          <ul className="flex flex-col gap-3">
            {TIPOS.map((t) => (
              <li
                key={t.titulo}
                className="flex items-start gap-4 rounded-trazo-2 border border-linea bg-hoja p-3"
              >
                {/* Tapa del cuaderno en miniatura, con su etiqueta blanca */}
                <span
                  aria-hidden="true"
                  className={`relative mt-0.5 h-12 w-9 shrink-0 rounded-[3px_5px_5px_3px] shadow-nota ${t.tapa}`}
                >
                  <span className="absolute inset-x-1.5 top-3 h-3 rounded-[2px] bg-hoja/90" />
                </span>
                <div>
                  <p className="font-bold">{t.titulo}</p>
                  <p className="text-lapiz">{t.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </section>
    </div>
  );
}
