import type { Config } from 'jest';

// Pruebas unitarias del backend (Parte 6, sección 7): servicios y utilidades con repositorios simulados
const config: Config = {
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  moduleNameMapper: { '^@autonota/shared$': '<rootDir>/../../packages/shared/src/index.ts' },
  collectCoverageFrom: ['src/modules/**/services/**/*.ts', 'src/common/**/*.ts'],
  coverageThreshold: { global: { lines: 80 } },
};

export default config;
