// Carga apps/api/.env.test en process.env antes de cada archivo de pruebas de integración
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function cargarEntornoDePrueba(): void {
  const contenido = readFileSync(join(__dirname, '..', '..', '.env.test'), 'utf8');
  for (const linea of contenido.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(linea);
    if (m && m[1]) process.env[m[1]] = process.env[`TEST_${m[1]}`] ?? m[2];
  }
}

cargarEntornoDePrueba();
