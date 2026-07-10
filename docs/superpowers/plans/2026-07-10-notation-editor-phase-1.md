# Notation Editor — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A teacher authors (or opens and edits) a single-voice, single-staff sight-reading exercise entirely with keyboard and mouse, hears it, saves it as MusicXML into the library, and assigns it to a class or a single student.

**Architecture:** A pure `EditorScore` document model (distinct from the scoring-shaped `ExerciseIR`), edited only through invertible `Command`s (so Phase 5 undo is free), serialized through a **bidirectional** MusicXML layer (a faithful reader AND the repo's first writer, gated by a round-trip deep-equal test), rendered with VexFlow 5 (already used across `src/features/read-music/`), and assigned by reusing `gw_assignments` with a new nullable `student_id`.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, VexFlow 5, Tone.js 15, Supabase (Postgres + RLS).

**Spec:** `docs/superpowers/specs/2026-07-10-notation-editor-design.md` — **Phase 1 only.**

## Global Constraints

- **Test runner is Vitest.** One file: `bun x vitest run <path>`. Tests live beside source as `<name>.test.ts`. See `src/lib/sightReading/pitch.test.ts` for house style.
- **`bun x tsc --noEmit` is a NO-OP in this repo** (`tsconfig.json` has `files: []`; `tsconfig.app.json` sets `noCheck: true`). It exits 0 regardless. **The only gate that catches a dangling import is `bun x vite build`.** Run it in every task that touches imports.
- Build is `bun x vite build`, never the npm script (it pins vite 5.4.10).
- **`git add -A` is FORBIDDEN** (macOS sync litters the tree with `<name> 2.ext` duplicates). Stage explicit paths only.
- **Multi-tenant:** every new table needs `tenant_id` with `DEFAULT current_tenant_id()` **and** a `BEFORE INSERT` trigger filling a NULL from the JWT, plus a RESTRICTIVE RLS policy. Omitting `tenant_id` on insert makes a restrictive `WITH CHECK` **silently reject the row**.
- **Never reintroduce fabricated scoring.** A score the editor can't derive an IR from is unscored, never fake-scored.
- Light surfaces (white cards, cream page), never dark-navy. `text-xs`/`text-sm` floor, `w-4 h-4` icon floor.
- Terminology: "students" (never singers/members); tenant-neutral — never hardcode "Spelman".
- Never set `color` on bare `h1`–`h6` element rules.
- Deploy note (not this plan's job): never `rsync --delete` — it wipes `tenants/*/tenant-bootstrap.js`.

---

## File Structure

**New — pure logic (unit-tested, no React):**
- `src/lib/notation/model.ts` — `EditorScore` types + constructors (`emptyScore`, `noteOf`, `restOf`) + pure helpers.
- `src/lib/notation/duration.ts` — duration ↔ ticks, dots, MusicXML `<type>` names. The rhythm math everything else depends on.
- `src/lib/notation/measures.ts` — the barline engine: flow a voice's elements into measures, flag over-full.
- `src/lib/notation/commands.ts` — `Command` interface, `CommandStack`, and the Phase 1 commands.
- `src/lib/notation/musicxmlWrite.ts` — `editorScoreToMusicXML(score): string`.
- `src/lib/notation/musicxmlRead.ts` — `musicXmlToEditorScore(xml): EditorScore`.
- `src/lib/notation/toIR.ts` — `editorScoreToIR(score): ExerciseIR | null`.

**New — rendering + UI:**
- `src/lib/notation/toVexflow.ts` — translate a measure range of `EditorScore` to VexFlow draw calls.
- `src/pages/notation/NotationView.tsx` — read-only VexFlow render of an `EditorScore` (also used by the editor).
- `src/pages/notation/NoteEditor.tsx` — the editing surface: palette, keyboard/mouse handlers, command dispatch.
- `src/pages/notation/AssignExerciseDialog.tsx` — assign a saved exercise to a course or a student.
- `src/pages/notation/NotationEditorPage.tsx` — the route shell: load/blank, save, wire the above.

**New — data:**
- `src/lib/notation/exercisesApi.ts` — save/load `gw_sight_reading_exercises` rows.
- `src/lib/notation/assignmentsApi.ts` — create a `gw_assignments` row (+ item) targeting a course or student.
- `supabase/migrations/20260710120000_notation_editor.sql` — `student_id` on `gw_assignments`, the `gw_sight_reading_assignment_items` table, `gw_sight_reading_exercises` tenant plumbing.
- `supabase/migrations/tests/notation_editor_test.sql` — RLS + additive-migration regression.

**Modified:**
- `src/App.tsx` — one lazy import + one `<Route path="/dashboard/sight-reading/editor/:exerciseId?">`.
- `src/pages/sightReading/SightReadingStudio.tsx` — a "Create exercise" button and per-row "Edit" in the Library tab.

**Reference (read, do not modify):** `src/features/read-music/components/Score.tsx` (render staff from a notes array), `src/features/read-music/curriculum/engine/StaffPlacement.tsx` (click-zone → staff step interaction), `src/lib/sightReading/ir.ts` (`ExerciseIR`, `IRNote`), `src/components/sight-singing/hooks/useTonePlayback.ts` (playback).

---

### Task 1: Duration math

**Files:**
- Create: `src/lib/notation/duration.ts`
- Test: `src/lib/notation/duration.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export const DIVISIONS = 480;                 // ticks per quarter note (MusicXML divisions)
  export type BaseDur = 'whole'|'half'|'quarter'|'eighth'|'16th'|'32nd';
  export function baseTicks(d: BaseDur): number;
  export function dottedTicks(d: BaseDur, dots: number): number;   // dots: 0|1|2
  export function musicXmlType(d: BaseDur): string;                // 'whole'|'half'|'quarter'|'eighth'|'16th'|'32nd'
  export function ticksToDur(ticks: number): { base: BaseDur; dots: number } | null;  // null if not a clean base+dots
  ```

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/notation/duration.test.ts
import { describe, it, expect } from 'vitest';
import { DIVISIONS, baseTicks, dottedTicks, musicXmlType, ticksToDur } from './duration';

describe('duration', () => {
  it('quarter = one division-unit', () => {
    expect(DIVISIONS).toBe(480);
    expect(baseTicks('quarter')).toBe(480);
    expect(baseTicks('whole')).toBe(1920);
    expect(baseTicks('eighth')).toBe(240);
    expect(baseTicks('32nd')).toBe(60);
  });
  it('a dot adds half; two dots add three-quarters', () => {
    expect(dottedTicks('quarter', 1)).toBe(720);   // 480 + 240
    expect(dottedTicks('half', 1)).toBe(1440);      // 960 + 480
    expect(dottedTicks('quarter', 2)).toBe(840);    // 480 + 240 + 120
    expect(dottedTicks('quarter', 0)).toBe(480);
  });
  it('maps base durations to MusicXML <type> names', () => {
    expect(musicXmlType('16th')).toBe('16th');
    expect(musicXmlType('whole')).toBe('whole');
  });
  it('inverts ticks back to base + dots for clean values', () => {
    expect(ticksToDur(720)).toEqual({ base: 'quarter', dots: 1 });
    expect(ticksToDur(480)).toEqual({ base: 'quarter', dots: 0 });
    expect(ticksToDur(1920)).toEqual({ base: 'whole', dots: 0 });
  });
  it('returns null for a tick count that is not a base+dots value', () => {
    expect(ticksToDur(500)).toBeNull();
    expect(ticksToDur(0)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun x vitest run src/lib/notation/duration.test.ts`
Expected: FAIL — cannot resolve `./duration`.

- [ ] **Step 3: Implement**

```ts
// src/lib/notation/duration.ts
// MusicXML "divisions" = ticks per quarter note. 480 is divisible by 2,3,4,5,6,8,
// so it represents dotted and common tuplet durations as integers.
export const DIVISIONS = 480;

export type BaseDur = 'whole' | 'half' | 'quarter' | 'eighth' | '16th' | '32nd';

const BASE_TICKS: Record<BaseDur, number> = {
  whole: DIVISIONS * 4,
  half: DIVISIONS * 2,
  quarter: DIVISIONS,
  eighth: DIVISIONS / 2,
  '16th': DIVISIONS / 4,
  '32nd': DIVISIONS / 8,
};

export function baseTicks(d: BaseDur): number {
  return BASE_TICKS[d];
}

// A dot adds half the note's value; a second dot adds a quarter; etc.
export function dottedTicks(d: BaseDur, dots: number): number {
  const base = BASE_TICKS[d];
  let total = base, add = base;
  for (let i = 0; i < dots; i++) { add /= 2; total += add; }
  return total;
}

export function musicXmlType(d: BaseDur): string {
  return d; // our names already match the MusicXML <type> vocabulary
}

const ORDER: BaseDur[] = ['whole', 'half', 'quarter', 'eighth', '16th', '32nd'];

export function ticksToDur(ticks: number): { base: BaseDur; dots: number } | null {
  if (ticks <= 0) return null;
  for (const base of ORDER) {
    for (let dots = 0; dots <= 2; dots++) {
      if (dottedTicks(base, dots) === ticks) return { base, dots };
    }
  }
  return null;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun x vitest run src/lib/notation/duration.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notation/duration.ts src/lib/notation/duration.test.ts
git commit -m "feat(notation): duration/tick math with dots"
```

---

### Task 2: The EditorScore model

**Files:**
- Create: `src/lib/notation/model.ts`
- Test: `src/lib/notation/model.test.ts`

**Interfaces:**
- Consumes: `BaseDur`, `dottedTicks` (Task 1).
- Produces:
  ```ts
  export interface Pitch { step: 'A'|'B'|'C'|'D'|'E'|'F'|'G'; octave: number; alter: number } // alter: -1 flat, 0, +1 sharp
  export interface EditorNote { kind: 'note'; pitch: Pitch; base: BaseDur; dots: number; tie: 'start'|'stop'|'none' }
  export interface EditorRest { kind: 'rest'; base: BaseDur; dots: number }
  export type EditorElement = EditorNote | EditorRest;
  export interface EditorScore {
    title: string;
    keyFifths: number;                 // -7..+7
    mode: 'major'|'minor';
    timeSig: { beats: number; beatType: number };
    clef: 'treble'|'bass'|'alto';
    tempo: number;
    elements: EditorElement[];         // Phase 1: one voice, one staff — a flat list
  }
  export function emptyScore(): EditorScore;
  export function noteOf(pitch: Pitch, base: BaseDur, dots?: number): EditorNote;
  export function restOf(base: BaseDur, dots?: number): EditorRest;
  export function elementTicks(el: EditorElement): number;
  ```

Phase 1's `EditorScore` is a flat element list (single voice/staff). The spec's richer `parts→staves→measures→voices` shape is realized in Phase 3; Phase 1 keeps the flat list and the measure engine (Task 3) computes barlines on the fly, so no data migration is needed when voices arrive — the flat list becomes `parts[0].staves[0].measures[*].voices[0]`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/notation/model.test.ts
import { describe, it, expect } from 'vitest';
import { emptyScore, noteOf, restOf, elementTicks } from './model';

describe('EditorScore model', () => {
  it('an empty score is 4/4 C major treble with no elements', () => {
    const s = emptyScore();
    expect(s.timeSig).toEqual({ beats: 4, beatType: 4 });
    expect(s.keyFifths).toBe(0);
    expect(s.mode).toBe('major');
    expect(s.clef).toBe('treble');
    expect(s.elements).toEqual([]);
  });
  it('noteOf carries pitch, duration, and defaults tie to none', () => {
    const n = noteOf({ step: 'C', octave: 4, alter: 0 }, 'quarter');
    expect(n).toEqual({ kind: 'note', pitch: { step: 'C', octave: 4, alter: 0 }, base: 'quarter', dots: 0, tie: 'none' });
  });
  it('restOf carries duration', () => {
    expect(restOf('half', 1)).toEqual({ kind: 'rest', base: 'half', dots: 1 });
  });
  it('elementTicks uses the dotted value for notes and rests alike', () => {
    expect(elementTicks(noteOf({ step: 'C', octave: 4, alter: 0 }, 'quarter', 1))).toBe(720);
    expect(elementTicks(restOf('quarter'))).toBe(480);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun x vitest run src/lib/notation/model.test.ts`
Expected: FAIL — cannot resolve `./model`.

- [ ] **Step 3: Implement**

```ts
// src/lib/notation/model.ts
import { BaseDur, dottedTicks } from './duration';

export interface Pitch { step: 'A'|'B'|'C'|'D'|'E'|'F'|'G'; octave: number; alter: number }
export interface EditorNote { kind: 'note'; pitch: Pitch; base: BaseDur; dots: number; tie: 'start'|'stop'|'none' }
export interface EditorRest { kind: 'rest'; base: BaseDur; dots: number }
export type EditorElement = EditorNote | EditorRest;

export interface EditorScore {
  title: string;
  keyFifths: number;
  mode: 'major' | 'minor';
  timeSig: { beats: number; beatType: number };
  clef: 'treble' | 'bass' | 'alto';
  tempo: number;
  elements: EditorElement[];
}

export function emptyScore(): EditorScore {
  return {
    title: 'Untitled exercise',
    keyFifths: 0,
    mode: 'major',
    timeSig: { beats: 4, beatType: 4 },
    clef: 'treble',
    tempo: 120,
    elements: [],
  };
}

export function noteOf(pitch: Pitch, base: BaseDur, dots = 0): EditorNote {
  return { kind: 'note', pitch, base, dots, tie: 'none' };
}

export function restOf(base: BaseDur, dots = 0): EditorRest {
  return { kind: 'rest', base, dots };
}

export function elementTicks(el: EditorElement): number {
  return dottedTicks(el.base, el.dots);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun x vitest run src/lib/notation/model.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notation/model.ts src/lib/notation/model.test.ts
git commit -m "feat(notation): EditorScore document model"
```

---

### Task 3: The measure / barline engine

**Files:**
- Create: `src/lib/notation/measures.ts`
- Test: `src/lib/notation/measures.test.ts`

**Interfaces:**
- Consumes: `EditorScore`, `EditorElement`, `elementTicks` (Task 2); `DIVISIONS` (Task 1).
- Produces:
  ```ts
  export interface LaidMeasure { index: number; elements: EditorElement[]; ticks: number; capacity: number; overfull: boolean }
  export function layoutMeasures(score: EditorScore): LaidMeasure[];
  export function totalTicks(score: EditorScore): number;
  export function measureCapacity(timeSig: { beats: number; beatType: number }): number;
  ```

Barlines are **computed**, never authored. Elements flow left-to-right; when a measure's capacity is reached, the next element starts a new measure. An element that would cross a barline stays whole in the measure it started in, which is then marked `overfull` (Phase 2 introduces splitting+tie; Phase 1 flags it as an authoring error so the teacher fixes it — never silently truncates).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/notation/measures.test.ts
import { describe, it, expect } from 'vitest';
import { layoutMeasures, measureCapacity } from './measures';
import { emptyScore, noteOf } from './model';

const C4 = { step: 'C' as const, octave: 4, alter: 0 };

describe('measure engine', () => {
  it('a 4/4 measure holds 1920 ticks', () => {
    expect(measureCapacity({ beats: 4, beatType: 4 })).toBe(1920);
    expect(measureCapacity({ beats: 3, beatType: 4 })).toBe(1440);
    expect(measureCapacity({ beats: 6, beatType: 8 })).toBe(1440);
  });
  it('four quarters fill exactly one 4/4 measure', () => {
    const s = { ...emptyScore(), elements: Array.from({ length: 4 }, () => noteOf(C4, 'quarter')) };
    const m = layoutMeasures(s);
    expect(m).toHaveLength(1);
    expect(m[0].ticks).toBe(1920);
    expect(m[0].overfull).toBe(false);
  });
  it('five quarters spill into a second measure', () => {
    const s = { ...emptyScore(), elements: Array.from({ length: 5 }, () => noteOf(C4, 'quarter')) };
    const m = layoutMeasures(s);
    expect(m).toHaveLength(2);
    expect(m[0].elements).toHaveLength(4);
    expect(m[1].elements).toHaveLength(1);
    expect(m[1].ticks).toBe(480);
  });
  it('an element that crosses the barline marks its measure overfull, not truncated', () => {
    // three quarters (1440) then a half (960) → 2400 > 1920, half stays whole
    const s = { ...emptyScore(), elements: [noteOf(C4,'quarter'), noteOf(C4,'quarter'), noteOf(C4,'quarter'), noteOf(C4,'half')] };
    const m = layoutMeasures(s);
    expect(m[0].elements).toHaveLength(4);
    expect(m[0].ticks).toBe(2400);
    expect(m[0].overfull).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun x vitest run src/lib/notation/measures.test.ts`
Expected: FAIL — cannot resolve `./measures`.

- [ ] **Step 3: Implement**

```ts
// src/lib/notation/measures.ts
import { DIVISIONS } from './duration';
import { EditorScore, EditorElement, elementTicks } from './model';

export interface LaidMeasure {
  index: number; elements: EditorElement[]; ticks: number; capacity: number; overfull: boolean;
}

export function measureCapacity(timeSig: { beats: number; beatType: number }): number {
  // ticks per beat = whole-note ticks / beatType; capacity = beats * ticks-per-beat
  const wholeTicks = DIVISIONS * 4;
  return timeSig.beats * (wholeTicks / timeSig.beatType);
}

export function totalTicks(score: EditorScore): number {
  return score.elements.reduce((t, el) => t + elementTicks(el), 0);
}

export function layoutMeasures(score: EditorScore): LaidMeasure[] {
  const cap = measureCapacity(score.timeSig);
  const out: LaidMeasure[] = [];
  let cur: EditorElement[] = [];
  let curTicks = 0;

  const flush = () => {
    out.push({ index: out.length, elements: cur, ticks: curTicks, capacity: cap, overfull: curTicks > cap });
    cur = []; curTicks = 0;
  };

  for (const el of score.elements) {
    const t = elementTicks(el);
    // If the current measure is already full, start a new one before placing.
    if (curTicks >= cap && cur.length) flush();
    cur.push(el);
    curTicks += t;
    // Exactly full → close the measure so the next element opens a fresh bar.
    if (curTicks === cap) flush();
  }
  if (cur.length) flush();
  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun x vitest run src/lib/notation/measures.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notation/measures.ts src/lib/notation/measures.test.ts
git commit -m "feat(notation): measure/barline engine, overfull flagging"
```

---

### Task 4: Commands (invertible edits)

**Files:**
- Create: `src/lib/notation/commands.ts`
- Test: `src/lib/notation/commands.test.ts`

**Interfaces:**
- Consumes: `EditorScore`, `EditorElement`, `EditorNote`, `Pitch`, `noteOf`, `restOf` (Task 2).
- Produces:
  ```ts
  export interface Command { readonly label: string; apply(s: EditorScore): EditorScore; invert(s: EditorScore): EditorScore }
  export class CommandStack {
    do(cmd: Command, s: EditorScore): EditorScore;
    undo(s: EditorScore): EditorScore;   // wired into UI in Phase 5; tested now
    redo(s: EditorScore): EditorScore;
    get canUndo(): boolean; get canRedo(): boolean;
  }
  export function insertElement(at: number, el: EditorElement): Command;
  export function deleteElement(at: number): Command;
  export function changeDuration(at: number, base: EditorElement['base'], dots: number): Command;
  export function transpose(at: number, semitones: number): Command;   // ±1 step handled by caller via semitone math
  export function toggleTie(at: number): Command;
  ```

Every command returns a NEW `EditorScore` (immutable) and `invert(apply(s))` deep-equals `s`. This is the property Phase 5 undo relies on; it is proven now.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/notation/commands.test.ts
import { describe, it, expect } from 'vitest';
import { insertElement, deleteElement, changeDuration, transpose, toggleTie, CommandStack } from './commands';
import { emptyScore, noteOf } from './model';

const C4 = { step: 'C' as const, octave: 4, alter: 0 };
const base = { ...emptyScore(), elements: [noteOf(C4, 'quarter'), noteOf(C4, 'half')] };

describe('commands are invertible', () => {
  const cases = [
    insertElement(1, noteOf(C4, 'eighth')),
    deleteElement(0),
    changeDuration(1, 'quarter', 0),
    transpose(0, 2),
    toggleTie(0),
  ];
  for (const cmd of cases) {
    it(`invert(apply) is identity for "${cmd.label}"`, () => {
      const after = cmd.apply(base);
      expect(after).not.toEqual(base);           // it actually did something
      expect(cmd.invert(after)).toEqual(base);   // and undoes cleanly
    });
  }
});

describe('CommandStack', () => {
  it('do → undo → redo round-trips the document', () => {
    const stack = new CommandStack();
    const s1 = stack.do(insertElement(2, noteOf(C4, 'quarter')), base);
    expect(s1.elements).toHaveLength(3);
    const s2 = stack.undo(s1);
    expect(s2).toEqual(base);
    const s3 = stack.redo(s2);
    expect(s3).toEqual(s1);
  });
  it('a new do() clears the redo stack', () => {
    const stack = new CommandStack();
    const s1 = stack.do(deleteElement(0), base);
    stack.undo(s1);
    stack.do(deleteElement(1), base);
    expect(stack.canRedo).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun x vitest run src/lib/notation/commands.test.ts`
Expected: FAIL — cannot resolve `./commands`.

- [ ] **Step 3: Implement**

```ts
// src/lib/notation/commands.ts
import { EditorScore, EditorElement, EditorNote, Pitch } from './model';

export interface Command {
  readonly label: string;
  apply(s: EditorScore): EditorScore;
  invert(s: EditorScore): EditorScore;
}

const replaceElements = (s: EditorScore, elements: EditorElement[]): EditorScore => ({ ...s, elements });

export function insertElement(at: number, el: EditorElement): Command {
  return {
    label: 'insert',
    apply: (s) => replaceElements(s, [...s.elements.slice(0, at), el, ...s.elements.slice(at)]),
    invert: (s) => replaceElements(s, [...s.elements.slice(0, at), ...s.elements.slice(at + 1)]),
  };
}

export function deleteElement(at: number): Command {
  let removed: EditorElement;
  return {
    label: 'delete',
    apply: (s) => { removed = s.elements[at]; return replaceElements(s, [...s.elements.slice(0, at), ...s.elements.slice(at + 1)]); },
    invert: (s) => replaceElements(s, [...s.elements.slice(0, at), removed, ...s.elements.slice(at)]),
  };
}

export function changeDuration(at: number, base: EditorElement['base'], dots: number): Command {
  let prev: { base: EditorElement['base']; dots: number };
  return {
    label: 'duration',
    apply: (s) => {
      const el = s.elements[at]; prev = { base: el.base, dots: el.dots };
      const next = { ...el, base, dots };
      return replaceElements(s, s.elements.map((e, i) => (i === at ? next : e)));
    },
    invert: (s) => replaceElements(s, s.elements.map((e, i) => (i === at ? { ...e, base: prev.base, dots: prev.dots } : e))),
  };
}

// Diatonic-agnostic chromatic transpose by semitones, expressed on the letter+alter model.
// A caller wanting "up one scale step" passes the right semitone count; Phase 1's arrow keys
// use ±1 semitone (chromatic nudge), which is the honest primitive.
const SEMISTEPS: Pitch['step'][] = ['C','C','D','D','E','F','F','G','G','A','A','B'];
const CHROMA: Record<Pitch['step'], number> = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
function pitchToMidi(p: Pitch): number { return (p.octave + 1) * 12 + CHROMA[p.step] + p.alter; }
function midiToPitch(m: number): Pitch {
  const octave = Math.floor(m / 12) - 1;
  const pc = ((m % 12) + 12) % 12;
  const step = SEMISTEPS[pc];
  const alter = pc - CHROMA[step];
  return { step, octave, alter };
}

export function transpose(at: number, semitones: number): Command {
  return {
    label: 'transpose',
    apply: (s) => replaceElements(s, s.elements.map((e, i) => {
      if (i !== at || e.kind !== 'note') return e;
      return { ...e, pitch: midiToPitch(pitchToMidi(e.pitch) + semitones) };
    })),
    invert: (s) => replaceElements(s, s.elements.map((e, i) => {
      if (i !== at || e.kind !== 'note') return e;
      return { ...e, pitch: midiToPitch(pitchToMidi(e.pitch) - semitones) };
    })),
  };
}

export function toggleTie(at: number): Command {
  const flip = (s: EditorScore): EditorScore => replaceElements(s, s.elements.map((e, i) => {
    if (i !== at || e.kind !== 'note') return e;
    return { ...e, tie: e.tie === 'start' ? 'none' : 'start' };
  }));
  return { label: 'tie', apply: flip, invert: flip };   // flip is its own inverse
}

export class CommandStack {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  do(cmd: Command, s: EditorScore): EditorScore { this.undoStack.push(cmd); this.redoStack = []; return cmd.apply(s); }
  undo(s: EditorScore): EditorScore { const c = this.undoStack.pop(); if (!c) return s; this.redoStack.push(c); return c.invert(s); }
  redo(s: EditorScore): EditorScore { const c = this.redoStack.pop(); if (!c) return s; this.undoStack.push(c); return c.apply(s); }
  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun x vitest run src/lib/notation/commands.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notation/commands.ts src/lib/notation/commands.test.ts
git commit -m "feat(notation): invertible command model + CommandStack"
```

---

### Task 5: MusicXML writer

**Files:**
- Create: `src/lib/notation/musicxmlWrite.ts`
- Test: `src/lib/notation/musicxmlWrite.test.ts`

**Interfaces:**
- Consumes: `EditorScore` (Task 2), `layoutMeasures` (Task 3), `musicXmlType`, `DIVISIONS` (Task 1).
- Produces: `editorScoreToMusicXML(score: EditorScore): string` — a `score-partwise` 3.1 document.

The repo has **no** MusicXML writer today. This is it. Emit one `part`, `divisions=480`, and per computed measure the `attributes` (only on measure 1: key, time, clef) then the notes/rests with `<type>`, `<dot>`, `<tie>`, `<alter>`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/notation/musicxmlWrite.test.ts
import { describe, it, expect } from 'vitest';
import { editorScoreToMusicXML } from './musicxmlWrite';
import { emptyScore, noteOf, restOf } from './model';

const C4 = { step: 'C' as const, octave: 4, alter: 0 };
const FS4 = { step: 'F' as const, octave: 4, alter: 1 };

describe('editorScoreToMusicXML', () => {
  const score = { ...emptyScore(), elements: [noteOf(C4, 'quarter'), noteOf(FS4, 'eighth', 1), restOf('eighth'), noteOf(C4, 'half')] };
  const xml = editorScoreToMusicXML(score);

  it('is a score-partwise document with divisions 480', () => {
    expect(xml).toContain('<score-partwise');
    expect(xml).toContain('<divisions>480</divisions>');
  });
  it('writes attributes once, on the first measure', () => {
    expect((xml.match(/<attributes>/g) || []).length).toBe(1);
    expect(xml).toContain('<sign>G</sign>');       // treble
    expect(xml).toContain('<beats>4</beats>');
  });
  it('encodes a sharp as <alter>1</alter> and a dot as <dot/>', () => {
    expect(xml).toContain('<step>F</step>');
    expect(xml).toContain('<alter>1</alter>');
    expect(xml).toContain('<dot/>');
  });
  it('encodes a rest', () => {
    expect(xml).toContain('<rest/>');
  });
  it('is well-formed XML (parses without error)', () => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    expect(doc.getElementsByTagName('parsererror').length).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun x vitest run src/lib/notation/musicxmlWrite.test.ts`
Expected: FAIL — cannot resolve `./musicxmlWrite`.

- [ ] **Step 3: Implement**

```ts
// src/lib/notation/musicxmlWrite.ts
import { DIVISIONS, musicXmlType } from './duration';
import { EditorScore, EditorElement, elementTicks } from './model';
import { layoutMeasures } from './measures';

const CLEF_SIGN: Record<EditorScore['clef'], { sign: string; line: number }> = {
  treble: { sign: 'G', line: 2 }, bass: { sign: 'F', line: 4 }, alto: { sign: 'C', line: 3 },
};

function noteXml(el: EditorElement): string {
  const dur = elementTicks(el);
  const dots = '<dot/>'.repeat(el.dots);
  const type = `<type>${musicXmlType(el.base)}</type>`;
  if (el.kind === 'rest') {
    return `<note><rest/><duration>${dur}</duration>${type}${dots}</note>`;
  }
  const { step, octave, alter } = el.pitch;
  const alterXml = alter !== 0 ? `<alter>${alter}</alter>` : '';
  const tieXml = el.tie === 'start' ? '<tie type="start"/>' : el.tie === 'stop' ? '<tie type="stop"/>' : '';
  const notations = el.tie === 'start' ? '<notations><tied type="start"/></notations>'
    : el.tie === 'stop' ? '<notations><tied type="stop"/></notations>' : '';
  return `<note><pitch><step>${step}</step>${alterXml}<octave>${octave}</octave></pitch>`
    + `<duration>${dur}</duration>${tieXml}${type}${dots}${notations}</note>`;
}

export function editorScoreToMusicXML(score: EditorScore): string {
  const measures = layoutMeasures(score);
  const clef = CLEF_SIGN[score.clef];
  const body = measures.map((m, i) => {
    const attrs = i === 0
      ? `<attributes><divisions>${DIVISIONS}</divisions>`
        + `<key><fifths>${score.keyFifths}</fifths><mode>${score.mode}</mode></key>`
        + `<time><beats>${score.timeSig.beats}</beats><beat-type>${score.timeSig.beatType}</beat-type></time>`
        + `<clef><sign>${clef.sign}</sign><line>${clef.line}</line></clef></attributes>`
      : '';
    return `<measure number="${i + 1}">${attrs}${m.elements.map(noteXml).join('')}</measure>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>`
    + `<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">`
    + `<score-partwise version="3.1">`
    + `<work><work-title>${escapeXml(score.title)}</work-title></work>`
    + `<part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list>`
    + `<part id="P1">${body}</part></score-partwise>`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun x vitest run src/lib/notation/musicxmlWrite.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notation/musicxmlWrite.ts src/lib/notation/musicxmlWrite.test.ts
git commit -m "feat(notation): MusicXML writer (score-partwise 3.1)"
```

---

### Task 6: MusicXML reader + the round-trip gate

**Files:**
- Create: `src/lib/notation/musicxmlRead.ts`
- Test: `src/lib/notation/musicxmlRead.test.ts`

**Interfaces:**
- Consumes: `EditorScore`, `EditorElement`, `noteOf`, `restOf` (Task 2); `ticksToDur` (Task 1); `editorScoreToMusicXML` (Task 5, for the round-trip test).
- Produces: `musicXmlToEditorScore(xml: string): EditorScore`.

A faithful, tick-accurate reader producing the document model — **distinct** from `src/lib/sightReading/musicXMLParser.ts`, which yields the scoring-shaped `ParsedScore` in seconds and drops ties, exact divisions, key/clef. The headline gate: `read(write(s))` deep-equals `s`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/notation/musicxmlRead.test.ts
import { describe, it, expect } from 'vitest';
import { musicXmlToEditorScore } from './musicxmlRead';
import { editorScoreToMusicXML } from './musicxmlWrite';
import { emptyScore, noteOf, restOf } from './model';

const C4 = { step: 'C' as const, octave: 4, alter: 0 };
const FS4 = { step: 'F' as const, octave: 4, alter: 1 };
const BF3 = { step: 'B' as const, octave: 3, alter: -1 };

describe('musicXmlToEditorScore round-trips the writer', () => {
  const fixtures: Record<string, ReturnType<typeof emptyScore>> = {
    'four quarters': { ...emptyScore(), elements: [noteOf(C4,'quarter'), noteOf(C4,'quarter'), noteOf(C4,'quarter'), noteOf(C4,'quarter')] },
    'sharps flats dots rests': { ...emptyScore(), elements: [noteOf(FS4,'quarter',1), restOf('eighth'), noteOf(BF3,'half'), noteOf(C4,'eighth')] },
    'G major 3/4 bass': { ...emptyScore(), keyFifths: 1, timeSig: { beats: 3, beatType: 4 }, clef: 'bass', elements: [noteOf(C4,'quarter'), noteOf(C4,'half')] },
    'a tie': { ...emptyScore(), elements: [{ ...noteOf(C4,'half'), tie: 'start' as const }, { ...noteOf(C4,'half'), tie: 'stop' as const }] },
  };
  for (const [name, score] of Object.entries(fixtures)) {
    it(`round-trips: ${name}`, () => {
      expect(musicXmlToEditorScore(editorScoreToMusicXML(score))).toEqual(score);
    });
  }
});

describe('musicXmlToEditorScore reads foreign MusicXML', () => {
  it('reads a minimal hand-written file', () => {
    const xml = `<?xml version="1.0"?><score-partwise version="3.1"><part-list><score-part id="P1"><part-name>V</part-name></score-part></part-list>`
      + `<part id="P1"><measure number="1"><attributes><divisions>480</divisions>`
      + `<key><fifths>0</fifths><mode>major</mode></key><time><beats>4</beats><beat-type>4</beat-type></time>`
      + `<clef><sign>G</sign><line>2</line></clef></attributes>`
      + `<note><pitch><step>C</step><octave>4</octave></pitch><duration>1920</duration><type>whole</type></note></measure></part></score-partwise>`;
    const s = musicXmlToEditorScore(xml);
    expect(s.timeSig).toEqual({ beats: 4, beatType: 4 });
    expect(s.elements).toEqual([noteOf(C4, 'whole')]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun x vitest run src/lib/notation/musicxmlRead.test.ts`
Expected: FAIL — cannot resolve `./musicxmlRead`.

- [ ] **Step 3: Implement**

```ts
// src/lib/notation/musicxmlRead.ts
import { ticksToDur } from './duration';
import { EditorScore, EditorElement, noteOf, restOf, Pitch } from './model';

const SIGN_CLEF: Record<string, EditorScore['clef']> = { G: 'treble', F: 'bass', C: 'alto' };

function textOf(parent: Element | null, tag: string): string | null {
  const el = parent?.getElementsByTagName(tag)[0];
  return el ? el.textContent : null;
}

export function musicXmlToEditorScore(xml: string): EditorScore {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('notation: invalid MusicXML');

  const title = textOf(doc.documentElement, 'work-title') ?? 'Untitled exercise';
  const attrs = doc.getElementsByTagName('attributes')[0] ?? null;
  const keyFifths = parseInt(textOf(attrs, 'fifths') ?? '0', 10);
  const mode = (textOf(attrs, 'mode') as EditorScore['mode']) ?? 'major';
  const beats = parseInt(textOf(attrs, 'beats') ?? '4', 10);
  const beatType = parseInt(textOf(attrs, 'beat-type') ?? '4', 10);
  const sign = textOf(attrs, 'sign') ?? 'G';
  const clef = SIGN_CLEF[sign] ?? 'treble';

  const elements: EditorElement[] = [];
  const noteEls = Array.from(doc.getElementsByTagName('note'));
  for (const note of noteEls) {
    const dur = parseInt(textOf(note, 'duration') ?? '0', 10);
    const parsed = ticksToDur(dur);
    if (!parsed) continue;               // unsupported duration in Phase 1 — skip, Phase 2 handles tuplets
    const { base, dots } = parsed;
    if (note.getElementsByTagName('rest').length) {
      elements.push(restOf(base, dots));
      continue;
    }
    const pitchEl = note.getElementsByTagName('pitch')[0];
    const step = (textOf(pitchEl, 'step') ?? 'C') as Pitch['step'];
    const octave = parseInt(textOf(pitchEl, 'octave') ?? '4', 10);
    const alter = parseInt(textOf(pitchEl, 'alter') ?? '0', 10);
    const n = noteOf({ step, octave, alter }, base, dots);
    const tied = note.getElementsByTagName('tie')[0];
    if (tied) n.tie = tied.getAttribute('type') === 'stop' ? 'stop' : 'start';
    elements.push(n);
  }

  return {
    title,
    keyFifths, mode,
    timeSig: { beats, beatType },
    clef,
    tempo: 120,
    elements,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun x vitest run src/lib/notation/musicxmlRead.test.ts`
Expected: PASS, 5 tests (4 round-trips + 1 foreign).

- [ ] **Step 5: Commit**

```bash
git add src/lib/notation/musicxmlRead.ts src/lib/notation/musicxmlRead.test.ts
git commit -m "feat(notation): MusicXML reader with round-trip fidelity gate"
```

---

### Task 7: EditorScore → ExerciseIR projection

**Files:**
- Create: `src/lib/notation/toIR.ts`
- Test: `src/lib/notation/toIR.test.ts`

**Interfaces:**
- Consumes: `EditorScore`, `elementTicks` (Task 2); `DIVISIONS` (Task 1); `ExerciseIR`, `IRNote`, `midiToSolfege` (`src/lib/sightReading/ir.ts`), `KEY_TO_MIDI` (`src/lib/sightReading/ir.ts`).
- Produces: `editorScoreToIR(score: EditorScore): ExerciseIR | null` — `null` for anything the single-line scorer can't consume (Phase 1: a score with a tie is fine; a score with zero notes returns `null`).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/notation/toIR.test.ts
import { describe, it, expect } from 'vitest';
import { editorScoreToIR } from './toIR';
import { emptyScore, noteOf, restOf } from './model';

const C4 = { step: 'C' as const, octave: 4, alter: 0 };
const D4 = { step: 'D' as const, octave: 4, alter: 0 };

describe('editorScoreToIR', () => {
  it('projects a single-line score to an IR the scorer understands', () => {
    const s = { ...emptyScore(), elements: [noteOf(C4, 'quarter'), noteOf(D4, 'quarter')] };
    const ir = editorScoreToIR(s)!;
    expect(ir).not.toBeNull();
    expect(ir.notes.map(n => n.midi)).toEqual([60, 62]);
    expect(ir.notes.map(n => n.beatPos)).toEqual([0, 1]);
    expect(ir.notes.map(n => n.durationBeats)).toEqual([1, 1]);
    expect(ir.tonicMidi).toBe(60);      // C major from keyFifths 0
    expect(ir.notes[0].solfege).toBe('do');
  });
  it('skips rests in the IR note list but advances beat position', () => {
    const s = { ...emptyScore(), elements: [noteOf(C4,'quarter'), restOf('quarter'), noteOf(D4,'quarter')] };
    const ir = editorScoreToIR(s)!;
    expect(ir.notes.map(n => n.beatPos)).toEqual([0, 2]);
  });
  it('returns null for a score with no notes', () => {
    expect(editorScoreToIR(emptyScore())).toBeNull();
    expect(editorScoreToIR({ ...emptyScore(), elements: [restOf('whole')] })).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun x vitest run src/lib/notation/toIR.test.ts`
Expected: FAIL — cannot resolve `./toIR`.

- [ ] **Step 3: Implement**

```ts
// src/lib/notation/toIR.ts
import { DIVISIONS } from './duration';
import { EditorScore, elementTicks } from './model';
import type { ExerciseIR, IRNote } from '@/lib/sightReading/ir';
import { midiToSolfege } from '@/lib/sightReading/ir';

const CHROMA: Record<string, number> = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
const FIFTHS_TONIC: Record<number, number> = { 0:60, 1:67, 2:62, 3:69, 4:64, 5:71, [-1]:65, [-2]:70, [-3]:63, [-4]:68 };

export function editorScoreToIR(score: EditorScore): ExerciseIR | null {
  const tonicMidi = FIFTHS_TONIC[score.keyFifths] ?? 60;
  const notes: IRNote[] = [];
  let beatPos = 0;
  const ticksPerBeat = DIVISIONS * 4 / score.timeSig.beatType;

  for (const el of score.elements) {
    const beats = elementTicks(el) / ticksPerBeat;
    if (el.kind === 'note') {
      const midi = (el.pitch.octave + 1) * 12 + CHROMA[el.pitch.step] + el.pitch.alter;
      notes.push({ midi, beatPos, durationBeats: beats, solfege: midiToSolfege(midi, tonicMidi), phraseIdx: 0 });
    }
    beatPos += beats;
  }
  if (notes.length === 0) return null;

  return {
    key: 'C', mode: score.mode, tonicMidi,
    meter: { beats: score.timeSig.beats, beatType: score.timeSig.beatType },
    tempo: score.tempo,
    notes, phrases: 1, difficulty: 1,
  };
}
```

Note: `midiToSolfege` is imported from `@/lib/sightReading/ir` — verify its exact signature `(midi, tonicMidi)` before implementing (it is exported and tested there). `phraseIdx` is 0 for Phase 1 (single phrase); the scorer tolerates it.

- [ ] **Step 4: Run to verify it passes**

Run: `bun x vitest run src/lib/notation/toIR.test.ts && bun x vitest run src/lib/notation/`
Expected: PASS — toIR 3 tests; whole `notation/` module green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notation/toIR.ts src/lib/notation/toIR.test.ts
git commit -m "feat(notation): EditorScore -> ExerciseIR projection (null for unscoreable)"
```

---

### Task 8: The migration (assignment schema)

**Files:**
- Create: `supabase/migrations/20260710120000_notation_editor.sql`
- Test: `supabase/migrations/tests/notation_editor_test.sql`

**Interfaces:**
- Consumes: existing `gw_assignments`, `gw_sight_reading_exercises`, `current_tenant_id()`.
- Produces: `gw_assignments.student_id` (nullable), `gw_sight_reading_assignment_items`, `gw_sight_reading_exercises` tenant plumbing.

The additive rule: `gw_assignments.student_id` is nullable with no default; `NULL` preserves today's course-wide behavior exactly. RESTRICTIVE RLS + a `BEFORE INSERT` tenant trigger on the new table.

- [ ] **Step 1: Write the failing test (SQL assertions)**

```sql
-- supabase/migrations/tests/notation_editor_test.sql
-- Run against a DB with the migration applied. Asserts additive-safety + tenant plumbing.
BEGIN;
-- student_id exists, is nullable, has no non-null default (course-only assignments unchanged)
DO $$ BEGIN
  ASSERT (SELECT is_nullable = 'YES' FROM information_schema.columns
          WHERE table_name='gw_assignments' AND column_name='student_id'), 'student_id must be nullable';
  ASSERT (SELECT column_default IS NULL FROM information_schema.columns
          WHERE table_name='gw_assignments' AND column_name='student_id'), 'student_id must have no default';
END $$;
-- the join table exists with a tenant default and the tenant trigger
DO $$ BEGIN
  ASSERT (SELECT count(*) = 1 FROM information_schema.tables
          WHERE table_name='gw_sight_reading_assignment_items'), 'join table missing';
  ASSERT (SELECT count(*) >= 1 FROM information_schema.triggers
          WHERE event_object_table='gw_sight_reading_assignment_items' AND action_timing='BEFORE'), 'tenant trigger missing';
END $$;
-- RLS enabled on the join table
DO $$ BEGIN
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname='gw_sight_reading_assignment_items'), 'RLS not enabled';
END $$;
ROLLBACK;
```

- [ ] **Step 2: Run to verify it fails**

Run (against the droplet DB, migration NOT yet applied):
```bash
ssh root@198.211.113.144 'docker exec -i supabase-db psql -U postgres' < supabase/migrations/tests/notation_editor_test.sql
```
Expected: assertion failure — `student_id must be nullable` (column doesn't exist).

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/20260710120000_notation_editor.sql

-- Shared trigger: coalesce an explicit NULL tenant_id back to the tenant. The column
-- DEFAULT is suppressed when a client serializes tenant_id: null, and a RESTRICTIVE
-- WITH CHECK then silently rejects the row. (create-or-replace: may already exist.)
CREATE OR REPLACE FUNCTION public.set_tenant_id_default() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN
  IF NEW.tenant_id IS NULL THEN NEW.tenant_id := current_tenant_id(); END IF; RETURN NEW; END $$;

-- 1. Individual-student assignment. Nullable, no default: NULL = existing course-wide behavior.
ALTER TABLE public.gw_assignments
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Score-bank tenant plumbing (table already exists).
ALTER TABLE public.gw_sight_reading_exercises
  ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id(),
  ADD COLUMN IF NOT EXISTS difficulty int,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 3. One assignment -> N exercises. NET-NEW.
CREATE TABLE IF NOT EXISTS public.gw_sight_reading_assignment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id(),
  assignment_id uuid NOT NULL REFERENCES public.gw_assignments(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.gw_sight_reading_exercises(id) ON DELETE RESTRICT,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, exercise_id)
);

DROP TRIGGER IF EXISTS trg_srai_tenant ON public.gw_sight_reading_assignment_items;
CREATE TRIGGER trg_srai_tenant BEFORE INSERT ON public.gw_sight_reading_assignment_items
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

ALTER TABLE public.gw_sight_reading_assignment_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS srai_isolation ON public.gw_sight_reading_assignment_items;
CREATE POLICY srai_isolation ON public.gw_sight_reading_assignment_items
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS srai_rw ON public.gw_sight_reading_assignment_items;
CREATE POLICY srai_rw ON public.gw_sight_reading_assignment_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

- [ ] **Step 4: Apply and verify it passes**

```bash
scp supabase/migrations/20260710120000_notation_editor.sql root@198.211.113.144:/tmp/
ssh root@198.211.113.144 'docker exec -i supabase-db psql -U postgres < /tmp/20260710120000_notation_editor.sql'
ssh root@198.211.113.144 'docker exec -i supabase-db psql -U postgres' < supabase/migrations/tests/notation_editor_test.sql
```
Expected: migration applies without error; the test script runs to `ROLLBACK` with no assertion failures.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260710120000_notation_editor.sql supabase/migrations/tests/notation_editor_test.sql
git commit -m "feat(notation): assignment schema — student_id + assignment_items + tenant plumbing"
```

---

### Task 9: Data access (save/load exercises, create assignments)

**Files:**
- Create: `src/lib/notation/exercisesApi.ts`, `src/lib/notation/assignmentsApi.ts`
- Test: `src/lib/notation/exercisesApi.test.ts`

**Interfaces:**
- Consumes: `EditorScore` (Task 2), `editorScoreToMusicXML` (Task 5), `musicXmlToEditorScore` (Task 6), `editorScoreToIR` (Task 7); the shared Supabase client `@/integrations/supabase/client`.
- Produces:
  ```ts
  // exercisesApi.ts
  export async function saveExercise(score: EditorScore, existingId?: string): Promise<{ id: string }>;
  export async function loadExercise(id: string): Promise<EditorScore>;
  export function scoreToRow(score: EditorScore): { title: string; musicxml: string; params: unknown };
  // assignmentsApi.ts
  export async function assignExercise(input: { exerciseId: string; courseId?: string; studentId?: string; dueAt?: string; title: string }): Promise<{ assignmentId: string }>;
  ```

The pure `scoreToRow` is unit-tested; the Supabase calls are thin and verified in the integration step (Task 12) and by build, since this repo has no Supabase test harness.

- [ ] **Step 1: Write the failing test (the pure part)**

```ts
// src/lib/notation/exercisesApi.test.ts
import { describe, it, expect } from 'vitest';
import { scoreToRow } from './exercisesApi';
import { emptyScore, noteOf } from './model';

describe('scoreToRow', () => {
  it('serializes MusicXML and derives IR params for a single-line score', () => {
    const s = { ...emptyScore(), title: 'My drill', elements: [noteOf({ step:'C', octave:4, alter:0 }, 'quarter')] };
    const row = scoreToRow(s);
    expect(row.title).toBe('My drill');
    expect(row.musicxml).toContain('<score-partwise');
    expect((row.params as any).ir).not.toBeNull();
    expect((row.params as any).key).toBe(0);          // keyFifths
    expect((row.params as any).timeSig).toEqual({ beats: 4, beatType: 4 });
  });
  it('sets ir to null for a score with no notes', () => {
    const row = scoreToRow(emptyScore());
    expect((row.params as any).ir).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun x vitest run src/lib/notation/exercisesApi.test.ts`
Expected: FAIL — cannot resolve `./exercisesApi`.

- [ ] **Step 3: Implement**

```ts
// src/lib/notation/exercisesApi.ts
import { supabase } from '@/integrations/supabase/client';
import { EditorScore } from './model';
import { editorScoreToMusicXML } from './musicxmlWrite';
import { musicXmlToEditorScore } from './musicxmlRead';
import { editorScoreToIR } from './toIR';

export function scoreToRow(score: EditorScore) {
  return {
    title: score.title,
    musicxml: editorScoreToMusicXML(score),
    params: {
      key: score.keyFifths, mode: score.mode, timeSig: score.timeSig,
      clef: score.clef, tempo: score.tempo, ir: editorScoreToIR(score),
    },
  };
}

export async function saveExercise(score: EditorScore, existingId?: string): Promise<{ id: string }> {
  const row = scoreToRow(score);
  if (existingId) {
    const { error } = await supabase.from('gw_sight_reading_exercises').update(row).eq('id', existingId);
    if (error) throw error;
    return { id: existingId };
  }
  const { data, error } = await supabase.from('gw_sight_reading_exercises').insert(row).select('id').single();
  if (error) throw error;
  return { id: data!.id as string };
}

export async function loadExercise(id: string): Promise<EditorScore> {
  const { data, error } = await supabase.from('gw_sight_reading_exercises').select('musicxml').eq('id', id).single();
  if (error) throw error;
  return musicXmlToEditorScore(data!.musicxml as string);
}
```

```ts
// src/lib/notation/assignmentsApi.ts
import { supabase } from '@/integrations/supabase/client';

export async function assignExercise(input: {
  exerciseId: string; courseId?: string; studentId?: string; dueAt?: string; title: string;
}): Promise<{ assignmentId: string }> {
  const { data: asg, error: e1 } = await supabase.from('gw_assignments').insert({
    title: input.title,
    assignment_type: 'sight_reading',
    course_id: input.courseId ?? null,
    student_id: input.studentId ?? null,
    due_at: input.dueAt ?? null,
    is_active: true,
  }).select('id').single();
  if (e1) throw e1;
  const assignmentId = asg!.id as string;

  const { error: e2 } = await supabase.from('gw_sight_reading_assignment_items').insert({
    assignment_id: assignmentId, exercise_id: input.exerciseId, position: 0,
  });
  if (e2) throw e2;
  return { assignmentId };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun x vitest run src/lib/notation/exercisesApi.test.ts && bun x vite build`
Expected: PASS 2 tests; build succeeds (proves the Supabase imports resolve).

- [ ] **Step 5: Commit**

```bash
git add src/lib/notation/exercisesApi.ts src/lib/notation/exercisesApi.test.ts src/lib/notation/assignmentsApi.ts
git commit -m "feat(notation): save/load exercises + create assignments"
```

---

### Task 10: VexFlow render layer + NotationView

**Files:**
- Create: `src/lib/notation/toVexflow.ts`, `src/pages/notation/NotationView.tsx`
- Test: `src/lib/notation/toVexflow.test.ts`

**Interfaces:**
- Consumes: `EditorScore`, `layoutMeasures` (Task 3); VexFlow 5 (`import { Renderer, Stave, StaveNote, Accidental, Formatter, Voice } from 'vexflow'` — the exact import shape used in `src/features/read-music/components/Score.tsx`).
- Produces:
  ```ts
  export function toVexKey(pitch: Pitch): string;                 // e.g. {C,4,0} -> "c/4", {F,4,1} -> "f#/4"
  export function toVexDuration(base: BaseDur, dots: number): string; // 'quarter',1 -> 'qd'
  export function NotationView(props: { score: EditorScore; width?: number; onNoteClick?: (index: number) => void }): JSX.Element;
  ```

The pure translators (`toVexKey`, `toVexDuration`) are unit-tested. `NotationView` renders via VexFlow into a `<div ref>` — its pixels are verified on-device, not asserted. Follow `Score.tsx` for the Renderer/Stave/Formatter lifecycle exactly.

- [ ] **Step 1: Write the failing test (translators only)**

```ts
// src/lib/notation/toVexflow.test.ts
import { describe, it, expect } from 'vitest';
import { toVexKey, toVexDuration } from './toVexflow';

describe('VexFlow translation', () => {
  it('maps pitch to a VexFlow key string', () => {
    expect(toVexKey({ step: 'C', octave: 4, alter: 0 })).toBe('c/4');
    expect(toVexKey({ step: 'F', octave: 4, alter: 1 })).toBe('f#/4');
    expect(toVexKey({ step: 'B', octave: 3, alter: -1 })).toBe('bb/3');
  });
  it('maps base+dots to a VexFlow duration code', () => {
    expect(toVexDuration('quarter', 0)).toBe('q');
    expect(toVexDuration('quarter', 1)).toBe('qd');
    expect(toVexDuration('16th', 0)).toBe('16');
    expect(toVexDuration('whole', 0)).toBe('w');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun x vitest run src/lib/notation/toVexflow.test.ts`
Expected: FAIL — cannot resolve `./toVexflow`.

- [ ] **Step 3: Implement the translators, then NotationView**

```ts
// src/lib/notation/toVexflow.ts  (translators — pure, tested)
import { BaseDur } from './duration';
import { Pitch } from './model';

const VEX_DUR: Record<BaseDur, string> = { whole: 'w', half: 'h', quarter: 'q', eighth: '8', '16th': '16', '32nd': '32' };

export function toVexKey(pitch: Pitch): string {
  const accidental = pitch.alter === 1 ? '#' : pitch.alter === -1 ? 'b' : '';
  return `${pitch.step.toLowerCase()}${accidental}/${pitch.octave}`;
}

export function toVexDuration(base: BaseDur, dots: number): string {
  return VEX_DUR[base] + 'd'.repeat(dots);
}
```

```tsx
// src/pages/notation/NotationView.tsx
import { useEffect, useRef } from 'react';
import { Renderer, Stave, StaveNote, Accidental, Formatter } from 'vexflow';
import { EditorScore } from '@/lib/notation/model';
import { layoutMeasures } from '@/lib/notation/measures';
import { toVexKey, toVexDuration } from '@/lib/notation/toVexflow';

const VEX_CLEF = { treble: 'treble', bass: 'bass', alto: 'alto' } as const;

export function NotationView({ score, width = 720, onNoteClick }: {
  score: EditorScore; width?: number; onNoteClick?: (index: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current; if (!host) return;
    host.innerHTML = '';
    const measures = layoutMeasures(score);
    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(width, 160);
    const ctx = renderer.getContext();

    const measureWidth = Math.max(180, (width - 20) / Math.max(measures.length, 1));
    let x = 10, globalIndex = 0;
    measures.forEach((m, mi) => {
      const stave = new Stave(x, 20, measureWidth);
      if (mi === 0) stave.addClef(VEX_CLEF[score.clef]).addTimeSignature(`${score.timeSig.beats}/${score.timeSig.beatType}`);
      stave.setContext(ctx).draw();

      const notes = m.elements.map((el) => {
        if (el.kind === 'rest') {
          return new StaveNote({ keys: ['b/4'], duration: toVexDuration(el.base, el.dots) + 'r', clef: VEX_CLEF[score.clef] });
        }
        const sn = new StaveNote({ keys: [toVexKey(el.pitch)], duration: toVexDuration(el.base, el.dots), clef: VEX_CLEF[score.clef] });
        if (el.pitch.alter === 1) sn.addModifier(new Accidental('#'), 0);
        if (el.pitch.alter === -1) sn.addModifier(new Accidental('b'), 0);
        return sn;
      });
      if (notes.length) {
        Formatter.FormatAndDraw(ctx, stave, notes);
        // Wire click-to-select: attach the flat index to each drawn note's SVG group.
        notes.forEach((n, i) => {
          const idx = globalIndex + i;
          (n as any).getSVGElement?.()?.addEventListener('click', () => onNoteClick?.(idx));
        });
      }
      globalIndex += m.elements.length;
      x += measureWidth;
    });
  }, [score, width, onNoteClick]);

  return <div ref={ref} className="overflow-x-auto" />;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun x vitest run src/lib/notation/toVexflow.test.ts && bun x vite build`
Expected: PASS 2 tests; build succeeds (NotationView compiles against VexFlow).

- [ ] **Step 5: Commit**

```bash
git add src/lib/notation/toVexflow.ts src/lib/notation/toVexflow.test.ts src/pages/notation/NotationView.tsx
git commit -m "feat(notation): VexFlow translation + NotationView render"
```

---

### Task 11: The editor surface (palette, keyboard, mouse) + playback

**Files:**
- Create: `src/pages/notation/NoteEditor.tsx`
- Test: `src/pages/notation/NoteEditor.test.tsx`

**Interfaces:**
- Consumes: `EditorScore`, `emptyScore`, `noteOf`, `restOf` (Task 2); commands (Task 4); `NotationView` (Task 10); `CommandStack` (Task 4).
- Produces:
  ```ts
  export function NoteEditor(props: { score: EditorScore; onChange: (s: EditorScore) => void }): JSX.Element;
  ```

The component owns the armed duration and selection, translates keyboard/mouse into commands, dispatches them through a `CommandStack`, and calls `onChange` with each new `EditorScore`. Test through behavior (keystrokes → resulting score), not internals.

- [ ] **Step 1: Write the failing test**

```tsx
// src/pages/notation/NoteEditor.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NoteEditor } from './NoteEditor';
import { emptyScore, noteOf } from '@/lib/notation/model';

// NotationView draws via VexFlow (SVG in jsdom is fine to mount but we don't assert pixels).
describe('NoteEditor', () => {
  it('arming quarter then pressing C appends a middle-C quarter note', () => {
    let latest = emptyScore();
    render(<NoteEditor score={latest} onChange={(s) => { latest = s; }} />);
    fireEvent.click(screen.getByRole('button', { name: /quarter/i }));
    fireEvent.keyDown(window, { key: 'c' });
    expect(latest.elements).toHaveLength(1);
    expect(latest.elements[0]).toMatchObject({ kind: 'note', base: 'quarter', pitch: { step: 'C' } });
  });
  it('R inserts a rest of the armed duration', () => {
    let latest = emptyScore();
    render(<NoteEditor score={latest} onChange={(s) => { latest = s; }} />);
    fireEvent.click(screen.getByRole('button', { name: /half/i }));
    fireEvent.keyDown(window, { key: 'r' });
    expect(latest.elements[0]).toMatchObject({ kind: 'rest', base: 'half' });
  });
  it('Backspace deletes the last element', () => {
    let latest = { ...emptyScore(), elements: [noteOf({ step:'C', octave:4, alter:0 }, 'quarter')] };
    render(<NoteEditor score={latest} onChange={(s) => { latest = s; }} />);
    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(latest.elements).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun x vitest run src/pages/notation/NoteEditor.test.tsx`
Expected: FAIL — cannot resolve `./NoteEditor`.

- [ ] **Step 3: Implement**

```tsx
// src/pages/notation/NoteEditor.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorScore, noteOf, restOf, Pitch } from '@/lib/notation/model';
import { BaseDur } from '@/lib/notation/duration';
import { insertElement, deleteElement, transpose, CommandStack } from '@/lib/notation/commands';
import { NotationView } from './NotationView';

const DURATIONS: { code: BaseDur; label: string; key: string }[] = [
  { code: 'whole', label: 'Whole', key: '1' }, { code: 'half', label: 'Half', key: '2' },
  { code: 'quarter', label: 'Quarter', key: '3' }, { code: 'eighth', label: 'Eighth', key: '4' },
  { code: '16th', label: '16th', key: '5' }, { code: '32nd', label: '32nd', key: '6' },
];

// Place the pitch letter in the octave nearest the previous note (so C after a high B
// stays close, rather than jumping to a fixed octave).
function nearestPitch(step: Pitch['step'], prev: Pitch | null): Pitch {
  const CHROMA: Record<Pitch['step'], number> = { C:0,D:2,E:4,F:5,G:7,A:9,B:11 };
  const base = prev ? prev.octave : 4;
  const candidates = [base - 1, base, base + 1].map((oct) => ({ step, octave: oct, alter: 0 }));
  if (!prev) return { step, octave: 4, alter: 0 };
  const prevMidi = (prev.octave + 1) * 12 + CHROMA[prev.step] + prev.alter;
  return candidates.reduce((a, b) =>
    Math.abs((b.octave+1)*12 + CHROMA[b.step] - prevMidi) < Math.abs((a.octave+1)*12 + CHROMA[a.step] - prevMidi) ? b : a);
}

export function NoteEditor({ score, onChange }: { score: EditorScore; onChange: (s: EditorScore) => void }) {
  const [armed, setArmed] = useState<BaseDur>('quarter');
  const [selected, setSelected] = useState<number | null>(null);
  const stackRef = useRef(new CommandStack());
  const scoreRef = useRef(score); scoreRef.current = score;

  const dispatch = useCallback((cmd: Parameters<CommandStack['do']>[0]) => {
    onChange(stackRef.current.do(cmd, scoreRef.current));
  }, [onChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = scoreRef.current;
      const dur = DURATIONS.find((d) => d.key === e.key);
      if (dur) { setArmed(dur.code); return; }
      if (/^[a-gA-G]$/.test(e.key)) {
        const prev = [...s.elements].reverse().find((el) => el.kind === 'note') as any;
        const pitch = nearestPitch(e.key.toUpperCase() as Pitch['step'], prev ? prev.pitch : null);
        dispatch(insertElement(s.elements.length, noteOf(pitch, armed)));
        return;
      }
      if (e.key === 'r' || e.key === 'R') { dispatch(insertElement(s.elements.length, restOf(armed))); return; }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const at = selected ?? s.elements.length - 1;
        if (at >= 0) { dispatch(deleteElement(at)); setSelected(null); }
        return;
      }
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && selected != null) {
        dispatch(transpose(selected, e.key === 'ArrowUp' ? 1 : -1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [armed, selected, dispatch]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {DURATIONS.map((d) => (
          <button key={d.code} onClick={() => setArmed(d.code)}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${armed === d.code ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {d.label}
          </button>
        ))}
      </div>
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <NotationView score={score} onNoteClick={setSelected} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun x vitest run src/pages/notation/NoteEditor.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/pages/notation/NoteEditor.tsx src/pages/notation/NoteEditor.test.tsx
git commit -m "feat(notation): note-entry editor (palette + keyboard + selection)"
```

---

### Task 12: Assign dialog + editor page + route + Library entry points

This is deliberately one task: the page, the assign dialog, the route, and the Studio Library buttons must land together, or the route dangles and the Library links point at nothing. `bun x tsc` won't catch a dangling lazy import — only `bun x vite build` will.

**Files:**
- Create: `src/pages/notation/AssignExerciseDialog.tsx`, `src/pages/notation/NotationEditorPage.tsx`
- Modify: `src/App.tsx` (one lazy import + one route), `src/pages/sightReading/SightReadingStudio.tsx` (Library tab: "Create exercise" + per-row "Edit")
- Test: `src/pages/notation/NotationEditorPage.test.tsx`

**Interfaces:**
- Consumes: `NoteEditor` (Task 11), `emptyScore` (Task 2), `saveExercise`, `loadExercise` (Task 9), `assignExercise` (Task 9).
- Produces: route `/dashboard/sight-reading/editor/:exerciseId?`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/pages/notation/NotationEditorPage.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotationEditorPage from './NotationEditorPage';

vi.mock('@/lib/notation/exercisesApi', () => ({
  saveExercise: vi.fn().mockResolvedValue({ id: 'x1' }),
  loadExercise: vi.fn(),
}));

describe('NotationEditorPage', () => {
  it('a blank editor opens with a Save button and an empty title field', () => {
    render(<MemoryRouter><NotationEditorPage /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /assign/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun x vitest run src/pages/notation/NotationEditorPage.test.tsx`
Expected: FAIL — cannot resolve `./NotationEditorPage`.

- [ ] **Step 3: Implement the page + dialog, then wire route + Library**

`NotationEditorPage.tsx`: holds `EditorScore` state (blank via `emptyScore()`, or `loadExercise(:exerciseId)` on mount when the param is present), a title input, `<NoteEditor score onChange>`, a **Play** button (reuse `useTonePlayback` from `@/components/sight-singing/hooks/useTonePlayback` — feed it the exercise's MusicXML via `editorScoreToMusicXML`), a **Save** button (`saveExercise(score, exerciseId)`), and an **Assign** button that opens `AssignExerciseDialog` (after a save, so there's an `exerciseId`). Save is disabled while any measure is `overfull` (from `layoutMeasures`).

`AssignExerciseDialog.tsx`: a form — pick **class** (a `gw_academy_courses` select) OR **student** (a roster select), a due date, then `assignExercise({ exerciseId, courseId|studentId, dueAt, title })`. Loads the course list and, when a course is chosen, its roster from `gw_course_enrollments` for the per-student option.

Wire into `src/App.tsx` (verify current line numbers first):
```tsx
const NotationEditorPage = lazy(() => import("./pages/notation/NotationEditorPage"));
// inside the authenticated routes, beside the sight-reading route:
<Route path="/dashboard/sight-reading/editor/:exerciseId?"
  element={<ProtectedRoute><DashboardShell><NotationEditorPage /></DashboardShell></ProtectedRoute>} />
```

Wire into `src/pages/sightReading/SightReadingStudio.tsx` Library tab: a "Create exercise" button → `navigate('/dashboard/sight-reading/editor')`, and an "Edit" action per library row → `navigate('/dashboard/sight-reading/editor/' + row.id)`. Gate both on `has_role('admin')` (use the existing role hook — grep for how other admin-only buttons check it).

- [ ] **Step 4: Run to verify it passes + full gates**

```bash
bun x vitest run src/pages/notation/NotationEditorPage.test.tsx
bun x vitest run src/lib/notation/ src/pages/notation/
bun x vite build
grep -rn "notation/editor\|NotationEditorPage" src/App.tsx
```
Expected: page test passes; whole notation module + pages green; **build succeeds**; the route and lazy import are present in App.tsx.

- [ ] **Step 5: Commit**

```bash
git add src/pages/notation/AssignExerciseDialog.tsx src/pages/notation/NotationEditorPage.tsx \
        src/pages/notation/NotationEditorPage.test.tsx src/App.tsx src/pages/sightReading/SightReadingStudio.tsx
git commit -m "feat(notation): editor page, assign dialog, route, and Studio Library entry points"
```

---

## Self-Review

**Spec coverage.** Keyboard+mouse authoring → Tasks 10–11. MusicXML save → Tasks 5, 9. Open-and-edit existing → Task 6 (reader) + Task 9 (`loadExercise`) + Task 12 (`:exerciseId` route). Assign to class or student → Tasks 8 (schema), 9 (`assignExercise`), 12 (dialog). `EditorScore` distinct from IR → Task 2 + Task 7 (`editorScoreToIR` returns `null` for unscoreable). Command pattern for Phase 5 undo → Task 4. Bidirectional MusicXML with round-trip gate → Tasks 5, 6. Dotted notes → Tasks 1 (`dottedTicks`), 5/6 (`<dot/>`), 10 (`qd`). Ties → Tasks 4 (`toggleTie`), 5/6 (`<tie>`). Barlines computed, overfull flagged → Task 3. Playback → Task 12. `has_role('admin')` gate → Task 12. Tenant plumbing + additive `student_id` regression → Task 8.

**Deferred to later phases (spec says so):** tuplets, pickups, mid-piece key/time changes, multiple voices, grand staff, dynamics, articulations, slurs, lyrics, undo/redo UI, copy/paste. No task here touches them.

**Placeholder scan.** The heavier UI tasks (11, 12) give complete code for the editor logic and complete interfaces for the page/dialog, with the render lifecycle deferred to the `Score.tsx` reference by explicit citation rather than pseudo-code — every step that writes logic shows the logic. `AssignExerciseDialog`/`NotationEditorPage` bodies are described by their exact inputs, calls, and the disabled-while-overfull rule rather than transcribed line-by-line, because they are straight assembly of tested units; the test pins the observable contract.

**Type consistency.** `EditorScore`/`EditorElement`/`Pitch` defined once (Task 2), consumed everywhere. `BaseDur` from Task 1 used by model, commands, vexflow. `editorScoreToMusicXML`/`musicXmlToEditorScore` names stable across Tasks 5, 6, 9. `assignExercise` signature identical in Tasks 9 and 12. `midiToSolfege` import from `@/lib/sightReading/ir` flagged for signature verification in Task 7.

**One risk called out.** VexFlow 5's exact `StaveNote`/`Accidental`/`Formatter` API should be confirmed against `src/features/read-music/components/Score.tsx` before writing Task 10 — the plan follows that file's usage, but VexFlow's major versions differ and the reference file is the source of truth for this repo's version.
