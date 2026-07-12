// Unsaved-work registry: surfaces that "reloading right now loses data".
//
// Born from a real incident (2026-07-12): Kevin was recording in Studio when
// a lazy chunk fetch hit a transient network failure; BootErrorBoundary's
// stale-chunk path silently location.reload()ed and the in-flight take and
// pending edits vanished. Two consumers close that hole:
//  - while ANY holder is retained, a window beforeunload handler is armed so
//    every reload/close (including programmatic ones) shows the browser's
//    leave-confirmation instead of silently discarding work;
//  - BootErrorBoundary consults hasUnsavedWork() and refuses to auto-reload
//    while work is at stake.
//
// Usage: const release = retainUnsavedWork('studio-session'); … release();
// Release is idempotent. Holders are counted, not keyed — the label is for
// debugging only.

let holders = 0;

const onBeforeUnload = (e: BeforeUnloadEvent) => {
  e.preventDefault();
  // Chrome requires returnValue to be set for the confirmation to show.
  e.returnValue = '';
};

function arm() {
  window.addEventListener('beforeunload', onBeforeUnload);
}

function disarm() {
  window.removeEventListener('beforeunload', onBeforeUnload);
}

export function retainUnsavedWork(_label: string): () => void {
  holders += 1;
  if (holders === 1) arm();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holders -= 1;
    if (holders === 0) disarm();
  };
}

export function hasUnsavedWork(): boolean {
  return holders > 0;
}

export function __resetUnsavedWorkForTests(): void {
  holders = 0;
  disarm();
}
