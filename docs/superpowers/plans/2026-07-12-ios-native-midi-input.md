# iOS Native MIDI Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make hardware MIDI keyboards (USB + Bluetooth) work on iPad in the Capacitor app — Studio recording/monitoring/sustain, sight-singing VirtualPiano, and hands-free viewer page-turns — via a local CoreMIDI Capacitor plugin and a shared JS facade.

**Architecture:** A `GWMidiPlugin.swift` CoreMIDI plugin (input only) forwards raw MIDI bytes over the Capacitor bridge as `midiMessage` events. A shared `MidiInputSource` facade in `src/lib/midi/midiInputSource.ts` has two backends — Web MIDI (behavior-identical to today's inline code) and native (backed by the plugin) — chosen once by platform. The three existing consumers swap their inline `requestMIDIAccess` blocks for the facade. No `navigator` monkey-patching (explicitly decided against a polyfill).

**Tech Stack:** Swift/CoreMIDI/CoreAudioKit, Capacitor 7 local plugin pattern, TypeScript, React hooks, vitest.

**Spec:** `docs/superpowers/specs/2026-07-12-ios-native-midi-input-design.md`

## Global Constraints

- Input only: no MIDI output ports. The Studio's MIDI Clock sender (`useMidiClockSync` / `MidiSyncSection` in `StudioEditor.tsx`) stays web-only and MUST NOT be modified.
- No global monkey-patching of `navigator.requestMIDIAccess` — consumers import the facade explicitly.
- Native events filter sysex (0xF0) and realtime (0xF8–0xFF) status bytes; only channel-voice messages cross the bridge, one `notifyListeners` call per message.
- `notifyListeners` is main-thread-only in this app — always hop to `DispatchQueue.main` from CoreMIDI callbacks (same pattern as `recordPeak` in `StudioEnginePlugin.swift`).
- New plugin MUST be registered in `MainViewController.capacitorDidLoad` — `CAPBridgedPlugin` auto-discovery gets dead-stripped in release builds.
- Plugin `jsName` is exactly `"GWMidi"` on both sides.
- Studio UI sizing: `text-xs`/`text-sm` minimum, `w-4 h-4` icons minimum. Never sub-12px text.
- Downstream parsing stays in `parseMidiMessage` (`src/lib/studio/midiMessage.ts`) — do not duplicate MIDI byte parsing in consumers.
- Web-backend behavior must be identical to today for single-surface use: `requestMIDIAccess({ sysex: false })`, permission denial surfaces as a rejected `subscribe`, re-attach on `onstatechange`.
- Do NOT upload any iOS build to App Store Connect without Kevin's explicit confirmation.
- Repo checkout is shared between sessions: verify `git branch --show-current` prints `main` (or your feature branch) before every commit.

---

### Task 1: `MidiInputSource` facade + web backend

**Files:**
- Create: `src/lib/midi/midiInputSource.ts`
- Test: `src/lib/midi/__tests__/midiInputSource.test.ts`

**Interfaces:**
- Consumes: nothing (native backend is Task 2; this task ships the types, the web backend, and a `getMidiInputSource()` that returns the web backend unconditionally for now).
- Produces (used by Tasks 2–5):

```ts
export interface MidiInputDescriptor { id: string; name: string }

export interface MidiInputSource {
  /** Which backend this is — the Studio UI shows the Bluetooth pairing button only for 'native'. */
  readonly kind: 'web' | 'native';
  readonly supported: boolean;
  listInputs(): Promise<MidiInputDescriptor[]>;
  /**
   * Deliver raw MIDI bytes from the chosen device ('' = all devices).
   * Rejects if access is denied (web permission prompt).
   * Resolves to an unsubscribe function.
   */
  subscribe(deviceId: string, onMessage: (data: Uint8Array) => void): Promise<() => void>;
  /** Fires on device hot-plug / disconnect. Returns un-listen function. */
  onStateChange(cb: () => void): () => void;
  /** Opens the OS Bluetooth MIDI pairing sheet. Resolves false where unavailable (web). */
  showBluetoothPairing(): Promise<boolean>;
}

export function createWebMidiInputSource(nav?: Navigator): MidiInputSource;
export function getMidiInputSource(): MidiInputSource; // module-level singleton
```

- [ ] **Step 1: Write the failing tests**

Create `src/lib/midi/__tests__/midiInputSource.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/Documents/GitHub/gleeworld && npx vitest run src/lib/midi`
Expected: FAIL — `Cannot find module '../midiInputSource'` (or equivalent resolve error).

- [ ] **Step 3: Write the implementation**

Create `src/lib/midi/midiInputSource.ts`:

```ts
// Unified MIDI input facade for every MIDI consumer in the app
// (Studio record/monitor, sight-singing VirtualPiano, hands-free viewer).
//
// Two backends behind one interface:
//   - web:    the Web MIDI API (Chrome/Edge desktop) — behavior-identical
//             to the inline requestMIDIAccess code it replaced.
//   - native: the GWMidi Capacitor plugin (CoreMIDI on iOS), added in a
//             follow-up task — iOS WebKit has no Web MIDI at all.
//
// Consumers import getMidiInputSource() and never branch on platform.
// Raw bytes go to the existing parseMidiMessage; no parsing lives here.

export interface MidiInputDescriptor { id: string; name: string }

export interface MidiInputSource {
  /** Which backend this is — the Studio UI shows the Bluetooth pairing
   *  button only for 'native'. */
  readonly kind: 'web' | 'native';
  readonly supported: boolean;
  listInputs(): Promise<MidiInputDescriptor[]>;
  /**
   * Deliver raw MIDI bytes from the chosen device ('' = all devices).
   * Rejects if access is denied (web permission prompt).
   * Resolves to an unsubscribe function.
   */
  subscribe(deviceId: string, onMessage: (data: Uint8Array) => void): Promise<() => void>;
  /** Fires on device hot-plug / disconnect. Returns un-listen function. */
  onStateChange(cb: () => void): () => void;
  /** Opens the OS Bluetooth MIDI pairing sheet. Resolves false where
   *  unavailable (web). */
  showBluetoothPairing(): Promise<boolean>;
}

// Web MIDI types aren't in the default TS DOM lib; keep these local +
// loose, same as the previous inline usage.
interface MidiPort { id: string; name?: string; onmidimessage: ((e: { data: Uint8Array }) => void) | null }
interface MidiAccessLike { inputs: Map<string, MidiPort>; onstatechange: (() => void) | null }

interface Subscriber { deviceId: string; cb: (data: Uint8Array) => void }

export function createWebMidiInputSource(nav: Navigator = globalThis.navigator): MidiInputSource {
  const supported = typeof nav !== 'undefined' && !!nav && 'requestMIDIAccess' in nav;
  const subscribers = new Set<Subscriber>();
  const stateCbs = new Set<() => void>();
  let accessPromise: Promise<MidiAccessLike> | null = null;

  // One dispatcher per port fans out to matching subscribers. Ports keep
  // the dispatcher attached after the last unsubscribe (an empty set just
  // delivers to nobody) — same net behavior as the old per-hook attach.
  const attach = (acc: MidiAccessLike) => {
    acc.inputs.forEach((inp) => {
      inp.onmidimessage = (e) => {
        subscribers.forEach((s) => {
          if (s.deviceId === '' || s.deviceId === inp.id) s.cb(e.data);
        });
      };
    });
  };

  const getAccess = (): Promise<MidiAccessLike> => {
    if (!accessPromise) {
      accessPromise = (nav as unknown as { requestMIDIAccess: (o: { sysex: boolean }) => Promise<MidiAccessLike> })
        .requestMIDIAccess({ sysex: false })
        .then((acc) => {
          attach(acc);
          acc.onstatechange = () => {
            attach(acc); // pick up newly plugged ports
            stateCbs.forEach((f) => f());
          };
          return acc;
        })
        .catch((err) => {
          accessPromise = null; // denied — let a later subscribe retry
          throw err;
        });
    }
    return accessPromise;
  };

  return {
    kind: 'web',
    supported,
    async listInputs() {
      if (!supported) return [];
      const acc = await getAccess();
      return [...acc.inputs.values()].map((i) => ({ id: i.id, name: i.name ?? i.id }));
    },
    async subscribe(deviceId, onMessage) {
      await getAccess(); // permission denial rejects here, before we register
      const sub: Subscriber = { deviceId, cb: onMessage };
      subscribers.add(sub);
      return () => { subscribers.delete(sub); };
    },
    onStateChange(cb) {
      stateCbs.add(cb);
      return () => { stateCbs.delete(cb); };
    },
    async showBluetoothPairing() {
      return false; // browsers pair Bluetooth MIDI at the OS level
    },
  };
}

let singleton: MidiInputSource | null = null;

/** The app-wide MIDI input source. Native backend lands in a follow-up
 *  task; until then every platform gets the web backend. */
export function getMidiInputSource(): MidiInputSource {
  if (!singleton) singleton = createWebMidiInputSource();
  return singleton;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/Documents/GitHub/gleeworld && npx vitest run src/lib/midi`
Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/GitHub/gleeworld
git add src/lib/midi
git commit -m "feat(midi): MidiInputSource facade with Web MIDI backend

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: `gwMidi` plugin wrapper + native backend

**Files:**
- Create: `src/plugins/gwMidi.ts`
- Modify: `src/lib/midi/midiInputSource.ts` (add native backend + platform pick in `getMidiInputSource`)
- Test: `src/lib/midi/__tests__/midiInputSource.test.ts` (append a describe block)

**Interfaces:**
- Consumes: `MidiInputSource`, `MidiInputDescriptor`, `Subscriber` pattern from Task 1.
- Produces:

```ts
// src/plugins/gwMidi.ts
export interface GWMidiInput { id: string; name: string }
export interface GWMidiMessageEvent { portId: string; data: number[]; tsMs: number }
export interface GWMidiStateChangeEvent { inputs: GWMidiInput[] }
export interface GWMidiPluginShape { /* start/stop/listInputs/showBluetoothPairing/addListener — full shape below */ }
export const GWMidi: GWMidiPluginShape;
export function isNativeMidiAvailable(): boolean;

// src/lib/midi/midiInputSource.ts (added)
export function createNativeMidiInputSource(plugin: GWMidiPluginShape): MidiInputSource;
```

The Swift side (Task 6) must match: `jsName "GWMidi"`, methods `start`/`stop`/`listInputs`/`showBluetoothPairing`, events `midiMessage` (`{ portId: string, data: number[], tsMs: number }`) and `stateChange` (`{ inputs: [{ id, name }] }`).

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/midi/__tests__/midiInputSource.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/Documents/GitHub/gleeworld && npx vitest run src/lib/midi`
Expected: FAIL — `createNativeMidiInputSource` is not exported (and `@/plugins/gwMidi` unresolved).

- [ ] **Step 3: Create the plugin wrapper**

Create `src/plugins/gwMidi.ts`:

```ts
// TypeScript bridge for the iOS GWMidiPlugin (CoreMIDI input).
//
// iOS WebKit has no Web MIDI API, so the native plugin forwards raw
// MIDI bytes from USB / Bluetooth keyboards over the Capacitor bridge.
// Input only — no output ports (MIDI Clock out stays web-only).
// Outside Capacitor iOS the wrapper is never selected (see
// getMidiInputSource), so no web no-op shims are needed here.

import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface GWMidiInput { id: string; name: string }
export interface GWMidiMessageEvent {
  portId: string;
  /** Raw MIDI 1.0 channel-voice bytes: [status, data1, data2]. */
  data: number[];
  /** Native CoreMIDI timestamp in ms (monotonic). Unused for now; kept
   *  for future record-alignment work. */
  tsMs: number;
}
export interface GWMidiStateChangeEvent { inputs: GWMidiInput[] }

export interface GWMidiPluginShape {
  start(): Promise<void>;
  stop(): Promise<void>;
  listInputs(): Promise<{ inputs: GWMidiInput[] }>;
  showBluetoothPairing(): Promise<void>;
  addListener(event: 'midiMessage', cb: (e: GWMidiMessageEvent) => void): Promise<PluginListenerHandle>;
  addListener(event: 'stateChange', cb: (e: GWMidiStateChangeEvent) => void): Promise<PluginListenerHandle>;
}

export const GWMidi = registerPlugin<GWMidiPluginShape>('GWMidi');

export function isNativeMidiAvailable(): boolean {
  return Capacitor.getPlatform() === 'ios';
}
```

- [ ] **Step 4: Add the native backend to the facade**

In `src/lib/midi/midiInputSource.ts`, add the import at the top:

```ts
import { GWMidi, isNativeMidiAvailable, type GWMidiPluginShape, type GWMidiMessageEvent, type GWMidiStateChangeEvent } from '@/plugins/gwMidi';
import type { PluginListenerHandle } from '@capacitor/core';
```

Add `createNativeMidiInputSource` after `createWebMidiInputSource`:

```ts
export function createNativeMidiInputSource(plugin: GWMidiPluginShape): MidiInputSource {
  const subscribers = new Set<Subscriber>();
  const stateCbs = new Set<() => void>();
  let started = false;
  let handles: PluginListenerHandle[] = [];

  const ensureStarted = async () => {
    if (started) return;
    started = true;
    handles = [
      await plugin.addListener('midiMessage', (e: GWMidiMessageEvent) => {
        const data = Uint8Array.from(e.data);
        subscribers.forEach((s) => {
          if (s.deviceId === '' || s.deviceId === e.portId) s.cb(data);
        });
      }),
      await plugin.addListener('stateChange', (_e: GWMidiStateChangeEvent) => {
        stateCbs.forEach((f) => f());
      }),
    ];
    await plugin.start();
  };

  const stopIfIdle = async () => {
    if (!started || subscribers.size > 0) return;
    started = false;
    const toRemove = handles;
    handles = [];
    for (const h of toRemove) await h.remove();
    await plugin.stop();
  };

  return {
    kind: 'native',
    supported: true,
    async listInputs() {
      const { inputs } = await plugin.listInputs();
      return inputs;
    },
    async subscribe(deviceId, onMessage) {
      const sub: Subscriber = { deviceId, cb: onMessage };
      subscribers.add(sub);
      try {
        await ensureStarted();
      } catch (err) {
        subscribers.delete(sub);
        throw err;
      }
      return () => {
        subscribers.delete(sub);
        void stopIfIdle();
      };
    },
    onStateChange(cb) {
      stateCbs.add(cb);
      return () => { stateCbs.delete(cb); };
    },
    async showBluetoothPairing() {
      try {
        await plugin.showBluetoothPairing();
        return true;
      } catch {
        return false;
      }
    },
  };
}
```

Replace `getMidiInputSource` with the platform pick:

```ts
let singleton: MidiInputSource | null = null;

/** The app-wide MIDI input source: CoreMIDI plugin inside the iOS app,
 *  Web MIDI everywhere else. Consumers never branch on platform. */
export function getMidiInputSource(): MidiInputSource {
  if (!singleton) {
    singleton = isNativeMidiAvailable()
      ? createNativeMidiInputSource(GWMidi)
      : createWebMidiInputSource();
  }
  return singleton;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd ~/Documents/GitHub/gleeworld && npx vitest run src/lib/midi`
Expected: PASS — 16 tests (8 web + 8 native).

Note: importing `@capacitor/core` in a vitest environment works in this repo (other plugin wrappers are transitively imported by tested code). If the import ever breaks the test run, mock it with `vi.mock('@/plugins/gwMidi', ...)` in the test file — but try the plain run first.

- [ ] **Step 6: Commit**

```bash
cd ~/Documents/GitHub/gleeworld
git add src/plugins/gwMidi.ts src/lib/midi
git commit -m "feat(midi): GWMidi plugin wrapper + native MidiInputSource backend

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Swap `useStudioMidiInput` onto the facade

**Files:**
- Modify: `src/hooks/useStudioMidiInput.ts` (full rewrite of the effect; public API unchanged)

**Interfaces:**
- Consumes: `getMidiInputSource()` from Task 1/2.
- Produces: unchanged hook signature — `useStudioMidiInput({ enabled, deviceId, onNoteOn, onNoteOff, onSustain, onCc })` returning `{ supported, inputs, status }`. `StudioEditor.tsx:561` consumes this and must not need changes.

- [ ] **Step 1: Rewrite the hook**

Replace the entire contents of `src/hooks/useStudioMidiInput.ts` with:

```ts
import { useEffect, useRef, useState } from 'react';
import { parseMidiMessage } from '@/lib/studio/midiMessage';
import { getMidiInputSource } from '@/lib/midi/midiInputSource';

/**
 * Subscribe to hardware MIDI note input (Web MIDI on desktop browsers,
 * the CoreMIDI GWMidi plugin inside the iOS app). When `enabled`,
 * lists input devices and routes note on/off from the chosen device
 * (or all devices when deviceId is '') to the callbacks. Hot-plug aware.
 */
export function useStudioMidiInput({
  enabled,
  deviceId,
  onNoteOn,
  onNoteOff,
  onSustain,
  onCc,
}: {
  enabled: boolean;
  deviceId: string;
  onNoteOn: (pitch: number, velocity: number) => void;
  onNoteOff: (pitch: number) => void;
  onSustain?: (down: boolean) => void;
  onCc?: (controller: number, value: number) => void;
}) {
  const [inputs, setInputs] = useState<{ id: string; name: string }[]>([]);
  const [status, setStatus] = useState<'idle' | 'connected' | 'denied'>('idle');
  // Latest callbacks via refs so re-subscription isn't triggered every render.
  const onOnRef = useRef(onNoteOn); onOnRef.current = onNoteOn;
  const onOffRef = useRef(onNoteOff); onOffRef.current = onNoteOff;
  const onSustainRef = useRef(onSustain); onSustainRef.current = onSustain;
  const onCcRef = useRef(onCc); onCcRef.current = onCc;

  const source = getMidiInputSource();

  useEffect(() => {
    if (!enabled || !source.supported) { setStatus('idle'); return; }
    let cancelled = false;
    let unsub: (() => void) | null = null;

    const refreshInputs = () => {
      void source.listInputs().then((list) => { if (!cancelled) setInputs(list); });
    };
    const offState = source.onStateChange(refreshInputs);

    source
      .subscribe(deviceId, (data) => {
        const ev = parseMidiMessage(data);
        if (ev.type === 'noteon') onOnRef.current(ev.pitch, ev.velocity);
        else if (ev.type === 'noteoff') onOffRef.current(ev.pitch);
        else if (ev.type === 'sustain') onSustainRef.current?.(ev.down);
        else if (ev.type === 'cc') onCcRef.current?.(ev.controller, ev.value);
      })
      .then((u) => {
        if (cancelled) { u(); return; }
        unsub = u;
        setStatus('connected');
        refreshInputs();
      })
      .catch(() => { if (!cancelled) setStatus('denied'); });

    return () => {
      cancelled = true;
      offState();
      unsub?.();
    };
    // `source` is a module singleton — stable for the app lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, deviceId]);

  return { supported: source.supported, inputs, status };
}
```

- [ ] **Step 2: Verify the suite and the build**

Run: `cd ~/Documents/GitHub/gleeworld && npx vitest run src/lib/studio src/lib/midi`
Expected: PASS (Studio lib tests untouched, midi facade tests green).

Run: `cd ~/Documents/GitHub/gleeworld && npm run build 2>&1 | tail -5`
Expected: vite build completes with no TypeScript/rollup errors. (`tsc --noEmit` is a no-op in this repo — the build is the type gate.)

- [ ] **Step 3: Commit**

```bash
cd ~/Documents/GitHub/gleeworld
git add src/hooks/useStudioMidiInput.ts
git commit -m "refactor(studio): useStudioMidiInput reads through MidiInputSource facade

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Swap VirtualPiano + hands-free controls onto the facade

**Files:**
- Modify: `src/components/sight-singing/VirtualPiano.tsx` (the MIDI `useEffect` — currently ~lines 385–458, contains `setupMIDI`)
- Modify: `src/hooks/useHandsFreeControls.ts:98-157` (the `--- Web MIDI ---` effect)

**Interfaces:**
- Consumes: `getMidiInputSource()`.
- Produces: no API changes — both surfaces keep their existing behavior, they just also work on iPad.

- [ ] **Step 1: Swap the VirtualPiano effect**

In `src/components/sight-singing/VirtualPiano.tsx`, add the import:

```ts
import { getMidiInputSource } from '@/lib/midi/midiInputSource';
```

Replace the whole MIDI `useEffect` (the one declaring `handleMIDIMessage` and `setupMIDI`, ending with deps `[playNote, stopNote, isMobile, isFullScreen, dynamicKeyWidth]`) with:

```tsx
  // Hardware MIDI input — Web MIDI on desktop, GWMidi plugin on iPad.
  useEffect(() => {
    const source = getMidiInputSource();
    if (!source.supported) return;
    let cancelled = false;
    let unsub: (() => void) | null = null;

    source
      .subscribe('', (data) => {
        const [status, note, velocity] = data;
        const command = status & 0xf0;
        // Note On (144) or Note Off (128); note-on with velocity 0 is a release.
        if (command === 144 && velocity > 0) {
          const { name, frequency } = midiNoteToName(note);
          playNote(name, frequency, velocity);
        } else if (command === 128 || (command === 144 && velocity === 0)) {
          const { name } = midiNoteToName(note);
          stopNote(name);
        }
      })
      .then((u) => { if (cancelled) u(); else unsub = u; })
      .catch(() => { /* MIDI access denied — piano still works by touch */ });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [playNote, stopNote]);
```

(The old deps `isMobile, isFullScreen, dynamicKeyWidth` were left over from a removed auto-scroll feature — the handler doesn't use them.)

Also delete the now-unused `let midiAccess ...` declaration if it sits above the replaced effect, and remove the `MIDIMessageEvent`/`MIDIInput` type usages that belonged to the old block if they become unreferenced.

- [ ] **Step 2: Swap the hands-free effect**

In `src/hooks/useHandsFreeControls.ts`, add the import:

```ts
import { getMidiInputSource } from '@/lib/midi/midiInputSource';
```

Replace the `// --- Web MIDI ---` effect (lines ~99–157) with:

```ts
  // --- MIDI (Web MIDI on desktop, GWMidi plugin on iPad) --------------------
  useEffect(() => {
    const source = getMidiInputSource();
    if (!source.supported) { setMidiAvailable(false); return; }
    let cancelled = false;
    let unsub: (() => void) | null = null;

    const refreshInputs = () => {
      void source.listInputs().then((list) => {
        if (!cancelled) setMidiInputs(list.map((i) => i.name));
      });
    };
    const offState = source.onStateChange(refreshInputs);

    source
      .subscribe('', (data) => {
        const s = settingsRef.current;
        if (!s.midiEnabled && learningRef.current === null) return;
        const [status, data1, data2] = data;
        const cmd = status & 0xf0;
        let evt: MidiBinding | null = null;
        if (cmd === 0x90 && data2 > 0) {
          evt = { type: 'note', key: data1, label: `Note ${data1}` };
        } else if (cmd === 0xb0 && data2 > 0) {
          evt = { type: 'cc', key: data1, label: `CC ${data1}` };
        }
        if (!evt) return;

        if (learningRef.current) {
          // Learning mode: assign this event to the target slot.
          const target = learningRef.current;
          setSettings((prev) => ({
            ...prev,
            midiBindings: { ...prev.midiBindings, [target]: evt! },
          }));
          setMidiLearning(null);
          return;
        }

        if (s.midiEnabled) {
          const nextB = s.midiBindings.next;
          const prevB = s.midiBindings.prev;
          if (nextB && nextB.type === evt.type && nextB.key === evt.key) handlersRef.current.onNext();
          else if (prevB && prevB.type === evt.type && prevB.key === evt.key) handlersRef.current.onPrev();
        }
      })
      .then((u) => {
        if (cancelled) { u(); return; }
        unsub = u;
        setMidiAvailable(true);
        refreshInputs();
      })
      .catch(() => { if (!cancelled) setMidiAvailable(false); });

    return () => {
      cancelled = true;
      offState();
      unsub?.();
    };
  }, []);
```

- [ ] **Step 3: Verify the suite and the build**

Run: `cd ~/Documents/GitHub/gleeworld && npx vitest run && npm run build 2>&1 | tail -5`
Expected: full vitest suite PASS; vite build clean.

- [ ] **Step 4: Commit**

```bash
cd ~/Documents/GitHub/gleeworld
git add src/components/sight-singing/VirtualPiano.tsx src/hooks/useHandsFreeControls.ts
git commit -m "refactor(midi): VirtualPiano + hands-free controls read through MidiInputSource

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Bluetooth pairing button in the Studio MIDI picker

**Files:**
- Modify: `src/pages/studio/StudioEditor.tsx` — `MidiInputSection` (currently lines 5479–5509)

**Interfaces:**
- Consumes: `getMidiInputSource()` (`kind`, `showBluetoothPairing()`). `StudioEditor.tsx` already imports `toast` from sonner.
- Produces: UI only — no new props; `MidiInputProps` unchanged.

- [ ] **Step 1: Add the import**

In `src/pages/studio/StudioEditor.tsx`, alongside the other `@/lib` imports:

```ts
import { getMidiInputSource } from '@/lib/midi/midiInputSource';
```

- [ ] **Step 2: Add the button**

In `MidiInputSection`, after the closing `</div>` of the `flex items-center gap-2` row and before the `status === 'denied'` line, insert:

```tsx
      {enabled && getMidiInputSource().kind === 'native' && (
        <button
          onClick={() => {
            void getMidiInputSource().showBluetoothPairing().then((ok) => {
              if (!ok) toast.error('Could not open Bluetooth MIDI pairing.');
            });
          }}
          className="mt-1.5 h-8 px-3 rounded border text-sm bg-muted border-border text-muted-foreground hover:bg-muted/70"
        >
          Pair Bluetooth MIDI…
        </button>
      )}
```

Also update the section copy so it isn't USB-specific — change the `Label` text from `USB MIDI keyboard — play &amp; record` to `MIDI keyboard — play &amp; record`.

- [ ] **Step 3: Verify the build**

Run: `cd ~/Documents/GitHub/gleeworld && npm run build 2>&1 | tail -5`
Expected: clean build. (The button renders only when `kind === 'native'`, i.e. never in a desktop browser — that's by design; web users pair Bluetooth MIDI in the OS.)

- [ ] **Step 4: Commit**

```bash
cd ~/Documents/GitHub/gleeworld
git add src/pages/studio/StudioEditor.tsx
git commit -m "feat(studio): Bluetooth MIDI pairing button on iPad

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: `GWMidiPlugin.swift` — the CoreMIDI plugin

**Files:**
- Create: `ios/App/App/GWMidiPlugin.swift`
- Modify: `ios/App/App/MainViewController.swift` (register the plugin)
- Modify: `ios/App/App.xcodeproj/project.pbxproj` (add the file to the App target)

**Interfaces:**
- Consumes: nothing from JS-land; must match the contract from Task 2 exactly — `jsName "GWMidi"`, methods `start`/`stop`/`listInputs`/`showBluetoothPairing`, events `midiMessage` `{ portId, data, tsMs }` and `stateChange` `{ inputs }`. `portId` is `kMIDIPropertyUniqueID` stringified — the same value `listInputs` returns as `id`.
- Produces: the native half of the feature.

- [ ] **Step 1: Write the plugin**

Create `ios/App/App/GWMidiPlugin.swift`:

```swift
// GWMidiPlugin
//
// CoreMIDI input bridge for the Studio / VirtualPiano / hands-free
// viewer. iOS WebKit has no Web MIDI API, so hardware keyboards (USB-C
// or Bluetooth LE) are invisible to the webview — this plugin forwards
// their channel-voice messages over the Capacitor bridge instead.
//
// Input only by design: no output ports, so the web app's MIDI Clock
// sender stays feature-hidden on iPad. Sysex (0xF0) and realtime
// (0xF8–0xFF) traffic never crosses the bridge.
//
// Threading: CoreMIDI delivers on a realtime thread. notifyListeners
// must run on main (same constraint as StudioEnginePlugin's recordPeak),
// so every emit hops through DispatchQueue.main.

import Foundation
import Capacitor
import CoreMIDI
import CoreAudioKit

@objc(GWMidiPlugin)
public class GWMidiPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GWMidiPlugin"
    public let jsName = "GWMidi"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "listInputs", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showBluetoothPairing", returnType: CAPPluginReturnPromise),
    ]

    private var client = MIDIClientRef()
    private var inputPort = MIDIPortRef()
    private var running = false
    // mach_absolute_time → milliseconds conversion, resolved once.
    private static let timebase: Double = {
        var info = mach_timebase_info_data_t()
        mach_timebase_info(&info)
        return Double(info.numer) / Double(info.denom) / 1_000_000.0
    }()

    // MARK: - Lifecycle

    @objc func start(_ call: CAPPluginCall) {
        if running { call.resolve(); return }

        var status = MIDIClientCreateWithBlock("GWMidiClient" as CFString, &client) { [weak self] notification in
            // Hot-plug / Bluetooth connect+disconnect. CoreMIDI posts this
            // on its own thread; hop to main for connect + notify.
            if notification.pointee.messageID == .msgSetupChanged {
                DispatchQueue.main.async {
                    self?.connectAllSources()
                    self?.emitStateChange()
                }
            }
        }
        guard status == noErr else { call.reject("MIDIClientCreate failed (\(status))"); return }

        status = MIDIInputPortCreateWithProtocol(client, "GWMidiInput" as CFString, ._1_0, &inputPort) { [weak self] eventListPtr, srcConnRefCon in
            self?.handle(eventListPtr: eventListPtr, refCon: srcConnRefCon)
        }
        guard status == noErr else {
            MIDIClientDispose(client)
            client = MIDIClientRef()
            call.reject("MIDIInputPortCreate failed (\(status))")
            return
        }

        connectAllSources()
        running = true
        call.resolve()
    }

    @objc func stop(_ call: CAPPluginCall) {
        teardown()
        call.resolve()
    }

    deinit {
        teardown()
    }

    private func teardown() {
        guard running || client != 0 else { return }
        if inputPort != 0 { MIDIPortDispose(inputPort); inputPort = MIDIPortRef() }
        if client != 0 { MIDIClientDispose(client); client = MIDIClientRef() }
        running = false
    }

    // MARK: - Sources

    private func connectAllSources() {
        guard inputPort != 0 else { return }
        for i in 0..<MIDIGetNumberOfSources() {
            let source = MIDIGetSource(i)
            guard source != 0 else { continue }
            // refCon carries the source's uniqueID so the receive block can
            // label messages without a lookup. Re-connecting an already
            // connected source returns an error we can ignore.
            let refCon = UnsafeMutableRawPointer(bitPattern: Int(uniqueId(of: source)))
            MIDIPortConnectSource(inputPort, source, refCon)
        }
    }

    private func uniqueId(of endpoint: MIDIEndpointRef) -> Int32 {
        var value: Int32 = 0
        MIDIObjectGetIntegerProperty(endpoint, kMIDIPropertyUniqueID, &value)
        return value
    }

    private func displayName(of endpoint: MIDIEndpointRef) -> String {
        var name: Unmanaged<CFString>?
        if MIDIObjectGetStringProperty(endpoint, kMIDIPropertyDisplayName, &name) == noErr,
           let cf = name?.takeRetainedValue() {
            return cf as String
        }
        return "MIDI Device"
    }

    private func currentInputs() -> [[String: Any]] {
        (0..<MIDIGetNumberOfSources()).compactMap { i in
            let source = MIDIGetSource(i)
            guard source != 0 else { return nil }
            return ["id": String(uniqueId(of: source)), "name": displayName(of: source)]
        }
    }

    @objc func listInputs(_ call: CAPPluginCall) {
        call.resolve(["inputs": currentInputs()])
    }

    private func emitStateChange() {
        notifyListeners("stateChange", data: ["inputs": currentInputs()])
    }

    // MARK: - Receive

    private func handle(eventListPtr: UnsafePointer<MIDIEventList>, refCon: UnsafeMutableRawPointer?) {
        let portId = refCon.map { String(Int32(truncatingIfNeeded: Int(bitPattern: $0))) } ?? ""
        var messages: [(bytes: [Int], tsMs: Double)] = []

        for packetPtr in eventListPtr.unsafeSequence() {
            let tsMs = Double(packetPtr.pointee.timeStamp) * Self.timebase
            for word in packetPtr.words() {
                // Universal MIDI Packet, message type 0x2 = MIDI 1.0 channel voice.
                guard (word >> 28) & 0xF == 0x2 else { continue }
                let status = Int((word >> 16) & 0xFF)
                // Channel-voice only: sysex / realtime never cross the bridge.
                guard status < 0xF0 else { continue }
                let d1 = Int((word >> 8) & 0x7F)
                let d2 = Int(word & 0x7F)
                messages.append((bytes: [status, d1, d2], tsMs: tsMs))
            }
        }
        guard !messages.isEmpty else { return }

        // CoreMIDI thread → main; notifyListeners writes through the bridge.
        DispatchQueue.main.async { [weak self] in
            for m in messages {
                self?.notifyListeners("midiMessage", data: [
                    "portId": portId,
                    "data": m.bytes,
                    "tsMs": m.tsMs,
                ])
            }
        }
    }

    // MARK: - Bluetooth pairing

    private weak var pairingNav: UINavigationController?

    @objc func showBluetoothPairing(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self, let host = self.bridge?.viewController else {
                call.reject("No view controller to present from")
                return
            }
            let central = CABTMIDICentralViewController()
            central.navigationItem.rightBarButtonItem = UIBarButtonItem(
                barButtonSystemItem: .done,
                target: self,
                action: #selector(self.dismissPairing)
            )
            let nav = UINavigationController(rootViewController: central)
            nav.modalPresentationStyle = .formSheet
            self.pairingNav = nav
            host.present(nav, animated: true) { call.resolve() }
        }
    }

    @objc private func dismissPairing() {
        pairingNav?.dismiss(animated: true)
        pairingNav = nil
    }
}
```

- [ ] **Step 2: Register the plugin**

In `ios/App/App/MainViewController.swift`, inside `capacitorDidLoad()`, after the `StudioEnginePlugin` registration line, add:

```swift
        // GWMidiPlugin — CoreMIDI input bridge (iOS WebKit has no Web
        // MIDI). Same dead-strip problem as the others, same explicit fix.
        bridge?.registerPluginInstance(GWMidiPlugin())
```

- [ ] **Step 3: Add the file to the Xcode target**

The project uses explicit pbxproj file lists (no fileSystemSynchronizedGroups). Edit `ios/App/App.xcodeproj/project.pbxproj`, mirroring the four `StudioEnginePlugin.swift` entries (grep for it to find each section). Use these two new 24-hex-char IDs consistently: `6A1D00000000000000000001` (build file) and `6A1D00000000000000000002` (file ref).

1. In the `PBXBuildFile` section (next to line ~10):
```
		6A1D00000000000000000001 /* GWMidiPlugin.swift in Sources */ = {isa = PBXBuildFile; fileRef = 6A1D00000000000000000002 /* GWMidiPlugin.swift */; };
```
2. In the `PBXFileReference` section (next to line ~41):
```
		6A1D00000000000000000002 /* GWMidiPlugin.swift */ = {isa = PBXFileReference; includeInIndex = 1; lastKnownFileType = sourcecode.swift; path = GWMidiPlugin.swift; sourceTree = "<group>"; };
```
3. In the `App` group's `children` list (next to line ~132):
```
				6A1D00000000000000000002 /* GWMidiPlugin.swift */,
```
4. In the `Sources` build phase `files` list (next to line ~291):
```
				6A1D00000000000000000001 /* GWMidiPlugin.swift in Sources */,
```

- [ ] **Step 4: Build for the simulator to verify it compiles**

```bash
cd ~/Documents/GitHub/gleeworld/ios/App
xcodebuild -workspace App.xcworkspace -scheme App \
  -destination 'generic/platform=iOS Simulator' build 2>&1 | tail -5
```
Expected: `** BUILD SUCCEEDED **`. If Swift errors mention `words()` / `unsafeSequence()`, the deployment target predates iOS 14 — it doesn't (this app targets 14+), so treat any such error as a real typo, not an API gap.

- [ ] **Step 5: Commit**

```bash
cd ~/Documents/GitHub/gleeworld
git add ios/App/App/GWMidiPlugin.swift ios/App/App/MainViewController.swift ios/App/App.xcodeproj/project.pbxproj
git commit -m "feat(ios): GWMidiPlugin — CoreMIDI input bridge for hardware keyboards

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: End-to-end verification (simulator first, then device)

**Files:** none created — verification only.

**Interfaces:**
- Consumes: everything above.
- Produces: evidence the feature works before any TestFlight upload.

- [ ] **Step 1: Full JS gate**

```bash
cd ~/Documents/GitHub/gleeworld && npx vitest run && npm run build 2>&1 | tail -3
```
Expected: full suite PASS, clean build.

- [ ] **Step 2: Sync the fresh web bundle into the iOS app**

```bash
cd ~/Documents/GitHub/gleeworld && npx cap sync ios 2>&1 | tail -3
```
Expected: `✔ Sync finished`. (The app bundles `dist/` — without this the sim runs stale JS.)

- [ ] **Step 3: Simulator smoke test with real MIDI**

The iOS simulator shares the Mac's CoreMIDI devices — plug the WP06 (or any MIDI keyboard) into the Mac, then:

```bash
cd ~/Documents/GitHub/gleeworld/ios/App
xcodebuild -workspace App.xcworkspace -scheme App \
  -destination 'platform=iOS Simulator,name=iPad Pro 13-inch (M4)' build 2>&1 | tail -3
# then install + launch via Xcode or simctl
```

In the simulator app: open the Studio → audio settings → the MIDI input section must appear (it was hidden before on iOS). Enable it, confirm the keyboard shows in the device list, add + arm a MIDI track, play keys → notes sound and record into a clip. Sustain pedal writes CC64. If no hardware keyboard is at hand, any Mac virtual MIDI source (e.g. an IAC Driver bus fed by a DAW) exercises the same path.

- [ ] **Step 4: Check the web app didn't regress**

Load the local preview (`npm run preview` or the `Documents/GitHub/gleeworld:verify` skill) in Chrome: Studio MIDI input, MIDI Clock sync section, and hands-free MIDI settings all behave exactly as before. The "Pair Bluetooth MIDI…" button must NOT appear in the browser.

- [ ] **Step 5: Hand off for device QA + ship decision**

- Web changes deploy with the next normal web deploy (no behavior change for browsers).
- iOS: bump `CURRENT_PROJECT_VERSION` to 158 in `ios/App/App.xcodeproj/project.pbxproj` (both Debug and Release entries; `MARKETING_VERSION` stays 1.0.4 unless 1.0.4 has been approved by then).
- **STOP and confirm with Kevin before any App Store Connect upload** (standing rule). Kevin's device QA list: WP06 over USB-C and over Bluetooth (pair via the new button) — record a take, sustain lane, MIDI editor monitor, sight-singing piano, viewer page-turn bindings.

---

## Self-Review Notes

- Spec coverage: plugin (Task 6), wrapper (Task 2), facade both backends (Tasks 1–2), three consumer swaps (Tasks 3–4), pairing button (Task 5), error handling (denied → rejected subscribe → status 'denied'; plugin failure → catch in wrapper-consuming backend; pairing failure → `false` + toast), testing pyramid (unit → sim with real CoreMIDI → device QA), ship vector + build 158 + upload confirmation (Task 7). MIDI Clock stays untouched per spec ("out of scope").
- Type consistency: `MidiInputDescriptor`, `GWMidiPluginShape`, `subscribe(deviceId, onMessage) → Promise<() => void>`, `portId`/`id` = stringified `kMIDIPropertyUniqueID` — consistent across Tasks 1, 2, 3, 6.
- The spec's "webview reload while native port open" concern is covered by `start()` idempotence + `teardown()` in `deinit`/`stop`.
