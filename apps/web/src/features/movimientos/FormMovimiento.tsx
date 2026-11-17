import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  esquemaFecha,
  MEDIOS_PAGO,
  NOMBRE_MEDIO_PAGO,
  type Movimiento,
  type TipoEmprendimiento,
  type TipoMovimiento,
} from '@autonota/shared';
import { Boton } from '../../components/Boton';
import { Campo } from '../../components/Campo';
import { Dialogo } from '../../components/Dialogo';
import { formatearPesos, pesosACentavos } from '../../lib/dinero';
import { aplicarErroresApi } from '../../lib/formularios';
import { hoyArgentina } from '../../lib/meses';
import { useCrearMovimiento, useEditarMovimiento } from './api';
import { ETIQUETAS } from './etiquetas';

const esquema = z.object({
  monto: z
    .string()
    .refine(
      (t) => pesosACentavos(t) !== null,
      'Ingresá un monto mayor que cero, por ejemplo 8500 o 8.500,50',
    ),
  fecha: esquemaFecha,
  descripcion: z.string().max(500, 'Usá como máximo 500 caracteres'),
  medioPago: z.union([z.enum(MEDIOS_PAGO), z.literal('')]),
});
type Datos = z.infer<typeof esquema>;

interface Props {
  eid: string;
  tipoNegocio: TipoEmprendimiento;
  tipo: TipoMovimiento;
  /** Si viene, el formulario corrige ese movimiento */
  movimiento?: Movimiento;
  /** RF-55: venta vinculada a una tarea */
  tareaId?: string;
  descripcionInicial?: string;
  alCerrar: () => void;
}

/** Alta y corrección de ingresos y gastos, con medio de pago opcional (RF-07) */
export function FormMovimiento({
  eid,
  tipoNegocio,
  tipo,
  movimiento,
  tareaId,
  descripcionInicial,
  alCerrar,
}: Props) {
  // Se genera una sola vez al abrir el formulario (Parte 6, sección 5.2)
  const [clave] = useState(() => crypto.randomUUID());
  const [errorGeneral, setErrorGeneral] = useState('');
  const crear = useCrearMovimiento(eid);
  const editar = useEditarMovimiento(eid);
  const { register, handleSubmit, setError, formState } = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: {
      monto: movimiento ? formatearPesos(movimiento.montoCentavos).replace(/[^\d,.]/g, '') : '',
      fecha: movimiento?.fecha ?? hoyArgentina(),
      descripcion: movimiento?.descripcion ?? descripcionInicial ?? '',
      medioPago: movimiento?.medioPago ?? '',
    },
  });
  const etiqueta = ETIQUETAS[tipoNegocio][tipo];

  const alEnviar = handleSubmit(async (d) => {
    setErrorGeneral('');
    const comunes = {
      montoCentavos: pesosACentavos(d.monto) ?? 0,
      fecha: d.fecha,
      descripcion: d.descripcion.trim() || null,
      medioPago: d.medioPago || null,
    };
    try {
      if (movimiento) await editar.mutateAsync({ id: movimiento.id, datos: comunes });
      else
        await crear.mutateAsync({
          datos: { tipo, ...comunes, ...(tareaId ? { tareaId } : {}) },
          clave,
        });
      alCerrar();
    } catch (e) {
      setErrorGeneral(aplicarErroresApi(e, setError, ['fecha', 'descripcion', 'medioPago']));
    }
  });

  return (
    <Dialogo
      abierto
      titulo={
        movimiento ? `Corregir ${etiqueta.toLowerCase()}` : `Nuevo: ${etiqueta.toLowerCase()}`
      }
      alCerrar={alCerrar}
    >
      <form onSubmit={alEnviar} noValidate className="flex flex-col gap-4">
        <Campo
          etiqueta="Monto en pesos"
          inputMode="decimal"
          autoComplete="off"
          placeholder="8.500,50"
          className="montos"
          error={formState.errors.monto?.message}
          {...register('monto')}
        />
        <Campo
          etiqueta="Fecha"
          type="date"
          error={formState.errors.fecha?.message}
          {...register('fecha')}
        />
        <Campo
          etiqueta="Descripción (opcional)"
          autoComplete="off"
          error={formState.errors.descripcion?.message}
          {...register('descripcion')}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="medio-pago" className="text-sm font-bold text-lapiz">
            Medio de pago (opcional)
          </label>
          <select
            id="medio-pago"
            className="min-h-11 border-0 border-b-2 border-tinta bg-transparent px-1 text-base focus:border-birome"
            {...register('medioPago')}
          >
            <option value="">Sin indicar</option>
            {MEDIOS_PAGO.map((m) => (
              <option key={m} value={m}>
                {NOMBRE_MEDIO_PAGO[m]}
              </option>
            ))}
          </select>
        </div>
        {errorGeneral && (
          <p role="alert" className="font-bold text-rojo">
            ✗ {errorGeneral}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <Boton variante="secundario" onClick={alCerrar}>
            Cancelar
          </Boton>
          {/* El botón queda deshabilitado mientras se guarda (Parte 6, sección 5.2) */}
          <Boton type="submit" cargando={formState.isSubmitting}>
            Guardar
          </Boton>
        </div>
      </form>
    </Dialogo>
  );
}
