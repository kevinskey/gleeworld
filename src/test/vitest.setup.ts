// Node ≥25 ships built-in `localStorage`/`sessionStorage` globals that,
// when Node has no --localstorage-file path, are method-less stub objects.
// They shadow jsdom's real Storage inside vitest (the global wins over the
// jsdom window), so calls like localStorage.removeItem() throw. Replace any
// broken storage global with a working in-memory Storage implementation.
// Running node with --no-experimental-webstorage also fixes it, but this
// shim keeps tests green regardless of Node version or flags.
function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() { return store.size; },
    clear: () => { store.clear(); },
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    removeItem: (k: string) => { store.delete(k); },
    setItem: (k: string, v: string) => { store.set(String(k), String(v)); },
  } as Storage;
}

// In DOM (jsdom) tests, swap the stub for a working shim. In node-env
// tests, remove it entirely — pre-Node-25 there was no localStorage global
// there, and tests assert the "storage unavailable" fallback paths.
const isDom = typeof document !== 'undefined';
for (const key of ['localStorage', 'sessionStorage'] as const) {
  const cur = (globalThis as Record<string, unknown>)[key] as Storage | undefined;
  if (cur && typeof cur.removeItem !== 'function') {
    Object.defineProperty(globalThis, key, {
      value: isDom ? memoryStorage() : undefined,
      writable: true,
      configurable: true,
    });
  }
}
