import type { Config } from 'jest';

// Pruebas de integración (Parte 6, sección 7): endpoints completos contra PostgreSQL real en Docker
const config: Config = {
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/integration/**/*.int-spec.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  moduleNameMapper: { '^@autonota/shared$': '<rootDir>/../../packages/shared/src/index.ts' },
  globalSetup: '<rootDir>/test/integration/global-setup.ts',
  setupFiles: ['<rootDir>/test/integration/entorno.ts'],
  testTimeout: 30000,
};

export default config;
