import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const shared = fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url));

// Pruebas unitarias y de componentes del frontend (Parte 6, sección 7)
export default defineConfig({
  resolve: { alias: { '@autonota/shared': shared } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
