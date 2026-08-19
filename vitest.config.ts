import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Allow Vitest (Node) to import edge-function files that use Deno's npm: specifier.
      'npm:jose@5': 'jose',
    },
  },
  test: {
    globals: true,
    environment: 'node',
    // Two setup files, both load-bearing: the root one shims Deno globals so
    // edge-function sources import under Node; src/test adds the Node-25
    // localStorage shim (Node 25 ships a built-in localStorage that isn't a
    // real Storage, so localStorage.setItem throws). Merging main into this
    // branch brought main's vitest.config.ts, which took precedence over the
    // test block in vite.config.ts where the second shim used to be wired —
    // that silently dropped it and failed ~118 storage-touching tests.
    setupFiles: ['./vitest.setup.ts', './src/test/vitest.setup.ts'],
    // e2e/ holds Playwright specs. Vitest was collecting them, and calling
    // Playwright's test.describe() outside a Playwright runner throws
    // "Playwright Test did not expect test.describe() to be called here",
    // which surfaced as unhandled rejections and two failing suites.
    // Playwright runs them via its own config; vitest must not.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.claude/worktrees/**',
      'e2e/**',
    ],
  },
});
