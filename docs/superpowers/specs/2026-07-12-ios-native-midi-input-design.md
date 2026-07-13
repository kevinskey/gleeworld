# iOS Native MIDI Input — Design

**Date:** 2026-07-12
**Status:** Approved (design review with Kevin, 2026-07-12)

## Problem

Every MIDI feature in the web app is built on the Web MIDI API
(`navigator.requestMIDIAccess`). iOS does not implement Web MIDI — not in
Safari and not in the Capacitor WKWebView — so on iPad the feature
detection fails and all MIDI UI hides itself. The iPad itself handles MIDI
hardware fine at the OS level (CoreMIDI sees USB and Bluetooth keyboards
instantly); the gap is purely that WebKit doesn't expose it to web content.

Affected surfaces (all three are in scope):

1. **Studio** — `src/hooks/useStudioMidiInput.ts`: MIDI recording,
   monitoring, sustain pedal, MIDI editor (PRs #133/#134/#135/#138).
2. **VirtualPiano** — `src/components/sight-singing/VirtualPiano.tsx`:
   hardware-keyboard input for sight-singing.
3. **Hands-free viewer** — `src/hooks/useHandsFreeControls.ts`: MIDI
   pedal/key page-turn controls in the score viewer.

## Decisions (from design review)

- **Scope:** all three consumer surfaces get native MIDI on iPad.
- **Connections:** USB and Bluetooth. Bluetooth pairing via Apple's
  built-in `CABTMIDICentralViewController` sheet.
- **Direction:** input only for v1. No output ports; the Studio's MIDI
  Clock sender (`src/lib/studio/midiClock.ts`) stays feature-hidden on
  iPad because it detects no outputs. Deferred until someone needs to
  slave hardware to an iPad.
- **Architecture:** per-hook adapter (explicitly chosen over a
  `navigator.requestMIDIAccess` polyfill). No global monkey-patching;
  each consumer imports a shared facade. The facade keeps the adapter
  logic in one place so "per-hook" doesn't mean "three copies."
- **Studio native-engine gate (amended during final review):** StudioEditor
  predated this feature with `!engineState.native` gates on the MIDI hook,
  the settings section, and the LiveVoices web-audio monitor — which made
  the whole Studio surface unreachable on iPad. Decision (Kevin,
  2026-07-12): lift all three gates. Recording was already engine-agnostic
  (native latency compensation existed); the live monitor now plays through
  the WKWebView's web audio alongside the native engine (shared
  playAndRecord + mixWithOthers session). Monitor feel on a real iPad is a
  device-QA gate. MIDI Clock output stays web-only, unchanged.

## Components

### 1. Native plugin — `ios/App/App/GWMidiPlugin.swift`

Follows the existing local-plugin pattern (`AudioSessionConfigPlugin`,
`StudioEnginePlugin`, `NativeMusicKitPlugin`): `CAPPlugin` +
`CAPBridgedPlugin`, `jsName = "GWMidi"`.

**Methods** (all promise-returning):

- `start()` — create the CoreMIDI client + input port, connect all
  current sources, begin forwarding events. Idempotent.
- `stop()` — disconnect sources, tear down the port/client.
- `listInputs()` → `{ inputs: [{ id, name }] }` — current CoreMIDI
  sources. `id` is the endpoint's unique ID (`kMIDIPropertyUniqueID`)
  stringified; `name` from `kMIDIPropertyDisplayName`.
- `showBluetoothPairing()` — present `CABTMIDICentralViewController` in a
  nav controller with a Done button, on the main thread.

**Events** (via `notifyListeners`):

- `midiMessage` — `{ portId: string, data: number[], tsMs: number }`.
  `data` is the raw MIDI 1.0 byte triplet (status, data1, data2), one
  message per event. Sysex (0xF0) and realtime (0xF8–0xFF) bytes are
  filtered natively and never forwarded. `tsMs` is the CoreMIDI
  timestamp converted to milliseconds (monotonic); v1 consumers ignore
  it, but it rides along for future record-alignment work.
- `stateChange` — `{ inputs: [{ id, name }] }` — fired on CoreMIDI
  setup-changed notifications (hot-plug, Bluetooth connect/disconnect).

**Threading:** CoreMIDI delivers on a realtime thread.
`notifyListeners` is main-thread-only in this app (see the `recordPeak`
pattern in `StudioEnginePlugin.swift`) — hop to main before notifying.
MIDI note rates (tens of events/sec) are far below what the bridge
handles for `recordPeak`; no batching needed for v1. If a dense CC
stream (mod wheel sweeps) ever shows bridge pressure, batch CC events
per runloop tick — noted as a known follow-up, not built now.

**Registration:** add `bridge?.registerPluginInstance(GWMidiPlugin())`
to `MainViewController.capacitorDidLoad`. This is mandatory —
`CAPBridgedPlugin` auto-discovery gets dead-stripped in release builds.

### 2. JS wrapper — `src/plugins/gwMidi.ts`

Typed `registerPlugin<GWMidiPlugin>('GWMidi')` mirroring the existing
wrappers in `src/plugins/`. Exposes `isNativeMidiAvailable()`
(`Capacitor.isNativePlatform()` && platform `ios`), the four methods,
and `addListener` for the two events. On web, everything is a no-op and
`isNativeMidiAvailable()` is false.

### 3. Shared facade — `src/lib/midi/midiInputSource.ts`

One interface both backends implement:

```ts
interface MidiInputSource {
  supported: boolean;
  listInputs(): Promise<{ id: string; name: string }[]>;
  /** deviceId '' = all devices. Returns unsubscribe. */
  subscribe(deviceId: string, onMessage: (data: Uint8Array) => void): Promise<() => void>;
  onStateChange(cb: () => void): () => void;
  /** Native-only; resolves false where unavailable (web). */
  showBluetoothPairing(): Promise<boolean>;
}
```

- `webMidiInputSource` — wraps `navigator.requestMIDIAccess({ sysex:
  false })`; behavior identical to today's inline code (per-device
  `onmidimessage` attach, `onstatechange` re-attach, permission-denied
  surfaces as a rejected `subscribe`).
- `nativeMidiInputSource` — wraps the `gwMidi` plugin: `start()` on
  first subscribe, `stop()` when the last subscriber unsubscribes,
  filters `midiMessage` events by `portId` against `deviceId`, converts
  `data: number[]` to `Uint8Array` before the callback.
- `getMidiInputSource()` — returns native on Capacitor iOS, web
  otherwise. Consumers never branch on platform themselves.

Downstream parsing is untouched: both backends hand raw bytes to the
existing `parseMidiMessage` (`src/lib/studio/midiMessage.ts`).

### 4. Consumer changes

Each consumer swaps its inline `requestMIDIAccess` block for the facade;
public APIs, callback signatures, and everything downstream (record
path, sustain lane, MIDI editor, page-turn actions) are unchanged.

- `src/hooks/useStudioMidiInput.ts` — `supported` comes from the facade;
  effect body becomes subscribe/unsubscribe against it. Return shape
  (`{ supported, inputs, status }`) unchanged.
- `src/components/sight-singing/VirtualPiano.tsx` — same swap in its
  MIDI effect.
- `src/hooks/useHandsFreeControls.ts` — same swap; `setMidiAvailable`
  driven by facade `supported`.

**UI addition (the only one):** a "Pair Bluetooth MIDI…" button in the
Studio's MIDI device picker, rendered only when the native source is
active. Devices paired there appear system-wide, so VirtualPiano and
hands-free pick them up without their own pairing UI. Standard sizing
rules apply (text-xs/text-sm, w-4 h-4 icons minimum).

## Error handling

- **No devices connected:** `listInputs` returns `[]`; existing empty
  states in each surface already handle this.
- **Plugin missing (older app build than the web bundle... not possible —
  the app bundles `dist/`, so JS and native always ship together; but
  defensively):** the wrapper catches "not implemented" from the bridge
  and reports `supported: false`, which is exactly today's behavior.
- **Bluetooth pairing sheet unavailable** (no Bluetooth permission
  scenario): the sheet itself handles messaging; `showBluetoothPairing`
  resolves false on presentation failure and the button shows a toast.
- **Webview reload while native port open:** plugin `stop()` is called
  from `load()`/deinit paths so a stale CoreMIDI client from a previous
  page generation never double-forwards.

## Testing

1. **Unit (vitest):** facade tests with a fake plugin event emitter —
   subscribe/unsubscribe refcounting (start/stop calls), device
   filtering by `portId`, `number[]` → `Uint8Array` conversion,
   state-change propagation. Web backend keeps the existing
   `useStudioMidiInput` behavior tests green.
2. **Simulator:** the iOS simulator shares the Mac's CoreMIDI setup —
   plug the WP06 into the Mac and the sim app sees it. Verifies the full
   native path (plugin → bridge → facade → Studio record) before any
   TestFlight upload.
3. **Device QA (Kevin):** WP06 over USB-C and over Bluetooth on the
   iPad — record a take, sustain pedal lane, MIDI editor monitor,
   sight-singing piano, viewer page-turn.

## Ship vector

- Web deploy carries the facade/consumer changes (no-op for browsers —
  web backend is behavior-identical).
- Native changes require a new iOS build (**158+**, from current main).
  Schema note: MIDI clips already stamp schema 1.1.0 and build 156+
  handles them; this feature adds no manifest changes.
- Per standing rule: confirm with Kevin before any ASC upload.

## Out of scope (deferred)

- MIDI output ports / MIDI Clock chase on iPad.
- CC event batching over the bridge (only if profiling shows pressure).
- Android (no Capacitor Android app yet).
- Native-timestamp-based record alignment (timestamp is already in the
  event payload when we want it).
