import { describe, it, expect, vi } from 'vitest';
import { createWebMidiInputSource } from '../midiInputSource';

// Minimal fake Web MIDI: ports with the single-slot onmidimessage handler
// the real API has, plus a fire() helper to simulate hardware input.
function makeFakePort(id: string, name: string) {
  return {
    id,
    name,
    onmidimessage: null as ((e: { data: Uint8Array }) => void) | null,
    fire(bytes: number[]) {
      this.onmidimessage?.({ data: Uint8Array.from(bytes) });
    },
  };
}

function makeFakeAccess() {
  const a = makeFakePort('a', 'Keys A');
  const b = makeFakePort('b', 'Keys B');
  const inputs = new Map([['a', a], ['b', b]]);
  return { inputs, onstatechange: null as (() => void) | null, ports: { a, b } };
}

function navWith(access: ReturnType<typeof makeFakeAccess>) {
  return { requestMIDIAccess: vi.fn().mockResolvedValue(access) } as unknown as Navigator;
}

describe('createWebMidiInputSource', () => {
  it('reports unsupported when navigator lacks requestMIDIAccess', () => {
    const src = createWebMidiInputSource({} as Navigator);
    expect(src.supported).toBe(false);
    expect(src.kind).toBe('web');
  });

  it('lists inputs with id and name', async () => {
    const access = makeFakeAccess();
    const src = createWebMidiInputSource(navWith(access));
    expect(await src.listInputs()).toEqual([
      { id: 'a', name: 'Keys A' },
      { id: 'b', name: 'Keys B' },
    ]);
  });

  it('requests access with sysex: false', async () => {
    const access = makeFakeAccess();
    const nav = navWith(access);
    const src = createWebMidiInputSource(nav);
    await src.listInputs();
    expect((nav as any).requestMIDIAccess).toHaveBeenCalledWith({ sysex: false });
  });

  it("subscribe('') receives messages from every port", async () => {
    const access = makeFakeAccess();
    const src = createWebMidiInputSource(navWith(access));
    const got: number[][] = [];
    await src.subscribe('', (d) => got.push([...d]));
    access.ports.a.fire([0x90, 60, 100]);
    access.ports.b.fire([0x80, 60, 0]);
    expect(got).toEqual([[0x90, 60, 100], [0x80, 60, 0]]);
  });

  it('subscribe(deviceId) filters to that port', async () => {
    const access = makeFakeAccess();
    const src = createWebMidiInputSource(navWith(access));
    const got: number[][] = [];
    await src.subscribe('b', (d) => got.push([...d]));
    access.ports.a.fire([0x90, 60, 100]);
    access.ports.b.fire([0x90, 64, 90]);
    expect(got).toEqual([[0x90, 64, 90]]);
  });

  it('unsubscribe stops delivery', async () => {
    const access = makeFakeAccess();
    const src = createWebMidiInputSource(navWith(access));
    const got: number[][] = [];
    const unsub = await src.subscribe('', (d) => got.push([...d]));
    unsub();
    access.ports.a.fire([0x90, 60, 100]);
    expect(got).toEqual([]);
  });

  it('rejects subscribe when permission is denied, and retries on the next call', async () => {
    const access = makeFakeAccess();
    const requestMIDIAccess = vi
      .fn()
      .mockRejectedValueOnce(new Error('denied'))
      .mockResolvedValue(access);
    const src = createWebMidiInputSource({ requestMIDIAccess } as unknown as Navigator);
    await expect(src.subscribe('', () => {})).rejects.toThrow('denied');
    // A later attempt must retry the permission request, not cache the rejection.
    await expect(src.subscribe('', () => {})).resolves.toBeTypeOf('function');
    expect(requestMIDIAccess).toHaveBeenCalledTimes(2);
  });

  it('fires onStateChange and re-attaches on hot-plug', async () => {
    const access = makeFakeAccess();
    const src = createWebMidiInputSource(navWith(access));
    const stateCb = vi.fn();
    src.onStateChange(stateCb);
    const got: number[][] = [];
    await src.subscribe('', (d) => got.push([...d]));

    // Simulate hot-plug: a new port appears, browser fires onstatechange.
    const c = makeFakePort('c', 'Keys C');
    access.inputs.set('c', c as any);
    access.onstatechange?.();

    expect(stateCb).toHaveBeenCalledTimes(1);
    c.fire([0x90, 72, 80]);
    expect(got).toEqual([[0x90, 72, 80]]);
  });
});
