import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createListenTracker } from '../player/listenTracker';

describe('createListenTracker', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('flushes accumulated seconds on interval', () => {
    const flush = vi.fn();
    const t = createListenTracker({ flush, flushIntervalMs: 30000 });
    t.start('soprano', 85);
    vi.advanceTimersByTime(30000);
    expect(flush).toHaveBeenCalledWith({ partRole: 'soprano', tempoPct: 85, seconds: 30 });
    t.dispose();
  });

  it('flushes remainder on stop and never flushes zero', () => {
    const flush = vi.fn();
    const t = createListenTracker({ flush, flushIntervalMs: 30000 });
    t.start('alto', 100);
    vi.advanceTimersByTime(5000);
    t.stop();
    expect(flush).toHaveBeenCalledWith({ partRole: 'alto', tempoPct: 100, seconds: 5 });
    t.stop();
    expect(flush).toHaveBeenCalledTimes(1);
    t.dispose();
  });

  it('setContext mid-session attributes seconds to the new context after flush', () => {
    const flush = vi.fn();
    const t = createListenTracker({ flush, flushIntervalMs: 30000 });
    t.start('soprano', 100);
    vi.advanceTimersByTime(10000);
    t.setContext('alto', 85);   // flushes the soprano span first
    expect(flush).toHaveBeenCalledWith({ partRole: 'soprano', tempoPct: 100, seconds: 10 });
    vi.advanceTimersByTime(5000);
    t.stop();
    expect(flush).toHaveBeenLastCalledWith({ partRole: 'alto', tempoPct: 85, seconds: 5 });
    t.dispose();
  });
});
