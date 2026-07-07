// Master-chain convergence state machine, extracted from StudioEngine so
// the toggle/build interleavings are unit-testable (no Tone, no
// AudioContext — the async build fn is injected; masterChainSync.test.ts
// drives every interleaving deterministically).
//
// WHY THIS EXISTS (the fd2f223e8 race): the engine used to decide
// rebuild-vs-refresh by comparing the REQUESTED enabled state against
// handle-null-ness (`this.masterChainHandle !== null`). During the only
// async gap — an enable-build awaiting the AudioWorklet module load,
// handle still null — a disable request compared false === false →
// "already correct" → the build token was NOT bumped → the in-flight
// build resolved with a matching token and wired the chain into the live
// graph. Mastering audibly ON while the session said OFF, persisting
// until an unrelated setMastering call. Reachable in normal usage:
// useStudio.ts calls engine.setMastering on every skeleton-stable
// effect pass.
//
// THE INVARIANT NOW: `desiredEnabled` is recorded SYNCHRONOUSLY at the
// top of every sync() — before any async gap can open — and everything
// converges against IT, never against handle-null-ness:
//   • desired OFF  ⇒ installed chain disposed immediately; any in-flight
//     build superseded (token bumped) so its resolve discards + disposes
//     the freshly built chain instead of leaking worklet nodes.
//   • desired ON   ⇒ exactly one of: a chain installed, or one build in
//     flight carrying the current token. A resolve installs ONLY if its
//     token still matches AND desired is still enabled.
// Params edited during the gap are captured in `desiredParams` and
// pushed via refresh() the moment the chain lands.

import type { MasteringParams } from '../session';

export interface DisposableChain {
  dispose(): void;
}

export interface MasterChainSyncHooks<H extends DisposableChain> {
  /** Async chain construction (AudioWorklet module load). */
  build(params: MasteringParams): Promise<H>;
  /** A freshly built, still-desired chain was stored on `handle` — wire
   * it into the live graph (and emit). */
  install(handle: H): void;
  /** The installed chain was just disposed and `handle` cleared — wire
   * the bypass topology (and emit). */
  uninstall(): void;
  /** Already converged — push (debounced) param updates to the live
   * chain. Also fired right after install() when params were edited
   * during the build gap. */
  refresh(params: MasteringParams): void;
  onBuildError?(err: unknown): void;
}

export class MasterChainSync<H extends DisposableChain> {
  /** The state the SESSION wants, recorded synchronously on every
   * sync() — the single source of truth every async resolve checks. */
  private desiredEnabled = false;
  private desiredParams: MasteringParams | undefined;
  /** Monotonic guard: a resolve whose token no longer matches was
   * superseded (disable, re-enable, or dispose) and must discard. */
  private token = 0;
  /** Token of the in-flight build, or null. "A build is converging
   * toward the current desired state" ⇔ pendingToken === token. */
  private pendingToken: number | null = null;
  private installed: H | null = null;

  constructor(private readonly hooks: MasterChainSyncHooks<H>) {}

  get handle(): H | null {
    return this.installed;
  }

  /** Converge the live chain toward `mastering`. Idempotent and cheap
   * when already converged (a debounced param refresh at most); an
   * actual divergence disposes/builds as needed. `undefined` (legacy
   * pre-B1 session) means disabled. */
  sync(mastering: MasteringParams | undefined): void {
    const enabled = !!mastering?.enabled;
    // Record desired state FIRST — synchronously, before any gap.
    this.desiredEnabled = enabled;
    this.desiredParams = enabled ? mastering : undefined;

    if (!enabled) {
      // Supersede any in-flight enable-build: its resolve must discard.
      if (this.pendingToken === this.token) this.token++;
      this.pendingToken = null;
      if (this.installed) {
        const stale = this.installed;
        this.installed = null;
        stale.dispose();
        this.hooks.uninstall();
      }
      return;
    }

    if (this.installed) {
      // Converged — live param refresh only, never a rebuild.
      this.hooks.refresh(mastering!);
      return;
    }

    if (this.pendingToken === this.token) {
      // A build toward this same desired state is already in flight;
      // the newest params were captured above and refresh() fires on
      // install. Kicking a second build here would leak the first.
      return;
    }

    const token = ++this.token;
    this.pendingToken = token;
    this.hooks.build(mastering!).then(
      (handle) => {
        // Install ONLY if this build is still the current one AND the
        // desired state is still enabled (belt and suspenders — any
        // disable also bumps the token). Otherwise dispose immediately:
        // a superseded chain must not leak its worklet nodes.
        if (token !== this.token || !this.desiredEnabled) {
          handle.dispose();
          return;
        }
        this.pendingToken = null;
        this.installed = handle;
        this.hooks.install(handle);
        // Params may have been edited during the async gap — converge.
        if (this.desiredParams) this.hooks.refresh(this.desiredParams);
      },
      (err) => {
        if (this.pendingToken === token) this.pendingToken = null;
        this.hooks.onBuildError?.(err);
        // desiredEnabled stays true: the next sync() retries the build.
      },
    );
  }

  /** Engine teardown — supersede any in-flight build and dispose the
   * installed chain WITHOUT rewiring (the whole graph is going away,
   * so no uninstall() hook fires). */
  dispose(): void {
    this.token++;
    this.pendingToken = null;
    this.desiredEnabled = false;
    this.desiredParams = undefined;
    if (this.installed) {
      this.installed.dispose();
      this.installed = null;
    }
  }
}
