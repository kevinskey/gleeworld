// MasterChainSync — regression suite for the mastering-toggle race
// (review-confirmed on fd2f223e8): the engine used to decide whether to
// rebuild by comparing the REQUESTED enabled state against
// handle-null-ness. During the only async gap (enable-build awaiting the
// AudioWorklet module load, handle still null) a disable request compared
// false === false → "already correct" → token NOT bumped → the in-flight
// build resolved with a matching token and wired the chain into the live
// graph: mastering audibly ON while the session said OFF.
//
// Hermetic — no Tone, no AudioContext (matching trackEq.test.ts /
// masterChain.test.ts policy): the async build fn is injected, so every
// interleaving is driven deterministically with manual deferreds.

import { describe, it, expect, vi } from 'vitest';
import { MasterChainSync } from './masterChainSync';
import { DEFAULT_MASTERING, type MasteringParams } from '../session';

const ON: MasteringParams = { ...DEFAULT_MASTERING, enabled: true };
const OFF: MasteringParams = { ...DEFAULT_MASTERING, enabled: false };

interface FakeHandle { id: number; dispose: ReturnType<typeof vi.fn> }

function makeHarness() {
  let nextId = 1;
  const pending: Array<{
    params: MasteringParams;
    resolve: (h: FakeHandle) => void;
    reject: (e: unknown) => void;
    handle: FakeHandle;
  }> = [];
  const install = vi.fn<(h: FakeHandle) => void>();
  const uninstall = vi.fn<() => void>();
  const refresh = vi.fn<(p: MasteringParams) => void>();
  const onBuildError = vi.fn<(e: unknown) => void>();
  const sync = new MasterChainSync<FakeHandle>({
    build: (params) =>
      new Promise<FakeHandle>((resolve, reject) => {
        pending.push({ params, resolve, reject, handle: { id: nextId++, dispose: vi.fn() } });
      }),
    install,
    uninstall,
    refresh,
    onBuildError,
  });
  // Let the .then continuation run after a deferred settles.
  const flush = () => new Promise<void>((r) => setTimeout(r, 0));
  return { sync, pending, install, uninstall, refresh, onBuildError, flush };
}

describe('MasterChainSync — the confirmed race', () => {
  it('enable → (build pending) → disable → build resolves ⇒ NO chain installed, resolved build disposed', async () => {
    const h = makeHarness();

    h.sync.sync(ON);                       // kicks async build
    expect(h.pending).toHaveLength(1);
    expect(h.sync.handle).toBeNull();      // still building — the async gap

    h.sync.sync(OFF);                      // disable lands INSIDE the gap

    h.pending[0].resolve(h.pending[0].handle);
    await h.flush();

    // The bug: this handle used to get installed (token never bumped).
    expect(h.install).not.toHaveBeenCalled();
    expect(h.sync.handle).toBeNull();
    // And it must not leak worklet nodes — the superseded build is disposed.
    expect(h.pending[0].handle.dispose).toHaveBeenCalledTimes(1);
  });

  it('disable during the gap wins even when the session write repeats the same OFF state afterwards', async () => {
    // Mirrors useStudio.ts calling engine.setMastering on EVERY
    // skeleton-stable effect pass: the redundant OFF writes must not
    // re-arm anything, and the stale build must still be discarded.
    const h = makeHarness();
    h.sync.sync(ON);
    h.sync.sync(OFF);
    h.sync.sync(OFF);
    h.sync.sync(OFF);
    h.pending[0].resolve(h.pending[0].handle);
    await h.flush();
    expect(h.install).not.toHaveBeenCalled();
    expect(h.sync.handle).toBeNull();
    expect(h.pending[0].handle.dispose).toHaveBeenCalledTimes(1);
    expect(h.pending).toHaveLength(1); // no phantom rebuilds from the repeats
  });

  it('rapid enable → disable → enable ⇒ exactly one final installed chain (the newest build)', async () => {
    const h = makeHarness();

    h.sync.sync(ON);   // build #1
    h.sync.sync(OFF);  // supersedes build #1
    h.sync.sync(ON);   // build #2
    expect(h.pending).toHaveLength(2);

    // Resolve out of order too — #1 late is the nastier interleaving.
    h.pending[1].resolve(h.pending[1].handle);
    await h.flush();
    h.pending[0].resolve(h.pending[0].handle);
    await h.flush();

    expect(h.install).toHaveBeenCalledTimes(1);
    expect(h.install).toHaveBeenCalledWith(h.pending[1].handle);
    expect(h.sync.handle).toBe(h.pending[1].handle);
    expect(h.pending[0].handle.dispose).toHaveBeenCalledTimes(1); // stale build disposed
    expect(h.pending[1].handle.dispose).not.toHaveBeenCalled();   // live chain untouched
  });

  it('dispose() during an in-flight build ⇒ resolved handle disposed, nothing installed', async () => {
    const h = makeHarness();
    h.sync.sync(ON);
    h.sync.dispose();                       // engine teardown mid-build
    h.pending[0].resolve(h.pending[0].handle);
    await h.flush();
    expect(h.install).not.toHaveBeenCalled();
    expect(h.sync.handle).toBeNull();
    expect(h.pending[0].handle.dispose).toHaveBeenCalledTimes(1);
  });
});

describe('MasterChainSync — steady-state convergence', () => {
  it('enable → build resolves ⇒ installed exactly once', async () => {
    const h = makeHarness();
    h.sync.sync(ON);
    h.pending[0].resolve(h.pending[0].handle);
    await h.flush();
    expect(h.install).toHaveBeenCalledTimes(1);
    expect(h.sync.handle).toBe(h.pending[0].handle);
    expect(h.pending[0].handle.dispose).not.toHaveBeenCalled();
  });

  it('disable while installed ⇒ chain disposed + uninstall fired (bypass rewire)', async () => {
    const h = makeHarness();
    h.sync.sync(ON);
    h.pending[0].resolve(h.pending[0].handle);
    await h.flush();

    h.sync.sync(OFF);
    expect(h.sync.handle).toBeNull();
    expect(h.pending[0].handle.dispose).toHaveBeenCalledTimes(1);
    expect(h.uninstall).toHaveBeenCalledTimes(1);
  });

  it('param edit while installed ⇒ refresh only, no rebuild', async () => {
    const h = makeHarness();
    h.sync.sync(ON);
    h.pending[0].resolve(h.pending[0].handle);
    await h.flush();

    const edited: MasteringParams = { ...ON, hpf_hz: 120 };
    h.sync.sync(edited);
    expect(h.pending).toHaveLength(1);               // no second build
    expect(h.refresh).toHaveBeenLastCalledWith(edited);
    expect(h.sync.handle).toBe(h.pending[0].handle); // same live chain
  });

  it('enable repeated while a build is already pending ⇒ no duplicate build; newest params refresh on install', async () => {
    const h = makeHarness();
    h.sync.sync(ON);
    const edited: MasteringParams = { ...ON, hpf_hz: 90 };
    h.sync.sync(edited);                 // still enabled, build in flight
    expect(h.pending).toHaveLength(1);   // NOT a second build

    h.pending[0].resolve(h.pending[0].handle);
    await h.flush();
    expect(h.install).toHaveBeenCalledTimes(1);
    // The mid-gap edit converges via refresh once the chain lands.
    expect(h.refresh).toHaveBeenCalledWith(edited);
  });

  it('undefined mastering (legacy pre-B1 session) is disabled: tears down an installed chain, no-ops when off', async () => {
    const h = makeHarness();
    h.sync.sync(undefined);
    expect(h.pending).toHaveLength(0);
    expect(h.uninstall).not.toHaveBeenCalled();

    h.sync.sync(ON);
    h.pending[0].resolve(h.pending[0].handle);
    await h.flush();
    h.sync.sync(undefined);
    expect(h.sync.handle).toBeNull();
    expect(h.pending[0].handle.dispose).toHaveBeenCalledTimes(1);
  });

  it('build failure reports the error, leaves no chain, and a later enable retries', async () => {
    const h = makeHarness();
    h.sync.sync(ON);
    const boom = new Error('worklet fetch failed');
    h.pending[0].reject(boom);
    await h.flush();
    expect(h.onBuildError).toHaveBeenCalledWith(boom);
    expect(h.sync.handle).toBeNull();

    h.sync.sync(ON);                     // converge again — must retry
    expect(h.pending).toHaveLength(2);
    h.pending[1].resolve(h.pending[1].handle);
    await h.flush();
    expect(h.sync.handle).toBe(h.pending[1].handle);
  });
});
