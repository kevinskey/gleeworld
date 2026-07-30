// Provide a minimal Deno global shim so that edge-function files (which use
// Deno.env.get) can be imported by Vitest without modification. The shim
// delegates to process.env so tests can set env vars the normal Node way.

if (typeof globalThis.Deno === 'undefined') {
  (globalThis as any).Deno = {
    env: {
      get: (key: string): string | undefined => process.env[key],
    },
  };
}
