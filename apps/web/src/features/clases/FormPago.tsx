import { useState } from 'react';
import { MEDIOS_PAGO, NOMBRE_MEDIO_PAGO, type MedioPago } from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { Campo } from '../../components/Campo';
import { Dialogo } from '../../components/Dialogo';
import { SelectorMes } from '../../components/SelectorMes';
import { ErrorApi } from '../../lib/api';
import { pesosACentavos } from '../../lib/dinero';
import { hoyArgentina, mesActual } from '../../lib/meses';
import { useCrearMovimiento } from '../movimientos/api';
import { usePersonas } from '../personas/api';

interface Props {
  eid: string;
  /** Si viene, el pago es de ese alumno */
  alumnoId?: string;
  alCerrar: () => void;
}

/** CU-09 (RF-34): pago de un alumno con el mes al que corresponde (por defecto, el mes en curso) */
export function FormPago({ eid, alumnoId, alCerrar }: Props) {
  const [clave] = useState(() => crypto.randomUUID());
  const alumnos = usePersonas(eid, 'alumnos', { pageSize: 100 });
  const crear = useCrearMovimiento(eid);
  const [alumno, setAlumno] = useState(alumnoId ?? '');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(hoyArgentina());
  const [mes, setMes] = useState(mesActual());
  const [medio, setMedio] = useState<MedioPago | ''>('');
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');

  async function guardar() {
    setError('');
    const centavos = pesosACentavos(monto);
    if (!alumno) return setError('Elegí el alumno que pagó.');
    if (centavos === null)
      return setError('Ingresá un monto mayor que cero, por ejemplo 40000 o 40.000,50');
    try {
      await crear.mutateAsync({
        clave,
        datos: {
          tipo: 'INGRESO',
          montoCentavos: centavos,
          fecha,
          alumnoId: alumno,
          mesCorrespondiente: mes,
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
    <Dialogo abierto titulo="Nuevo cobro" alCerrar={alCerrar}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="alumno-pago" className="text-sm font-bold text-lapiz">
            Alumno
          </label>
          <select
            id="alumno-pago"
            value={alumno}
            disabled={Boolean(alumnoId)}
            onChange={(e) => setAlumno(e.target.value)}
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
        <Campo
          etiqueta="Monto en pesos"
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
        <SelectorMes etiqueta="Mes al que corresponde" valor={mes} alCambiar={setMes} />
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
          placeholder="Cuota de noviembre"
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
          <Boton cargando={crear.isPending} onClick={() => void guardar()}>
            Guardar cobro
          </Boton>
        </div>
      </div>
    </Dialogo>
  );
}
