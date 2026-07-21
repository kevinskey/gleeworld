# Studio Mixer Refactor — Phase 1 Audit

Document-only PR. Nothing here changes runtime behavior. Purpose: give a
factual snapshot of the current Studio architecture (native iOS + web +
bridge + UI) and enumerate the file-level plan for the multi-phase
mixer refactor before any code is touched.

Approve or push back on the phase plan in §7 before we open a code PR.

---

## 1. Current architecture — native iOS engine

Root: `ios/App/App/Studio/` (+ four top-level plugin files).

### 1.1 File inventory

| File | Lines | Owns |
|---|---|---|
| `Engine.swift` | 1231 | AVAudioEngine, master mixer, output limiter, transport clock, all tracks, metronome, session load |
| `Tracks.swift` | 483 | `TrackBinding` — one track's strip + mute gate + FX chain; clip scheduling |
| `Fx.swift` | 215+ | `FxChain` — serial chain of 6 built-in FX types with live-param + bypass |
| `Instruments.swift` | 106 | `SynthInstrument` (sampler-based sine/saw) + `SamplerInstrument` (drum kit) |
| `Recorder.swift` | 175+ | `StudioNativeRecorder` — AVAudioRecorder wrapper, 30 Hz peak meter, WAV output |
| `ExternalRecorder.swift` | 540 | Dedicated capture engine for Part Tracks — separate AVAudioEngine, watchdog, gain boost |
| `PullRenderer.swift` | 250+ | Experimental lock-free `AVAudioSourceNode` render block (opt-in A/B) |
| `ClipStreamer.swift` | 233 | 4 s ring-buffer disk streamer for long clips |
| `AudioConverter.swift` | 112 | AVAudioFile → Float32 PCM in master format |
| `AudioBufferCache.swift` | 160 | LRU cache (200 MB default), pre-warm on session load |
| `AssetLoader.swift` | 52 | URL → local file download + cache lookup |
| `Mixdown.swift` | 63 | Manual-rendering offline bounce to WAV @ 44.1 kHz stereo |
| `RealtimeThread.swift` | 97 | Thread-policy promotion for background workers |
| `StudioBufferPool.swift` | 160+ | Pre-allocated buffer ring to avoid audio-thread allocs |
| `../StudioEnginePlugin.swift` | 1068 | Capacitor plugin — 40+ methods, `onState` → `notifyListeners` |
| `../StudioModel.swift` | 260 | Codable session schema — `Studio.Session` / `Track` / `Clip` / `FxNode` / `Instrument` / `Asset` |
| `../GWMidiPlugin.swift` | 100+ | CoreMIDI input bridge for hardware keyboards |
| `../StudioObjC.{h,m}` | small | `+catchExceptions:` — wraps AVAudioEngine calls that raise `NSException` |

### 1.2 Native audio graph today

```
Per track:
  strip (AVAudioMixerNode)  ── volume + pan
    → muteGate (AVAudioMixerNode) ── 0 or 1
    → [optional fxChain]
    → masterMixer (AVAudioMixerNode)

Master:
  masterMixer
    → [optional masterFxChain]
    → outputLimiter (AVAudioUnitEffect: PeakLimiter)
    → engine.mainMixerNode
    → hardware
```

Cited connections: `Engine.swift:100–107, 400–434, 460–479` (self-heal
`ensureMasterWired`); `Tracks.swift:67–70, 93–98`.

Metronome player is attached lazily and connected `metronomePlayer →
masterMixer` (`Engine.swift:1052`).

### 1.3 Track model (`TrackBinding`, `Tracks.swift:13–482`)

Present today: `volumeDb`, `pan`, `mute` (via `muteGate`), `solo` (via
`userSolo` + `recomputeSolo`), per-track `fxChain`.

Missing vs. a channel strip: **sends, output-bus selection, insert slots
distinct from FX chain, per-track peak/RMS meters, automation, per-track
freeze/bounce.**

### 1.4 Buses / sends / inserts (native)

Not implemented. Every track is hardwired to `masterMixer`. There is no
submix / aux / send matrix. There is a `masterFxChain` (same 6 built-in
FX types as tracks) and a permanent `outputLimiter`.

The graph mutation protocol (`engine.connect/disconnect/attach/detach`
serialized under `loadLock`, `Engine.swift:351–362`) is already in
place; adding a bus tier is a schema + wiring change, not a new
subsystem.

### 1.5 Transport, metronome, recording (native)

- **Transport clock**: host-time anchor (`mach_absolute_time()`) at
  `play()`, plus `pausedAt` seconds. Position is
  `(now − startHostTime) + pausedAt` (`Engine.swift:73–87, 632`).
  Position tick to JS at ~15 Hz via `Timer` on `RunLoop.main`
  (`Engine.swift:891`).
- **Metronome**: **Foundation `Timer` per beat, not sample-accurate**
  (`Engine.swift:1105–1122`). Click buffers are windowed sine wave, 200 Hz
  duration, 30 ms; 1000 Hz beat / 1500 Hz accent
  (`Engine.swift:1204–1225`). Rebuilds buffers on route change
  (`Engine.swift:1034–1046`). Has a `metronomeNeedsRestart` workaround
  for a case where `.isPlaying == true` but no callback fires
  (`Engine.swift:132–144`, verified 2026-07-03 via node tap).
- **Recording**: `AVAudioRecorder` → `~/tmp/studio-take-<ts>.wav`,
  44.1 kHz mono 16-bit; `updateMeters()` polled at 30 Hz for `recordPeak`
  event (`Recorder.swift:41, 68–74, 105`).

### 1.6 Threading model (native)

- Audio callback: kernel real-time thread (Apple-managed).
- Graph mutations: main thread under `loadLock` (`NSLock`).
- Asset I/O: `DispatchQueue.global(.userInitiated)` or `Task(priority:
  .userInitiated)`.
- **No `@MainActor`, no actors, no Swift concurrency in the audio
  path.** Pure DispatchQueue + Timer.
- Force-unwrap surface: `Fx.swift:42–46` (`bindings.first!` guarded by
  build-time non-empty check).

### 1.7 Capacitor bridge surface (native)

40+ plugin methods (see §3). Events emitted: `state` (15 Hz snapshot),
`playbackStarted/Paused/Stopped`, `audioInterrupted`, `engineRecovered`,
`routeChanged`, `recordPeak` (30 Hz), `externalRecordPeak`. FX events
are declared in the schema but not currently emitted.

### 1.8 Known-fragile native areas

Numbered so we can reference them in the phase plan.

1. **Metronome restart hack** (`Engine.swift:132–144, 1191`). `Timer`
   chain + `metronomeNeedsRestart` flag; race-prone during route +
   stop.
2. **Live-edit graph severing** (`Tracks.swift:93–98`, `Engine.swift:657–770`).
   Connecting a fresh player on a running engine can sever
   `masterMixer → limiter → mainMixer`; `ensureMasterWired` +
   `healWiringAfterIncrementalAdd` re-verify defensively.
3. **Audio-session mode drift** (`Recorder.swift:48–54`, `Engine.swift:417,
   ExternalRecorder.swift:1021`). Past incident where external record
   left `.videoRecording` behind; now guarded, still fragile.
4. **Metronome format renegotiation on route change**
   (`Engine.swift:1029–1046`). `masterMixer.outputFormat` sometimes lags
   behind after AirPods / BT connect.
5. **Pull renderer path** is opt-in per tenant, no metering hook
   (`Engine.swift:805–822`).
6. **Compressor param indexing** by raw integer indices in
   `Fx.swift:126–137`. Fine for Apple's stable DynamicsProcessor,
   brittle if we swap AUs.
7. **Duplicate-listener risk**: `didWireEngineEvents` gate
   (`StudioEnginePlugin:166–170`) is defensive against Capacitor 7
   lifecycle miss; every entry point re-wires idempotently. If it
   regresses, JS gets duplicate `state` events.

---

## 2. Current architecture — web engine (Tone.js)

Root: `src/lib/studio/`. This is what runs in gleeworld.org and inside
the Capacitor iOS webview alongside the native engine.

### 2.1 Class inventory

| Class | File:line | Responsibility |
|---|---|---|
| `StudioEngine` | `engine.ts:81` | Root — master bus, transport, metronome, recording flag, coordinates tracks + FX + mastering |
| `EngineTrack` | `tracks.ts:35` | Runtime per-track wrapper — schedules clips, routes to `masterIn` |
| `EngineFxChain` | `fx.ts:19` | Serial FX chain, stable input/output, 6 node types |
| `MasterChain` | `masterChain.ts:104` | Live mastering (HPF → air shelf → glue comp → preGain → gw-limiter worklet → gw-loudness worklet) |
| `MasterChainSync` | `masterChainSync.ts:52` | State machine that converges live mastering with desired state; fixes the fd2f223e8 handle-null race |
| `MidiTimebase` | `midiTimebase.ts:23` | Maps hardware MIDI timestamps to transport seconds |
| `LiveVoices` | `liveVoices.ts:17` | S88 → track instrument monitor path; routes to `engine.getMasterIn()` after #260 |
| `Recorder` | `recorder.ts:24` | `openMicRecorder` wrapper for mic → WAV → upload |

### 2.2 Web audio graph

```
Per track:
  [Instrument or Player]
    → panvol (Tone.PanVol)
    → muteGate (Tone.Gain)
    → fx (EngineFxChain)
    → eq (BiquadFilter[])
    → track output
    → StudioEngine.masterIn (Tone.Gain × session.master.volume_db)

Master:
  masterIn
    → masterPan (Tone.Panner)
    → masterFx (EngineFxChain)
    → masterMeter (Tone.Meter, post-FX, ~33 ms)
    → [mastering chain if enabled, else destination]
      → destination
      → loudness worklet (parallel tap, 0 outputs)

Metronome: two Tone.Synths → destination (bypasses master, clicks even
if master is muted).

Live monitor (S88):
  inst → panvol → muteGate → eq → engine.masterIn  (#260)
```

Wiring cites: `engine.ts:185, 188–189, 259, 498, 501–503`;
`tracks.ts:58–85`; `masterChain.ts:178–258`.

### 2.3 Session `Track` model (`session.ts:137–162`)

Present: `id, kind ('audio'|'midi'), name, color, volume_db, pan, mute,
solo, arm, fx: FxNode[], eq?: TrackEqBand[]`.

Missing: **sends, output-bus assignment, insert slots (FX is in-series
only), per-track meter contract, automation, input-monitoring mode.**

### 2.4 Buses / sends / inserts (web)

Not implemented. Header comment `session.ts:14–15`: *"Phase 1 keeps
routing simple: every track lands on the master bus. Sends/buses are
deferred to Phase 2."* Every `EngineTrack.output` connects to
`masterIn` at `engine.ts:498`.

### 2.5 Transport, metronome, recording (web)

- **Transport**: `Tone.getTransport()`. Clips scheduled via
  `transport.schedule()` at `engine.ts:815`.
- **Loop wrap**: `setInterval` @ 25 ms watches position, calls
  `repositionAndPlay()` past `loopEnd` — bypasses `transport.loop`
  which was unreliable (`engine.ts:545, 776`).
- **Metronome**: `setInterval` (wall clock), NOT
  `transport.scheduleRepeat` — see design comment at `engine.ts:8`.
- **MIDI recording**: `useStudioMidiInput` calls `onNoteOn(pitch, vel,
  timeStampMs)` (`useStudioMidiInput.ts:54`). StudioEditor uses
  `MidiTimebase.toTransportSeconds()` to place each note relative to
  the hardware anchor rather than the ~30 Hz UI `positionSeconds`
  snapshot.

### 2.6 useStudio hook contract (`hooks/useStudio.ts:252–691`)

Returns `{ engine, state, warming, native, ...api }`. `state` is
emitted by `engine.subscribe(setState)` at `~33 ms`. Native path
returns `engine: null` and dispatches every API call through
`NativeStudio` (Capacitor plugin).

### 2.7 Session persistence

`Session.schema_version` currently `'1.0.0' | '1.1.0'` (`session.ts:19`).
1.1.0 introduces MIDI CC events + premium `gw:` instruments.
Autosave: 800 ms debounce in `useStudioSession` (`useStudio.ts:109,
124–128`). **No explicit migration code** — sessions load as-is,
missing optional fields treated as absent via
`withMasteringDefaults()` (`session.ts:267`).

### 2.8 Known-fragile web areas

1. **FX param hash bug (fixed)** — `useStudio.ts:139–152`. Before
   2026-07-07, `fxSig` didn't include param values, so knob edits
   didn't take. Now it hashes sorted params.
2. **Mastering enable/disable race (fd2f223e8, fixed)** —
   `masterChainSync.ts:1–29, 76–79, 115`. Fix: record desired state
   synchronously at `sync()` start.
3. **Loop wrap during recording** — `engine.ts:159–161, 768–786`.
   Loop watchdog stands down while `recordingActive`. If
   `setRecordingActive(false)` is missed, loop wraps unexpectedly on
   next playback.
4. **Metronome drift on loop wrap** — `engine.ts:573–582`. Wall-clock
   `setInterval` unaware of transport jumps; stopped + restarted at
   every wrap to re-phase.
5. **Track EQ / FX rebuilds the whole track** — `tracks.ts:77–85`,
   `useStudio.ts:162–166`. Any band or enabled toggle triggers a full
   skeleton diff + rebuild.
6. **Mastering pre-gain servo lockout during recording** —
   `engine.ts:350–364`.  `setMasterPreGainDb()` is a no-op while armed.
7. **In-flight seek race** — `engine.ts:866–899`. Async
   `player.onload` may push a stale playback descriptor after
   `player.stop()` during a seek.

---

## 3. Capacitor bridge + React UI

### 3.1 Bridge (JS → Native)

Registered as `NativeStudio` in `src/plugins/studioEngine.ts:156`.

Methods called from JS today:

```
start, loadSession, play, pause, stop, seek,
updateStrip { trackId, volumeDb?, pan?, mute?, solo? },
updateTempo { bpm },
setMetronome { on?, volumeDb? },  clickOnce { accent },
recordStart, recordWithCountIn, recordStop,
prewarmAssets, addClipToTrack, removeClipFromTrack,
setFxParam, bypassEffect,
getHardwareLatencyMs, getHardwareLatency, getAudioRoute,
injectNewClip, updateTrackVolume,
prepareExternalRecordSession, externalRecordStart, externalRecordStop,
setPullRendererEnabled, isPullRendererEnabled
```

Cited call sites: `useStudio.ts:600–634`; `useStudioEngineRuntime.ts:50, 54, 78–92`;
`StudioEditor.tsx:1125–1148, 1167, 2022, 2581, 2583`.

### 3.2 Bridge events (Native → JS)

| Event | Payload | Where consumed | Cleanup |
|---|---|---|---|
| `state` | `{ isReady, isPlaying, positionSeconds, tempoBpm, metronomeOn }` @15 Hz | `useStudio.ts:421` | via `nativeCloseRef.current()` on unmount |
| `recordPeak` | `{ db }` @30 Hz | `StudioEditor.tsx:1167` | explicit `.remove()` @1284 ✓ |
| `externalRecordPeak` | `{ db }` | Part Tracks (not Studio) | Part-Tracks-owned |
| `playbackStarted/Paused/Stopped` | — | not currently consumed | n/a |
| `audioInterrupted` | `{ reason }` | not currently consumed | n/a |
| `engineRecovered` | `{ positionMs }` | not currently consumed | n/a |
| `routeChanged` | `{ outputs, isHeadphones }` | not currently consumed | n/a |

**Listener issues found**:

- `state` subscription in `openNativeStudio()` (`useStudio.ts:421`)
  has no explicit cleanup inside the mount effect — it relies on
  `nativeCloseRef`. If `StudioEditor` remounts with the same
  `sessionId` but a different React key, the old listener may not be
  removed.
- Scroll-sync provider (`MixerView.tsx:136`) adds `scroll` listeners
  to a `Set` without an explicit remove when the tracked element is
  destroyed. Minor risk.

### 3.3 React ↔ engine wiring

Mount flow: `StudioEditor` → `useStudioSession(id)` → `useStudioEngine(session)`
→ native `openNativeStudio()` OR web `new StudioEngine()`. State flows
directly via hook return, no context. `MixerView` polls
`engineState.getTrackPeakDb(trackId)` per rAF at 30 Hz (~33 ms).

**Native per-track metering not bridged yet** — `useStudio.ts:659`
returns `-Infinity` on native, so channel-strip meters show flat on
iOS. Comment: *"Native per-track metering isn't bridged yet."*

### 3.4 Current mixer UI (`src/pages/studio/MixerView.tsx`)

Components: `ChannelStrip` (274–345), `PanKnob` (466–515), `Fader`
(523–585), `PeakMeter` (591–612), `MiniFader` (619–664, phones),
`MasterStrip` (674–800+), `TrackEqPanel` (353–465).

Missing UI (matches missing engine): **no bus / send controls, no
insert-slot rack (EQ only), no output-selector, no routing matrix, no
record-arm button (M/S buttons only — arm lives elsewhere).**

### 3.5 State restoration on mount

`useStudio.ts:324–497`. Native path snapshots playback state, closes
old engine, calls `Native.start()` + `Native.loadSession()`, awaits
prewarm, then resumes playback if the session was playing. Skeleton
diff means clip-only changes splice live via `addClipToTrack` /
`removeClipFromTrack`.

**Optimistic state risk** (`StudioEditor.tsx:180–184`): local session
state mutates immediately, engine call is fire-and-forget. If native
fails, React state has already drifted. Failures are logged, not
surfaced to UI.

---

## 4. Target architecture

The mixer graph we want (unchanged from the requirements doc, restated
for reference):

```
Source
  → inserts (up to 4)
  → pre-fader sends (up to 4)
  → volume + pan
  → post-fader sends (up to 4)
  → mute
  → output bus (default: master; can be any bus)

Bus
  → bus inserts (up to 4)
  → bus volume + pan
  → bus mute + solo
  → output (master or another bus, cycle-checked)

Master
  → master inserts (up to 4)
  → master volume + mute
  → AVAudioEngine.outputNode  (native)  /  AudioContext.destination  (web)
```

V1 limits: 16 tracks, 8 stereo buses, 4 sends per track, 4 inserts per
track/bus/master, one stereo master, WAV export, per-track + per-bus +
master peak/RMS meters, routing cycle prevention.

Design decisions we're locking in now:

- **Native remains authoritative for the iOS app.** Web engine is the
  authoritative for gleeworld.org. Both need bus/send/insert support,
  because the exact same session document has to open on both. Schema
  is shared.
- **Session schema bumps to `2.0.0`** with a documented migration path
  from 1.1.0 (bus + send arrays default to empty; tracks default to
  `output_bus_id = 'master'`). No 1.x sessions should break.
- **No new audio engine.** Extend `StudioEngine` (both native and web),
  don't stand up a competing one.
- **Insert vs FX chain**: today's "FX chain" is essentially inserts on
  a track output. Rename in the schema to `inserts` (with 4-slot cap)
  and keep the existing 6 built-in types + document the AU hook.
- **Solo semantics**: preserve current "any solo silences non-soloed"
  behavior; extend to buses. Solo of a track keeps its output bus
  audible.
- **Meters**: peak + RMS + clip flag, throttled to 30 Hz, one Capacitor
  event per tick containing all channels — not one per channel.

---

## 5. Non-goals for this refactor

Explicitly OUT of scope so we don't scope-creep during code review:

- Third-party AUv3 browsing / hosting on iOS.
- MIDI plug-in hosting.
- Video track integration.
- Group / VCA channel type (only tracks + buses + master).
- Automation lanes UI (Phase 7 — engine hooks only, no UI yet).
- Freeze / bounce per-track.
- Real-time collaboration on a session.
- Windows / Android native engine (web only on non-iOS).

---

## 6. File-level change map

Every file that needs an edit, grouped by phase. Anything that lands in
a single phase must ship green — typecheck + unit tests + iOS build +
manual smoke test — before the next phase opens a PR.

### Phase 2 — stabilize (no new features)

Goal: fix the fragile items in §1.8 and §2.8 first so the mixer
refactor lands on solid ground.

Files:

- `ios/App/App/Studio/Engine.swift` — replace metronome Timer chain
  with sample-accurate scheduling via `AVAudioPlayerNode.scheduleBuffer(_:
  at:)` and host-time future timestamps. Drop
  `metronomeNeedsRestart` workaround (§1.8-1). Keep the format-
  renegotiation guard.
- `ios/App/App/StudioEnginePlugin.swift` — audit event wiring, kill
  double-registration risk (§1.8-7), add exhaustive
  `deinit/removeAllListeners` cleanup.
- `src/lib/studio/engine/engine.ts` — replace metronome
  `setInterval` with a Tone.Transport-locked scheduler so loop wraps
  don't require restart (§2.8-4). Add `setRecordingActive(false)`
  finally-block guard (§2.8-3).
- `src/hooks/useStudio.ts` — explicit cleanup of `state` listener in
  the mount effect, not just via `nativeCloseRef` (§3.2 note).
- `src/pages/studio/MixerView.tsx` — remove scroll-sync `Set` leak
  path (§3.2 note).

Tests added:
- Swift: metronome scheduling determinism under repeated play/pause.
- Web: `midiTimebase` regression around loop wrap; `MasterChainSync`
  disable-during-enable race replay.

### Phase 3 — schema + track channel strip

Files:

- `src/lib/studio/session.ts` — bump `StudioSchemaVersion` to
  `'2.0.0'`, add `Bus`, `Send`, `Insert` types, extend `Track` with
  `output_bus_id: string`, `sends: Send[]`, `inserts: Insert[]`
  (rename of `fx`), `input_monitor: 'off' | 'auto' | 'on'`.
- `src/lib/studio/migrations/` (new) — `v1_to_v2.ts` that lifts
  `session.master.mastering` untouched, adds a default `master` bus,
  seeds `sends: []`, `inserts: track.fx`, `output_bus_id: 'master'`.
  Runs at load time in `useStudioSession` load path
  (`useStudio.ts:89`).
- `ios/App/App/StudioModel.swift` — mirror schema changes as Codable
  Swift structs; add migration hook read at `loadSession`.
- `src/lib/studio/engine/tracks.ts` — extend `EngineTrack` with a
  `outputTarget` node (defaults to `masterIn`) so §2.4 hard-wire
  becomes configurable.
- `ios/App/App/Studio/Tracks.swift` — mirror on native side; add
  `setOutput(bus:)` to `TrackBinding`.
- `src/pages/studio/MixerView.tsx` — add per-track output-bus
  selector to `ChannelStrip`. Add insert-slot list (rebrand existing
  FX list, hard cap at 4).

Tests added:
- Schema migration v1 → v2 round-trip.
- Track routing to non-master bus (unit-level graph assertion, both
  engines).

### Phase 4 — buses, sends, routing validation

Files:

- `src/lib/studio/engine/buses.ts` (new) — `EngineBus` runtime type
  mirroring `EngineTrack` (bus panvol, mute gate, insert chain,
  meter). Exposes `.input` node other tracks/buses connect to.
- `src/lib/studio/engine/engine.ts` — build buses from
  `session.buses`; wire track outputs and sends to their assigned
  bus; validate cycles at `loadSession` time (topo-sort);
  incremental add/remove bus methods.
- `src/lib/studio/routingGraph.ts` (new) — pure cycle-detection
  helper (source → target adjacency, DFS with white/gray/black
  marks). Rejects with `{ code: 'INVALID_ROUTING', ... }` shape.
- `ios/App/App/Studio/Bus.swift` (new) — Swift equivalent of
  `EngineBus`. Native cycle validation uses the same topo-sort helper
  (port routingGraph.ts to Swift).
- `ios/App/App/Studio/Engine.swift` — build/tear buses; wire track
  sends via post-fader tap or pre-fader mixer branch.
- `ios/App/App/StudioEnginePlugin.swift` — new plugin methods:
  `createBus, removeBus, setBusVolume, setBusPan, setBusMute,
  setBusOutput, setBusInsert, setTrackSend, setTrackOutput,
  setTrackInsert, bypassTrackInsert`. Every method returns the
  `{ success, data } | { success, error: { code, message } }` shape.
- `src/plugins/studioEngine.ts` — add matching TS wrappers +
  event types.
- `src/hooks/useStudio.ts` — expose new API methods on the hook
  return.
- `src/pages/studio/MixerView.tsx` — add `BusStrip` component (same
  fader/pan/mute/meter as ChannelStrip). Add per-track sends section
  (4 rows) with target-bus dropdown, level, enabled, pre/post toggle.

Tests added:
- Cycle rejection: `bus1 → bus2 → bus1`.
- Send pre vs post: unit-level graph assertion that pre-fader tap
  reads the panvol input, post-fader reads panvol output.
- Bus mute silences all tracks routed through it.

### Phase 5 — inserts, effects, bypass

Files:

- `src/lib/studio/engine/fx.ts` — expose per-insert bypass without
  rebuilding the chain (currently `enabled: false` triggers a full
  track rebuild; make bypass live).
- `ios/App/App/Studio/Fx.swift` — already supports live bypass; add
  robust "failed to instantiate AU" fallback that logs + skips the
  insert instead of crashing the load.
- `src/pages/studio/InsertRack.tsx` (new, ~150 lines) —
  4-slot rack UI reusable for track / bus / master. Slot dropdown
  chooses effect type; bypass toggle; drag-to-reorder within cap.

Tests added:
- Bypass live update does not rebuild the chain (mock buildFxChain,
  assert call count unchanged).
- Insert failure gracefully falls back.

### Phase 6 — metering across track / bus / master

Files:

- `ios/App/App/Studio/Metering.swift` (new) — install lightweight
  peak+RMS tap on `strip.output` for each track and bus; batch send
  as one Capacitor event per 33 ms tick:
  `{ tracks: { id: { peakL, peakR, rmsL, rmsR, clip } }, buses: {...}, master: {...} }`.
- `ios/App/App/Studio/Engine.swift` — start/stop metering when tracks
  or buses change; teardown in `dispose`.
- `ios/App/App/StudioEnginePlugin.swift` — emit `meters` event.
- `src/plugins/studioEngine.ts` — declare `meters` event and payload
  shape.
- `src/hooks/useStudio.ts` — expose `subscribeToMeters(cb)` /
  cleanup handle.
- `src/pages/studio/MixerView.tsx` — swap web-only `getTrackPeakDb`
  path for the unified subscription; render stereo meter (L/R) +
  clip indicator on every channel strip and bus strip.

Tests added:
- Meter event payload contract test.
- No allocation in the render callback (Swift signpost check).

### Phase 7 — persistence, migration, export

Files:

- `src/lib/studio/migrations/index.ts` — chain runner; fail-loudly
  if a session's schema is newer than the code understands.
- `src/lib/studio/engine/exportRender.ts` — extend offline render
  to walk the bus graph, not just per-track → master. Assert every
  bus/insert included.
- `ios/App/App/Studio/Mixdown.swift` — mirror on native side; export
  progress event.
- `src/pages/studio/StudioEditor.tsx` — export progress UI +
  error surface.

Tests added:
- Session v1.1 loads and mixes down to the same WAV pre- and
  post-migration.
- Export includes bus/insert processing (deterministic offline
  render + hash check).

### Phase 8 — automation foundation

Deliberately minimal in scope: engine reads breakpoint automation from
the session and interpolates during playback. UI is a follow-up.

Files:

- `src/lib/studio/session.ts` — add `Automation` type per parameter:
  `{ trackId, param, mode: 'off' | 'read', points: { time, value,
  curve }[] }`.
- `src/lib/studio/engine/automation.ts` (new) — schedule value
  writes against the transport for volume + pan initially.
- `ios/App/App/Studio/Automation.swift` (new) — mirror.
- `ios/App/App/Studio/Engine.swift` — hook into `startScheduling()`
  path.

Tests added:
- Value interpolation at intermediate times (linear + exponential
  curves).
- Read-mode toggle behavior.

---

## 7. Ordering and PR cadence

Proposed cadence (one PR per phase, merged only after green):

| Phase | What | Est. LOC net | Risk |
|---|---|---|---|
| 2 | Stabilize metronome, lifecycle, listeners | ~500 | Low if constrained to those files |
| 3 | Schema v2 + track output/inserts | ~1500 | Medium — schema migration is load-bearing |
| 4 | Buses + sends + cycle validation | ~2500 | High — most graph mutation surface |
| 5 | Inserts UI + bypass live | ~800 | Low |
| 6 | Unified metering | ~800 | Medium — real-time-safety review needed |
| 7 | Export walks bus graph + persistence hardening | ~600 | Medium |
| 8 | Automation engine foundation | ~700 | Low |

Every PR:

- Ships behind zero new feature flags (schema migration handles v1
  sessions transparently, everything else is additive).
- Runs the existing web `tsc --noEmit`, `vitest run`, plus the new
  tests it introduces.
- Runs the iOS build via the repo's existing scheme. **This is the
  gating step I currently cannot run from my sandbox** — I'll need
  you to `xcodebuild` locally or in CI and paste the result on the
  PR, OR authorize me to shell into a machine with Xcode.
- Manual smoke test: play → record → stop → seek → looping →
  metronome → export, on both web and iOS.

---

## 8. Risks called out early

1. **AVAudioEngine live-graph edits already sever links today**
   (§1.8-2). Adding buses multiplies the edges that can go bad.
   Mitigation: at every bus/send edit, run `ensureMasterWired`
   (extended to check bus connections too). Reject the edit if the
   graph is invalid after mutation instead of half-committing.
2. **Schema v1 sessions in production**. Every existing user session
   must open post-migration. Mitigation: v2 loader accepts v1 input
   directly (migration runs in the read path, not offline). Round-trip
   test on every v1 fixture we can pull from Supabase.
3. **iOS build cannot be verified from my sandbox.** I don't have
   Xcode / signing credentials in the environment I run in. Every
   phase touching Swift needs a manual `xcodebuild -workspace ... -scheme App
   -destination 'generic/platform=iOS' build` on your machine.
4. **Sample-accurate metronome on iOS**. Moving off Timer to
   `scheduleBuffer(at:)` is well-worn Apple API but has subtle
   behavior around format changes and route changes; keep the format-
   renegotiation guard from today.
5. **Metering payload can be a JS hot path** if we emit per-frame.
   30 Hz is the ceiling; below that the UI feels laggy; above that
   we start swamping the JS thread. Enforce throttling in the native
   emitter, not in JS.
6. **Send pre-fader vs post-fader on Tone.js**. Tone doesn't have a
   first-class pre-fader tap; we'll insert a pre-panvol Gain
   explicitly and route sends off it. Adds one node per track.

---

## 9. What I need from you before writing code

1. **Approve the phase plan in §6** (or push back on ordering / scope
   before Phase 2 opens).
2. **Confirm the schema bump to `2.0.0` with the migration in §6
   Phase 3** — this is the load-bearing decision.
3. **Tell me your iOS build story** — either (a) I get authorization
   to shell into a Mac with Xcode set up for gleeworld, or (b) you
   run `xcodebuild` for each Phase PR and paste the result.
4. **Confirm the non-goals list in §5** so we don't argue about them
   inside a Phase 4 PR review.

Nothing above touches runtime code. If you approve, Phase 2's PR is
the next thing that opens.
