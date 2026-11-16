import { Link } from 'react-router';
import { Tarjeta } from '../../components/Tarjeta';
import { BotonDemo } from './BotonDemo';

const TIPOS = [
  {
    titulo: 'Turnero',
    texto: 'Para peluqueros, tatuadores o masajistas: turnos, clientes, cobros e insumos.',
  },
  {
    titulo: 'Calendario de clases',
    texto: 'Para profesores: clases individuales o grupales, alumnos y pagos por mes.',
  },
  {
    titulo: 'Ventas',
    texto: 'Para locales y emprendimientos: anotaciones de pedidos, ventas y gastos.',
  },
];

export function PantallaInicio() {
  return (
    <div className="flex flex-col gap-8 py-4">
      <section className="flex flex-col gap-4">
        <h1 className="font-mano text-5xl font-bold leading-tight text-cafe sm:text-6xl">
          Tu cuaderno de trabajo, que hace solo las cuentas.
        </h1>
        <p className="text-lg text-lapiz">
          AutoNota es gratis y te ayuda a organizar turnos, clases o pedidos, y a saber cuánto entra
          y cuánto sale de tu emprendimiento cada mes.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <Link
            to="/registro"
            className="inline-flex min-h-11 items-center justify-center rounded-trazo border-2 border-grafito bg-cafe px-5 py-2 font-bold text-papel no-underline hover:bg-grafito"
          >
            Crear mi cuenta
          </Link>
          <Link
            to="/ingresar"
            className="inline-flex min-h-11 items-center justify-center rounded-trazo border-2 border-grafito bg-papel px-5 py-2 font-bold text-grafito no-underline hover:bg-kraft-claro"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      <Tarjeta nota className="flex flex-col gap-3">
        <h2 className="font-mano text-3xl font-bold text-cafe">¿Querés verlo antes?</h2>
        <p>Probá una cuenta de ejemplo con los tres tipos de negocio cargados.</p>
        <BotonDemo />
      </Tarjeta>

      <section
        aria-labelledby="tipos"
        className="fondo-cuaderno rounded-trazo-2 border-2 border-grafito py-4 pr-4 pl-10"
      >
        <h2 id="tipos" className="font-mano text-3xl font-bold text-cafe">
          Tres tipos de negocio
        </h2>
        <ul className="mt-2 flex flex-col gap-4">
          {TIPOS.map((t) => (
            <li key={t.titulo}>
              <p className="font-bold">{t.titulo}</p>
              <p className="text-lapiz">{t.texto}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-lapiz">
          Podés tener hasta 3 emprendimientos, del mismo tipo o de tipos distintos.
        </p>
      </section>
    </div>
  );
}
