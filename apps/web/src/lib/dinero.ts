// Conversión entre pesos y centavos en un único lugar (ADR-007; Parte 6, sección 5.2).
// Se trabaja con el texto para no usar decimales de punto flotante.

const formato = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

/** Formatea centavos como pesos argentinos, por ejemplo 850050 → "$ 8.500,50" */
export function formatearPesos(centavos: number): string {
  return formato.format(centavos / 100);
}

/**
 * Convierte lo que escribe el usuario a centavos. Acepta "8500", "8.500", "8500,5" y "8.500,50".
 * Devuelve null si el texto no es un monto válido mayor que cero.
 */
export function pesosACentavos(texto: string): number | null {
  const limpio = texto.trim().replace(/\$|\s/g, '');
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(limpio)) return null;
  const [enteros = '', decimales = ''] = limpio.replace(/\./g, '').split(',');
  const centavos = Number(enteros) * 100 + Number(decimales.padEnd(2, '0'));
  return Number.isSafeInteger(centavos) && centavos > 0 ? centavos : null;
}
