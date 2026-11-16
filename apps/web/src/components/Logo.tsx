import { Link } from 'react-router';

export function Logo({ destino = '/' }: { destino?: string }) {
  return (
    <Link
      to={destino}
      className="shrink-0 font-mano text-3xl font-bold sm:text-4xl text-cafe no-underline"
      aria-label="AutoNota, inicio"
    >
      Auto<span className="text-madera">Nota</span>
    </Link>
  );
}
