# Studio MIDI Engine — Producer-Grade Sound, Native Parity, Tight Feel

**Date:** 2026-08-02
**Status:** Approved design, pre-implementation
**Approach:** Grow the gw: premium sample bank and compile it to per-instrument SoundFonts for the native iOS engine (approach A, chosen over a full SF2/SFZ engine swap and over AUv3 hosting).

## Problem

Studio's MIDI stack is strong on capture (Web MIDI + native CoreMIDI input,
hardware-timestamp timebase anchoring, CC64 sustain recording, piano-roll
editing) but weak on the way out:

- **iPad sound quality:** the native engine's only instruments are
  `synth_basic` (sine/saw) and `kit_basic` (3-piece synthesized kit) —
  `ios/App/App/Studio/Instruments.swift`. Every MIDI track on iPad plays
  through a toy synth regardless of the chosen preset.
- **Web sound ceiling:** the gw: bank (12 instruments) is good but shallow in
  velocity layers for piano, has no brass/winds/bass, no round-robin, and no
  sample loops (sustained strings die when the source sample ends).
- **iPad feel:** live MIDI monitoring routes through WKWebView web audio
  (high latency); native playback ignores CC64, so pedal takes recorded under
  schema 1.1.0 sound wrong on iPad.

Sound quality and iOS parity are one problem: the platforms don't share an
instrument layer. This design makes one sample bank feed two renderers.

## Goals

1. Producer-grade piano, orchestral strings/brass/winds, and rhythm-section
   sounds, identical in character on web and iPad.
2. Native iPad MIDI playback through real samples with CC64 sustain.
3. Low-latency live monitoring on iPad (input → native sampler, no JS bridge
   in the audio path).
4. No session-schema changes for playback; existing sessions simply sound
   better.

## Non-Goals (explicitly out of scope)

- AUv3 plugin hosting (remains "Phase 4" per existing native code comments).
- MPE, per-note expression, new editing features (humanize, groove quantize).
- Replacing the GM soundfont fallback tier or the Tone.js engine.
- Round-robin on iOS (SF2 cannot express it; iPad plays the first sample of
  each round-robin group — accepted divergence, documented in CREDITS.md).

## Current State (verified 2026-08-02)

- Web: `src/lib/studio/engine/layeredSampler.ts` — manifest-driven
  velocity-layered sampler (LayeredSampler pitched / KitSampler kits), release
  samples, module-level manifest + decoded-buffer caches, GM fallback contract
  ("a track is never silently dead"). Catalog in
  `src/lib/studio/gwInstruments.ts` (12 instruments), samples served from the
  glee-world Space `studio-samples/` path through the
  supabase.gleeworld.org public-storage proxy (CORS + CSP already handled).
- Pipeline: `scripts/studio-samples/` — `build-recipes.mjs`, `convert.mjs`,
  `extract-sf2.mjs`, `SOURCES.json`, `CREDITS.md`. Already extracts from SF2
  sources to build gw manifests.
- Native: `ios/App/App/Studio/Engine.swift` (AVAudioEngine transport,
  sample-accurate audio scheduling), `Instruments.swift` (EngineInstrument
  protocol: `trigger(pitch:durationSeconds:velocity01:)` — fire-and-forget),
  `GWMidiPlugin.swift` (CoreMIDI input, input-only).

## Architecture

One sample bank, two renderers:

```
open-license libraries (VSCO2/VCSL, Salamander-class piano, kits…)
        │  scripts/studio-samples (offline, deterministic)
        ├─→ manifest.json + per-note samples  ──→ web LayeredSampler (Tone.js)
        └─→ instrument.sf2 (new emit-sf2 stage) ─→ iOS GwSamplerInstrument
                                                    (AVAudioUnitSampler)
```

Both artifacts upload to the same `studio-samples/<instrument>/` folder and
serve through the existing storage proxy.

### Workstream 1 — Bank expansion (web + shared)

Catalog grows from 12 to ~20 instruments. Priorities from Kevin: piano,
strings & orchestral, rhythm section.

- **Piano:** rebuild `grand_piano` from a Salamander-class library — 6–8
  velocity layers, release/damper samples, longer natural decay. Single
  biggest audible win.
- **Strings:** rebuild `string_ensemble` from VSCO2/VCSL section recordings;
  add `strings_staccato` (articulation as a separate preset); re-source
  violin/cello/pizzicato at higher layer counts where libraries allow.
- **Brass & winds (new):** trumpet section, trombone/low brass, flute,
  clarinet.
- **Rhythm section (new):** upright bass, electric bass (fingered), drawbar
  organ; re-source `electric_piano` with real velocity layers; existing three
  kits gain more velocity layers and round-robin hits where source material
  allows.

**Manifest format** gains two optional, backward-compatible fields:

- `roundRobin`: alternate samples per note/velocity zone; LayeredSampler
  cycles them so repeated notes don't machine-gun. Absent → exactly today's
  behavior.
- `loop`: per-sample loop points; sustained instruments hold indefinitely.
  Absent → today's behavior.

Old manifests remain valid; no version bump needed (manifests are
instrument-bank files, not session files — the iOS 1.0.3 schema-rejection
class of problem does not apply; presets stay `gw:<name>` strings with GM
fallback).

**Size discipline:** each instrument budgeted ~20–40 MB compressed. Lazy
manifest-driven loading and the decoded-buffer cache already bound memory and
bandwidth. GM soundfonts remain the untouched fallback tier.

### Workstream 2 — Native parity (iOS)

**`emit-sf2` pipeline stage:** packages each instrument's velocity splits,
loop points, and release behavior into one `.sf2` per instrument
(`studio-samples/<name>/instrument.sf2`), uploaded next to the manifest. The
manifest carries the SF2's content hash and byte size.

**`GwSamplerInstrument`** (new, in `Instruments.swift`): when a track preset
is `gw:<name>`, the factory builds an `AVAudioUnitSampler`, downloads the SF2
(URLSession, into `Caches/gw-instruments/<name>-<hash>.sf2`), verifies the
hash, and calls `loadSoundBankInstrument`. Until loaded (first launch,
offline), the track plays through `synth_basic` and switches over when ready
— mirroring the web's never-silently-dead contract.

**Note lifecycle:** `EngineInstrument` grows `noteOn(pitch:velocity:)`,
`noteOff(pitch:)`, and `controller(number:value:)` alongside the existing
`trigger`. The scheduler sends note-ons/offs at their timeline positions and
replays CC64 events from schema-1.1.0 clips via `sendController(64, …)` — the
sampler's damper behavior then matches the web engine's `applySustain`
semantics. `synth_basic` and `kit_basic` keep the `trigger` path unchanged.

**Live monitoring:** while the native engine is running, `GWMidiPlugin`
routes incoming note/CC events directly to the armed track's
`GwSamplerInstrument` in Swift. WKWebView `LiveVoices` remains the monitor
for web/desktop. This removes the JS bridge from the iPad audio path —
the latency fix.

### Workstream 3 — Timing & feel

Mostly carried by Workstream 2 (native monitoring + native CC64). Additional:

- Verify the capture timebase (`midiTimebase.ts`) against native playback:
  a take recorded on iPad must land at the same grid positions when played on
  web and native (parity fixture below).
- No changes to quantize, editing, or the transport clock.

## Error Handling

- **Download/load failure:** web falls back to GM (existing); native falls
  back to `synth_basic`, retries on the next engine rebuild, and evicts
  partial/failed downloads so a bad fetch can't poison the cache.
- **Cache integrity:** SF2 verified against the manifest hash before load;
  mismatch → delete + re-download. Cache lives in `Caches/` so iOS may
  reclaim it; absence is just the cold-start path.
- **Memory:** instruments load per-track and unload on track delete or
  instrument switch. 20–40 MB budget keeps large sessions under
  older-iPad/WKWebView pressure points.
- **Mid-load races:** native instrument swaps are FIFO-serialized (same
  discipline as the web MidiInputSource facade) so rapid preset switching
  cannot leave a zombie sampler attached to the graph. Any AVAudioEngine
  attach/detach that can throw NSExceptions goes through
  StudioObjC.catchExceptions per existing practice.

## Testing

- **Pipeline:** `emit-sf2` is deterministic (same recipe → byte-identical
  SF2), unit-tested, with a validation pass asserting every manifest zone is
  present in the SF2.
- **Web:** vitest for round-robin cycling and loop-point handling in
  `LayeredSampler` (pure-logic tests in the existing style).
- **Native:** Swift unit tests for note-lifecycle scheduling and CC64 math
  (style of `grownSessionLength`).
- **Cross-platform parity fixtures** (B2 mixer precedent): render a reference
  MIDI clip through both engines; assert loudness/duration within tolerance.
  Catches "iPad sounds different" in CI.
- **Kevin device QA checklist:** WP06 pedal feel through native sustain,
  monitor-latency A/B (native vs. old web monitor), instrument switching
  mid-playback, airplane-mode fallback behavior, and a large session on the
  oldest supported iPad.

## Delivery Order

1. Manifest `loop`/`roundRobin` + LayeredSampler support + piano rebuild
   (web-only, immediately audible).
2. `emit-sf2` stage + `GwSamplerInstrument` + native note lifecycle/CC64
   (iPad parity; needs a TestFlight build).
3. Native live monitoring through the sampler.
4. Remaining catalog expansion (strings, brass/winds, rhythm section) —
   incremental, no code changes once 1–2 land.

Each step ships independently; step 4 is content work that can trickle in.
