// Retry-with-backoff for take uploads. A 4-minute recording must never
// be one transient network failure away from silent loss (2026-07-31:
// a tenant-config outage failed a bass take's single upload attempt;
// the provisional asset id stuck forever and the clip played silence).
import { describe, it, expect, vi } from 'vitest';
import { withUploadRetry } from '../uploadRetry';

const noSleep = () => Promise.resolve();

describe('withUploadRetry', () => {
  it('returns the first success without retrying', async () => {
    const attempt = vi.fn().mockResolvedValue('asset');
    const onRetry = vi.fn();
    await expect(withUploadRetry(attempt, { sleep: noSleep, onRetry })).resolves.toBe('asset');
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('retries through failures and resolves on a later success', async () => {
    const attempt = vi.fn()
      .mockRejectedValueOnce(new Error('net down'))
      .mockRejectedValueOnce(new Error('still down'))
      .mockResolvedValue('asset');
    const onRetry = vi.fn();
    await expect(withUploadRetry(attempt, { sleep: noSleep, onRetry })).resolves.toBe('asset');
    expect(attempt).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('backs off exponentially and caps the delay', async () => {
    const delays: number[] = [];
    const attempt = vi.fn().mockRejectedValue(new Error('down'));
    await expect(withUploadRetry(attempt, {
      retries: 6,
      baseDelayMs: 2000,
      maxDelayMs: 15000,
      sleep: (ms) => { delays.push(ms); return Promise.resolve(); },
    })).rejects.toThrow('down');
    expect(delays).toEqual([2000, 4000, 8000, 15000, 15000, 15000]);
  });

  it('throws the last error after exhausting retries', async () => {
    const attempt = vi.fn()
      .mockRejectedValueOnce(new Error('first'))
      .mockRejectedValue(new Error('last'));
    await expect(withUploadRetry(attempt, { retries: 2, sleep: noSleep })).rejects.toThrow('last');
    expect(attempt).toHaveBeenCalledTimes(3); // initial + 2 retries
  });
});
