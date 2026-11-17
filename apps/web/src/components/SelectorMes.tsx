import { useId } from 'react';
import { formatearMes, NOMBRES_MES, sumarMeses } from '../lib/meses';

interface Props {
  etiqueta: string;
  valor: string;
  alCambiar: (mes: string) => void;
  /** Años que ofrece el selector, alrededor del valor actual */
  rangoAnios?: number;
}

/** Selector de mes y año (RF-34, RF-38, CU-12), con flechas para el mes anterior y el siguiente */
export function SelectorMes({ etiqueta, valor, alCambiar, rangoAnios = 3 }: Props) {
  const id = useId();
  const [anio, mes] = valor.split('-').map(Number) as [number, number];
  const anios = Array.from({ length: rangoAnios * 2 + 1 }, (_, i) => anio - rangoAnios + i);
  const flecha =
    'flex size-10 items-center justify-center rounded-trazo border border-linea bg-hoja font-bold hover:bg-celeste';
  const select =
    'min-h-10 border-0 border-b-2 border-tinta bg-transparent px-1 font-sans text-base text-tinta capitalize focus:border-birome';

  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-sm font-bold text-lapiz">{etiqueta}</legend>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={flecha}
          onClick={() => alCambiar(sumarMeses(valor, -1))}
          aria-label={`Mes anterior a ${formatearMes(valor)}`}
        >
          ‹
        </button>
        <label htmlFor={`${id}-mes`} className="sr-only">
          Mes
        </label>
        <select
          id={`${id}-mes`}
          className={select}
          value={mes}
          onChange={(e) => alCambiar(`${anio}-${String(e.target.value).padStart(2, '0')}`)}
        >
          {NOMBRES_MES.map((nombre, i) => (
            <option key={nombre} value={i + 1}>
              {nombre}
            </option>
          ))}
        </select>
        <label htmlFor={`${id}-anio`} className="sr-only">
          Año
        </label>
        <select
          id={`${id}-anio`}
          className={select}
          value={anio}
          onChange={(e) => alCambiar(`${e.target.value}-${String(mes).padStart(2, '0')}`)}
        >
          {anios.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={flecha}
          onClick={() => alCambiar(sumarMeses(valor, 1))}
          aria-label={`Mes siguiente a ${formatearMes(valor)}`}
        >
          ›
        </button>
      </div>
    </fieldset>
  );
}
