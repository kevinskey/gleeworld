// Opt-in helper for tests that need a real (fake) IndexedDB under jsdom.
// Import this instead of 'fake-indexeddb/auto' directly so the Blob fixup
// below travels with it. Deliberately NOT wired into the shared
// vitest.setup.ts: that file runs for all ~100+ jsdom test files, and
// reassigning globalThis.Blob there would be a blast-radius footgun —
// jsdom's File.prototype still chains to the ORIGINAL Blob.prototype, so
// any future `x instanceof Blob` check elsewhere would silently start
// failing. Scoping it to this file means only suites that explicitly need
// fake-indexeddb pay for it.
import 'fake-indexeddb/auto';

import { Blob as NodeBlob } from 'node:buffer';

// jsdom's Blob (this project is pinned to jsdom 20) is not the same
// constructor Node's native structuredClone() special-cases, so cloning a
// jsdom Blob through IndexedDB (fake-indexeddb uses structuredClone under
// the hood) silently degrades it to a plain object — the clone loses
// .text()/.arrayBuffer()/etc, with no error. Swapping in Node's own Blob
// for jsdom-environment tests makes Blob round-trip correctly through
// fake-indexeddb, matching real-browser IndexedDB behavior. See
// https://github.com/jsdom/jsdom/issues/3363 and the fake-indexeddb README
// "jsdom" section. No-op under the default node test environment, where
// globalThis.Blob already is Node's Blob.
if (typeof window !== 'undefined') {
  (globalThis as unknown as { Blob: typeof Blob }).Blob = NodeBlob as unknown as typeof Blob;
}
