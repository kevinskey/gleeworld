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
    setupFiles: ['./vitest.setup.ts'],
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
