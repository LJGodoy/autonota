import { useState } from 'react';
import { MEDIOS_PAGO, NOMBRE_MEDIO_PAGO, type MedioPago } from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { Campo } from '../../components/Campo';
import { CasillaVerificacion } from '../../components/CasillaVerificacion';
import { Dialogo } from '../../components/Dialogo';
import { Cargando } from '../../components/Estados';
import { ErrorApi } from '../../lib/api';
import { pesosACentavos } from '../../lib/dinero';
import { formatearFechaHora } from '../../lib/fechas';
import { hoyArgentina } from '../../lib/meses';
import { usePersonas } from '../personas/api';
import { useClasesAlumno, useRegistrarPago } from './api';

interface Props {
  eid: string;
  /** Si viene, el pago es de ese alumno */
  alumnoId?: string;
  alCerrar: () => void;
}

/** CU-09: pago por clase. El monto es el total de las clases impagas que se marquen */
export function FormPago({ eid, alumnoId, alCerrar }: Props) {
  const [clave] = useState(() => crypto.randomUUID());
  const alumnos = usePersonas(eid, 'alumnos', { pageSize: 100 });
  const pagar = useRegistrarPago(eid);
  const [alumno, setAlumno] = useState(alumnoId ?? '');
  const impagas = useClasesAlumno(eid, alumno, 'impagas');
  const [elegidas, setElegidas] = useState<string[]>([]);
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(hoyArgentina());
  const [medio, setMedio] = useState<MedioPago | ''>('');
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');

  const alternar = (id: string, marcada: boolean) =>
    setElegidas((v) => (marcada ? [...v, id] : v.filter((x) => x !== id)));

  async function guardar() {
    setError('');
    const centavos = pesosACentavos(monto);
    if (!alumno) return setError('Elegí el alumno que pagó.');
    if (elegidas.length === 0) return setError('Marcá al menos una clase.');
    if (centavos === null)
      return setError('Ingresá un monto mayor que cero, por ejemplo 40000 o 40.000,50');
    try {
      await pagar.mutateAsync({
        alumnoId: alumno,
        clave,
        datos: {
          montoCentavos: centavos,
          fecha,
          claseIds: elegidas,
          medioPago: medio || null,
          descripcion: nota.trim() || null,
        },
      });
      alCerrar();
    } catch (e) {
      setError(
        e instanceof ErrorApi
          ? (e.details[0]?.message ?? e.message)
          : 'No se pudo registrar el pago.',
      );
    }
  }

  return (
    <Dialogo abierto titulo="Registrar pago" alCerrar={alCerrar}>
      <div className="flex flex-col gap-4">
        {!alumnoId && (
          <div className="flex flex-col gap-1">
            <label htmlFor="alumno-pago" className="text-sm font-bold text-lapiz">
              Alumno
            </label>
            <select
              id="alumno-pago"
              value={alumno}
              onChange={(e) => {
                setAlumno(e.target.value);
                setElegidas([]);
              }}
              className="min-h-11 border-0 border-b-2 border-tinta bg-transparent px-1"
            >
              <option value="">Elegí un alumno…</option>
              {alumnos.data?.data.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
        {alumno && (
          <fieldset className="flex flex-col gap-1">
            <legend className="text-sm font-bold text-lapiz">Clases que paga</legend>
            {impagas.isPending && <Cargando />}
            {impagas.data?.length === 0 && <p className="text-sm">No tiene clases sin pagar.</p>}
            <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
              {impagas.data?.map((c) => (
                <CasillaVerificacion
                  key={c.id}
                  checked={elegidas.includes(c.id)}
                  onChange={(e) => alternar(c.id, e.target.checked)}
                >
                  {formatearFechaHora(c.inicio)} · {c.titulo ?? 'Clase'}
                </CasillaVerificacion>
              ))}
            </div>
          </fieldset>
        )}
        <Campo
          etiqueta="Monto total en pesos"
          inputMode="decimal"
          autoComplete="off"
          placeholder="40.000"
          className="montos"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
        />
        <Campo
          etiqueta="Fecha en que pagó"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="medio-pago-alumno" className="text-sm font-bold text-lapiz">
            Medio de pago (opcional)
          </label>
          <select
            id="medio-pago-alumno"
            value={medio}
            onChange={(e) => setMedio(e.target.value as MedioPago | '')}
            className="min-h-11 border-0 border-b-2 border-tinta bg-transparent px-1"
          >
            <option value="">Sin indicar</option>
            {MEDIOS_PAGO.map((m) => (
              <option key={m} value={m}>
                {NOMBRE_MEDIO_PAGO[m]}
              </option>
            ))}
          </select>
        </div>
        <Campo
          etiqueta="Nota (opcional)"
          placeholder="Clases de noviembre"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />
        {error && (
          <p role="alert" className="font-bold text-rojo">
            ✗ {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <Boton variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton cargando={pagar.isPending} onClick={() => void guardar()}>
            Guardar pago
          </Boton>
        </div>
      </div>
    </Dialogo>
  );
}
