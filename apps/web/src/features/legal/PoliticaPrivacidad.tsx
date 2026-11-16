import { TextoLegal } from './TextoLegal';

/** RNF-06 y RNF-07: política de privacidad, legible sin iniciar sesión */
export function PoliticaPrivacidad() {
  return (
    <TextoLegal titulo="Política de privacidad">
      <h2>Qué datos guardamos</h2>
      <ul>
        <li>
          De tu cuenta: nombre, email, la contraseña cifrada (nunca en texto plano) y la fecha en
          que aceptaste esta política.
        </li>
        <li>
          De tus emprendimientos: los datos que cargues, como turnos, clases, anotaciones, ingresos
          y gastos.
        </li>
        <li>De tus clientes y alumnos: nombre, teléfono y notas, que cargás vos.</li>
      </ul>
      <h2>Para qué los usamos</h2>
      <p>
        Solo para que puedas usar AutoNota. No los usamos para ningún otro fin, no los vendemos ni
        los compartimos. Los datos de tus clientes y alumnos los guardamos por tu cuenta: vos sos
        responsable de ellos. En las notas, evitá cargar información sensible que no haga falta,
        como datos de salud.
      </p>
      <h2>Quién puede verlos</h2>
      <p>Solo vos. Cada usuario ve únicamente sus propios datos.</p>
      <h2>Cuánto tiempo los conservamos</h2>
      <p>
        Mientras tengas la cuenta. Si eliminás un emprendimiento o tu cuenta, los datos se borran de
        forma definitiva. Las copias de seguridad del proveedor de base de datos pueden conservarlos
        por un período limitado hasta que se renuevan. Las cuentas de prueba se borran solas a las
        48 horas.
      </p>
      <h2>Cómo pedir que se borren</h2>
      <p>
        Podés eliminar tu cuenta desde «Mi cuenta». Si un cliente o alumno te pide que borres sus
        datos, podés anonimizarlo: se borran su nombre, teléfono y notas, y se conservan sus turnos
        y pagos sin datos que lo identifiquen.
      </p>
      <h2>Marco legal</h2>
      <p>
        El tratamiento de los datos cumple la Ley 25.326 de Protección de Datos Personales de la
        República Argentina.
      </p>
    </TextoLegal>
  );
}
