// Debounced autosave for the Documents word processor.
//
// `createAutosaver` is a pure factory (no React) so it's trivially testable
// with fake timers — see useDocAutosave.test.ts. `useDocAutosave` is the
// thin React wrapper that also holds `unsavedWork` retention while a save
// is pending/in-flight/erroring, and releases it once clean.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { retainUnsavedWork } from '@/lib/unsavedWork';

export type AutosaveStatus = 'saving' | 'saved' | 'error';

export interface Autosaver<T> {
  schedule: (patch: Partial<T>) => void;
  flush: () => Promise<void>;
  /** True while there's unsaved work: a patch queued, or a save in flight. */
  hasPending: () => boolean;
}

const BACKOFF_START_MS = 4000;
const BACKOFF_MAX_MS = 16000;

/**
 * Pending-patch merge on schedule, single timer, statuses via optional
 * callback, backoff 4s -> 8s -> 16s (capped) on failure, flush() for
 * blur/unmount.
 */
export function createAutosaver<T extends object>(
  save: (patch: T) => Promise<void>,
  delayMs: number,
  onStatus?: (status: AutosaveStatus) => void,
): Autosaver<T> {
  let pending: Partial<T> | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let backoffMs = 0;
  // Tracks the currently-running save so `flush()` (and a stray timer that
  // fires while a save is already underway) awaits/reuses that SAME
  // promise instead of firing a second, overlapping `save()` call — two
  // concurrent saves could resolve out of order and let a stale write land
  // last. `attempt()` is the only writer of this variable.
  let inFlight: Promise<void> | null = null;

  function clearTimer(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function hasPending(): boolean {
    return pending !== null || inFlight !== null;
  }

  // Runs the actual save for `patch`. `inFlight` is cleared BEFORE emitting
  // the terminal status ('saved'/'error') so a status listener that checks
  // `hasPending()` synchronously from inside that callback sees the correct
  // in-flight state (not "still in flight" because we haven't gotten
  // around to clearing it yet).
  async function runAttempt(patch: Partial<T>): Promise<void> {
    try {
      await save(patch as T);
      inFlight = null;
      backoffMs = 0;
      onStatus?.('saved');
    } catch {
      // Newer edits (scheduled while the failed save was in flight) win
      // over the stale failed patch for any overlapping keys.
      pending = { ...patch, ...(pending ?? {}) };
      inFlight = null;
      onStatus?.('error');
      backoffMs = backoffMs === 0 ? BACKOFF_START_MS : Math.min(backoffMs * 2, BACKOFF_MAX_MS);
      clearTimer();
      timer = setTimeout(() => { void attempt(); }, backoffMs);
    }
  }

  function attempt(): Promise<void> {
    if (inFlight) return inFlight; // already running — reuse, don't overlap
    if (pending === null) return Promise.resolve();
    const patch = pending;
    pending = null;
    onStatus?.('saving');
    inFlight = runAttempt(patch);
    return inFlight;
  }

  function schedule(patch: Partial<T>): void {
    pending = { ...(pending ?? {}), ...patch };
    backoffMs = 0; // fresh edits cancel any pending backoff retry
    clearTimer();
    timer = setTimeout(() => { void attempt(); }, delayMs);
  }

  function flush(): Promise<void> {
    clearTimer();
    return attempt();
  }

  return { schedule, flush, hasPending };
}

/**
 * React wrapper around `createAutosaver`: retains `unsavedWork` while dirty
 * (a patch is pending, saving, or erroring — `hasPending()`) and releases it
 * once a save lands clean AND nothing new is queued. Release is idempotent,
 * so overlapping retain/unmount races are harmless.
 */
export function useDocAutosave<T extends object>(
  save: (patch: T) => Promise<void>,
  delayMs = 2000,
): { schedule: (patch: Partial<T>) => void; flush: () => Promise<void>; status: AutosaveStatus | 'idle' } {
  const [status, setStatus] = useState<AutosaveStatus | 'idle'>('idle');
  const releaseRef = useRef<(() => void) | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;
  // Guards setStatus after unmount: React 18 doesn't error on this, but the
  // final flush() kicked off from the unmount cleanup can still be pending
  // when it settles well after the component is gone.
  const mountedRef = useRef(true);

  const autosaverRef = useRef<Autosaver<T> | null>(null);
  if (!autosaverRef.current) {
    autosaverRef.current = createAutosaver<T>(
      (patch) => saveRef.current(patch),
      delayMs,
      (s) => {
        if (!mountedRef.current) return;
        setStatus(s);
        if (s === 'saved' && !autosaverRef.current?.hasPending()) {
          releaseRef.current?.();
          releaseRef.current = null;
        }
      },
    );
  }

  const retain = useCallback(() => {
    if (!releaseRef.current) releaseRef.current = retainUnsavedWork('personal-doc');
  }, []);

  const schedule = useCallback((patch: Partial<T>) => {
    retain();
    autosaverRef.current!.schedule(patch);
  }, [retain]);

  const flush = useCallback(() => autosaverRef.current!.flush(), []);

  // `flush` above is already a stable useCallback, but the unmount effect
  // reads it via a ref anyway (rather than depending on it directly) so
  // this effect's own deps stay `[]` — registering the unmount handler
  // exactly once, instead of on every render, is the whole point: an
  // effect with an unstable dependency re-fires its cleanup on every
  // render it doesn't actually need to (see: the bug this replaced, where
  // the caller had `useEffect(() => () => flush(), [autosaver])` against a
  // freshly-object-literal'd `autosaver` and ended up flushing per
  // keystroke).
  const flushRef = useRef(flush);
  flushRef.current = flush;

  useEffect(() => () => {
    mountedRef.current = false;
    // Release only after the final flush settles — releasing first would
    // let a reload race the in-flight save and lose it.
    void flushRef.current().finally(() => {
      releaseRef.current?.();
      releaseRef.current = null;
    });
  }, []);

  // Stable identity across renders that don't actually change schedule,
  // flush, or status — so callers can safely use the returned object as a
  // dependency without it forcing per-render churn.
  return useMemo(() => ({ schedule, flush, status }), [schedule, flush, status]);
}
