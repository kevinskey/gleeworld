// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// `fake` doubles as the shared-facade mock. In 'auto' mode subscribe()
// resolves immediately (the original two tests below). In 'manual' mode
// subscribe() attaches the handler synchronously (matching the real
// facades, which register the subscriber before awaiting permission/plugin
// start) but its returned promise only settles when resolvePending() is
// called — used to exercise the enable()/disable() races in the second
// describe block.
const fake = vi.hoisted(() => {
  let handler: ((data: Uint8Array, ts?: number) => void) | null = null;
  let subscribeCallCount = 0;
  let mode: 'auto' | 'manual' = 'auto';
  let pendingResolve: ((unsub: () => void) => void) | null = null;
  return {
    source: {
      kind: 'native' as const,
      supported: true,
      listInputs: async () => [{ id: 'p1', name: 'Keys' }],
      subscribe: (_d: string, cb: (data: Uint8Array, ts?: number) => void) => {
        subscribeCallCount++;
        handler = cb;
        if (mode === 'manual') {
          return new Promise<() => void>((resolve) => { pendingResolve = resolve; });
        }
        return Promise.resolve(() => { handler = null; });
      },
      onStateChange: () => () => {},
      showBluetoothPairing: async () => false,
    },
    emit(bytes: number[]) { handler?.(Uint8Array.from(bytes)); },
    get subscribed() { return handler !== null; },
    get subscribeCallCount() { return subscribeCallCount; },
    setManual(v: boolean) { mode = v ? 'manual' : 'auto'; },
    resolvePending() {
      if (!pendingResolve) throw new Error('no pending subscribe() to resolve');
      const resolve = pendingResolve;
      pendingResolve = null;
      resolve(() => { handler = null; });
    },
    reset() {
      handler = null;
      subscribeCallCount = 0;
      mode = 'auto';
      pendingResolve = null;
    },
  };
});

vi.mock('@/lib/midi/midiInputSource', () => ({
  getMidiInputSource: () => fake.source,
}));

import { useMidiInput } from '../useMidiInput';

beforeEach(() => fake.reset());

describe('notation useMidiInput on the shared facade', () => {
  it('is supported wherever the facade is (e.g. iOS native)', () => {
    const { result } = renderHook(() => useMidiInput(() => {}));
    expect(result.current.state.supported).toBe(true);
  });

  it('enable subscribes; note-on reaches the handler; disable unsubscribes', async () => {
    const notes: number[] = [];
    const { result } = renderHook(() => useMidiInput((m) => notes.push(m)));
    await act(async () => { await result.current.enable(); });
    await waitFor(() => expect(result.current.state.connected).toBe(true));
    expect(result.current.state.inputNames).toEqual(['Keys']);
    fake.emit([0x90, 60, 100]);
    expect(notes).toEqual([60]);
    fake.emit([0x90, 61, 0]); // vel-0 = note-off → not a note-on
    expect(notes).toEqual([60]);
    act(() => result.current.disable());
    expect(fake.subscribed).toBe(false);
  });
});

describe('notation useMidiInput enable()/disable() races', () => {
  it('disable() during a pending enable() tears down the late subscription instead of committing it', async () => {
    fake.setManual(true);
    const notes: number[] = [];
    const { result } = renderHook(() => useMidiInput((m) => notes.push(m)));

    let enablePromise!: Promise<void>;
    act(() => { enablePromise = result.current.enable(); }); // subscribe() called, still pending
    expect(fake.subscribeCallCount).toBe(1);

    act(() => { result.current.disable(); }); // fires before subscribe() resolves
    expect(result.current.state.connected).toBe(false);

    fake.resolvePending(); // enable()'s continuation now runs — must notice it's stale
    await act(async () => { await enablePromise; });

    expect(result.current.state.connected).toBe(false); // never flipped by the late continuation
    expect(fake.subscribed).toBe(false); // the freshly-obtained unsub WAS invoked — no leak

    // A subsequent enable() still works normally (not permanently jammed).
    fake.setManual(false);
    await act(async () => { await result.current.enable(); });
    await waitFor(() => expect(result.current.state.connected).toBe(true));
  });

  it('double enable() before the first resolves opens exactly one subscription', async () => {
    fake.setManual(true);
    const notes: number[] = [];
    const { result } = renderHook(() => useMidiInput((m) => notes.push(m)));

    let p1!: Promise<void>;
    let p2!: Promise<void>;
    act(() => {
      p1 = result.current.enable();
      p2 = result.current.enable(); // in-flight guard makes this a no-op
    });
    expect(fake.subscribeCallCount).toBe(1); // second call never touched subscribe()

    fake.resolvePending();
    await act(async () => { await p1; await p2; });
    expect(result.current.state.connected).toBe(true);

    fake.emit([0x90, 60, 100]);
    expect(notes).toEqual([60]); // delivered exactly once — no duplicate subscription

    act(() => result.current.disable());
    expect(fake.subscribed).toBe(false); // fully torn down
  });
});
