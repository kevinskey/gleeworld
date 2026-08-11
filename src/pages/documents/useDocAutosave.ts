// Debounced autosave for the Documents word processor.
//
// `createAutosaver` is a pure factory (no React) so it's trivially testable
// with fake timers — see useDocAutosave.test.ts. `useDocAutosave` is the
// thin React wrapper that also holds `unsavedWork` retention while a save
// is pending/in-flight/erroring, and releases it once clean.
import { useCallback, useEffect, useRef, useState } from 'react';
import { retainUnsavedWork } from '@/lib/unsavedWork';

export type AutosaveStatus = 'saving' | 'saved' | 'error';

export interface Autosaver<T> {
  schedule: (patch: Partial<T>) => void;
  flush: () => Promise<void>;
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

  function clearTimer(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  async function attempt(): Promise<void> {
    if (pending === null) return;
    const patch = pending;
    pending = null;
    onStatus?.('saving');
    try {
      await save(patch as T);
      backoffMs = 0;
      onStatus?.('saved');
    } catch {
      // Newer edits (scheduled while the failed save was in flight) win
      // over the stale failed patch for any overlapping keys.
      pending = { ...patch, ...(pending ?? {}) };
      onStatus?.('error');
      backoffMs = backoffMs === 0 ? BACKOFF_START_MS : Math.min(backoffMs * 2, BACKOFF_MAX_MS);
      clearTimer();
      timer = setTimeout(() => { void attempt(); }, backoffMs);
    }
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

  return { schedule, flush };
}

/**
 * React wrapper around `createAutosaver`: retains `unsavedWork` while dirty
 * (a patch is pending, saving, or erroring) and releases it as soon as a
 * save lands clean. Release is idempotent, so overlapping retain/unmount
 * races are harmless.
 */
export function useDocAutosave<T extends object>(
  save: (patch: T) => Promise<void>,
  delayMs = 2000,
): { schedule: (patch: Partial<T>) => void; flush: () => Promise<void>; status: AutosaveStatus | 'idle' } {
  const [status, setStatus] = useState<AutosaveStatus | 'idle'>('idle');
  const releaseRef = useRef<(() => void) | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  const autosaverRef = useRef<Autosaver<T> | null>(null);
  if (!autosaverRef.current) {
    autosaverRef.current = createAutosaver<T>(
      (patch) => saveRef.current(patch),
      delayMs,
      (s) => {
        setStatus(s);
        if (s === 'saved') {
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

  // Release on unmount too — flush() (called explicitly by the page on
  // blur/unmount) settles the save itself; this is the belt-and-suspenders
  // release so a stray retain never outlives the component.
  useEffect(() => () => {
    releaseRef.current?.();
    releaseRef.current = null;
  }, []);

  return { schedule, flush, status };
}
