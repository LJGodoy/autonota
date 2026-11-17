import { Link } from 'react-router';

export function PantallaNoEncontrada() {
  return (
    <section className="flex flex-col items-start gap-4 py-10">
      <h1 className="font-mano text-5xl font-bold text-cafe">Esta hoja está en blanco</h1>
      <p className="text-lapiz">La página que buscás no existe.</p>
      <Link to="/">Volver al inicio</Link>
    </section>
  );
}
