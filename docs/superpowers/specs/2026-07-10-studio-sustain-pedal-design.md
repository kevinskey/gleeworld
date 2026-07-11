# Studio sustain pedal (CC64) — design

**Date:** 2026-07-10 · **Status:** approved (approach A: bake sustain into note durations)

## Goal

A USB keyboard's sustain pedal behaves like a piano's in the Studio: notes released
while the pedal is down keep sounding live, and recorded notes extend until the pedal
lifts — the clip plays back exactly like the performance. No clip-schema change, no
playback-engine change (web or iOS): recorded output is plain notes with longer
durations.

## Non-goals

- Recording CC64 events into clips (editable pedal lanes) — rejected as approach B.
- Half-pedaling — Tone.js voices are binary; threshold at CC64 ≥ 64.
- Pedal on the on-screen piano roll / virtual piano.

## Components

1. **Parser** (`lib/studio/midiMessage.ts`) — new event `{ type: 'sustain', down }`
   for status 0xB0 controller 64, `down = value ≥ 64`. Channel nibble is already
   stripped; the Williams WP06 broadcasts the pedal on channels 1–3, which becomes
   idempotent duplicate events.
2. **Input hook** (`hooks/useStudioMidiInput.ts`) — optional `onSustain(down)`
   callback beside `onNoteOn`/`onNoteOff`.
3. **Live sound** (`lib/studio/engine/liveVoices.ts`) — `sustain(down)`: while the
   pedal is down, `noteOff` parks the pitch in a `sustained` set instead of
   releasing; pedal-up releases every sustained pitch whose key is up; re-striking a
   sustained pitch releases the old voice first. Instrument teardown clears the set.
4. **Record capture** (`lib/studio/midiSustain.ts` + `StudioEditor.tsx`) —
   `SustainTracker`, a pure state machine (held / sustained / pedal) that returns
   which presses to commit on each event:
   - `keyUp` with pedal down → press moves to sustained, commits nothing.
   - `setPedal(false)` → commits every sustained press (note end = pedal-up time).
   - `keyDown` on a sustained pitch → commits the old press first (re-strike).
   - `flush()` on record stop → commits held + sustained.
   Commits flow through the existing `appendTakeNote` one-clip-per-take path in a
   single session update per event.

## Edge cases

- Duplicate pedal messages (multi-channel) — `setPedal` no-ops when state unchanged.
- Pedal already down at record start — only affects key-ups, works naturally.
- Record stops with keys/pedal held — `flush()` commits everything at stop time.
- Pedal events while not recording — tracked for pedal position; nothing commits.

## Testing

`SustainTracker` and the CC64 parser cases are unit-tested in
`lib/studio/midiInput.test.ts`. Live-audio behavior (LiveVoices) is verified
manually on gleeworld.org with the WP06.
