# Studio MIDI Editor — Design

**Date:** 2026-07-11
**Status:** Approved by Kevin (conversation, 2026-07-11)
**Scope decisions:** Full editor (level C: draw/move/resize/delete/velocity + CC lanes + transpose) · latency = auto-measured + manual trim, applied at capture · quantize = grid + strength (no swing) · desktop/mouse-first, touch-usable (dedicated touch pass later)

## Problem

Studio MIDI tracks (shipped PRs #133–135) record note data but the clips are opaque:

1. MIDI clips on the timeline render as a plain block labeled "N notes" — no visual note data.
2. There is no in-context note editor. `PianoRollDialog` is a fixed 16-step toggle grid that only edits `track.clips[0]` — a step sequencer, not an editor.
3. Recorded notes land late: `start_seconds` is stamped from `state.positionSeconds` at JS event time with zero compensation, and there is no control to adjust it.
4. No way to quantize recorded notes.

## Solution overview

- **PianoRollPanel** — a docked, canvas-rendered piano-roll editor that opens directly below Smart Controls when a MIDI clip is selected. Full note editing (pointer + pencil tools), velocity lane, CC lanes (sustain/mod), quantize-with-strength, transpose. Replaces `PianoRollDialog` (deleted).
- **Timeline clip preview** — MIDI clip blocks draw a mini note map (time × normalized pitch, velocity as tint) instead of the "N notes" label.
- **Capture-time latency compensation** — auto (measured Web Audio output latency) + manual trim slider; stored note data is correct, not playback-shifted.
- **Schema 1.1.0** — `MidiClip` gains optional `cc` events; sustain becomes real, editable CC64 data instead of being baked into note durations.

## 1. Data model (schema 1.0.0 → 1.1.0)

```ts
export interface MidiCcEvent {
  controller: number;   // 64 = sustain, 1 = mod
  value: number;        // 0..127
  time_seconds: number; // relative to clip start
}

export interface MidiClip {
  // ...existing fields unchanged...
  cc?: MidiCcEvent[];   // absent on legacy clips
}
```

- `MidiNote` unchanged. All times remain float seconds (no PPQ migration); bar/beat conversion stays `60/bpm` via existing helpers.
- **Sustain semantics at record time change:** `SustainTracker` continues to drive live monitoring exactly as today (pedal feel unchanged), but committed notes now store their **true key-up duration**, and pedal down/up events are stored as CC64 events in `clip.cc`. Mod wheel (CC1) records into the same array.
- **Playback derives sustain:** a pure `applySustain(notes, cc)` computes effective durations (note held until pedal-up) before scheduling. Legacy clips have no `cc` → pass-through → bit-identical playback for existing sessions.
- **Mod caveat (explicit):** current synth/sampler doesn't respond to CC1. The mod lane records/displays/edits data for export and future instruments but does not change sound in this iteration. Sustain is fully live end-to-end.
- `STUDIO_SCHEMA_VERSION = '1.1.0'`. Matching **optional** field added to `ios/App/App/StudioModel.swift` (decode-tolerant only; native playback changes out of scope — MIDI recording is web-engine-only).
- Loader tolerates 1.0.0 and 1.1.0; missing/corrupt `cc` treated as `[]`.

## 2. Latency compensation (auto + trim)

Applied **at capture** in `src/lib/studio/midiRecord.ts`: every note start and CC event time is shifted earlier by `(autoMs + trimMs)`.

- **Auto** = `getOutputLatencyMs()` from `src/lib/audio/sharedRecorder.ts`. Rationale: the player performs in time with what they hear, which is late by the output latency, so notes land late by that amount. Mirrors the proven Part Tracks take-alignment logic.
- **Trim** = new "MIDI recording offset" slider, ±100 ms, default 0, persisted to `localStorage['studio.midiTrimMs']`, placed in the existing audio-settings dialog next to the input/device latency dials. UI shows the resolved total (e.g., "auto 23 ms + trim 10 ms = 33 ms early").
- Clamped at clip start (existing `max(0, …)`).
- New recordings only — no retroactive rewriting. Existing late takes are fixed with quantize.

## 3. PianoRollPanel

### Placement & lifecycle

- Renders directly below `SmartControls` in `StudioEditor.tsx` when `selectedClip` is a MIDI clip.
- Persists until a non-MIDI clip is selected or closed via ×. Collapse chevron shrinks to a title bar without clearing selection (same behavior as Smart Controls).
- Per-track "Piano roll" button opens the panel: selects the track's first clip, or creates an empty 4-bar clip if the track has none (compose-from-scratch path).
- `PianoRollDialog` is deleted.

### Anatomy

Canvas-rendered note grid (PeaksCanvas pattern; DOM-per-note rejected for perf past a few hundred notes). ~300 px tall on desktop.

```
┌─ toolbar: [pointer|pencil] [grid: 1/4▾] [strength: 80%] [Quantize] [♯+1 ♭-1 8va 8vb] ─┐
│ ┌──────┬───────────── time ruler (bars.beats) ─────────────┐                          │
│ │ piano│ note grid — rounded bars, velocity = opacity;     │  v-scroll pitch          │
│ │ keys │ gridlines from grid selector; playhead line       │                          │
│ ├──────┼────────────────────────────────────────────────────┤                          │
│ │ lane▾│ velocity bars / CC64 sustain blocks / CC1 curve   │  lane selector           │
│ └──────┴────────────────────────────────────────────────────┘                          │
```

- Horizontal zoom/scroll **independent** of the main timeline.
- Vertical scroll spans all 128 keys; auto-centers on the clip's pitch content when opened.
- Sustained note tails (per `applySustain`) ghost-rendered in a lighter shade past key-up, so display matches playback.

### Interactions (mouse-first)

- **Pointer:** click selects + auditions through the track's instrument; shift-click adds; drag on empty = marquee; drag note = move pitch/time (snaps to grid selector; ⌥/Alt bypasses snap); edge drag = resize; double-click empty = create note at grid length; Delete/Backspace = delete selection; ⌘A = select all; Esc = clear.
- **Pencil:** click-drag draws (drag length = duration); click existing note deletes it.
- **Velocity lane:** drag a bar to set; drag across to paint; with a selection, drag scales the selection together.
- **CC lanes:** sustain as down/up block regions (drag edges, double-click add, Delete remove); mod as draggable/pencil-drawable point curve.
- Selection = index set against `clip.notes`; every edit op returns `{ notes, cc, selection }` with remapped indices so chained edits keep selection.
- Undo: one history entry per completed gesture via the session's existing state-update path.
- Touch: usable (tap select, toolbar ops) but fine drag-editing deferred to a dedicated touch pass (per PR #77 precedent).

## 4. Timeline clip preview

- `MidiClipBlock` replaces its "N notes" label with a mini canvas: x = time, y = pitch normalized to the clip's own range, notes as 2-px bars tinted by velocity.
- Memoized on a notes-revision counter (same discipline as waveform peaks). Note count moves to the clip tooltip.

## 5. Edit library — `src/lib/studio/midiEdit.ts`

Pure functions, no DOM/engine: `(notes, cc, selection, params) → { notes, cc, selection }`.

- **`quantizeNotes(notes, sel, { gridSeconds, strength })`** — selected starts move toward nearest gridline by `strength` (0–100%). Grid seconds from existing `snapModeToSeconds(mode, bpm, num, denom)`. Grid anchored to the **timeline** bar/beat grid, not the clip's left edge: convert to absolute time, snap, convert back (clips recorded mid-bar quantize to real beats). Durations untouched.
- **`transposeNotes(notes, sel, semitones)`** — ±1 / ±12, clamped 0–127.
- **`moveNotes` / `resizeNotes` / `scaleVelocity` / `addNote` / `deleteNotes`** — gesture backends; enforce `MIN_NOTE_SECONDS = 0.05` and non-negative starts.
- **`applySustain(notes, cc)`** — extends each note's effective duration to the next CC64-up after its release while pedal is down. Used by the scheduler and by panel ghost-rendering.

Overlapping identical pitches after quantize are allowed and rendered stacked (DAW-standard; no auto-dedup).

## 6. Playback & capture changes

- `src/lib/studio/engine/tracks.ts` — `scheduleMidiClip` schedules from `applySustain(clip.notes, clip.cc ?? [])`. Legacy pass-through provably identical.
- `src/lib/studio/midiRecord.ts` — `captureNote` subtracts `(autoMs + trimMs)/1000`; new `captureCc` records pedal/mod with the same compensation; commit path stores true key-up durations. **Must not regress WP06 pedal monitoring feel** (hands-on QA still pending from PR #135).
- Panel edits flow through the existing session update path, which already reschedules the engine — no new plumbing.

## 7. Error handling

- No Web MIDI (Safari/Firefox) / no device: panel fully works — it edits data, not input.
- Manifest with missing/corrupt `cc`: treated as `[]`; loader accepts 1.0.0 and 1.1.0.
- Compensation clamped so notes can't precede clip start.

## 8. Testing

- **Unit (vitest, alongside `midiSustain.test.ts` / `takeAlignment.test.ts`):** quantize strength math incl. mid-bar clip anchoring; transpose clamping; `applySustain` (pedal across note boundaries, re-strike, flush); capture compensation clamping; legacy `cc`-absent pass-through.
- **E2E (Playwright local preview harness — not prod; per E2E memory):** create MIDI track → pencil three notes → quantize → reload session → notes persisted; clip preview canvas non-empty.
- **Hands-on QA (Kevin):** WP06 pedal feel unchanged; record against click with auto+trim → notes sit on the beat; sustain-lane edit audibly shortens a held chord.

## 9. Phasing (single iteration, three phases)

1. Schema 1.1.0 + capture compensation (+ trim UI) + `midiEdit.ts` library with tests.
2. PianoRollPanel: pointer tool, selection, quantize/transpose toolbar, velocity lane.
3. Pencil tool, CC lanes, timeline clip preview, `PianoRollDialog` retirement.

## Out of scope

- Swing / note-end quantize (revisit after strength-quantize lands).
- Touch-first drag editing (dedicated later pass).
- Synth/sampler response to CC1; multi-channel MIDI; MIDI file export.
- Native iOS MIDI playback of `cc` (decode-tolerance only).
- Retroactive latency correction of existing clips.
