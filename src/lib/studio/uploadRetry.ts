// Retry-with-backoff wrapper for take uploads.
//
// Born from a real loss scenario (2026-07-31): a take's single
// background upload attempt failed during a tenant-config outage, the
// provisional asset id stuck in the saved session forever, and the
// clip played silence after reload. Uploads of recorded audio get
// bounded automatic retries with exponential backoff; the caller
// handles terminal failure (persistent toast + manual retry + the
// unsavedWork registry so a reload can't silently discard the take).

export interface UploadRetryOptions {
  /** Additional attempts after the first (default 5). */
  retries?: number;
  /** First backoff delay; doubles per retry (default 2s). */
  baseDelayMs?: number;
  /** Backoff ceiling (default 30s). */
  maxDelayMs?: number;
  /** Called before each retry sleep — for logging/telemetry. */
  onRetry?: (info: { attempt: number; delayMs: number; error: unknown }) => void;
  /** Injectable for tests. */
  sleep?: (ms: number) => Promise<void>;
}

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function withUploadRetry<T>(
  attempt: () => Promise<T>,
  opts: UploadRetryOptions = {},
): Promise<T> {
  const retries = opts.retries ?? 5;
  const base = opts.baseDelayMs ?? 2000;
  const cap = opts.maxDelayMs ?? 30000;
  const sleep = opts.sleep ?? realSleep;
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    if (i > 0) {
      const delayMs = Math.min(cap, base * 2 ** (i - 1));
      opts.onRetry?.({ attempt: i, delayMs, error: lastError });
      await sleep(delayMs);
    }
    try {
      return await attempt();
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}
