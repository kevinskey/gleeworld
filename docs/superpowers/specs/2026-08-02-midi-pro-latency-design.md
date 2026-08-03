# MIDI Pro: Latency + Responsiveness + Audit Fixes — Design

**Date:** 2026-08-02
**Status:** Approved by Kevin (design conversation, this date)
**Scope:** Web first. iOS-facing items ship web-safe now and light up in the next iOS build.

## Goal

Top-of-the-line MIDI in Studio: software-added monitoring latency under ~15ms
(down from ~110–140ms), takes that capture exactly what was played, and all
seven confirmed bugs from the 2026-08-02 MIDI audit fixed with regression
tests.

## Why the latency exists

`LiveVoices` (src/lib/studio/engine/liveVoices.ts) triggers live-monitored
notes at `Tone.now()`, which is `context.currentTime + lookAhead`. Nothing in
the codebase configures `lookAhead`, so Tone's default **0.1s** applies: every
key-press is artificially delayed 100ms before the attack is even scheduled,
on top of ~1–10ms MIDI input delivery and ~10–30ms audio output latency.
`Tone.immediate()` returns `currentTime` without the lookahead. The transport
(metronome, clip scheduling) legitimately needs the lookahead for jitter-free
scheduling and is not touched.

## Phase 1 — Monitoring latency

1. `LiveVoices.noteOn/noteOff/sustain` trigger at `Tone.immediate()` instead
   of `Tone.now()` (attack, re-strike release, damper release — every
   time-stamped call in the class).
2. Assert/keep context `latencyHint: 'interactive'` (Tone default) at engine
   init — verify, don't re-plumb.
3. Surface measured monitoring latency in the Studio MIDI input settings
   section: `baseLatency + outputLatency` rendered as "monitoring ≈ Nms",
   reusing `getOutputLatencyMs()`.

Non-goals: changing global `lookAhead`; AudioWorklet synthesis; native iOS
audio path (future effort).

## Phase 2 — Recording accuracy

4. **Punch gating:** MIDI capture handlers additionally gate on
   `punchRef.current?.phase === 'rec'` when a punch pass is active, and
   `resetMidiCapture()` + `midiTakeClipRef = null` re-run at the actual
   punch-in transition (`beginPunchTake`), not only at arm time.
5. **cancelPunch cleanup:** also clear `pendingMidiCommitsRef`, cancel+null
   `pendingFlushTimerRef`, and null `midiTakeClipRef` — honoring the
   documented "leave no trace" contract.
6. **Pedal truth:** track last-known CC64 state continuously (a ref updated
   by the live input handler regardless of recording state);
   `resetMidiCapture()` seeds `midiPedalRef` from it instead of
   unconditionally `false`.
7. **CC-only takes:** `commitTakeCc()` creates the take clip when
   `midiTakeClipRef` is null but captured CC exists (clip start = first CC
   event, min duration floor), instead of silently dropping the data.
8. **Trim honesty:** right-edge trim of a MIDI clip drops notes starting past
   the new duration and truncates straddlers (respecting `MIN_NOTE_SECONDS`);
   `scheduleMidiClip` additionally clamps scheduling to `duration_seconds` as
   defense in depth.

## Phase 3 — Responsiveness & correctness

9. **Autosave unmount flush** (src/hooks/useStudio.ts): keep a `sessionRef`
   updated every render; unmount cleanup flushes `sessionRef.current` instead
   of the mount-time-null closure. Remove the eslint-disable masking it.
10. **Voice release on transport changes:** add `releaseAll()` to
    `EngineInstrument` (synth: `releaseAll`/per-voice release; samplers:
    release all active voices); engine calls it in `pause()`, `stop()`, and
    the `wasPlaying` branch of `seek()`.
11. **Piano-roll selection integrity:** selection resets (or is clamped to
    valid indices) whenever `clip.notes` changes identity outside the panel's
    own edit paths — undo can no longer leave a stale selection that targets
    the wrong note.
12. **Device switch without teardown:** `useStudioMidiInput` keeps one
    subscription while enabled and changes the device filter in place;
    switching devices no longer stops/starts the CoreMIDI session (native) or
    re-subscribes (web). The device dropdown is disabled while a take is
    active.
13. **Notation on the facade:** rewrite `src/lib/notation/useMidiInput.ts` on
    `getMidiInputSource()` + `parseMidiMessage` (same pattern as
    `useStudioMidiInput`), deleting its duplicated parsing. No behavior change
    on web; enables iPad MIDI in notation next iOS build.

## Testing

- Regression test per numbered item where unit-testable (4–12).
- New engine suite: MIDI scheduling under pause / seek / loop-wrap / replay —
  the coverage gap that let #8 and #10 ship (mirrors
  `enginePausePlayers.test.ts` for MIDI).
- `npm run typecheck:guard` + full `npm run test:studio` green per PR.
- Acceptance: Kevin plays a MIDI keyboard on deployed web — feel check.

## PR sequencing

| PR | Contents |
|----|----------|
| A | Phase 1 (latency core + latency readout) |
| B | Item 9 (autosave flush) — isolated, highest data-loss risk |
| C | Items 4–7 (punch/capture cluster) |
| D | Items 8 + 10 + new engine MIDI scheduling tests |
| E | Items 11–13 (piano roll selection, device switch, notation facade) |

Each PR small, independently deployable via `scripts/deploy-frontend.sh`.
