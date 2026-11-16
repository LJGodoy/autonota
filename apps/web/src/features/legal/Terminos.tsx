import { TextoLegal } from './TextoLegal';

/** RNF-08: términos y condiciones, legibles sin iniciar sesión */
export function Terminos() {
  return (
    <TextoLegal titulo="Términos y condiciones">
      <h2>El servicio</h2>
      <p>
        AutoNota es gratuito y se ofrece tal como está, sin garantía de disponibilidad: puede tener
        demoras o interrupciones.
      </p>
      <h2>Tus datos</h2>
      <p>Sos responsable de los datos que cargás, incluidos los de tus clientes y alumnos.</p>
      <h2>No es facturación</h2>
      <p>
        AutoNota no emite facturas ni reemplaza la facturación electrónica ante ARCA. Registrar una
        venta o un cobro no equivale a facturarlo.
      </p>
      <h2>Cuentas de prueba</h2>
      <p>
        Las cuentas de demostración y todos sus datos se eliminan automáticamente a las 48 horas.
      </p>
    </TextoLegal>
  );
}
