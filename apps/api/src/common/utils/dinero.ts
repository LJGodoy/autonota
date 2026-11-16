// Montos en centavos (ADR-007). Prisma devuelve BIGINT como bigint; la salida usa number.

/** Convierte centavos de la base (bigint) a number para los DTOs de salida */
export function centavosANumero(valor: bigint): number {
  if (valor > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('Monto fuera del rango representable');
  }
  return Number(valor);
}

/** Convierte un monto entero en pesos a centavos (uso interno, por ejemplo en los datos de ejemplo) */
export function pesosACentavos(pesos: number): bigint {
  if (!Number.isInteger(pesos)) throw new Error('Los pesos deben ser un número entero');
  return BigInt(pesos) * 100n;
}
