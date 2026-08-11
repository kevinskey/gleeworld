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

// --- Added on coordinator review (2 Critical/Important fixes touching
// createAutosaver): hasPending() contract, and flush() awaiting an
// in-flight attempt instead of firing a second overlapping save. The three
// tests above are the brief's verbatim tests and are left unchanged.

it('hasPending() reflects a queued patch and a running save, then clears', async () => {
  vi.useFakeTimers();
  let resolveSave: () => void = () => {};
  const save = vi.fn(() => new Promise<void>((resolve) => { resolveSave = resolve; }));
  const a = createAutosaver(save, 2000);

  expect(a.hasPending()).toBe(false);

  a.schedule({ title: 'x' });
  expect(a.hasPending()).toBe(true); // queued, timer armed but not fired

  await vi.advanceTimersByTimeAsync(2100); // timer fires; save() called, still unresolved
  expect(save).toHaveBeenCalledTimes(1);
  expect(a.hasPending()).toBe(true); // in flight

  resolveSave();
  await vi.advanceTimersByTimeAsync(0); // flush the microtask that settles save()
  expect(a.hasPending()).toBe(false);

  vi.useRealTimers();
});

it('hasPending() stays true if new work is scheduled while a save is in flight', async () => {
  vi.useFakeTimers();
  let resolveSave: () => void = () => {};
  const save = vi.fn(() => new Promise<void>((resolve) => { resolveSave = resolve; }));
  const a = createAutosaver(save, 2000);

  a.schedule({ title: 'x' });
  await vi.advanceTimersByTimeAsync(2100); // save() #1 now in flight
  a.schedule({ title: 'xy' }); // edit lands mid-save

  resolveSave();
  await vi.advanceTimersByTimeAsync(0);
  expect(a.hasPending()).toBe(true); // save #1 landed clean, but 'xy' is still unsaved

  vi.useRealTimers();
});

it('flush() awaits an in-flight attempt instead of starting a second overlapping save', async () => {
  vi.useFakeTimers();
  let resolveSave: () => void = () => {};
  const save = vi.fn(() => new Promise<void>((resolve) => { resolveSave = resolve; }));
  const a = createAutosaver(save, 2000);

  a.schedule({ title: 'x' });
  await vi.advanceTimersByTimeAsync(2100); // debounce fires; save() #1 in flight
  expect(save).toHaveBeenCalledTimes(1);

  const flushed = a.flush(); // must reuse the in-flight save, not start #2
  expect(save).toHaveBeenCalledTimes(1);

  resolveSave();
  await flushed;
  expect(save).toHaveBeenCalledTimes(1);

  vi.useRealTimers();
});

// --- Added on coordinator re-review: the fix above (flush() reusing an
// in-flight promise) had a data-loss gap — it returned the IN-FLIGHT
// promise as-is even when a newer edit had been scheduled while that save
// was running, so flush() (title blur, unmount) could resolve without ever
// sending that newer edit. attempt() now drains: when it reuses an
// in-flight promise, it chains a check of `pending` once that promise
// settles and recurses if there's more to send.

it('flush() drains a newer edit scheduled while a save is in flight — both patches persisted', async () => {
  vi.useFakeTimers();
  const resolvers: Array<() => void> = [];
  const save = vi.fn(() => new Promise<void>((resolve) => { resolvers.push(resolve); }));
  const a = createAutosaver(save, 2000);

  a.schedule({ title: 'A' });
  await vi.advanceTimersByTimeAsync(2100); // debounce fires; save() #1 (A) in flight
  expect(save).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenNthCalledWith(1, { title: 'A' });

  a.schedule({ title: 'B' }); // edit lands mid-save — the bug stranded this

  const flushed = a.flush(); // must not resolve until B is ALSO saved

  resolvers[0](); // let save #1 (A) resolve
  await vi.advanceTimersByTimeAsync(0); // drain notices pending=B, starts save #2 with B

  expect(save).toHaveBeenCalledTimes(2); // both A and B were sent, not just A
  expect(save).toHaveBeenNthCalledWith(2, { title: 'B' });

  resolvers[1](); // let save #2 (B) resolve — only now can flush() settle
  await flushed;

  expect(save).toHaveBeenCalledTimes(2); // no stray extra save beyond A then B

  vi.useRealTimers();
});

it('hasPending() is false once a drained flush() has fully settled', async () => {
  vi.useFakeTimers();
  const resolvers: Array<() => void> = [];
  const save = vi.fn(() => new Promise<void>((resolve) => { resolvers.push(resolve); }));
  const a = createAutosaver(save, 2000);

  a.schedule({ title: 'A' });
  await vi.advanceTimersByTimeAsync(2100); // save #1 (A) in flight
  a.schedule({ title: 'B' }); // edit lands mid-save

  const flushed = a.flush();
  resolvers[0](); // A resolves
  await vi.advanceTimersByTimeAsync(0); // drain starts save #2 with B
  resolvers[1](); // B resolves
  await flushed;

  expect(a.hasPending()).toBe(false);

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
