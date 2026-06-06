import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Minimal config (rebuilt after originals were lost). Mirrors a standard
// Vite-React-Shadcn project: `@/` aliases to `./src/`.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 8080, host: '::' },
  build: { outDir: 'dist' },
});
