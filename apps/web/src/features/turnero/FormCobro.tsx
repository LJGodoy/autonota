import { useState } from 'react';
import { MEDIOS_PAGO, NOMBRE_MEDIO_PAGO, type MedioPago, type Turno } from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { Campo } from '../../components/Campo';
import { CasillaVerificacion } from '../../components/CasillaVerificacion';
import { Dialogo } from '../../components/Dialogo';
import { ErrorApi } from '../../lib/api';
import { pesosACentavos } from '../../lib/dinero';
import { hoyArgentina } from '../../lib/meses';
import { useCobrarTurno } from './api';

interface Props {
  eid: string;
  turno: Turno;
  /** true: marcar como realizado, con cobro opcional. false: registrar una seña o un pago. */
  realizar: boolean;
  alCerrar: () => void;
}

/** CU-08: realizar con o sin cobro, o registrar un cobro (seña, parcial o total) */
export function FormCobro({ eid, turno, realizar, alCerrar }: Props) {
  const [clave] = useState(() => crypto.randomUUID());
  const [cobra, setCobra] = useState(!realizar);
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(hoyArgentina());
  const [medio, setMedio] = useState<MedioPago | ''>('');
  const [descripcion, setDescripcion] = useState(realizar ? '' : 'Seña');
  const [error, setError] = useState('');
  const cobrar = useCobrarTurno(eid);

  async function guardar() {
    setError('');
    const centavos = pesosACentavos(monto);
    if (cobra && centavos === null) {
      setError('Ingresá un monto mayor que cero, por ejemplo 8500 o 8.500,50');
      return;
    }
    try {
      await cobrar.mutateAsync({
        id: turno.id,
        realizar,
        clave,
        cobro:
          cobra && centavos
            ? {
                montoCentavos: centavos,
                fecha,
                medioPago: medio || null,
                descripcion: descripcion.trim() || null,
              }
            : undefined,
      });
      alCerrar();
    } catch (e) {
      setError(
        e instanceof ErrorApi ? (e.details[0]?.message ?? e.message) : 'No se pudo guardar.',
      );
    }
  }

  return (
    <Dialogo
      abierto
      titulo={realizar ? 'Marcar como realizado' : 'Registrar un cobro'}
      alCerrar={alCerrar}
    >
      <p className="text-sm text-lapiz">
        {turno.cliente.nombre}
        {turno.descripcion ? ` · ${turno.descripcion}` : ''}
      </p>
      {realizar && (
        <CasillaVerificacion checked={cobra} onChange={(e) => setCobra(e.target.checked)}>
          Cobré en este momento
        </CasillaVerificacion>
      )}
      {cobra && (
        <div className="flex flex-col gap-4">
          <Campo
            etiqueta="Monto en pesos"
            inputMode="decimal"
            autoComplete="off"
            placeholder="8.500,50"
            className="montos"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />
          <Campo
            etiqueta="Fecha del cobro"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="medio-cobro" className="text-sm font-bold text-lapiz">
              Medio de pago (opcional)
            </label>
            <select
              id="medio-cobro"
              value={medio}
              onChange={(e) => setMedio(e.target.value as MedioPago | '')}
              className="min-h-11 border-0 border-b-2 border-grafito bg-transparent px-1 focus:border-madera"
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
            etiqueta="Detalle (opcional)"
            autoComplete="off"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>
      )}
      {error && (
        <p role="alert" className="font-bold text-cafe">
          ✗ {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <Boton variante="secundario" onClick={alCerrar}>
          Cancelar
        </Boton>
        <Boton onClick={guardar} cargando={cobrar.isPending}>
          {realizar ? 'Marcar realizado' : 'Guardar cobro'}
        </Boton>
      </div>
    </Dialogo>
  );
}
