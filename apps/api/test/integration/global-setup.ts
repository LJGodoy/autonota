// Prepara la base de pruebas aplicando las migraciones pendientes (SDD 0.4, fase 1).
// No borra datos: cada prueba crea sus propios datos y no depende del orden (Parte 6, sección 7).
// Para recrear la base de pruebas desde cero, borrarla a mano (DROP DATABASE autonota_test).
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { cargarEntornoDePrueba } from './entorno';

export default function globalSetup(): void {
  cargarEntornoDePrueba();
  execSync('pnpm exec prisma migrate deploy', {
    cwd: join(__dirname, '..', '..'),
    env: process.env,
    stdio: 'inherit',
  });
}
