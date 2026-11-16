import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ErrorApi } from './api';

/**
 * Muestra junto a cada campo los errores de validación que devuelve la API
 * y devuelve el mensaje general para mostrar arriba del formulario.
 */
export function aplicarErroresApi<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  campos: readonly Path<T>[],
): string {
  if (!(error instanceof ErrorApi)) return 'Algo salió mal. Probá de nuevo en un rato.';
  let asignado = false;
  for (const d of error.details) {
    if ((campos as readonly string[]).includes(d.field)) {
      setError(d.field as Path<T>, { type: 'server', message: d.message });
      asignado = true;
    }
  }
  return asignado && error.code === 'VALIDACION' ? '' : error.message;
}
