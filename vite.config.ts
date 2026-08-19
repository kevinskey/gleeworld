import { type Plugin } from 'vite';
import { defineConfig, configDefaults } from 'vitest/config';
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
  test: {
    // Parallel Claude sessions keep git worktrees under .claude/worktrees;
    // without this vitest runs every copy of the suite it finds there.
    exclude: [...configDefaults.exclude, '**/.claude/**'],
    setupFiles: ['./src/test/vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 8080,
    host: '::',
    proxy: {
      // Dev-only: forward the Apple Music developer-token endpoint to the
      // live demo tenant so the companion harness can exercise search.
      '/apple-music': {
        target: 'https://demo.gleeworld.org',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  // Vite's default worker format is IIFE, which can't load ES module workers
  // like pdfjs 5's pdf.worker.mjs — the worker silently fails to initialize
  // and pdfjs hangs on getDocument forever. Forcing 'es' fixes the score
  // viewer on every platform (desktop browsers + Capacitor WKWebView).
  worker: { format: 'es' },
  build: {
    outDir: 'dist',
    // Code-split heavy libs that aren't on the critical render path.
    // Rule of thumb: split libs that are big, only used by a subset of
    // routes, and don't have an init-order dependency on React's module.
    //
    // DO NOT split react / react-dom / radix / shadcn — that's been
    // tried; chunks that consume React initialize before React's own
    // module runs and you get "useState is undefined" white screens.
    //
    // Splits below cut the main `index.js` from ~8.8 MB to ~3–4 MB so
    // first paint on slow networks/iPads finishes inside the 20s
    // boot watchdog. Browsers fetch chunks in parallel after they hit
    // the dynamic import, so the user only pays the cost when they
    // actually open the relevant feature.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // Already in place — multi-MB WASM packages.
          if (id.includes('verovio')) return 'verovio';
          if (id.includes('heic2any')) return 'heic2any';
          // PDF rendering — viewer + sight-singing PDF export. ~1MB.
          if (id.includes('pdfjs-dist')) return 'pdfjs';
          if (id.includes('@react-pdf-viewer')) return 'pdf-viewer';
          // PDF generation — sight-singing save-to-library.
          if (id.includes('jspdf') || id.includes('pdf-lib')) return 'pdf-tools';
          // Canvas raster used by the save flow + some annotation paths.
          if (id.includes('html2canvas')) return 'html2canvas';
          // Score rendering — sight-singing studio. ~700KB.
          if (id.includes('opensheetmusicdisplay')) return 'osmd';
          // Studio audio — Tone.js graph + scheduler. ~400KB.
          if (id.includes('/tone/') || id.endsWith('/tone')) return 'tone';
          // Charts (analytics). Only used on a couple of pages.
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          // Markdown / prose libs — only the rich text editor uses these.
          if (id.includes('react-markdown') || id.includes('remark-') || id.includes('rehype-')) return 'markdown';
          // Date pickers + calendar libs — only Calendar route needs the full set.
          if (id.includes('date-fns/locale')) return 'date-locale';
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
});
