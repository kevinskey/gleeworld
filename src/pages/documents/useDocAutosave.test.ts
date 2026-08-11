import { describe, it, expect, vi } from 'vitest';
import { createAutosaver } from './useDocAutosave';
import { countWords } from '@/components/documents/DocumentEditor';

it('debounces: one save for rapid edits', async () => {
  vi.useFakeTimers();
  const save = vi.fn().mockResolvedValue(undefined);
  const a = createAutosaver(save, 2000);
  a.schedule({ title: 'x' }); a.schedule({ title: 'xy' }); a.schedule({ title: 'xyz' });
  await vi.advanceTimersByTimeAsync(2100);
  expect(save).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenCalledWith({ title: 'xyz' });
  vi.useRealTimers();
});

it('retries with backoff on failure and reports status', async () => {
  vi.useFakeTimers();
  const save = vi.fn().mockRejectedValueOnce(new Error('net')).mockResolvedValue(undefined);
  const statuses: string[] = [];
  const a = createAutosaver(save, 2000, s => statuses.push(s));
  a.schedule({ title: 'x' });
  await vi.advanceTimersByTimeAsync(2100);   // first attempt fails
  await vi.advanceTimersByTimeAsync(4100);   // backoff retry succeeds
  expect(save).toHaveBeenCalledTimes(2);
  expect(statuses).toEqual(['saving', 'error', 'saving', 'saved']);
  vi.useRealTimers();
});

it('flush() saves pending work immediately', async () => {
  vi.useFakeTimers();
  const save = vi.fn().mockResolvedValue(undefined);
  const a = createAutosaver(save, 2000);
  a.schedule({ title: 'x' });
  await a.flush();
  expect(save).toHaveBeenCalledTimes(1);
  vi.useRealTimers();
});

describe('countWords consistency (Task 5 helper, re-asserted for this task)', () => {
  it('trims and collapses whitespace', () => {
    expect(countWords('  two  words ')).toBe(2);
  });
  it('empty string is zero words', () => {
    expect(countWords('')).toBe(0);
  });
});
