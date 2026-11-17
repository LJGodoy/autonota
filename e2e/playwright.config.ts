import { defineConfig, devices } from '@playwright/test';

/**
 * Flujos críticos de la Parte 6, sección 7, contra el entorno publicado.
 * Otra URL: E2E_URL=http://localhost:5173 pnpm e2e
 */
export default defineConfig({
  testDir: './tests',
  // Los flujos comparten una cuenta de demostración (hay un límite de 3 demos por hora por IP)
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_URL ?? 'https://autonota-two.vercel.app',
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
