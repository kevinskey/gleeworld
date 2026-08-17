// Registry + kill switch for every live studio audio resource.
//
// Why this exists: leaving the Studio is supposed to tear down the MIDI
// subscription, the live-monitor voices, and the engine via React effect
// cleanups — and on 2026-08-17 that provably failed in production (the
// USB keyboard kept playing piano on the Command Center; muting the tab
// silenced it, and the Studio DOM was gone). One aborted cleanup batch is
// enough: React skips the remaining cleanups in the commit and whatever
// held the audio graph lives on with no handle left to reach it.
//
// So every studio audio owner registers a disposer here (LiveVoices and
// StudioEngine in their constructors, the MIDI subscription when it opens),
// and DashboardShell — which mounts on every route and does NOT depend on
// the Studio's own lifecycle — calls disposeAllStudioAudio() whenever the
// location is not a Studio session. Belt over the suspenders: on the happy
// path everything has already unregistered itself and this is a no-op over
// an empty set.
//
// Deliberately dependency-free (no Tone import): DashboardShell pulls this
// module into the shell chunk, and dragging Tone.js in with it would bloat
// the boot bundle the iPad watchdog cares about.

export interface StudioDisposable {
  dispose(): void;
}

const live = new Set<StudioDisposable>();

/** Track a disposable. Returns an unregister fn for the happy-path cleanup. */
export function registerStudioAudio(d: StudioDisposable): () => void {
  live.add(d);
  return () => { live.delete(d); };
}

/** How many resources are currently registered (for tests/diagnostics). */
export function liveStudioAudioCount(): number {
  return live.size;
}

/**
 * Dispose everything still registered. Safe to call at any time from any
 * route: a disposer must tolerate being called after its owner already
 * cleaned up (every implementer wraps teardown in try/catch today).
 */
export function disposeAllStudioAudio(): void {
  for (const d of [...live]) {
    live.delete(d);
    try { d.dispose(); } catch { /* already torn down */ }
  }
}
