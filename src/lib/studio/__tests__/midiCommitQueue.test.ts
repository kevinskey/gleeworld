import { describe, it, expect, vi } from 'vitest';
import { createMidiCommitQueue } from '../midiRecord';

describe('createMidiCommitQueue', () => {
  it('coalesces adds into one onFlush after coalesceMs', () => {
    vi.useFakeTimers();
    const flushed: number[][] = [];
    const q = createMidiCommitQueue<number>({ coalesceMs: 250, onFlush: (i) => flushed.push(i) });
    q.add(1); q.add(2);
    expect(flushed.length).toBe(0);
    vi.advanceTimersByTime(250);
    expect(flushed).toEqual([[1, 2]]);
    expect(q.size()).toBe(0);
    vi.useRealTimers();
  });

  it('flushNow drains synchronously and cancels the timer', () => {
    vi.useFakeTimers();
    const flushed: number[][] = [];
    const q = createMidiCommitQueue<number>({ coalesceMs: 250, onFlush: (i) => flushed.push(i) });
    q.add(7);
    expect(q.flushNow()).toEqual([7]);
    vi.advanceTimersByTime(1000);
    expect(flushed).toEqual([[7]]); // exactly once, via flushNow
    vi.useRealTimers();
  });

  it('clear discards items and cancels the timer — nothing ever flushes', () => {
    vi.useFakeTimers();
    const flushed: number[][] = [];
    const q = createMidiCommitQueue<number>({ coalesceMs: 250, onFlush: (i) => flushed.push(i) });
    q.add(9);
    q.clear();
    vi.advanceTimersByTime(1000);
    expect(flushed).toEqual([]);
    expect(q.size()).toBe(0);
    vi.useRealTimers();
  });
});
