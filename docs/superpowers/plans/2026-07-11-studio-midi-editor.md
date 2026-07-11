# Studio MIDI Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Studio MIDI tracks a real editor — a docked piano-roll panel below Smart Controls (full note editing, velocity + sustain/mod CC lanes, quantize with strength, transpose), a note preview on timeline clips, and auto+trim MIDI recording latency compensation applied at capture.

**Architecture:** All note/CC math lives in pure, unit-tested modules (`midiEdit.ts`, `rollGeometry.ts`, additions to `midiRecord.ts`). The panel (`src/pages/studio/pianoroll/PianoRollPanel.tsx`) is a canvas-rendered React component that mutates the session through `StudioEditor`'s existing `update`/`pushHistory` path, which already reschedules the engine. Sustain moves from baked-into-duration to real CC64 events (schema 1.1.0, optional field); playback derives lengthening via `applySustain` at schedule time.

**Tech Stack:** React 18 + Vite + Tailwind/shadcn (Studio dark room), Tone.js transport, vitest for unit tests. Spec: `docs/superpowers/specs/2026-07-11-studio-midi-editor-design.md`.

## Global Constraints

- Repo: `~/Documents/GitHub/gleeworld`, branch off `main`. NEVER work in `/tmp` or in `.claude/worktrees/` checkouts. Verify `git branch --show-current` before every commit.
- **Schema-version compat (spec refinement, approved rationale):** the shipped iOS app (1.0.3, in review) hard-rejects any `schema_version != "1.0.0"` (`StudioModel.swift` decode guard), and web `validate.ts:29` does the same. Therefore manifests are written as `1.0.0` unless a clip actually uses `cc` — only then `1.1.0` (`requiredSchemaVersion()`). Both loaders accept both versions. This keeps every existing session openable by the app already in App Store review.
- All times are float **seconds**. Convert to beats only via `60 / tempo_bpm`. Never introduce ticks into the data model (display uses 960 PPQN, MIDI-clock-out uses 24 PPQ — leave both alone).
- `MIN_NOTE_SECONDS = 0.05` floor and `start_seconds >= 0` are invariants on every note-mutating op.
- Design system: theme tokens only (`bg-card`, `border-border`, `text-muted-foreground`, `bg-primary`, `accent-primary`…), never hex/palette classes in JSX. Canvas code resolves tokens via `getComputedStyle` (helper in Task 9). Type floor `text-xs`; icons ≥ `w-4 h-4`; square corners (no `rounded-*` except `rounded-full`); sentence-case copy.
- Tests are colocated: `src/lib/studio/<name>.test.ts`, vitest style matching `src/lib/studio/midiInput.test.ts`. Run with `npx vitest run <path>`. `tsc --noEmit` is a NO-OP in this repo — typecheck via `npm run build`.
- WP06 pedal **monitoring** feel must not change: `LiveVoices.sustain()` is untouched. Only the *recording commit* path changes.
- MIDI recording is web-engine only (`recordStartMode` gates native); the panel must guard audition with `!engineState.native`.
- Do not touch deploy scripts; no rsync in this plan. Never `rsync --delete` ever.

## File Map

| File | Role |
|---|---|
| `src/lib/studio/session.ts` | Modify: `MidiCcEvent`, `MidiClip.cc?`, version set + `requiredSchemaVersion` |
| `src/lib/studio/validate.ts` | Modify: accept 1.0.0 and 1.1.0 |
| `src/lib/studio/storage.ts` | Modify: stamp `requiredSchemaVersion` on save |
| `ios/App/App/StudioModel.swift` | Modify: `MidiCcEvent` struct, `cc` field, tolerant decode guard |
| `src/lib/studio/midiEdit.ts` (+`.test.ts`) | Create: applySustain, quantize, transpose, move/resize, velocity, add/delete, CC ops, grid math |
| `src/lib/studio/midiMessage.ts` | Modify: parse CC1 (mod) as `cc` event |
| `src/lib/studio/midiRecord.ts` | Modify: capture compensation, `HeldNotes`, `attachTakeCc`, trim config |
| `src/lib/studio/midiSustain.ts` | Delete (recording no longer bakes pedal into durations) |
| `src/lib/studio/midiInput.test.ts` | Modify: cc parser tests; SustainTracker tests → HeldNotes tests |
| `src/hooks/useStudioMidiInput.ts` | Modify: `onCc` callback |
| `src/lib/studio/engine/tracks.ts` | Modify: schedule through `applySustain` |
| `src/pages/studio/pianoroll/rollGeometry.ts` (+`.test.ts`) | Create: px↔time/pitch mapping, hit-testing, marquee |
| `src/pages/studio/pianoroll/PianoRollPanel.tsx` | Create: the editor panel |
| `src/pages/studio/pianoroll/MidiClipPreview.tsx` | Create: timeline mini note map |
| `src/pages/studio/StudioEditor.tsx` | Modify: capture rewire, panel mount, trim UI, clip preview, delete `PianoRollDialog` |

---

### Task 1: Schema 1.1.0 — `cc` events + dual-version loaders (web + iOS)

**Files:**
- Modify: `src/lib/studio/session.ts`
- Modify: `src/lib/studio/validate.ts:29-31`
- Modify: `src/lib/studio/storage.ts` (saveSession)
- Modify: `ios/App/App/StudioModel.swift`
- Test: `src/lib/studio/schemaVersion.test.ts`

**Interfaces:**
- Produces: `MidiCcEvent { controller: number; value: number; time_seconds: number }`, `MidiClip.cc?: MidiCcEvent[]`, `STUDIO_SCHEMA_VERSIONS: readonly ['1.0.0','1.1.0']`, `requiredSchemaVersion(session: Session): StudioSchemaVersion`. Every later task imports `MidiCcEvent` from `./session`.

- [ ] **Step 1: Write the failing test** — `src/lib/studio/schemaVersion.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { requiredSchemaVersion, STUDIO_SCHEMA_VERSIONS, type Session } from './session';
import { defaultSession } from './defaults';
import { validateSession } from './validate';

const base = (): Session => defaultSession({ ownerUserId: 'u1', tenantId: 't1' });

describe('schema versions', () => {
  it('new sessions require 1.0.0 (no cc anywhere)', () => {
    expect(requiredSchemaVersion(base())).toBe('1.0.0');
  });

  it('a clip with cc events requires 1.1.0', () => {
    const s = base();
    s.tracks.push({
      id: 'm1', kind: 'midi', name: 'Keys', color: '#888888', volume_db: 0, pan: 0,
      mute: false, solo: false, arm: false, fx: [],
      instrument: { type: 'synth_basic', params: {} },
      clips: [{ id: 'c1', kind: 'midi', start_seconds: 0, duration_seconds: 4, notes: [],
        cc: [{ controller: 64, value: 127, time_seconds: 1 }] }],
    });
    expect(requiredSchemaVersion(s)).toBe('1.1.0');
  });

  it('validate accepts both known versions and rejects others', () => {
    for (const v of STUDIO_SCHEMA_VERSIONS) {
      const s = { ...base(), schema_version: v };
      expect(validateSession(s).errors.filter((e) => e.includes('schema_version'))).toEqual([]);
    }
    const bad = { ...base(), schema_version: '2.0.0' } as unknown as Session;
    expect(validateSession(bad).errors.some((e) => e.includes('schema_version'))).toBe(true);
  });
});
```

Before writing, check `defaultSession`'s actual export name/signature in `src/lib/studio/defaults.ts` and `validateSession`'s return shape in `validate.ts` (it may return `string[]` rather than `{errors}`) — adapt the test to the real signatures, keeping the three assertions' intent.

- [ ] **Step 2: Run it** — `npx vitest run src/lib/studio/schemaVersion.test.ts` — expect FAIL (`requiredSchemaVersion` not exported).

- [ ] **Step 3: Implement in `session.ts`** — replace lines 19-20 with:

```ts
export const STUDIO_SCHEMA_VERSIONS = ['1.0.0', '1.1.0'] as const;
export type StudioSchemaVersion = typeof STUDIO_SCHEMA_VERSIONS[number];
/** Baseline version for sessions that use no 1.1.0 features. Kept at
 * 1.0.0 so manifests stay openable by the shipped iOS app (its decoder
 * hard-rejects unknown versions). Writers stamp requiredSchemaVersion(). */
export const STUDIO_SCHEMA_VERSION: StudioSchemaVersion = '1.0.0';
```

Add below `MidiNote` (line 82):

```ts
/** A recorded continuous-controller event. 1.1.0 feature — a clip that
 * carries cc events forces the manifest to schema 1.1.0.
 * controller 64 = sustain pedal (down at value >= 64), 1 = mod wheel. */
export interface MidiCcEvent {
  controller: number;   // 0..127
  value: number;        // 0..127
  time_seconds: number; // relative to clip start
}
```

Add to `MidiClip`: `cc?: MidiCcEvent[];  // optional — absent on 1.0.0 clips`.

Add after `withMasteringDefaults`:

```ts
/** The minimum schema version that can represent this session: 1.1.0
 * only when some MIDI clip actually uses cc events, else 1.0.0. */
export function requiredSchemaVersion(session: Session): StudioSchemaVersion {
  for (const t of session.tracks) {
    if (t.kind !== 'midi') continue;
    for (const c of t.clips) if (c.cc && c.cc.length > 0) return '1.1.0';
  }
  return '1.0.0';
}
```

In `validate.ts` replace the exact-match check (lines 29-31) with membership in `STUDIO_SCHEMA_VERSIONS` (update the import and the error message to `expected one of "1.0.0", "1.1.0"`). In `storage.ts`'s `saveSession`, before the manifest is serialized, stamp the version: `session = { ...session, schema_version: requiredSchemaVersion(session), updated_at: … }` — find the existing line that builds the manifest payload and fold the stamp in there (grep `schema_version` in storage.ts; the two hits at 69/119 are index-row upserts and read the same session object, so stamping once before both is enough).

- [ ] **Step 4: iOS decoder tolerance** — in `ios/App/App/StudioModel.swift`:
  - After the `MidiNote` struct (line ~86) add:

```swift
    public struct MidiCcEvent: Codable, Equatable, Sendable {
        public var controller: Int  // 64 = sustain, 1 = mod
        public var value: Int       // 0..127
        public var time_seconds: Double
    }
```

  - In `MidiClip` add: `public var cc: [MidiCcEvent]?`.
  - Replace the strict guard in `decode` with:

```swift
        public static let acceptedSchemaVersions: Set<String> = ["1.0.0", "1.1.0"]
```
```swift
        guard Studio.acceptedSchemaVersions.contains(s.schema_version) else {
```

  (Keep `schemaVersion = "1.0.0"` as-is — native writes stay baseline until native cc playback exists. Known limitation, in the spec: native playback ignores `cc`, so pedal-lengthening is web-only until a later iOS pass.)

- [ ] **Step 5: Run tests + build** — `npx vitest run src/lib/studio/` all pass; `npm run build` passes.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(studio): schema 1.1.0 — MIDI cc events, dual-version loaders (web + iOS)"`

---

### Task 2: `midiEdit.ts` — `applySustain`

**Files:**
- Create: `src/lib/studio/midiEdit.ts`
- Test: `src/lib/studio/midiEdit.test.ts`

**Interfaces:**
- Produces: `applySustain(notes: MidiNote[], cc: MidiCcEvent[]): MidiNote[]` — pure; returns the same array reference semantics not required, but MUST return `notes` unchanged (same values) when there are no CC64 events (legacy pass-through).

- [ ] **Step 1: Write the failing tests** — `src/lib/studio/midiEdit.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applySustain } from './midiEdit';
import type { MidiNote, MidiCcEvent } from './session';

const note = (pitch: number, start: number, dur: number, vel = 100): MidiNote =>
  ({ pitch, velocity: vel, start_seconds: start, duration_seconds: dur });
const cc64 = (t: number, down: boolean): MidiCcEvent =>
  ({ controller: 64, value: down ? 127 : 0, time_seconds: t });

describe('applySustain', () => {
  it('passes notes through untouched with no cc (legacy clips)', () => {
    const notes = [note(60, 0, 0.5)];
    expect(applySustain(notes, [])).toEqual(notes);
    expect(applySustain(notes, [{ controller: 1, value: 64, time_seconds: 0 }])).toEqual(notes);
  });

  it('extends a note released while the pedal is down until pedal-up', () => {
    const out = applySustain([note(60, 0, 0.5)], [cc64(0.2, true), cc64(2.0, false)]);
    expect(out[0].duration_seconds).toBeCloseTo(2.0);
  });

  it('leaves a note alone when the pedal lifted before its key-up', () => {
    const out = applySustain([note(60, 0, 1.0)], [cc64(0.1, true), cc64(0.5, false)]);
    expect(out[0].duration_seconds).toBeCloseTo(1.0);
  });

  it('clamps a sustained note at the next re-strike of the same pitch', () => {
    const out = applySustain(
      [note(60, 0, 0.3), note(60, 1.0, 0.3)],
      [cc64(0.1, true), cc64(3.0, false)],
    );
    expect(out[0].duration_seconds).toBeCloseTo(1.0); // ends at the re-strike
    expect(out[1].duration_seconds).toBeCloseTo(2.0); // rides to pedal-up
  });

  it('pedal never lifted: extends to the end of the material', () => {
    const out = applySustain([note(60, 0, 0.4), note(64, 1.0, 0.6)], [cc64(0.1, true)]);
    expect(out[0].duration_seconds).toBeCloseTo(1.6); // last note end
  });
});
```

- [ ] **Step 2: Run** — `npx vitest run src/lib/studio/midiEdit.test.ts` — FAIL (module missing).
- [ ] **Step 3: Implement** — create `src/lib/studio/midiEdit.ts`:

```ts
// Pure MIDI note/CC editing operations for the Studio piano roll.
// No DOM, no Tone — everything here is unit-tested in midiEdit.test.ts.
// All times are seconds; grid math converts via 60 / tempo_bpm.

import type { MidiNote, MidiCcEvent } from './session';

export const MIN_NOTE_SECONDS = 0.05;

/** Playback-side sustain: a note released while CC64 is down keeps
 * sounding until the next pedal-up — clamped at a re-strike of the same
 * pitch, and at the end of the material when the pedal never lifts.
 * Clips without CC64 events pass through unchanged (legacy behavior,
 * where the pedal was baked into recorded durations). */
export function applySustain(notes: MidiNote[], cc: MidiCcEvent[]): MidiNote[] {
  const pedal = cc.filter((e) => e.controller === 64)
    .slice().sort((a, b) => a.time_seconds - b.time_seconds);
  if (pedal.length === 0) return notes;
  const materialEnd = Math.max(
    ...pedal.map((e) => e.time_seconds),
    ...notes.map((n) => n.start_seconds + n.duration_seconds),
  );
  return notes.map((n) => {
    const off = n.start_seconds + n.duration_seconds;
    let downAtOff = false;
    for (const e of pedal) {
      if (e.time_seconds <= off) downAtOff = e.value >= 64; else break;
    }
    if (!downAtOff) return n;
    const up = pedal.find((e) => e.time_seconds > off && e.value < 64);
    let end = up ? up.time_seconds : materialEnd;
    const restrike = notes
      .filter((m) => m !== n && m.pitch === n.pitch && m.start_seconds >= off && m.start_seconds < end)
      .sort((a, b) => a.start_seconds - b.start_seconds)[0];
    if (restrike) end = restrike.start_seconds;
    return end > off ? { ...n, duration_seconds: end - n.start_seconds } : n;
  });
}
```

- [ ] **Step 4: Run** — same command — PASS (5 tests).
- [ ] **Step 5: Commit** — `git add src/lib/studio/midiEdit.ts src/lib/studio/midiEdit.test.ts && git commit -m "feat(studio): applySustain — CC64-derived note lengthening"`

---

### Task 3: `midiEdit.ts` — note ops, CC ops, grid math

**Files:**
- Modify: `src/lib/studio/midiEdit.ts`
- Test: `src/lib/studio/midiEdit.test.ts` (append)

**Interfaces:**
- Produces (all pure; `selection` is an array of indices into `notes`; ops that keep note count/order preserve indices):
  - `type RollGrid = '1/4' | '1/8' | '1/16' | '1/32' | '1/8T' | '1/16T'`
  - `gridSeconds(grid: RollGrid, tempoBpm: number): number`
  - `quantizeNotes(notes, selection, opts: { gridSeconds: number; strength: number; clipStartSeconds: number }): MidiNote[]`
  - `transposeNotes(notes, selection, semitones: number): MidiNote[]`
  - `moveNotes(notes, selection, opts: { deltaSeconds: number; deltaSemitones: number; gridSeconds: number; clipStartSeconds: number }): MidiNote[]`
  - `resizeNotes(notes, selection, opts: { edge: 'left' | 'right'; deltaSeconds: number; gridSeconds: number; clipStartSeconds: number }): MidiNote[]`
  - `offsetVelocity(notes, selection, delta: number): MidiNote[]`
  - `addNote(notes, note: MidiNote): { notes: MidiNote[]; index: number }`
  - `deleteNotes(notes, selection): MidiNote[]`
  - `sustainRanges(cc: MidiCcEvent[], fallbackEnd: number): Array<{ down: number; up: number }>`
  - `setSustainRanges(cc: MidiCcEvent[], ranges: Array<{ down: number; up: number }>): MidiCcEvent[]` (rebuilds CC64 events from ranges, preserving non-64 events)
  - `ccPoints(cc: MidiCcEvent[], controller: number): Array<{ index: number; time: number; value: number }>`

- [ ] **Step 1: Append failing tests**:

```ts
import {
  gridSeconds, quantizeNotes, transposeNotes, moveNotes, resizeNotes,
  offsetVelocity, addNote, deleteNotes, sustainRanges, setSustainRanges,
} from './midiEdit';

describe('gridSeconds', () => {
  it('derives straight and triplet grids from tempo', () => {
    expect(gridSeconds('1/4', 120)).toBeCloseTo(0.5);
    expect(gridSeconds('1/16', 120)).toBeCloseTo(0.125);
    expect(gridSeconds('1/8T', 120)).toBeCloseTo(0.5 / 3);
  });
});

describe('quantizeNotes', () => {
  it('hard-snaps selected notes to the TIMELINE grid (clip offset honored)', () => {
    // Clip starts mid-bar at 0.3s; a note at clip-relative 0.15 sits at
    // absolute 0.45 → nearest 0.5 gridline → clip-relative 0.2.
    const out = quantizeNotes([note(60, 0.15, 0.2)], [0],
      { gridSeconds: 0.5, strength: 1, clipStartSeconds: 0.3 });
    expect(out[0].start_seconds).toBeCloseTo(0.2);
  });
  it('strength moves notes only part-way', () => {
    const out = quantizeNotes([note(60, 0.15, 0.2)], [0],
      { gridSeconds: 0.5, strength: 0.5, clipStartSeconds: 0.3 });
    expect(out[0].start_seconds).toBeCloseTo(0.175); // half of the 0.05 correction
  });
  it('never moves unselected notes, and clamps at clip start', () => {
    // Unselected note (index 0) must not move.
    const out = quantizeNotes([note(60, 0.15, 0.2), note(62, 0.6, 0.2)], [1],
      { gridSeconds: 0.5, strength: 1, clipStartSeconds: 0 });
    expect(out[0].start_seconds).toBeCloseTo(0.15);
    expect(out[1].start_seconds).toBeCloseTo(0.5);
    // A clip starting at 0.4 with a note at rel 0.05 (abs 0.45 → grid 0.5)
    // snaps to rel 0.1; but a grid target BEFORE the clip start clamps to 0:
    // abs 0.45 with grid 2.0 → target 0.0 → rel would be −0.4 → clamped 0.
    const clamped = quantizeNotes([note(60, 0.05, 0.2)], [0],
      { gridSeconds: 2.0, strength: 1, clipStartSeconds: 0.4 });
    expect(clamped[0].start_seconds).toBe(0);
  });
});

describe('note ops', () => {
  it('transpose clamps to 0..127', () => {
    const out = transposeNotes([note(126, 0, 1), note(1, 0, 1)], [0, 1], 12);
    expect(out[0].pitch).toBe(127);
    expect(out[1].pitch).toBe(13);
  });
  it('move shifts time+pitch with grid snap and floors at 0', () => {
    const out = moveNotes([note(60, 1.0, 0.5)], [0],
      { deltaSeconds: 0.26, deltaSemitones: -2, gridSeconds: 0.25, clipStartSeconds: 0 });
    expect(out[0].start_seconds).toBeCloseTo(1.25);
    expect(out[0].pitch).toBe(58);
  });
  it('resize right enforces the minimum duration', () => {
    const out = resizeNotes([note(60, 0, 0.5)], [0],
      { edge: 'right', deltaSeconds: -0.49, gridSeconds: 0, clipStartSeconds: 0 });
    expect(out[0].duration_seconds).toBeCloseTo(0.05);
  });
  it('resize left moves start and preserves the end', () => {
    const out = resizeNotes([note(60, 1.0, 0.5)], [0],
      { edge: 'left', deltaSeconds: 0.2, gridSeconds: 0, clipStartSeconds: 0 });
    expect(out[0].start_seconds).toBeCloseTo(1.2);
    expect(out[0].duration_seconds).toBeCloseTo(0.3);
  });
  it('velocity offset clamps 1..127', () => {
    const out = offsetVelocity([note(60, 0, 1, 120), note(62, 0, 1, 3)], [0, 1], 20);
    expect(out[0].velocity).toBe(127);
    expect(out[1].velocity).toBe(23);
  });
  it('add returns the new index; delete filters the selection', () => {
    const { notes, index } = addNote([note(60, 0, 1)], note(64, 1, 1));
    expect(index).toBe(1);
    expect(deleteNotes(notes, [0])).toEqual([note(64, 1, 1)]);
  });
});

describe('sustain ranges', () => {
  it('pairs down/up events into ranges (open range ends at fallbackEnd)', () => {
    expect(sustainRanges([cc64(1, true), cc64(2, false), cc64(3, true)], 5))
      .toEqual([{ down: 1, up: 2 }, { down: 3, up: 5 }]);
  });
  it('setSustainRanges rebuilds CC64 and keeps other controllers', () => {
    const mod = { controller: 1, value: 30, time_seconds: 0.5 };
    const out = setSustainRanges([cc64(1, true), cc64(2, false), mod], [{ down: 0.5, up: 1.5 }]);
    expect(out).toEqual([mod, cc64(0.5, true), cc64(1.5, false)].sort((a, b) => a.time_seconds - b.time_seconds));
  });
});
```

Fix the third quantize test before running: replace it with a clean clamp case — a note at clip-relative `0.05` in a clip starting at `0.0` with `gridSeconds: 0.5` snaps to `0` (`expect(out[1].start_seconds).toBe(0)`), and keep the unselected-note assertion.

- [ ] **Step 2: Run** — FAIL (exports missing).
- [ ] **Step 3: Implement** — append to `midiEdit.ts`:

```ts
// ── Grid ─────────────────────────────────────────────────────────────

export type RollGrid = '1/4' | '1/8' | '1/16' | '1/32' | '1/8T' | '1/16T';
export const ROLL_GRIDS: RollGrid[] = ['1/4', '1/8', '1/16', '1/32', '1/8T', '1/16T'];

/** Length of one grid unit in seconds. Triplets are 2/3 of the straight value. */
export function gridSeconds(grid: RollGrid, tempoBpm: number): number {
  const q = 60 / tempoBpm;
  const straight: Record<string, number> = { '1/4': q, '1/8': q / 2, '1/16': q / 4, '1/32': q / 8 };
  if (grid.endsWith('T')) return (straight[grid.slice(0, -1)] / 1) * (2 / 3);
  return straight[grid];
}

const clampPitch = (p: number) => Math.max(0, Math.min(127, p));
const clampVel = (v: number) => Math.max(1, Math.min(127, Math.round(v)));
const snapAbs = (absSeconds: number, grid: number) =>
  grid > 0 ? Math.round(absSeconds / grid) * grid : absSeconds;

// ── Selected-note operations ─────────────────────────────────────────
// `selection` holds indices into `notes`. Ops that preserve count and
// order keep the same indices valid, so chained edits (quantize →
// transpose → nudge) never remap.

export function quantizeNotes(
  notes: MidiNote[], selection: number[],
  opts: { gridSeconds: number; strength: number; clipStartSeconds: number },
): MidiNote[] {
  if (opts.gridSeconds <= 0) return notes;
  const k = Math.max(0, Math.min(1, opts.strength));
  const sel = new Set(selection);
  return notes.map((n, i) => {
    if (!sel.has(i)) return n;
    // Anchor to the TIMELINE grid: clips recorded mid-bar still quantize
    // to real beats, so convert to absolute time before snapping.
    const abs = opts.clipStartSeconds + n.start_seconds;
    const target = snapAbs(abs, opts.gridSeconds);
    const moved = abs + (target - abs) * k;
    return { ...n, start_seconds: Math.max(0, moved - opts.clipStartSeconds) };
  });
}

export function transposeNotes(notes: MidiNote[], selection: number[], semitones: number): MidiNote[] {
  const sel = new Set(selection);
  return notes.map((n, i) => sel.has(i) ? { ...n, pitch: clampPitch(n.pitch + semitones) } : n);
}

export function moveNotes(
  notes: MidiNote[], selection: number[],
  opts: { deltaSeconds: number; deltaSemitones: number; gridSeconds: number; clipStartSeconds: number },
): MidiNote[] {
  const sel = new Set(selection);
  return notes.map((n, i) => {
    if (!sel.has(i)) return n;
    const abs = snapAbs(opts.clipStartSeconds + n.start_seconds + opts.deltaSeconds, opts.gridSeconds);
    return {
      ...n,
      start_seconds: Math.max(0, abs - opts.clipStartSeconds),
      pitch: clampPitch(n.pitch + opts.deltaSemitones),
    };
  });
}

export function resizeNotes(
  notes: MidiNote[], selection: number[],
  opts: { edge: 'left' | 'right'; deltaSeconds: number; gridSeconds: number; clipStartSeconds: number },
): MidiNote[] {
  const sel = new Set(selection);
  return notes.map((n, i) => {
    if (!sel.has(i)) return n;
    if (opts.edge === 'right') {
      const absEnd = snapAbs(opts.clipStartSeconds + n.start_seconds + n.duration_seconds + opts.deltaSeconds, opts.gridSeconds);
      return { ...n, duration_seconds: Math.max(MIN_NOTE_SECONDS, absEnd - opts.clipStartSeconds - n.start_seconds) };
    }
    const end = n.start_seconds + n.duration_seconds;
    const absStart = snapAbs(opts.clipStartSeconds + n.start_seconds + opts.deltaSeconds, opts.gridSeconds);
    const start = Math.max(0, Math.min(end - MIN_NOTE_SECONDS, absStart - opts.clipStartSeconds));
    return { ...n, start_seconds: start, duration_seconds: end - start };
  });
}

export function offsetVelocity(notes: MidiNote[], selection: number[], delta: number): MidiNote[] {
  const sel = new Set(selection);
  return notes.map((n, i) => sel.has(i) ? { ...n, velocity: clampVel(n.velocity + delta) } : n);
}

export function addNote(notes: MidiNote[], note: MidiNote): { notes: MidiNote[]; index: number } {
  const next = [...notes, {
    ...note,
    pitch: clampPitch(note.pitch),
    velocity: clampVel(note.velocity),
    start_seconds: Math.max(0, note.start_seconds),
    duration_seconds: Math.max(MIN_NOTE_SECONDS, note.duration_seconds),
  }];
  return { notes: next, index: next.length - 1 };
}

export function deleteNotes(notes: MidiNote[], selection: number[]): MidiNote[] {
  const sel = new Set(selection);
  return notes.filter((_, i) => !sel.has(i));
}

// ── CC lane helpers ──────────────────────────────────────────────────

/** Pair CC64 events into pedal ranges for rendering/editing. An
 * unmatched trailing pedal-down closes at `fallbackEnd`. */
export function sustainRanges(cc: MidiCcEvent[], fallbackEnd: number): Array<{ down: number; up: number }> {
  const pedal = cc.filter((e) => e.controller === 64)
    .slice().sort((a, b) => a.time_seconds - b.time_seconds);
  const ranges: Array<{ down: number; up: number }> = [];
  let openDown: number | null = null;
  for (const e of pedal) {
    if (e.value >= 64) { if (openDown === null) openDown = e.time_seconds; }
    else if (openDown !== null) { ranges.push({ down: openDown, up: e.time_seconds }); openDown = null; }
  }
  if (openDown !== null) ranges.push({ down: openDown, up: fallbackEnd });
  return ranges;
}

/** Rebuild the CC64 stream from edited ranges; other controllers pass
 * through untouched. Result is time-sorted. */
export function setSustainRanges(cc: MidiCcEvent[], ranges: Array<{ down: number; up: number }>): MidiCcEvent[] {
  const others = cc.filter((e) => e.controller !== 64);
  const rebuilt = ranges.flatMap((r) => [
    { controller: 64, value: 127, time_seconds: Math.max(0, Math.min(r.down, r.up)) },
    { controller: 64, value: 0, time_seconds: Math.max(r.down, r.up) },
  ]);
  return [...others, ...rebuilt].sort((a, b) => a.time_seconds - b.time_seconds);
}

/** The editable points of one controller's lane, with their indices in
 * the full cc array (so edits can write back). */
export function ccPoints(cc: MidiCcEvent[], controller: number): Array<{ index: number; time: number; value: number }> {
  return cc.map((e, index) => ({ e, index }))
    .filter(({ e }) => e.controller === controller)
    .map(({ e, index }) => ({ index, time: e.time_seconds, value: e.value }))
    .sort((a, b) => a.time - b.time);
}
```

- [ ] **Step 4: Run** — `npx vitest run src/lib/studio/midiEdit.test.ts` — PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(studio): midiEdit note/CC operations — quantize w/ strength, transpose, move/resize, velocity, sustain ranges"`

---

### Task 4: Capture — CC parsing, `HeldNotes`, compensation, `attachTakeCc`

**Files:**
- Modify: `src/lib/studio/midiMessage.ts`
- Modify: `src/lib/studio/midiRecord.ts`
- Modify: `src/lib/studio/midiInput.test.ts`
- Delete: `src/lib/studio/midiSustain.ts` (in Task 5, once nothing imports it)

**Interfaces:**
- Produces in `midiMessage.ts`: new union member `{ type: 'cc'; controller: number; value: number }` (emitted for CC1 only; CC64 keeps the existing `sustain` shape).
- Produces in `midiRecord.ts`:
  - `interface HeldPress { pitch: number; velocity: number; downAbsSeconds: number }` (moved here from midiSustain.ts)
  - `class HeldNotes { keyDown(pitch, velocity, atSeconds): HeldPress | null; keyUp(pitch): HeldPress | null; flush(): HeldPress[] }`
  - `interface CapturedCc { controller: number; value: number; timeAbsSeconds: number }`
  - `attachTakeCc(clips: MidiClip[], takeClipId: string, events: CapturedCc[]): MidiClip[]`
  - `MIDI_TRIM_STORAGE_KEY = 'studio.midiTrimMs'`, `getMidiTrimMs(): number` (clamped −100..100, default 0)

- [ ] **Step 1: Write failing tests** — append to `src/lib/studio/midiInput.test.ts`:

```ts
import { HeldNotes, attachTakeCc, getMidiTrimMs, MIDI_TRIM_STORAGE_KEY } from './midiRecord';

describe('parseMidiMessage cc', () => {
  it('reads the mod wheel (CC1) on any channel', () => {
    expect(parseMidiMessage([0xb0, 1, 90])).toEqual({ type: 'cc', controller: 1, value: 90 });
    expect(parseMidiMessage([0xb2, 1, 0])).toEqual({ type: 'cc', controller: 1, value: 0 });
  });
  it('still special-cases sustain and ignores other CCs', () => {
    expect(parseMidiMessage([0xb0, 64, 127])).toEqual({ type: 'sustain', down: true });
    expect(parseMidiMessage([0xb0, 7, 100])).toEqual({ type: 'other' });
  });
});

describe('HeldNotes', () => {
  it('keyUp returns the press with its true down time (no pedal hold)', () => {
    const h = new HeldNotes();
    expect(h.keyDown(60, 100, 1.0)).toBeNull();
    expect(h.keyUp(60)).toEqual({ pitch: 60, velocity: 100, downAbsSeconds: 1.0 });
    expect(h.keyUp(60)).toBeNull();
  });
  it('a re-strike with a missed note-off commits the stale press', () => {
    const h = new HeldNotes();
    h.keyDown(60, 100, 1.0);
    expect(h.keyDown(60, 90, 2.0)).toEqual({ pitch: 60, velocity: 100, downAbsSeconds: 1.0 });
  });
  it('flush commits everything still held', () => {
    const h = new HeldNotes();
    h.keyDown(60, 100, 1.0); h.keyDown(64, 80, 1.5);
    expect(h.flush()).toHaveLength(2);
    expect(h.flush()).toEqual([]);
  });
});

describe('attachTakeCc', () => {
  const clip: MidiClip = { id: 'c1', kind: 'midi', start_seconds: 10, duration_seconds: 2, notes: [] };
  it('converts to clip-relative, sorts, merges, and grows the clip', () => {
    const out = attachTakeCc([clip], 'c1', [
      { controller: 64, value: 0, timeAbsSeconds: 13 },
      { controller: 64, value: 127, timeAbsSeconds: 10.5 },
    ]);
    expect(out[0].cc).toEqual([
      { controller: 64, value: 127, time_seconds: 0.5 },
      { controller: 64, value: 0, time_seconds: 3 },
    ]);
    expect(out[0].duration_seconds).toBe(3);
  });
  it('leaves other clips and empty event lists untouched', () => {
    expect(attachTakeCc([clip], 'c1', [])).toEqual([clip]);
    expect(attachTakeCc([clip], 'other', [{ controller: 64, value: 127, timeAbsSeconds: 11 }])).toEqual([clip]);
  });
});

describe('getMidiTrimMs', () => {
  it('defaults to 0 and clamps to ±100', () => {
    localStorage.removeItem(MIDI_TRIM_STORAGE_KEY);
    expect(getMidiTrimMs()).toBe(0);
    localStorage.setItem(MIDI_TRIM_STORAGE_KEY, '250');
    expect(getMidiTrimMs()).toBe(100);
    localStorage.setItem(MIDI_TRIM_STORAGE_KEY, '-40');
    expect(getMidiTrimMs()).toBe(-40);
    localStorage.removeItem(MIDI_TRIM_STORAGE_KEY);
  });
});
```

(If the vitest environment lacks `localStorage`, check `vitest.config`/existing tests for the environment — `takeAlignment.test.ts` and friends will show the convention; use `happy-dom`/`jsdom` env pragma comment `// @vitest-environment jsdom` at the top of the file if needed.)

- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** `midiMessage.ts` — add to the union: `| { type: 'cc'; controller: number; value: number }  // CC1 (mod wheel) for now` and after the sustain line:

```ts
  // Controller 1 is the mod wheel — recorded into MidiClip.cc since 1.1.0.
  if (status === 0xb0 && pitch === 1) return { type: 'cc', controller: 1, value: velocity };
```

`midiRecord.ts` — add:

```ts
import type { MidiCcEvent } from './session';

// ── Held-note bookkeeping (recording) ────────────────────────────────
// Since schema 1.1.0 the sustain pedal is recorded as CC64 events, so
// recorded notes carry their TRUE key-up duration — the pedal no longer
// holds presses open (that behavior lives in applySustain at playback,
// and in LiveVoices for live monitoring). This replaces SustainTracker.

export interface HeldPress {
  pitch: number;
  velocity: number;
  downAbsSeconds: number;
}

export class HeldNotes {
  private held = new Map<number, HeldPress>();
  /** Track a key-down. Returns a stale press to commit when a note-off
   * was missed for this pitch, else null. */
  keyDown(pitch: number, velocity: number, atSeconds: number): HeldPress | null {
    const stale = this.held.get(pitch) ?? null;
    this.held.set(pitch, { pitch, velocity, downAbsSeconds: atSeconds });
    return stale;
  }
  keyUp(pitch: number): HeldPress | null {
    const press = this.held.get(pitch) ?? null;
    this.held.delete(pitch);
    return press;
  }
  /** Record stop: commit everything still physically held. */
  flush(): HeldPress[] {
    const commits = [...this.held.values()];
    this.held.clear();
    return commits;
  }
}

// ── CC capture ───────────────────────────────────────────────────────

export interface CapturedCc { controller: number; value: number; timeAbsSeconds: number; }

/** Fold a take's captured CC events into the take clip: clip-relative
 * times (clamped ≥ 0), merged with any existing cc (overdub), sorted;
 * the clip grows to cover a trailing event (e.g. a pedal-up after the
 * last key-up). CC captured with no take clip is dropped by the caller. */
export function attachTakeCc(clips: MidiClip[], takeClipId: string, events: CapturedCc[]): MidiClip[] {
  if (events.length === 0) return clips;
  return clips.map((c) => {
    if (c.id !== takeClipId) return c;
    const rel: MidiCcEvent[] = events.map((e) => ({
      controller: e.controller, value: e.value,
      time_seconds: Math.max(0, e.timeAbsSeconds - c.start_seconds),
    }));
    const cc = [...(c.cc ?? []), ...rel].sort((a, b) => a.time_seconds - b.time_seconds);
    const last = cc[cc.length - 1].time_seconds;
    return { ...c, cc, duration_seconds: Math.max(c.duration_seconds, last) };
  });
}

// ── MIDI recording offset (auto + trim) ──────────────────────────────
// The player performs in time with what they HEAR, which is late by the
// audio output latency — so captured event times are shifted earlier by
// getOutputLatencyMs() (read once per take by the caller) plus this
// user trim. Mirrors the audio path's takeAlignment approach.

export const MIDI_TRIM_STORAGE_KEY = 'studio.midiTrimMs';

export function getMidiTrimMs(): number {
  if (typeof localStorage === 'undefined') return 0;
  const raw = localStorage.getItem(MIDI_TRIM_STORAGE_KEY);
  if (raw === null) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(-100, Math.min(100, n)) : 0;
}
```

- [ ] **Step 4: Run** — `npx vitest run src/lib/studio/midiInput.test.ts` — PASS (old SustainTracker tests still pass; they go in Task 5).
- [ ] **Step 5: Commit** — `git commit -am "feat(studio): MIDI capture plumbing — CC1 parsing, HeldNotes, attachTakeCc, midi trim config"`

---

### Task 5: Rewire StudioEditor recording (true durations + CC capture + compensation)

**Files:**
- Modify: `src/hooks/useStudioMidiInput.ts`
- Modify: `src/pages/studio/StudioEditor.tsx` (lines ~447-533 MIDI handlers, ~1070-1100 stopRecording, record start)
- Delete: `src/lib/studio/midiSustain.ts`; remove its `SustainTracker` describe blocks from `midiInput.test.ts`

**Interfaces:**
- Consumes: `HeldNotes`, `HeldPress`, `CapturedCc`, `attachTakeCc`, `getMidiTrimMs` from `./midiRecord`; `getOutputLatencyMs` from `@/lib/audio/sharedRecorder` (already imported in StudioEditor).
- Produces: `useStudioMidiInput` gains `onCc?: (controller: number, value: number) => void`.

- [ ] **Step 1: `useStudioMidiInput.ts`** — add `onCc` to the options interface, hold it in a ref like the existing three callbacks, and in the message router add `case 'cc': onCcRef.current?.(ev.controller, ev.value); break;` (match the file's existing switch/if style).

- [ ] **Step 2: StudioEditor — replace the tracker + add capture state.** Replace `const [midiTracker] = useState(() => new SustainTracker());` with:

```tsx
  // Physically-held keys for the current take. Since schema 1.1.0 the
  // pedal is captured as CC64 events (midiCcRef) and notes commit with
  // their TRUE key-up duration — playback lengthens them via applySustain.
  const [midiHeld] = useState(() => new HeldNotes());
  // CC events captured during the take (absolute compensated seconds).
  const midiCcRef = useRef<CapturedCc[]>([]);
  const midiPedalRef = useRef(false);   // dedupe (WP06 broadcasts CC64 on 3 channels)
  // Capture compensation for this take, seconds (auto output latency + trim).
  const midiCompSecRef = useRef(0);
  // Transport position minus recording compensation — the musical moment
  // the player MEANT, given they play in time with late-by-outputLatency audio.
  const compNow = () => Math.max(0, (state?.positionSeconds ?? 0) - midiCompSecRef.current);
```

Update imports: drop `SustainTracker` (from `@/lib/studio/midiSustain`), import `HeldNotes, attachTakeCc, getMidiTrimMs` and types `HeldPress, CapturedCc` from `@/lib/studio/midiRecord`. The `useEffect` teardown that called `midiTracker.flush()` now calls `midiHeld.flush()`.

- [ ] **Step 3: Rewrite the three handlers** (keep `commitMidiPresses` exactly as is):

```tsx
  const handleMidiNoteOn = (pitch: number, velocity: number) => {
    liveVoicesRef.current?.noteOn(pitch, velocity / 127);
    if (state?.recordingActive && midiInputTrack) {
      const at = compNow();
      const stale = midiHeld.keyDown(pitch, velocity, at);
      if (stale) commitMidiPresses([stale], at); // missed note-off
    }
  };
  const handleMidiNoteOff = (pitch: number) => {
    liveVoicesRef.current?.noteOff(pitch);
    const press = midiHeld.keyUp(pitch);
    if (!press) return;
    commitMidiPresses([press], compNow());
  };
  const handleMidiSustain = (down: boolean) => {
    liveVoicesRef.current?.sustain(down); // monitoring feel unchanged
    if (state?.recordingActive && down !== midiPedalRef.current) {
      midiPedalRef.current = down;
      midiCcRef.current.push({ controller: 64, value: down ? 127 : 0, timeAbsSeconds: compNow() });
    }
    if (!state?.recordingActive) midiPedalRef.current = down;
  };
  const handleMidiCc = (controller: number, value: number) => {
    if (!state?.recordingActive) return;
    const prev = midiCcRef.current[midiCcRef.current.length - 1];
    if (prev && prev.controller === controller && prev.value === value) return; // coalesce dupes
    midiCcRef.current.push({ controller, value, timeAbsSeconds: compNow() });
  };
```

Pass `onCc: handleMidiCc` into the `useStudioMidiInput({...})` call.

- [ ] **Step 4: Record start/stop.** In `startRecording`, find the existing `midiTakeClipRef.current = null` reset (grep; it's near where the recording state object is created) and add beside it:

```tsx
    midiCcRef.current = [];
    midiPedalRef.current = false;
    // Auto compensation measured once per take; ±trim from the settings dial.
    midiCompSecRef.current = engineState.native ? 0
      : Math.max(0, getOutputLatencyMs() + getMidiTrimMs()) / 1000;
```

In `stopRecording`, both MIDI commit sites currently call `commitMidiPresses(midiTracker.flush(), …)` — change to `midiHeld.flush()`, then immediately after each, attach the take's CC:

```tsx
      const ccTake = midiCcRef.current.splice(0);
      if (ccTake.length && midiTakeClipRef.current && midiInputTrack) {
        const takeId = midiTakeClipRef.current;
        const trackId = midiInputTrack.id;
        update((s) => ({
          ...s,
          tracks: s.tracks.map((t) => t.id === trackId && isMidiTrack(t)
            ? { ...t, clips: attachTakeCc(t.clips, takeId, ccTake) } as Track
            : t),
        }));
      }
```

Extract that block into a local `const commitTakeCc = () => {…}` above `stopRecording`'s branches and call it from both the `midiOnly` early-return path and the audio path (right after their `flush()` commits) — one definition, two calls.

- [ ] **Step 5: Delete `src/lib/studio/midiSustain.ts`** and the `SustainTracker` describe blocks + import in `midiInput.test.ts`. `grep -rn "midiSustain\|SustainTracker" src ios` must return nothing.
- [ ] **Step 6: Verify** — `npx vitest run src/lib/studio/` PASS; `npm run build` PASS.
- [ ] **Step 7: Commit** — `git commit -am "feat(studio): record true note durations + CC64/CC1 capture with auto+trim latency compensation"`

---

### Task 6: Playback through `applySustain`

**Files:**
- Modify: `src/lib/studio/engine/tracks.ts:233-250` (`scheduleMidiClip`)

**Interfaces:**
- Consumes: `applySustain` from `../midiEdit`.

- [ ] **Step 1: Edit** — in `scheduleMidiClip`, change the loop source:

```ts
import { applySustain } from '../midiEdit';
```
```ts
  // Pedal-lengthened effective durations (1.1.0 cc clips). Legacy clips
  // (no cc) pass through applySustain untouched — identical output.
  for (const note of applySustain(clip.notes, clip.cc ?? [])) {
```

- [ ] **Step 2: Verify** — `npx vitest run src/lib/studio/engine/__tests__/ src/lib/studio/` PASS; `npm run build` PASS.
- [ ] **Step 3: Commit** — `git commit -am "feat(studio): playback derives sustain lengthening from CC64 (applySustain)"`

---

### Task 7: MIDI trim UI control

**Files:**
- Modify: `src/pages/studio/StudioEditor.tsx` (~line 5199, next to `<RecordingLatencyControl />`)

**Interfaces:**
- Consumes: `MIDI_TRIM_STORAGE_KEY`, `getMidiTrimMs` from `@/lib/studio/midiRecord`; `getOutputLatencyMs` from `@/lib/audio/sharedRecorder`.

- [ ] **Step 1: Implement** — add `<MidiLatencyControl />` right after `<RecordingLatencyControl />`, and the component next to it (mirror `RecordingLatencyControl`'s structure exactly — same classes, `Timer` icon, R-reset button):

```tsx
function MidiLatencyControl() {
  const [trim, setTrim] = useState<number>(() => getMidiTrimMs());
  // Auto value read once for display — the actual per-take value is
  // sampled at record start (midiCompSecRef in startRecording).
  const [autoMs] = useState(() => Math.round(getOutputLatencyMs()));
  useEffect(() => { localStorage.setItem(MIDI_TRIM_STORAGE_KEY, String(trim)); }, [trim]);
  return (
    <div className="border-t border-border pt-1.5 space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold inline-flex items-center gap-1">
          <Timer className="w-4 h-4" /> MIDI recording offset
        </span>
        <span className="font-mono tabular-nums">auto {autoMs} + trim {trim} ms</span>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="range" min={-100} max={100} step={5} value={trim}
          onChange={(e) => setTrim(Number(e.target.value))}
          className="flex-1 h-1 accent-primary"
          title="Fine-tunes where recorded MIDI notes land. Positive = notes move earlier."
        />
        <button
          onClick={() => setTrim(0)}
          className="text-xs font-semibold px-1.5 py-0.5 rounded border border-border bg-muted hover:bg-muted/70 tabular-nums"
          title="Reset trim to 0 ms"
        >R</button>
      </div>
      <div className="text-[10px] text-muted-foreground italic">
        Auto compensation is measured each take. Add trim if recorded notes still sit late against the click; go negative if they land early.
      </div>
    </div>
  );
}
```

(Note: `text-[10px]` and `rounded` match `RecordingLatencyControl` verbatim — consistency with the adjacent control wins over introducing a one-off deviation here.)

- [ ] **Step 2: Verify** — `npm run build`; then `npm run dev`, open Studio → audio settings dialog → both latency controls render, slider persists across reload.
- [ ] **Step 3: Commit** — `git commit -am "feat(studio): MIDI recording offset control (auto + trim)"`

---

### Task 8: `rollGeometry.ts` — mapping + hit-testing

**Files:**
- Create: `src/pages/studio/pianoroll/rollGeometry.ts`
- Test: `src/pages/studio/pianoroll/rollGeometry.test.ts`

**Interfaces:**
- Produces (all coordinates are CONTENT-space px — scroll/chrome offsets already removed by the caller):
  - `interface RollMetrics { pxPerSecond: number; rowHeight: number }`
  - `timeToX(m, seconds): number`, `xToTime(m, x): number` (clamped ≥ 0)
  - `pitchToY(m, pitch): number` (top of the row; pitch 127 at y=0), `yToPitch(m, y): number` (clamped 0..127)
  - `type HitZone = 'left' | 'body' | 'right'`
  - `hitTestNote(m, notes: MidiNote[], x, y, edgePx?): { index: number; zone: HitZone } | null` (topmost = last drawn = highest index wins)
  - `notesInRect(m, notes, r: { x0; y0; x1; y1 }): number[]` (normalizes the rect, note intersects rect)

- [ ] **Step 1: Failing tests** — `rollGeometry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { timeToX, xToTime, pitchToY, yToPitch, hitTestNote, notesInRect } from './rollGeometry';
import type { MidiNote } from '@/lib/studio/session';

const m = { pxPerSecond: 100, rowHeight: 12 };
const note = (pitch: number, start: number, dur: number): MidiNote =>
  ({ pitch, velocity: 100, start_seconds: start, duration_seconds: dur });

describe('rollGeometry', () => {
  it('maps time and pitch both ways', () => {
    expect(timeToX(m, 1.5)).toBe(150);
    expect(xToTime(m, 150)).toBeCloseTo(1.5);
    expect(xToTime(m, -10)).toBe(0);
    expect(pitchToY(m, 127)).toBe(0);
    expect(pitchToY(m, 60)).toBe((127 - 60) * 12);
    expect(yToPitch(m, 5)).toBe(127);
    expect(yToPitch(m, (127 - 60) * 12 + 6)).toBe(60);
    expect(yToPitch(m, 99999)).toBe(0);
  });

  it('hit-tests body and edges, topmost note first', () => {
    const notes = [note(60, 1, 1), note(60, 1, 1)];
    const y = pitchToY(m, 60) + 6;
    expect(hitTestNote(m, notes, 150, y)).toEqual({ index: 1, zone: 'body' });
    expect(hitTestNote(m, notes, 102, y)).toEqual({ index: 1, zone: 'left' });
    expect(hitTestNote(m, notes, 198, y)).toEqual({ index: 1, zone: 'right' });
    expect(hitTestNote(m, notes, 150, y + 12)).toBeNull();
    expect(hitTestNote(m, notes, 300, y)).toBeNull();
  });

  it('tiny notes are all body (edges need width)', () => {
    const notes = [note(60, 1, 0.05)]; // 5px wide at 100px/s
    expect(hitTestNote(m, notes, 101, pitchToY(m, 60) + 6)?.zone).toBe('body');
  });

  it('marquee returns intersecting notes with a normalized rect', () => {
    const notes = [note(60, 0, 1), note(62, 2, 1), note(64, 5, 1)];
    const y60 = pitchToY(m, 60), y62 = pitchToY(m, 62);
    expect(notesInRect(m, notes, { x0: 250, y0: y60 + 11, x1: 50, y1: y62 + 1 })).toEqual([0, 1]);
  });
});
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement:**

```ts
// Pure px↔music mapping for the piano roll. All coordinates here are
// CONTENT-space pixels: (0,0) is clip-time 0 at pitch 127's row top.
// The panel translates pointer/scroll/chrome offsets before calling in.

import type { MidiNote } from '@/lib/studio/session';

export interface RollMetrics {
  pxPerSecond: number;
  rowHeight: number;
}

export const PITCH_MAX = 127;
export const ROLL_ROWS = 128;

export const timeToX = (m: RollMetrics, seconds: number): number => seconds * m.pxPerSecond;
export const xToTime = (m: RollMetrics, x: number): number => Math.max(0, x / m.pxPerSecond);
export const pitchToY = (m: RollMetrics, pitch: number): number => (PITCH_MAX - pitch) * m.rowHeight;
export const yToPitch = (m: RollMetrics, y: number): number =>
  Math.max(0, Math.min(PITCH_MAX, PITCH_MAX - Math.floor(y / m.rowHeight)));

export type HitZone = 'left' | 'body' | 'right';

/** Topmost (= last rendered = highest index) note under the point.
 * Edge zones only exist when the note is wide enough that grabbing an
 * edge can't be an accidental body-grab. */
export function hitTestNote(
  m: RollMetrics, notes: MidiNote[], x: number, y: number, edgePx = 5,
): { index: number; zone: HitZone } | null {
  for (let i = notes.length - 1; i >= 0; i--) {
    const n = notes[i];
    const x0 = timeToX(m, n.start_seconds);
    const x1 = timeToX(m, n.start_seconds + n.duration_seconds);
    const y0 = pitchToY(m, n.pitch);
    if (y < y0 || y >= y0 + m.rowHeight || x < x0 || x > x1) continue;
    if (x1 - x0 > edgePx * 3) {
      if (x <= x0 + edgePx) return { index: i, zone: 'left' };
      if (x >= x1 - edgePx) return { index: i, zone: 'right' };
    }
    return { index: i, zone: 'body' };
  }
  return null;
}

/** Indices of notes intersecting the (any-corner-order) rect. */
export function notesInRect(
  m: RollMetrics, notes: MidiNote[], r: { x0: number; y0: number; x1: number; y1: number },
): number[] {
  const [xa, xb] = r.x0 <= r.x1 ? [r.x0, r.x1] : [r.x1, r.x0];
  const [ya, yb] = r.y0 <= r.y1 ? [r.y0, r.y1] : [r.y1, r.y0];
  const out: number[] = [];
  notes.forEach((n, i) => {
    const nx0 = timeToX(m, n.start_seconds);
    const nx1 = timeToX(m, n.start_seconds + n.duration_seconds);
    const ny0 = pitchToY(m, n.pitch);
    if (nx1 >= xa && nx0 <= xb && ny0 + m.rowHeight >= ya && ny0 <= yb) out.push(i);
  });
  return out;
}
```

- [ ] **Step 4: Run** — PASS. **Step 5: Commit** — `git commit -am "feat(studio): piano roll geometry — mapping, hit-testing, marquee"`

---

### Task 9: PianoRollPanel skeleton — rendering + mount below Smart Controls

**Files:**
- Create: `src/pages/studio/pianoroll/PianoRollPanel.tsx`
- Modify: `src/pages/studio/StudioEditor.tsx` (mount after `<SmartControls …/>` at line ~2328; rewire the per-track "Piano roll" button ~2765)

**Interfaces:**
- Produces the component contract every later task extends:

```tsx
export interface PianoRollPanelProps {
  session: Session;
  trackId: string;
  clipId: string;
  positionSeconds: number;
  nativeEngine: boolean;
  update: (mut: (s: Session) => Session) => void;
  pushHistory: () => void;         // snapshot BEFORE the first mutation of a gesture
  onSeek: (seconds: number) => void;
  onClose: () => void;
}
```

- Internal helpers later tasks call: `editClip(mut: (c: MidiClip) => MidiClip): void`, `metrics: RollMetrics`, `contentPos(e): { cx: number; cy: number; region: 'ruler' | 'keys' | 'grid' }`, `selection: number[]` + `setSelection`, `grid: RollGrid` + `strengthPct`, `scheduleDraw()`.

- [ ] **Step 1: Create the component** — `src/pages/studio/pianoroll/PianoRollPanel.tsx`:

```tsx
// Docked piano-roll editor — opens below Smart Controls when a MIDI clip
// is selected. Canvas-rendered (like PeaksCanvas): one sticky canvas
// draws the visible window of ruler + keys + note grid; a second canvas
// below is the velocity/CC lane (Tasks 11-12). All note math is pure
// (midiEdit.ts / rollGeometry.ts); edits flow through the session update
// path, which reschedules the engine.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MidiClip, Session, MidiNote } from '@/lib/studio/session';
import { isMidiTrack } from '@/lib/studio/session';
import {
  ROLL_GRIDS, type RollGrid, gridSeconds,
} from '@/lib/studio/midiEdit';
import {
  type RollMetrics, PITCH_MAX, ROLL_ROWS, timeToX, pitchToY,
} from './rollGeometry';

const KEYS_W = 48;      // piano-key gutter
const RULER_H = 20;
const ROW_H = 12;       // px per semitone
const GRID_BODY_H = 300;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const isBlackKey = (p: number) => NOTE_NAMES[p % 12].endsWith('#');
const pitchLabel = (p: number) => `${NOTE_NAMES[p % 12]}${Math.floor(p / 12) - 1}`;

/** Resolve a theme token to a canvas-usable color (tokens are HSL triplets). */
function tokenColor(el: HTMLElement, name: string, fallback: string): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v ? `hsl(${v})` : fallback;
}

export interface PianoRollPanelProps {
  session: Session;
  trackId: string;
  clipId: string;
  positionSeconds: number;
  nativeEngine: boolean;
  update: (mut: (s: Session) => Session) => void;
  pushHistory: () => void;
  onSeek: (seconds: number) => void;
  onClose: () => void;
}

export function PianoRollPanel(props: PianoRollPanelProps) {
  const { session, trackId, clipId } = props;
  const track = session.tracks.find((t) => t.id === trackId);
  const clip = track && isMidiTrack(track)
    ? track.clips.find((c) => c.id === clipId) ?? null : null;

  const [open, setOpen] = useState(true);
  const [grid, setGrid] = useState<RollGrid>('1/16');
  const [strengthPct, setStrengthPct] = useState(80);
  const [pxPerSecond, setPxPerSecond] = useState(120);
  const [selection, setSelection] = useState<number[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  const metrics: RollMetrics = useMemo(
    () => ({ pxPerSecond, rowHeight: ROW_H }), [pxPerSecond]);
  const gridSec = clip ? gridSeconds(grid, session.tempo_bpm) : 0;

  /** One history-free clip mutation; gestures call pushHistory() once first. */
  const editClip = (mut: (c: MidiClip) => MidiClip) => props.update((s) => ({
    ...s,
    tracks: s.tracks.map((t) => t.id !== trackId || !isMidiTrack(t) ? t : {
      ...t, clips: t.clips.map((c) => c.id === clipId ? mut(c) : c),
    }),
  }));

  // ── Drawing ─────────────────────────────────────────────────────────
  const scheduleDraw = () => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => { rafRef.current = null; draw(); });
  };

  const draw = () => {
    const canvas = canvasRef.current, holder = scrollRef.current;
    if (!canvas || !holder || !clip) return;
    const dpr = window.devicePixelRatio || 1;
    const vw = holder.clientWidth, vh = holder.clientHeight;
    if (canvas.width !== vw * dpr || canvas.height !== vh * dpr) {
      canvas.width = vw * dpr; canvas.height = vh * dpr;
      canvas.style.width = `${vw}px`; canvas.style.height = `${vh}px`;
    }
    const sx = holder.scrollLeft, sy = holder.scrollTop;
    const g = canvas.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cBg = tokenColor(holder, '--card', '#111');
    const cMuted = tokenColor(holder, '--muted', '#222');
    const cBorder = tokenColor(holder, '--border', '#333');
    const cFg = tokenColor(holder, '--foreground', '#eee');
    const cSub = tokenColor(holder, '--muted-foreground', '#999');
    const cPrimary = tokenColor(holder, '--primary', '#7c3aed');
    g.fillStyle = cBg; g.fillRect(0, 0, vw, vh);

    const secondsPerBeat = 60 / session.tempo_bpm;
    const beatsPerBar = session.time_signature.numerator;

    // Note grid region: rows + gridlines + notes, offset by scroll.
    g.save();
    g.beginPath(); g.rect(KEYS_W, RULER_H, vw - KEYS_W, vh - RULER_H); g.clip();
    g.translate(KEYS_W - sx, RULER_H - sy);
    // Row shading (black keys darker) across the clip width.
    const totalW = timeToX(metrics, clip.duration_seconds);
    for (let p = 0; p <= PITCH_MAX; p++) {
      if (!isBlackKey(p)) continue;
      g.fillStyle = cMuted;
      g.globalAlpha = 0.35;
      g.fillRect(0, pitchToY(metrics, p), totalW, ROW_H);
      g.globalAlpha = 1;
    }
    // Octave lines (each C) + vertical grid/beat/bar lines. Vertical
    // lines are TIMELINE-anchored: line positions in clip time are
    // (k*grid − clip.start) so they match what quantize snaps to.
    const totalH = ROLL_ROWS * ROW_H;
    for (let p = 0; p <= PITCH_MAX; p += 12) {
      g.strokeStyle = cBorder; g.globalAlpha = 0.8;
      const y = pitchToY(metrics, p) + ROW_H;
      g.beginPath(); g.moveTo(0, y); g.lineTo(totalW, y); g.stroke(); g.globalAlpha = 1;
    }
    const drawVerticals = (stepSec: number, alpha: number) => {
      if (stepSec <= 0 || stepSec * metrics.pxPerSecond < 4) return;
      const firstAbs = Math.ceil(clip.start_seconds / stepSec) * stepSec;
      for (let abs = firstAbs; abs <= clip.start_seconds + clip.duration_seconds; abs += stepSec) {
        const x = timeToX(metrics, abs - clip.start_seconds);
        g.strokeStyle = cBorder; g.globalAlpha = alpha;
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, totalH); g.stroke(); g.globalAlpha = 1;
      }
    };
    drawVerticals(gridSec, 0.25);
    drawVerticals(secondsPerBeat, 0.5);
    drawVerticals(secondsPerBeat * beatsPerBar, 1);
    // Notes — velocity as alpha, selection ringed in foreground color.
    const selSet = new Set(selection);
    clip.notes.forEach((n, i) => {
      const x = timeToX(metrics, n.start_seconds);
      const w = Math.max(3, timeToX(metrics, n.duration_seconds));
      const y = pitchToY(metrics, n.pitch);
      g.fillStyle = cPrimary;
      g.globalAlpha = 0.35 + 0.65 * (n.velocity / 127);
      g.fillRect(x, y + 1, w, ROW_H - 2);
      g.globalAlpha = 1;
      if (selSet.has(i)) {
        g.strokeStyle = cFg; g.lineWidth = 1.5;
        g.strokeRect(x + 0.5, y + 1.5, w - 1, ROW_H - 3);
        g.lineWidth = 1;
      }
    });
    // Playhead (clip-relative).
    const ph = props.positionSeconds - clip.start_seconds;
    if (ph >= 0 && ph <= clip.duration_seconds) {
      const x = timeToX(metrics, ph);
      g.strokeStyle = cFg; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, totalH); g.stroke();
    }
    g.restore();

    // Keys gutter (sticky left, scrolls vertically only).
    g.save();
    g.beginPath(); g.rect(0, RULER_H, KEYS_W, vh - RULER_H); g.clip();
    g.translate(0, RULER_H - sy);
    for (let p = 0; p <= PITCH_MAX; p++) {
      const y = pitchToY(metrics, p);
      g.fillStyle = isBlackKey(p) ? cMuted : cBg;
      g.fillRect(0, y, KEYS_W, ROW_H);
      g.strokeStyle = cBorder; g.globalAlpha = 0.4;
      g.strokeRect(0.5, y + 0.5, KEYS_W - 1, ROW_H); g.globalAlpha = 1;
      if (p % 12 === 0) {
        g.fillStyle = cSub; g.font = '9px ui-monospace, monospace';
        g.fillText(pitchLabel(p), 4, y + ROW_H - 3);
      }
    }
    g.restore();

    // Ruler (sticky top, scrolls horizontally only): absolute bars.
    g.save();
    g.beginPath(); g.rect(KEYS_W, 0, vw - KEYS_W, RULER_H); g.clip();
    g.translate(KEYS_W - sx, 0);
    g.fillStyle = cMuted; g.fillRect(sx - KEYS_W, 0, vw, RULER_H);
    const barSec = secondsPerBeat * beatsPerBar;
    const firstBarAbs = Math.ceil(clip.start_seconds / barSec) * barSec;
    for (let abs = firstBarAbs; abs <= clip.start_seconds + clip.duration_seconds; abs += barSec) {
      const x = timeToX(metrics, abs - clip.start_seconds);
      g.strokeStyle = cBorder;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, RULER_H); g.stroke();
      g.fillStyle = cSub; g.font = '9px ui-monospace, monospace';
      g.fillText(String(Math.round(abs / barSec) + 1), x + 3, 13);
    }
    g.restore();
    // Corner mask above the keys.
    g.fillStyle = cMuted; g.fillRect(0, 0, KEYS_W, RULER_H);
    g.strokeStyle = cBorder;
    g.beginPath(); g.moveTo(0, RULER_H - 0.5); g.lineTo(vw, RULER_H - 0.5); g.stroke();
  };

  // Redraw on any input change; keep the playhead moving.
  useEffect(() => { scheduleDraw(); });
  // Auto-center the pitch content on open / clip switch.
  useEffect(() => {
    const holder = scrollRef.current;
    if (!holder || !clip) return;
    const pitches = clip.notes.map((n) => n.pitch);
    const mid = pitches.length ? (Math.min(...pitches) + Math.max(...pitches)) / 2 : 60;
    holder.scrollTop = Math.max(0, pitchToY(metrics, Math.round(mid)) - (holder.clientHeight - RULER_H) / 2);
    setSelection([]);
  }, [clipId]);

  if (!clip) return null;
  const totalW = KEYS_W + Math.ceil(clip.duration_seconds * pxPerSecond) + 200; // headroom to draw past the end
  const totalH = RULER_H + ROLL_ROWS * ROW_H;

  return (
    <div className="bg-card border border-border rounded-md" data-testid="piano-roll-panel">
      <div className="px-3 py-1.5 border-b border-border flex items-center gap-2 text-sm">
        <button onClick={() => setOpen(!open)} className="text-muted-foreground hover:text-foreground">
          {open ? '▾' : '▸'}
        </button>
        <span className="font-semibold uppercase tracking-wide text-muted-foreground">Piano roll</span>
        <span className="text-xs text-muted-foreground">· {track?.name}</span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setPxPerSecond((z) => Math.max(30, z / 1.5))}
            className="text-xs px-1.5 py-0.5 border border-border bg-muted hover:bg-muted/70" title="Zoom out">−</button>
          <button onClick={() => setPxPerSecond((z) => Math.min(1000, z * 1.5))}
            className="text-xs px-1.5 py-0.5 border border-border bg-muted hover:bg-muted/70" title="Zoom in">+</button>
          <button onClick={props.onClose} className="text-xs px-1.5 py-0.5 text-muted-foreground hover:text-foreground" title="Close">×</button>
        </div>
      </div>
      {open && (
        <>
          {/* Toolbar — tools + quantize land in Tasks 10-12. */}
          <div className="px-3 py-1 border-b border-border flex items-center gap-2 text-xs flex-wrap" data-roll-toolbar>
            <label className="text-muted-foreground">Grid</label>
            <select value={grid} onChange={(e) => setGrid(e.target.value as RollGrid)}
              className="border border-border bg-background px-1 py-0.5 text-xs">
              {ROLL_GRIDS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <label className="text-muted-foreground">Strength</label>
            <input type="range" min={10} max={100} step={10} value={strengthPct}
              onChange={(e) => setStrengthPct(Number(e.target.value))}
              className="w-20 h-1 accent-primary" />
            <span className="font-mono tabular-nums w-8">{strengthPct}%</span>
          </div>
          <div
            ref={scrollRef}
            className="relative overflow-auto outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ height: GRID_BODY_H }}
            tabIndex={0}
            onScroll={scheduleDraw}
          >
            <div style={{ width: totalW, height: totalH }} />
            <canvas ref={canvasRef} className="sticky top-0 left-0 block" style={{ position: 'sticky' }} />
          </div>
        </>
      )}
    </div>
  );
}
```

Note on the sticky canvas: the spacer div establishes scroll extent; the canvas must render at the viewport origin while the container scrolls. If `position: sticky` misbehaves inside the flex layout during manual testing, switch to `position: absolute` with `left: scrollLeft; top: scrollTop` updated in `draw()` — decide by testing, keep whichever is stable, and leave a one-line comment stating which and why.

- [ ] **Step 2: Mount in StudioEditor** — after the `<SmartControls …/>` element (line ~2328):

```tsx
      {(() => {
        if (!selectedClip) return null;
        const t = session.tracks.find((x) => x.id === selectedClip.trackId);
        if (!t || !isMidiTrack(t) || !t.clips.some((c) => c.id === selectedClip.clipId)) return null;
        return (
          <PianoRollPanel
            key={selectedClip.clipId}
            session={session}
            trackId={selectedClip.trackId}
            clipId={selectedClip.clipId}
            positionSeconds={state?.positionSeconds ?? 0}
            nativeEngine={!!engineState.native}
            update={update}
            pushHistory={() => pushHistory(session)}
            onSeek={(s) => engineState.seek?.(s)}
            onClose={() => setSelectedClip(null)}
          />
        );
      })()}
```

- [ ] **Step 3: Rewire the "Piano roll" track button.** Thread a new prop `onOpenPianoRoll: () => void` from the editor into `DarkTrackRow` → the MIDI track actions component (where `setOpenRoll(true)` lives, ~line 2765). Editor-side implementation:

```tsx
  // "Piano roll" on the track strip: select the first clip, creating an
  // empty 4-bar clip when the track has none (compose-from-scratch path).
  const openPianoRollForTrack = (trackId: string) => {
    const t = session.tracks.find((x) => x.id === trackId);
    if (!t || !isMidiTrack(t)) return;
    if (t.clips.length > 0) { setSelectedClip({ trackId, clipId: t.clips[0].id }); return; }
    const barSec = (60 / session.tempo_bpm) * session.time_signature.numerator * (4 / session.time_signature.denominator);
    const clip: MidiClip = { id: crypto.randomUUID(), kind: 'midi', start_seconds: 0, duration_seconds: barSec * 4, notes: [] };
    update((s) => ({
      ...s,
      tracks: s.tracks.map((x) => x.id === trackId && isMidiTrack(x) ? { ...x, clips: [clip] } as Track : x),
    }));
    setSelectedClip({ trackId, clipId: clip.id });
  };
```

The button becomes `onClick={onOpenPianoRoll}`; leave `PianoRollDialog` and its `openRoll` state in place but unreferenced-by-the-button (full deletion is Task 13).

- [ ] **Step 4: Verify** — `npm run build`; `npm run dev` → open a session with a recorded MIDI clip → click the clip → panel opens below Smart Controls showing notes, black-key row shading, bar ruler, moving playhead; zoom in/out; scroll both axes; collapse/close; "Piano roll" button on an empty MIDI track creates a 4-bar clip and opens it.
- [ ] **Step 5: Commit** — `git commit -am "feat(studio): PianoRollPanel — docked canvas note view below Smart Controls"`

---

### Task 10: Pointer tool — select, marquee, move, resize, delete, audition, keyboard

**Files:**
- Modify: `src/pages/studio/pianoroll/PianoRollPanel.tsx`
- Modify: `src/pages/studio/StudioEditor.tsx` (audition plumbing)

**Interfaces:**
- Consumes: `hitTestNote`, `notesInRect`, `yToPitch`, `xToTime` from `./rollGeometry`; `moveNotes`, `resizeNotes`, `deleteNotes` from `@/lib/studio/midiEdit`; `LiveVoices` from `@/lib/studio/engine/liveVoices`.
- Produces: `PianoRollPanelProps` unchanged; adds internal `contentPos`, drag state machine, and a marquee overlay in `draw()` (reads `dragRef.current?.kind === 'marquee'`).

- [ ] **Step 1: Audition voice.** In `PianoRollPanel`, own a lazy `LiveVoices` (web engine only — `props.nativeEngine` guards):

```tsx
  const auditionRef = useRef<LiveVoices | null>(null);
  useEffect(() => () => { auditionRef.current?.dispose(); auditionRef.current = null; }, []);
  const audition = (pitch: number, velocity: number) => {
    if (props.nativeEngine || !track || !isMidiTrack(track)) return;
    if (!auditionRef.current) auditionRef.current = new LiveVoices();
    auditionRef.current.setInstrument(track.instrument);
    auditionRef.current.setStrip({ volume_db: track.volume_db, pan: track.pan, mute: track.mute });
    auditionRef.current.noteOn(pitch, velocity / 127);
    window.setTimeout(() => auditionRef.current?.noteOff(pitch), 250);
  };
```

- [ ] **Step 2: Pointer plumbing.** Add to the panel:

```tsx
  type Drag =
    | { kind: 'move'; startCx: number; startCy: number; orig: MidiNote[]; sel: number[]; moved: boolean }
    | { kind: 'resize'; edge: 'left' | 'right'; startCx: number; orig: MidiNote[]; sel: number[] }
    | { kind: 'marquee'; startCx: number; startCy: number; cx: number; cy: number; base: number[] };
  const dragRef = useRef<Drag | null>(null);

  /** Pointer event → content-space coords + which chrome region it hit. */
  const contentPos = (e: React.PointerEvent): { cx: number; cy: number; region: 'ruler' | 'keys' | 'grid' } => {
    const holder = scrollRef.current!;
    const rect = holder.getBoundingClientRect();
    const vx = e.clientX - rect.left, vy = e.clientY - rect.top;
    const region = vy < RULER_H ? 'ruler' : vx < KEYS_W ? 'keys' : 'grid';
    return { cx: vx - KEYS_W + holder.scrollLeft, cy: vy - RULER_H + holder.scrollTop, region };
  };

  const snapMod = (e: { altKey: boolean }) => (e.altKey ? 0 : gridSec);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!clip || e.button !== 0) return;
    scrollRef.current?.focus();
    const { cx, cy, region } = contentPos(e);
    if (region === 'ruler') { props.onSeek(clip.start_seconds + xToTime(metrics, cx)); return; }
    if (region === 'keys') { audition(yToPitch(metrics, cy), 100); return; }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const hit = hitTestNote(metrics, clip.notes, cx, cy);
    if (hit) {
      const already = selection.includes(hit.index);
      const sel = e.shiftKey
        ? (already ? selection.filter((i) => i !== hit.index) : [...selection, hit.index])
        : (already ? selection : [hit.index]);
      setSelection(sel);
      if (!e.shiftKey) audition(clip.notes[hit.index].pitch, clip.notes[hit.index].velocity);
      props.pushHistory();
      dragRef.current = hit.zone === 'body'
        ? { kind: 'move', startCx: cx, startCy: cy, orig: clip.notes, sel, moved: false }
        : { kind: 'resize', edge: hit.zone, startCx: cx, orig: clip.notes, sel };
      return;
    }
    if (e.detail === 2) { // double-click empty: create a note at grid length
      props.pushHistory();
      const start = snapAbsForClip(xToTime(metrics, cx));
      const dur = gridSec > 0 ? gridSec : 0.25;
      let created = -1;
      editClip((c) => {
        const r = addNote(c.notes, { pitch: yToPitch(metrics, cy), velocity: 100, start_seconds: start, duration_seconds: dur });
        created = r.index;
        return { ...c, notes: r.notes, duration_seconds: Math.max(c.duration_seconds, start + dur) };
      });
      setSelection(created >= 0 ? [created] : []);
      return;
    }
    dragRef.current = { kind: 'marquee', startCx: cx, startCy: cy, cx, cy, base: e.shiftKey ? selection : [] };
    if (!e.shiftKey) setSelection([]);
  };

  /** Snap a clip-relative time onto the TIMELINE grid (matches quantize). */
  const snapAbsForClip = (t: number): number => {
    if (gridSec <= 0 || !clip) return Math.max(0, t);
    const abs = clip.start_seconds + t;
    return Math.max(0, Math.round(abs / gridSec) * gridSec - clip.start_seconds);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !clip) return;
    const { cx, cy } = contentPos(e);
    if (d.kind === 'move') {
      const deltaSeconds = (cx - d.startCx) / metrics.pxPerSecond;
      const deltaSemitones = -Math.round((cy - d.startCy) / ROW_H);
      if (!d.moved && Math.abs(cx - d.startCx) < 3 && Math.abs(cy - d.startCy) < 3) return;
      d.moved = true;
      editClip((c) => ({ ...c, notes: moveNotes(d.orig, d.sel, {
        deltaSeconds, deltaSemitones, gridSeconds: snapMod(e), clipStartSeconds: c.start_seconds }) }));
    } else if (d.kind === 'resize') {
      const deltaSeconds = (cx - d.startCx) / metrics.pxPerSecond;
      editClip((c) => ({ ...c, notes: resizeNotes(d.orig, d.sel, {
        edge: d.edge, deltaSeconds, gridSeconds: snapMod(e), clipStartSeconds: c.start_seconds }) }));
    } else {
      d.cx = cx; d.cy = cy;
      setSelection([...new Set([...d.base, ...notesInRect(metrics, clip.notes,
        { x0: d.startCx, y0: d.startCy, x1: cx, y1: cy })])]);
      scheduleDraw();
    }
  };

  const onPointerUp = () => { dragRef.current = null; scheduleDraw(); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    // The panel owns keys while focused — never let Delete bubble to the
    // editor's clip-delete shortcut.
    e.stopPropagation();
    if (!clip) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && selection.length) {
      e.preventDefault();
      props.pushHistory();
      editClip((c) => ({ ...c, notes: deleteNotes(c.notes, selection) }));
      setSelection([]);
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      setSelection(clip.notes.map((_, i) => i));
    } else if (e.key === 'Escape') {
      setSelection([]);
    }
  };
```

Attach `onPointerDown/onPointerMove/onPointerUp/onKeyDown` to the scroll container div. Add the marquee rectangle to `draw()`'s grid section (after notes, before playhead):

```tsx
    const d = dragRef.current;
    if (d && d.kind === 'marquee') {
      g.strokeStyle = cFg; g.globalAlpha = 0.7; g.setLineDash([4, 3]);
      g.strokeRect(Math.min(d.startCx, d.cx) + 0.5, Math.min(d.startCy, d.cy) + 0.5,
        Math.abs(d.cx - d.startCx), Math.abs(d.cy - d.startCy));
      g.setLineDash([]); g.globalAlpha = 1;
    }
```

Also add imports: `addNote, moveNotes, resizeNotes, deleteNotes` from midiEdit; `hitTestNote, notesInRect, xToTime, yToPitch` from rollGeometry; `LiveVoices` from `@/lib/studio/engine/liveVoices`.

- [ ] **Step 3: Editor keyboard guard.** In StudioEditor's window `keydown` handler (~line 1515), the panel's `stopPropagation` on a focused panel already prevents conflicts (React synthetic stopPropagation halts native bubbling to `window`). Verify by testing: with notes selected in the panel, Delete removes notes and the CLIP survives; with the timeline focused, Delete still deletes the clip.
- [ ] **Step 4: Manual verify** (dev server): click selects + auditions; shift-click multi-select; marquee; drag moves with grid snap; ⌥-drag bypasses snap; edge-drag resizes; double-click creates; Delete/⌘A/Esc; undo (existing shortcut) reverts a whole gesture in one step.
- [ ] **Step 5: Build + commit** — `npm run build`; `git commit -am "feat(studio): piano roll pointer tool — select, marquee, move, resize, create, delete, audition"`

---

### Task 11: Toolbar ops (quantize, transpose) + velocity lane

**Files:**
- Modify: `src/pages/studio/pianoroll/PianoRollPanel.tsx`

**Interfaces:**
- Consumes: `quantizeNotes`, `transposeNotes`, `offsetVelocity` from `@/lib/studio/midiEdit`.
- Produces: lane state `type RollLane = 'velocity' | 'sustain' | 'mod'` (sustain/mod filled in Task 12); `LANE_H = 72`; a second canvas `laneCanvasRef` sharing `scrollLeft`.

- [ ] **Step 1: Toolbar actions.** Extend the toolbar row (after the strength slider):

```tsx
            <button onClick={applyQuantize} disabled={!selection.length}
              className="px-2 py-0.5 border border-border bg-muted hover:bg-muted/70 disabled:opacity-40 font-semibold">
              Quantize
            </button>
            <span className="text-muted-foreground">·</span>
            {[
              { label: '♯ +1', st: 1 }, { label: '♭ −1', st: -1 },
              { label: '8va', st: 12 }, { label: '8vb', st: -12 },
            ].map((b) => (
              <button key={b.label} onClick={() => applyTranspose(b.st)} disabled={!selection.length}
                className="px-2 py-0.5 border border-border bg-muted hover:bg-muted/70 disabled:opacity-40">
                {b.label}
              </button>
            ))}
            <span className="ml-auto text-muted-foreground">
              {selection.length ? `${selection.length} selected` : `${clip.notes.length} notes`}
            </span>
```

```tsx
  const applyQuantize = () => {
    if (!selection.length || gridSec <= 0) return;
    props.pushHistory();
    editClip((c) => ({ ...c, notes: quantizeNotes(c.notes, selection, {
      gridSeconds: gridSec, strength: strengthPct / 100, clipStartSeconds: c.start_seconds }) }));
  };
  const applyTranspose = (semitones: number) => {
    if (!selection.length) return;
    props.pushHistory();
    editClip((c) => ({ ...c, notes: transposeNotes(c.notes, selection, semitones) }));
  };
```

- [ ] **Step 2: Velocity lane.** Below the scroll container, add the lane strip:

```tsx
          <div className="flex border-t border-border">
            <select value={lane} onChange={(e) => setLane(e.target.value as RollLane)}
              className="w-12 shrink-0 border-r border-border bg-background text-xs px-0.5"
              style={{ width: KEYS_W }} title="Lane">
              <option value="velocity">Vel</option>
              <option value="sustain">Sus</option>
              <option value="mod">Mod</option>
            </select>
            <canvas
              ref={laneCanvasRef}
              className="block flex-1"
              style={{ height: LANE_H }}
              onPointerDown={onLanePointerDown}
              onPointerMove={onLanePointerMove}
              onPointerUp={onPointerUp}
            />
          </div>
```

with `const [lane, setLane] = useState<RollLane>('velocity');`, `const laneCanvasRef = useRef<HTMLCanvasElement>(null);`, `const LANE_H = 72;` (module scope), and a `drawLane()` called from `scheduleDraw`'s rAF alongside `draw()`:

```tsx
  const drawLane = () => {
    const canvas = laneCanvasRef.current, holder = scrollRef.current;
    if (!canvas || !holder || !clip) return;
    const dpr = window.devicePixelRatio || 1;
    const vw = canvas.clientWidth, vh = LANE_H;
    if (canvas.width !== vw * dpr || canvas.height !== vh * dpr) { canvas.width = vw * dpr; canvas.height = vh * dpr; }
    const g = canvas.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = holder.scrollLeft;
    const cBg = tokenColor(holder, '--card', '#111');
    const cBorder = tokenColor(holder, '--border', '#333');
    const cPrimary = tokenColor(holder, '--primary', '#7c3aed');
    const cFg = tokenColor(holder, '--foreground', '#eee');
    g.fillStyle = cBg; g.fillRect(0, 0, vw, vh);
    g.save(); g.translate(-sx, 0);
    if (lane === 'velocity') {
      const selSet = new Set(selection);
      clip.notes.forEach((n, i) => {
        const x = timeToX(metrics, n.start_seconds);
        const h = (n.velocity / 127) * (vh - 4);
        g.fillStyle = cPrimary;
        g.globalAlpha = selSet.has(i) ? 1 : 0.55;
        g.fillRect(x, vh - h, 4, h);
        g.globalAlpha = 1;
        if (selSet.has(i)) { g.strokeStyle = cFg; g.strokeRect(x + 0.5, vh - h + 0.5, 3, h - 1); }
      });
    }
    // sustain + mod lanes render in Task 12.
    g.restore();
    g.strokeStyle = cBorder; g.strokeRect(0.5, 0.5, vw - 1, vh - 1);
  };
```

Lane pointer handlers (velocity for now; Task 12 extends them by `lane`):

```tsx
  const laneDragRef = useRef<{ kind: 'velocity'; index: number; inSelection: boolean; lastVel: number } | null>(null);

  const lanePos = (e: React.PointerEvent) => {
    const canvas = laneCanvasRef.current!, holder = scrollRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { cx: e.clientX - rect.left + holder.scrollLeft, vy: e.clientY - rect.top };
  };

  const onLanePointerDown = (e: React.PointerEvent) => {
    if (!clip || lane !== 'velocity') return;
    const { cx, vy } = lanePos(e);
    // Nearest note whose start bar column is within 4px (topmost wins).
    let index = -1;
    clip.notes.forEach((n, i) => { if (Math.abs(timeToX(metrics, n.start_seconds) - cx) <= 4) index = i; });
    if (index < 0) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    props.pushHistory();
    const vel = velFromY(vy);
    const inSelection = selection.includes(index);
    laneDragRef.current = { kind: 'velocity', index, inSelection, lastVel: vel };
    applyLaneVelocity(index, inSelection, vel, vel);
  };

  const onLanePointerMove = (e: React.PointerEvent) => {
    const d = laneDragRef.current;
    if (!d || !clip) return;
    const { vy } = lanePos(e);
    const vel = velFromY(vy);
    applyLaneVelocity(d.index, d.inSelection, vel, d.lastVel);
    d.lastVel = vel;
  };

  const velFromY = (vy: number) => Math.max(1, Math.min(127, Math.round(127 * (1 - vy / LANE_H))));

  /** Dragging a selected note's bar scales the whole selection by the
   * same delta; an unselected bar edits just that note. */
  const applyLaneVelocity = (index: number, inSelection: boolean, vel: number, lastVel: number) => {
    editClip((c) => {
      if (inSelection && selection.length > 1) {
        return { ...c, notes: offsetVelocity(c.notes, selection, vel - lastVel) };
      }
      return { ...c, notes: c.notes.map((n, i) => i === index ? { ...n, velocity: vel } : n) };
    });
  };
```

Reuse `onPointerUp` to clear `laneDragRef` too: `const onPointerUp = () => { dragRef.current = null; laneDragRef.current = null; scheduleDraw(); };`

- [ ] **Step 3: Manual verify** — quantize a sloppy recording at 1/16, strength 80% (notes move most of the way; 100% lands exactly on beats — check against ruler bars); transpose buttons; velocity bars follow note alpha in the grid; dragging a selected bar moves the whole selection.
- [ ] **Step 4: Build + commit** — `npm run build`; `git commit -am "feat(studio): piano roll quantize/transpose toolbar + velocity lane"`

---

### Task 12: Pencil tool + sustain & mod CC lanes

**Files:**
- Modify: `src/pages/studio/pianoroll/PianoRollPanel.tsx`

**Interfaces:**
- Consumes: `sustainRanges`, `setSustainRanges`, `ccPoints`, `applySustain` from `@/lib/studio/midiEdit`.

- [ ] **Step 1: Tool toggle.** Add `const [tool, setTool] = useState<'pointer' | 'pencil'>('pointer');` and prepend to the toolbar:

```tsx
            <div className="flex border border-border">
              {(['pointer', 'pencil'] as const).map((t) => (
                <button key={t} onClick={() => setTool(t)}
                  className={`px-2 py-0.5 ${tool === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
                  {t === 'pointer' ? 'Pointer' : 'Pencil'}
                </button>
              ))}
            </div>
```

- [ ] **Step 2: Pencil behavior.** In `onPointerDown`'s grid branch, before the pointer-tool logic:

```tsx
    if (tool === 'pencil') {
      const hit = hitTestNote(metrics, clip.notes, cx, cy);
      props.pushHistory();
      if (hit) { // pencil-click an existing note deletes it (DAW standard)
        editClip((c) => ({ ...c, notes: deleteNotes(c.notes, [hit.index]) }));
        setSelection([]);
        return;
      }
      const start = snapAbsForClip(xToTime(metrics, cx));
      const dur = gridSec > 0 ? gridSec : 0.25;
      let created = -1;
      editClip((c) => {
        const r = addNote(c.notes, { pitch: yToPitch(metrics, cy), velocity: 100, start_seconds: start, duration_seconds: dur });
        created = r.index;
        return { ...c, notes: r.notes, duration_seconds: Math.max(c.duration_seconds, start + dur) };
      });
      setSelection(created >= 0 ? [created] : []);
      audition(yToPitch(metrics, cy), 100);
      // Drag-out lengthens the freshly drawn note.
      if (created >= 0) dragRef.current = { kind: 'resize', edge: 'right', startCx: cx, orig: null as unknown as MidiNote[], sel: [created] };
      return;
    }
```

That `orig: null` is wrong — fix it properly: `resize` drags read `d.orig`, and the freshly-created note isn't in any snapshot. Change the `Drag` resize variant to `orig: MidiNote[] | null` and in `onPointerMove` use `d.orig ?? clip.notes` **captured at first move** (store it back onto `d` so subsequent moves stay anchored):

```tsx
    } else if (d.kind === 'resize') {
      if (!d.orig) d.orig = clip.notes;
      const deltaSeconds = (cx - d.startCx) / metrics.pxPerSecond;
      editClip((c) => ({ ...c, notes: resizeNotes(d.orig!, d.sel, {
        edge: d.edge, deltaSeconds, gridSeconds: snapMod(e), clipStartSeconds: c.start_seconds }) }));
    }
```

- [ ] **Step 3: Sustain lane.** Extend `drawLane`:

```tsx
    if (lane === 'sustain') {
      const ranges = sustainRanges(clip.cc ?? [], clip.duration_seconds);
      ranges.forEach((r, i) => {
        const x0 = timeToX(metrics, r.down), x1 = timeToX(metrics, r.up);
        g.fillStyle = cPrimary;
        g.globalAlpha = selectedRange === i ? 0.8 : 0.45;
        g.fillRect(x0, 8, Math.max(2, x1 - x0), vh - 16);
        g.globalAlpha = 1;
        if (selectedRange === i) { g.strokeStyle = cFg; g.strokeRect(x0 + 0.5, 8.5, Math.max(2, x1 - x0) - 1, vh - 17); }
      });
    }
    if (lane === 'mod') {
      const pts = ccPoints(clip.cc ?? [], 1);
      g.strokeStyle = cPrimary; g.beginPath();
      pts.forEach((p, i) => {
        const x = timeToX(metrics, p.time), y = vh - (p.value / 127) * (vh - 4) - 2;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      });
      g.stroke();
      pts.forEach((p, i) => {
        const x = timeToX(metrics, p.time), y = vh - (p.value / 127) * (vh - 4) - 2;
        g.fillStyle = selectedModPoint === i ? cFg : cPrimary;
        g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill();
      });
    }
```

State + interactions (`const [selectedRange, setSelectedRange] = useState<number | null>(null);` `const [selectedModPoint, setSelectedModPoint] = useState<number | null>(null);` — both reset in the `[clipId]` effect). Extend the lane handlers by `lane`:

```tsx
  // lane === 'sustain': click selects a range; drag its edges (±5px)
  // retimes pedal-down/up; double-click empty adds a one-beat range;
  // Delete (panel keydown) removes the selected range.
  // lane === 'mod': drag a point to move it (time+value); double-click
  // adds a point; Delete removes the selected point.
```

Implement with the same pattern as the velocity handler — full code:

```tsx
  const ccDragRef = useRef<
    | { kind: 'sus-edge'; range: number; edge: 'down' | 'up'; ranges: Array<{ down: number; up: number }> }
    | { kind: 'sus-move'; range: number; startCx: number; ranges: Array<{ down: number; up: number }> }
    | { kind: 'mod'; index: number }
    | null
  >(null);

  const onLaneDownCc = (e: React.PointerEvent) => {
    if (!clip) return;
    const { cx } = lanePos(e);
    const t = xToTime(metrics, cx);
    if (lane === 'sustain') {
      const ranges = sustainRanges(clip.cc ?? [], clip.duration_seconds);
      const hitIdx = ranges.findIndex((r) => t >= r.down - 0.05 && t <= r.up + 0.05);
      if (hitIdx >= 0) {
        setSelectedRange(hitIdx);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        props.pushHistory();
        const r = ranges[hitIdx];
        const edgePx = 5 / metrics.pxPerSecond;
        ccDragRef.current = Math.abs(t - r.down) <= edgePx
          ? { kind: 'sus-edge', range: hitIdx, edge: 'down', ranges }
          : Math.abs(t - r.up) <= edgePx
            ? { kind: 'sus-edge', range: hitIdx, edge: 'up', ranges }
            : { kind: 'sus-move', range: hitIdx, startCx: cx, ranges };
      } else if (e.detail === 2) {
        props.pushHistory();
        const beat = 60 / session.tempo_bpm;
        const next = [...sustainRanges(clip.cc ?? [], clip.duration_seconds), { down: t, up: t + beat }];
        editClip((c) => ({ ...c, cc: setSustainRanges(c.cc ?? [], next) }));
        setSelectedRange(next.length - 1);
      } else setSelectedRange(null);
    } else if (lane === 'mod') {
      const pts = ccPoints(clip.cc ?? [], 1);
      const hitIdx = pts.findIndex((p) => Math.abs(timeToX(metrics, p.time) - cx) <= 5);
      if (hitIdx >= 0) {
        setSelectedModPoint(hitIdx);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        props.pushHistory();
        ccDragRef.current = { kind: 'mod', index: hitIdx };
      } else if (e.detail === 2) {
        props.pushHistory();
        const { vy } = lanePos(e);
        const value = Math.max(0, Math.min(127, Math.round(127 * (1 - vy / LANE_H))));
        editClip((c) => ({
          ...c,
          cc: [...(c.cc ?? []), { controller: 1, value, time_seconds: Math.max(0, t) }]
            .sort((a, b) => a.time_seconds - b.time_seconds),
        }));
      } else setSelectedModPoint(null);
    }
  };

  const onLaneMoveCc = (e: React.PointerEvent) => {
    const d = ccDragRef.current;
    if (!d || !clip) return;
    const { cx, vy } = lanePos(e);
    const t = Math.max(0, xToTime(metrics, cx));
    if (d.kind === 'sus-edge' || d.kind === 'sus-move') {
      const next = d.ranges.map((r, i) => {
        if (i !== d.range) return r;
        if (d.kind === 'sus-edge') return d.edge === 'down' ? { ...r, down: Math.min(t, r.up - 0.01) } : { ...r, up: Math.max(t, r.down + 0.01) };
        const delta = (cx - d.startCx) / metrics.pxPerSecond;
        return { down: Math.max(0, r.down + delta), up: r.up + delta };
      });
      editClip((c) => ({ ...c, cc: setSustainRanges(c.cc ?? [], next) }));
    } else {
      const value = Math.max(0, Math.min(127, Math.round(127 * (1 - vy / LANE_H))));
      const pts = ccPoints(clip.cc ?? [], 1);
      const target = pts[d.index];
      if (!target) return;
      editClip((c) => ({
        ...c,
        cc: (c.cc ?? []).map((ev, i) => i === target.index ? { ...ev, value, time_seconds: t } : ev)
          .sort((a, b) => a.time_seconds - b.time_seconds),
      }));
    }
  };
```

Route lane pointer events by `lane`: `onPointerDown={lane === 'velocity' ? onLanePointerDown : onLaneDownCc}` (same for move); clear `ccDragRef` in `onPointerUp`. Extend the panel `onKeyDown` Delete branch: when the velocity/notes selection is empty but `lane === 'sustain' && selectedRange !== null`, delete that range via `setSustainRanges` with the range spliced out; same for a selected mod point (filter that cc index out). One caveat to preserve: after a mod-point drag re-sorts the array, `selectedModPoint`/drag indices reference `ccPoints` order (time-sorted), which is stable under the sort — do NOT cache raw `cc` indices across moves (the code above re-derives `target.index` each move for exactly this reason).

- [ ] **Step 4: Ghost tails.** In `draw()`'s note loop, render pedal-lengthened tails so sight matches sound: compute once before the loop `const effective = applySustain(clip.notes, clip.cc ?? []);` and after filling the note body, if `effective[i].duration_seconds > n.duration_seconds`, draw the extension at 0.25 alpha:

```tsx
      const ext = effective[i].duration_seconds - n.duration_seconds;
      if (ext > 0) {
        g.fillStyle = cPrimary; g.globalAlpha = 0.25;
        g.fillRect(x + w, y + 1, timeToX(metrics, ext), ROW_H - 2);
        g.globalAlpha = 1;
      }
```

- [ ] **Step 5: Manual verify** — pencil draws (drag lengthens) and pencil-deletes; sustain lane shows recorded pedal ranges, dragging an up-edge earlier audibly shortens a held chord on playback, Delete removes a range and the ghost tails disappear; mod lane draws/edits points (no audible change — expected, documented).
- [ ] **Step 6: Build + commit** — `npm run build`; `git commit -am "feat(studio): piano roll pencil tool + sustain/mod CC lanes with ghost tails"`

---

### Task 13: Timeline clip preview + retire PianoRollDialog

**Files:**
- Create: `src/pages/studio/pianoroll/MidiClipPreview.tsx`
- Modify: `src/pages/studio/StudioEditor.tsx` (`MidiClipBlock` ~2881; `DraggableClip` ~2910; delete `PianoRollDialog` ~3255 and its `openRoll` state/imports)

**Interfaces:**
- Produces: `MidiClipPreview({ notes, durationSeconds }: { notes: MidiNote[]; durationSeconds: number })`; `DraggableClip` gains optional `preview?: React.ReactNode` rendered where `PeaksCanvas` renders (absolute inset overlay under the label).

- [ ] **Step 1: `MidiClipPreview.tsx`:**

```tsx
// Mini note map drawn inside a timeline MIDI clip block: x = time,
// y = pitch normalized to the clip's own range, alpha = velocity.
// Memoized — redraws only when the notes array identity changes.

import { memo, useEffect, useRef } from 'react';
import type { MidiNote } from '@/lib/studio/session';

export const MidiClipPreview = memo(function MidiClipPreview({
  notes, durationSeconds,
}: { notes: MidiNote[]; durationSeconds: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const g = canvas.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    if (!notes.length || durationSeconds <= 0) return;
    const cs = getComputedStyle(canvas);
    const fg = cs.getPropertyValue('--primary-foreground').trim();
    g.fillStyle = fg ? `hsl(${fg})` : '#ffffff';
    const lo = Math.min(...notes.map((n) => n.pitch)) - 1;
    const hi = Math.max(...notes.map((n) => n.pitch)) + 1;
    const span = Math.max(hi - lo, 8); // floor so a one-pitch clip isn't a full-height bar
    for (const n of notes) {
      const x = (n.start_seconds / durationSeconds) * w;
      const bw = Math.max(2, (n.duration_seconds / durationSeconds) * w);
      const y = h - ((n.pitch - lo) / span) * (h - 3) - 3;
      g.globalAlpha = 0.4 + 0.6 * (n.velocity / 127);
      g.fillRect(x, y, bw, 2);
    }
    g.globalAlpha = 1;
  }, [notes, durationSeconds]);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" />;
});
```

- [ ] **Step 2: Wire into the clip block.** Add `preview?: React.ReactNode` to `DraggableClip`'s props and render it exactly where the `peaks && <PeaksCanvas …/>` branch renders (same absolute overlay position, `{preview}` after the peaks branch). In `MidiClipBlock`, pass:

```tsx
      label=""
      preview={<MidiClipPreview notes={clip.notes} durationSeconds={clip.duration_seconds} />}
```

and put the old text in the block's tooltip: `DraggableClip` already renders a `title` or wrapping element — add `title={`${clip.notes.length} notes`}` to the props it forwards (check `DraggableClip`'s root element; add a `title?: string` prop if none exists).

- [ ] **Step 3: Delete `PianoRollDialog`** (component ~lines 3255-3372), the `openRoll` state + `<PianoRollDialog …/>` usage in the track strip (~2765-2768; also check line ~4709 for the second usage the exploration found), and any now-unused imports. `grep -n "PianoRollDialog\|openRoll" src/pages/studio/StudioEditor.tsx` must return nothing.
- [ ] **Step 4: Verify** — `npm run build`; dev server: MIDI clips show the note map (tint follows track color context, velocity visible as brightness), tooltip shows the count, "Piano roll" button opens the panel (not the old dialog), audio clips unaffected.
- [ ] **Step 5: Commit** — `git commit -am "feat(studio): MIDI clip note previews on the timeline; retire step-sequencer PianoRollDialog"`

---

### Task 14: Full verification + hands-on QA handoff

**Files:** none new.

- [ ] **Step 1: Unit suite** — `npx vitest run` (whole repo) — all pass.
- [ ] **Step 2: Build** — `npm run build` — clean.
- [ ] **Step 3: Drive it** — use the project verify skill (`Documents/GitHub/gleeworld:verify` — local preview + Playwright; never prod for write-heavy flows) to exercise: create MIDI track → Piano roll button → pencil 3 notes on different pitches → marquee-select → Quantize at 1/16 → reload the page → notes persisted with quantized positions; clip block shows a non-empty preview canvas (`page.locator('[data-testid="piano-roll-panel"]')` for the panel; assert the preview canvas has non-zero drawn pixels via `toDataURL` comparison against a blank canvas).
- [ ] **Step 4: Legacy pass-through proof** — open a pre-existing session with recorded MIDI (baked sustain durations, no `cc`): playback must sound identical (applySustain no-ops), clips render previews, panel opens read/editable, and after ANY edit + save, `requiredSchemaVersion` stays `1.0.0` (no cc added) — verify the saved manifest's `schema_version` via the network tab or storage inspection.
- [ ] **Step 5: Kevin's hands-on QA (blocking before deploy):**
  1. WP06 pedal monitoring feel unchanged while recording (this plan must not regress PR #135's behavior).
  2. Record against the click with auto+trim: notes sit on the beat; adjust the new "MIDI recording offset" trim if needed.
  3. Sustain-lane edit audibly shortens a held chord.
- [ ] **Step 6: Commit any fixes; do NOT deploy or upload an iOS build without explicit go-ahead** (ASC confirm-first rule; web deploy is `rsync` without `--delete` per the deploy memory, and only when Kevin says ship).

## Self-review notes (already applied)

- **Spec coverage:** §1 schema → Task 1; §2 latency → Tasks 4-5, 7; §3 panel → Tasks 9-12; §4 preview → Task 13; §5 edit lib → Tasks 2-3; §6 playback/capture → Tasks 5-6; §7 error handling → Tasks 1 (loader tolerance), 9 (panel works without Web MIDI); §8 testing → per-task tests + Task 14; §9 phasing preserved (Tasks 1-7 = phase 1, 8-11 = phase 2, 12-13 = phase 3).
- **Spec deviation (deliberate):** manifests write `1.0.0` until a clip actually carries `cc` (`requiredSchemaVersion`) instead of always `1.1.0` — the shipped iOS app hard-rejects unknown versions and is in review right now; this keeps all cc-less sessions compatible with it. Loader behavior matches the spec (accept both).
- **Known limitation carried from spec:** native iOS playback ignores `cc` (decode-tolerance only) — a cc-bearing session pedal-lengthens on web, not in the native engine, until a later iOS pass.
- **Type consistency:** `MidiCcEvent`/`CapturedCc`/`HeldPress` shapes, `RollGrid`, `RollMetrics`, selection-as-index-array, and `PianoRollPanelProps` are each defined once (Tasks 1, 3, 4, 8, 9) and consumed by name everywhere later.
