import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const shared = fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@autonota/shared': shared } },
  server: {
    port: 5173,
    // ADR-001: en desarrollo, el proxy de Vite cumple el papel del rewrite de Vercel
    proxy: { '/api': { target: 'http://localhost:3000', xfwd: true } },
  },
});
