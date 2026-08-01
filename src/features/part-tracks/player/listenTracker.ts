// Accumulates practice seconds and flushes them in batches. Pure timer
// logic — the caller supplies the flush side effect (a supabase insert)
// and must never let it throw into playback.

export interface ListenBatch {
  partRole: string | null;
  tempoPct: number;
  seconds: number;
}

interface Options {
  flush: (batch: ListenBatch) => void;
  flushIntervalMs?: number;
  now?: () => number;
}

export interface ListenTracker {
  start: (partRole: string | null, tempoPct: number) => void;
  stop: () => void;
  setContext: (partRole: string | null, tempoPct: number) => void;
  dispose: () => void;
}

export function createListenTracker({ flush, flushIntervalMs = 30000, now = () => Date.now() }: Options): ListenTracker {
  let running = false;
  let spanStart = 0;
  let partRole: string | null = null;
  let tempoPct = 100;
  let timer: ReturnType<typeof setInterval> | null = null;

  const flushSpan = () => {
    if (!running) return;
    const seconds = Math.round((now() - spanStart) / 1000);
    if (seconds > 0) flush({ partRole, tempoPct, seconds });
    spanStart = now();
  };

  const clearTimerIfAny = () => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  return {
    start(role, tempo) {
      if (running) flushSpan();
      running = true;
      partRole = role;
      tempoPct = tempo;
      spanStart = now();
      clearTimerIfAny();
      timer = setInterval(flushSpan, flushIntervalMs);
    },
    stop() {
      if (!running) return;
      flushSpan();
      running = false;
      clearTimerIfAny();
    },
    setContext(role, tempo) {
      if (running) flushSpan();
      partRole = role;
      tempoPct = tempo;
    },
    dispose() {
      if (running) {
        flushSpan();
        running = false;
      }
      clearTimerIfAny();
    },
  };
}
