// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const fake = vi.hoisted(() => {
  let handler: ((data: Uint8Array, ts?: number) => void) | null = null;
  return {
    source: {
      kind: 'native' as const,
      supported: true,
      listInputs: async () => [{ id: 'p1', name: 'Keys' }],
      subscribe: async (_d: string, cb: (data: Uint8Array, ts?: number) => void) => {
        handler = cb;
        return () => { handler = null; };
      },
      onStateChange: () => () => {},
      showBluetoothPairing: async () => false,
    },
    emit(bytes: number[]) { handler?.(Uint8Array.from(bytes)); },
    get subscribed() { return handler !== null; },
  };
});

vi.mock('@/lib/midi/midiInputSource', () => ({
  getMidiInputSource: () => fake.source,
}));

import { useMidiInput } from '../useMidiInput';

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
