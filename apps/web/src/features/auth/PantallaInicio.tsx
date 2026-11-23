import { IconoTipo } from '../../components/IconoTipo';
import { BotonDemo } from './BotonDemo';
import { FormIngreso } from './PantallaIngresar';

const TIPOS = [
  {
    titulo: 'Turnero',
    texto: 'Para peluqueros, tatuadores o masajistas: turnos, clientes, cobros e insumos.',
    tipo: 'TURNERO',
  },
  {
    titulo: 'Calendario de clases',
    texto: 'Para profesores: clases individuales o grupales, alumnos y pagos por mes.',
    tipo: 'CLASES',
  },
  {
    titulo: 'Ventas',
    texto: 'Para locales y emprendimientos: anotaciones de pedidos, ventas y gastos.',
    tipo: 'VENTAS',
  },
] as const;

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
              <span className={`montos font-bold ${r.gasto ? 'text-rojo' : 'text-verde'}`}>
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
    </figure>
  );
}

export function PantallaInicio() {
  return (
    <div className="flex flex-col gap-10 py-4 sm:py-6">
      <section className="grid items-center gap-8 md:grid-cols-[1.1fr_1fr] md:gap-12">
        <div className="flex flex-col gap-4">
          <h1 className="font-mano text-4xl leading-[1.05] font-bold text-cafe sm:text-5xl">
            Tu cuaderno de trabajo, que hace{' '}
            <span className="resaltado text-tinta">solo las cuentas.</span>
          </h1>
          <HojaDeEjemplo />
        </div>
        <div className="flex flex-col gap-4 rounded-trazo-2 border border-linea bg-hoja p-5 shadow-nota">
          <h2 className="font-mano text-3xl font-bold text-cafe">Ingresar</h2>
          <FormIngreso />
        </div>
      </section>

      <section className="grid gap-8 border-t border-cuadricula pt-10 md:grid-cols-[1fr_1.4fr] md:gap-12">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h2 className="font-mano text-3xl font-bold text-cafe">¿Querés verlo antes?</h2>
            <p>Probá una cuenta de ejemplo con los tres tipos de negocio cargados.</p>
            <BotonDemo />
          </div>
          <p className="max-w-[46ch] text-lg text-lapiz">
            AutoNota es gratis y te ayuda a organizar turnos, clases o pedidos, y a saber cuánto
            entra y cuánto sale de tu emprendimiento cada mes.
          </p>
        </div>

        <section aria-labelledby="tipos" className="flex flex-col gap-4">
          <h2 id="tipos" className="font-mano text-3xl font-bold text-cafe">
            Tres tipos de negocio
          </h2>
          <ul className="flex flex-col gap-3">
            {TIPOS.map((t) => (
              <li
                key={t.titulo}
                className="flex items-start gap-4 rounded-trazo-2 border border-linea bg-hoja p-3"
              >
                <span className="mt-0.5 text-cafe">
                  <IconoTipo tipo={t.tipo} />
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
