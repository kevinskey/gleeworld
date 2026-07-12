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

import { createNativeMidiInputSource } from '../midiInputSource';
import type { GWMidiPluginShape } from '@/plugins/gwMidi';

function makeFakePlugin() {
  const handlers: Record<string, (e: unknown) => void> = {};
  const plugin = {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    listInputs: vi.fn().mockResolvedValue({ inputs: [{ id: '101', name: 'WP06' }] }),
    showBluetoothPairing: vi.fn().mockResolvedValue(undefined),
    addListener: vi.fn(async (evt: string, cb: (e: unknown) => void) => {
      handlers[evt] = cb;
      return { remove: vi.fn(async () => { delete handlers[evt]; }) };
    }),
  };
  return {
    plugin: plugin as unknown as GWMidiPluginShape,
    raw: plugin,
    emit(evt: 'midiMessage' | 'stateChange', payload: unknown) { handlers[evt]?.(payload); },
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('createNativeMidiInputSource', () => {
  it('is supported and kind native', () => {
    const src = createNativeMidiInputSource(makeFakePlugin().plugin);
    expect(src.supported).toBe(true);
    expect(src.kind).toBe('native');
  });

  it('lists inputs from the plugin', async () => {
    const src = createNativeMidiInputSource(makeFakePlugin().plugin);
    expect(await src.listInputs()).toEqual([{ id: '101', name: 'WP06' }]);
  });

  it('starts the plugin once for many subscribers and converts data to Uint8Array', async () => {
    const fake = makeFakePlugin();
    const src = createNativeMidiInputSource(fake.plugin);
    const got: Uint8Array[] = [];
    await src.subscribe('', (d) => got.push(d));
    await src.subscribe('', () => {});
    expect(fake.raw.start).toHaveBeenCalledTimes(1);
    fake.emit('midiMessage', { portId: '101', data: [0x90, 60, 100], tsMs: 12.5 });
    expect(got).toHaveLength(1);
    expect(got[0]).toBeInstanceOf(Uint8Array);
    expect([...got[0]]).toEqual([0x90, 60, 100]);
  });

  it('filters by portId when a deviceId is chosen', async () => {
    const fake = makeFakePlugin();
    const src = createNativeMidiInputSource(fake.plugin);
    const got: number[][] = [];
    await src.subscribe('202', (d) => got.push([...d]));
    fake.emit('midiMessage', { portId: '101', data: [0x90, 60, 100], tsMs: 0 });
    fake.emit('midiMessage', { portId: '202', data: [0x90, 64, 90], tsMs: 0 });
    expect(got).toEqual([[0x90, 64, 90]]);
  });

  it('stops the plugin after the last unsubscribe', async () => {
    const fake = makeFakePlugin();
    const src = createNativeMidiInputSource(fake.plugin);
    const unsub1 = await src.subscribe('', () => {});
    const unsub2 = await src.subscribe('', () => {});
    unsub1();
    await flush();
    expect(fake.raw.stop).not.toHaveBeenCalled();
    unsub2();
    await flush();
    expect(fake.raw.stop).toHaveBeenCalledTimes(1);
  });

  it('restarts cleanly after a full stop', async () => {
    const fake = makeFakePlugin();
    const src = createNativeMidiInputSource(fake.plugin);
    const unsub = await src.subscribe('', () => {});
    unsub();
    await flush();
    const got: number[][] = [];
    await src.subscribe('', (d) => got.push([...d]));
    expect(fake.raw.start).toHaveBeenCalledTimes(2);
    fake.emit('midiMessage', { portId: '101', data: [0x80, 60, 0], tsMs: 0 });
    expect(got).toEqual([[0x80, 60, 0]]);
  });

  it('fans stateChange out to listeners', async () => {
    const fake = makeFakePlugin();
    const src = createNativeMidiInputSource(fake.plugin);
    const cb = vi.fn();
    src.onStateChange(cb);
    await src.subscribe('', () => {}); // listeners attach on first subscribe
    fake.emit('stateChange', { inputs: [] });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('showBluetoothPairing resolves true on success, false on failure', async () => {
    const fake = makeFakePlugin();
    const src = createNativeMidiInputSource(fake.plugin);
    await expect(src.showBluetoothPairing()).resolves.toBe(true);
    (fake.raw.showBluetoothPairing as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('no vc'));
    await expect(src.showBluetoothPairing()).resolves.toBe(false);
  });
});
