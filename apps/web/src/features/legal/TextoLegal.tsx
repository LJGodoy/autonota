import type { ReactNode } from 'react';

/** Marco común de los textos legales. Los textos son un borrador pendiente de revisión legal (SDD 0.7). */
export function TextoLegal({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <article className="flex max-w-prose flex-col gap-4 py-4 leading-relaxed [&_h2]:mt-2 [&_h2]:font-mano [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:text-cafe [&_ul]:list-disc [&_ul]:pl-6">
      <h1 className="font-mano text-5xl font-bold text-cafe">{titulo}</h1>
      <p className="rounded-trazo-2 border border-linea bg-arena p-3 text-sm">
        Borrador: este texto todavía debe ser revisado por alguien con conocimientos legales antes
        del uso con personas reales.
      </p>
      {children}
    </article>
  );
}
