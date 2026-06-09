import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

// Replaces the __GW_BUILD_VERSION__ placeholder in dist/sw.js with the short
// git SHA at build time, so deploys auto-bust the SW cache without anyone
// remembering to edit a constant. Falls back to a timestamp if not in a git
// checkout (CI without full history, sandboxed builds, etc.).
function bumpSwVersion(): Plugin {
  return {
    name: 'gw-bump-sw-version',
    apply: 'build',
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist/sw.js');
      if (!existsSync(swPath)) return;
      let version: string;
      try {
        version = execSync('git rev-parse --short HEAD', { cwd: __dirname })
          .toString()
          .trim();
      } catch {
        version = `t${Date.now()}`;
      }
      const content = readFileSync(swPath, 'utf8');
      if (!content.includes('__GW_BUILD_VERSION__')) {
        console.warn('[bump-sw-version] placeholder not found — did sw.js change?');
        return;
      }
      writeFileSync(swPath, content.replace(/__GW_BUILD_VERSION__/g, version));
      console.log(`[bump-sw-version] sw.js CACHE_VERSION → ${version}`);
    },
  };
}

// Minimal config (rebuilt after originals were lost). Mirrors a standard
// Vite-React-Shadcn project: `@/` aliases to `./src/`.
export default defineConfig({
  plugins: [react(), bumpSwVersion()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 8080, host: '::' },
  build: { outDir: 'dist' },
});
