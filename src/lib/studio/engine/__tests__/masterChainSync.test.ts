import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MasterChainSync, type MasterChainSyncHooks, type DisposableChain } from '../masterChainSync';
import type { MasteringParams } from '../../session';

// Test double: a chain that records dispose calls so we can assert
// worklet-node leaks would be caught in real life.
class FakeChain implements DisposableChain {
  disposed = false;
  constructor(public readonly id: number) {}
  dispose(): void {
    this.disposed = true;
  }
}

/** Test harness: injectable build that queues resolvers so overlapping
 * builds each resolve independently (matches the fd2f223e8 scenario). */
function makeHarness() {
  const built: FakeChain[] = [];
  const pending: Array<{ resolve: (c: FakeChain) => void; reject: (e: unknown) => void }> = [];

  const hooks: MasterChainSyncHooks<FakeChain> = {
    build: vi.fn((_params: MasteringParams) => {
      return new Promise<FakeChain>((res, rej) => { pending.push({ resolve: res, reject: rej }); });
    }),
    install: vi.fn(),
    uninstall: vi.fn(),
    refresh: vi.fn(),
    onBuildError: vi.fn(),
  };

  const sync = new MasterChainSync(hooks);
  return {
    sync,
    hooks,
    built,
    /** Resolve the OLDEST in-flight build (FIFO). */
    resolveWith(id: number): Promise<void> {
      const p = pending.shift();
      if (!p) throw new Error(`resolveWith(${id}) with no pending build`);
      const chain = new FakeChain(id);
      built.push(chain);
      p.resolve(chain);
      return Promise.resolve().then(() => Promise.resolve());
    },
    rejectWith(err: unknown): Promise<void> {
      const p = pending.shift();
      if (!p) throw new Error('rejectWith with no pending build');
      p.reject(err);
      return Promise.resolve().then(() => Promise.resolve());
    },
  };
}

const enabledParams = (n = 0): MasteringParams => ({
  enabled: true,
  hpf_hz: 30 + n,
  air_gain_db: 0,
  comp: { threshold_db: -18, ratio: 4, attack_ms: 10, release_ms: 100 },
  limiter: { ceiling_db: -1, release_ms: 200 },
  loudness_target_lufs: -14,
});

const disabledParams: MasteringParams = { ...enabledParams(), enabled: false };

describe('MasterChainSync', () => {
  beforeEach(() => vi.clearAllMocks());

  it('bypasses when disabled from the start (no build, no install)', () => {
    const h = makeHarness();
    h.sync.sync(disabledParams);
    expect(h.hooks.build).not.toHaveBeenCalled();
    expect(h.hooks.install).not.toHaveBeenCalled();
    expect(h.hooks.uninstall).not.toHaveBeenCalled();
    expect(h.sync.handle).toBeNull();
  });

  it('enable → build resolves → install fires once', async () => {
    const h = makeHarness();
    h.sync.sync(enabledParams());
    expect(h.hooks.build).toHaveBeenCalledTimes(1);
    await h.resolveWith(1);
    expect(h.hooks.install).toHaveBeenCalledTimes(1);
    expect(h.hooks.install).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(h.sync.handle).not.toBeNull();
  });

  it('disable while a build is in flight discards the resolved chain (fd2f223e8 race)', async () => {
    // This is the exact incident MasterChainSync was extracted to fix.
    // The build races the AudioWorklet module load. Disabling before it
    // resolves must ensure the resolved chain is disposed, NOT installed.
    const h = makeHarness();
    h.sync.sync(enabledParams());           // enable → build starts
    h.sync.sync(disabledParams);            // disable BEFORE resolve
    expect(h.hooks.uninstall).not.toHaveBeenCalled(); // nothing installed yet
    await h.resolveWith(1);
    expect(h.hooks.install).not.toHaveBeenCalled();   // must NOT install
    expect(h.built[0].disposed).toBe(true);           // must dispose the leaked chain
    expect(h.sync.handle).toBeNull();
  });

  it('re-enable after a superseded build starts a fresh build', async () => {
    const h = makeHarness();
    h.sync.sync(enabledParams(1));   // build A
    h.sync.sync(disabledParams);     // supersede
    h.sync.sync(enabledParams(2));   // build B
    expect(h.hooks.build).toHaveBeenCalledTimes(2);
    await h.resolveWith(1);          // A resolves — must be discarded
    expect(h.built[0].disposed).toBe(true);
    expect(h.hooks.install).not.toHaveBeenCalled();
    await h.resolveWith(2);          // B resolves — this one installs
    expect(h.hooks.install).toHaveBeenCalledTimes(1);
    expect(h.hooks.install).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
  });

  it('a second enable while a build is in flight does NOT start a duplicate build', () => {
    const h = makeHarness();
    h.sync.sync(enabledParams(1));
    h.sync.sync(enabledParams(2));   // same desired-enabled, params updated
    h.sync.sync(enabledParams(3));   // still enabled, params updated again
    expect(h.hooks.build).toHaveBeenCalledTimes(1);   // only one build in flight
  });

  it('params edited during the build gap converge on install via refresh()', async () => {
    const h = makeHarness();
    h.sync.sync(enabledParams(1));           // build with params v1
    h.sync.sync(enabledParams(99));          // desired now v99 (no new build)
    await h.resolveWith(1);
    expect(h.hooks.install).toHaveBeenCalledTimes(1);
    // refresh() should fire immediately after install with the LATEST params.
    expect(h.hooks.refresh).toHaveBeenCalledTimes(1);
    expect(h.hooks.refresh).toHaveBeenCalledWith(expect.objectContaining({ hpf_hz: 30 + 99 }));
  });

  it('sync() while installed is a live refresh, never a rebuild', async () => {
    const h = makeHarness();
    h.sync.sync(enabledParams(1));
    await h.resolveWith(1);
    (h.hooks.build as ReturnType<typeof vi.fn>).mockClear();
    (h.hooks.refresh as ReturnType<typeof vi.fn>).mockClear();
    h.sync.sync(enabledParams(2));
    expect(h.hooks.build).not.toHaveBeenCalled();
    expect(h.hooks.refresh).toHaveBeenCalledTimes(1);
    expect(h.hooks.refresh).toHaveBeenCalledWith(expect.objectContaining({ hpf_hz: 30 + 2 }));
  });

  it('disable while installed disposes and uninstalls exactly once', () => {
    const h = makeHarness();
    h.sync.sync(enabledParams());
    // Resolve inline via microtask sim isn't needed — we test the installed path directly.
    // Simulate an already-installed chain by calling sync + resolve first.
    // (Delegate to the actual sync path.)
    return h.resolveWith(1).then(() => {
      const chain = h.built[0];
      h.sync.sync(disabledParams);
      expect(chain.disposed).toBe(true);
      expect(h.hooks.uninstall).toHaveBeenCalledTimes(1);
      expect(h.sync.handle).toBeNull();
    });
  });

  it('build error clears pending state without installing', async () => {
    const h = makeHarness();
    h.sync.sync(enabledParams());
    await h.rejectWith(new Error('worklet load failed'));
    expect(h.hooks.install).not.toHaveBeenCalled();
    expect(h.hooks.onBuildError).toHaveBeenCalledTimes(1);
    expect(h.sync.handle).toBeNull();
    // The next sync() must be able to try again.
    h.sync.sync(enabledParams());
    expect(h.hooks.build).toHaveBeenCalledTimes(2);
  });

  it('dispose() supersedes any in-flight build and disposes the installed chain silently', async () => {
    const h = makeHarness();
    h.sync.sync(enabledParams());
    await h.resolveWith(1);
    h.sync.sync(enabledParams(2));     // params update — no rebuild
    h.sync.sync(enabledParams(3));     // still enabled
    // Now dispose.
    h.sync.dispose();
    expect(h.built[0].disposed).toBe(true);
    // Uninstall hook must NOT fire — the graph is going away, not switching topology.
    expect(h.hooks.uninstall).not.toHaveBeenCalled();
    expect(h.sync.handle).toBeNull();
  });

  it('dispose() while a build is pending discards the resolved chain', async () => {
    const h = makeHarness();
    h.sync.sync(enabledParams());
    h.sync.dispose();
    await h.resolveWith(1);
    expect(h.built[0].disposed).toBe(true);
    expect(h.hooks.install).not.toHaveBeenCalled();
  });
});
