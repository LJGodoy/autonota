import { Link } from 'react-router';

/** Logo escrito en birome; sobre la tapa va en blanco */
export function Logo({
  destino = '/',
  sobreTapa = false,
}: {
  destino?: string;
  sobreTapa?: boolean;
}) {
  return (
    <Link
      to={destino}
      className={`shrink-0 font-mano text-3xl leading-none font-bold no-underline sm:text-[2rem] ${sobreTapa ? 'text-hoja hover:text-hoja' : 'text-birome'}`}
      aria-label="AutoNota, inicio"
    >
      Auto
      <span
        className={
          sobreTapa ? 'rounded-[3px_8px_4px_7px] bg-resaltador px-1 text-tinta' : 'resaltado px-0.5'
        }
      >
        Nota
      </span>
    </Link>
  );
}
