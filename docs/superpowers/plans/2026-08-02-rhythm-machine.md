# Rhythm Machine (Reading Music Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Rhythm domain of Reading Music: Steady Beat / Echo / Read & Clap drills with tap + mic-clap input, practice + assessment modes, persisted to a new consolidated `gw_reading_music_attempts` table with teacher override.

**Architecture:** Pure engine in `src/lib/rhythm/` (pattern model, seeded generator, syllable labeler, %-of-beat grader, two interchangeable onset sources emitting identical `number[]` onset times). UI is `RhythmTab` following PitchMatchTab's game shape, with a new single-line SVG `RhythmStrip` renderer. Persistence mirrors `gw_pitch_match_attempts` RLS exactly; teacher override via SECURITY DEFINER RPC.

**Tech Stack:** React + TS + Tailwind + shadcn, Web Audio (AnalyserNode), Supabase (self-hosted), Vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-02-rhythm-machine-design.md` — binding.
- **Pulse units:** all pattern math is in *pulses* (the click unit). Simple meters: pulse = notated beat. 6/8: pulse = dotted quarter (2 pulses/measure, eighth = 1/3 pulse). 5/8 & 7/8: pulse = eighth. This lets `clickSchedule()` (bpm = pulses/min, `meterBeats` = pulses/measure) drive everything unchanged.
- Tolerance = `max(tolerancePct × secondsPerPulse, 0.03)`; practice 0.10, assessment 0.06. Match window = 2× tolerance. Pass threshold 80.
- AudioContext must be created/resumed inside the click gesture (pitch-match lesson).
- All inserts `.insert(...).select().single()` and check the returned row (demo-tenant silent-fail gotcha).
- Tenant-neutral copy; light theme tokens; no sub-12px text in dense UI.
- Worktree: `~/Documents/GitHub/gleeworld-wt-rhythm`, branch `rhythm-machine-phase-2`. Run `npm ci` there first (worktrees need their own node_modules).
- Test runner: `npx vitest run <file>`.

---

### Task 1: Pattern model + level catalog — `src/lib/rhythm/pattern.ts`

**Files:**
- Create: `src/lib/rhythm/pattern.ts`
- Test: `src/lib/rhythm/__tests__/pattern.test.ts`

**Interfaces (Produces):**
```ts
export interface Meter { beats: number; beatType: number }
export type NoteValue = 'w' | 'h' | 'h.' | 'q' | 'q.' | 'e' | 'e.' | 's';
export interface RhythmEvent { startPulse: number; durPulses: number; value: NoteValue; rest: boolean }
export interface RhythmPattern { meter: Meter; pulsesPerMeasure: number; measures: number; events: RhythmEvent[]; totalPulses: number }
export interface RhythmCellEvent { value: NoteValue; rest?: boolean }
export interface RhythmCell { pulses: number; events: RhythmCellEvent[] }
export interface RhythmLevel { id: number; label: string; meters: Meter[]; cells: RhythmCell[]; measures: number; defaultBpm: number }
export const RHYTHM_LEVELS: RhythmLevel[];              // 8 levels per spec §1
export function pulsesPerMeasure(meter: Meter): number; // 6/8→2, else meter.beats
export function isCompound(meter: Meter): boolean;      // beats divisible by 3 && beatType 8 && beats>3
export function valuePulses(value: NoteValue, meter: Meter): number;
```

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/rhythm/__tests__/pattern.test.ts
import { describe, it, expect } from 'vitest';
import { RHYTHM_LEVELS, pulsesPerMeasure, isCompound, valuePulses } from '../pattern';

describe('pattern model', () => {
  it('computes pulses per measure', () => {
    expect(pulsesPerMeasure({ beats: 4, beatType: 4 })).toBe(4);
    expect(pulsesPerMeasure({ beats: 3, beatType: 4 })).toBe(3);
    expect(pulsesPerMeasure({ beats: 6, beatType: 8 })).toBe(2);
    expect(pulsesPerMeasure({ beats: 5, beatType: 8 })).toBe(5);
    expect(pulsesPerMeasure({ beats: 7, beatType: 8 })).toBe(7);
  });
  it('flags compound meter', () => {
    expect(isCompound({ beats: 6, beatType: 8 })).toBe(true);
    expect(isCompound({ beats: 4, beatType: 4 })).toBe(false);
    expect(isCompound({ beats: 5, beatType: 8 })).toBe(false);
  });
  it('maps note values to pulses per meter', () => {
    const simple = { beats: 4, beatType: 4 };
    expect(valuePulses('q', simple)).toBe(1);
    expect(valuePulses('e', simple)).toBe(0.5);
    expect(valuePulses('h', simple)).toBe(2);
    expect(valuePulses('q.', simple)).toBe(1.5);
    const compound = { beats: 6, beatType: 8 };
    expect(valuePulses('q.', compound)).toBe(1);      // dotted quarter = the pulse
    expect(valuePulses('e', compound)).toBeCloseTo(1 / 3);
    const fiveEight = { beats: 5, beatType: 8 };
    expect(valuePulses('e', fiveEight)).toBe(1);       // eighth = the pulse
    expect(valuePulses('q', fiveEight)).toBe(2);
  });
  it('has 8 levels, each with legal cells (event durations sum to cell pulses)', () => {
    expect(RHYTHM_LEVELS).toHaveLength(8);
    for (const lvl of RHYTHM_LEVELS) {
      expect(lvl.meters.length).toBeGreaterThan(0);
      expect(lvl.cells.length).toBeGreaterThan(0);
      for (const meter of lvl.meters) {
        for (const cell of lvl.cells) {
          const sum = cell.events.reduce((s, e) => s + valuePulses(e.value, meter), 0);
          expect(sum).toBeCloseTo(cell.pulses, 6);
        }
      }
    }
  });
  it('level 5 is compound 6/8 (spec: compound is NOT last)', () => {
    expect(RHYTHM_LEVELS[4].meters.some((m) => m.beats === 6 && m.beatType === 8)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run src/lib/rhythm/__tests__/pattern.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// src/lib/rhythm/pattern.ts
export interface Meter { beats: number; beatType: number }
export type NoteValue = 'w' | 'h' | 'h.' | 'q' | 'q.' | 'e' | 'e.' | 's';
export interface RhythmEvent { startPulse: number; durPulses: number; value: NoteValue; rest: boolean }
export interface RhythmPattern { meter: Meter; pulsesPerMeasure: number; measures: number; events: RhythmEvent[]; totalPulses: number }
export interface RhythmCellEvent { value: NoteValue; rest?: boolean }
export interface RhythmCell { pulses: number; events: RhythmCellEvent[] }
export interface RhythmLevel { id: number; label: string; meters: Meter[]; cells: RhythmCell[]; measures: number; defaultBpm: number }

export function isCompound(m: Meter): boolean {
  return m.beatType === 8 && m.beats > 3 && m.beats % 3 === 0;
}
export function pulsesPerMeasure(m: Meter): number {
  if (isCompound(m)) return m.beats / 3;
  return m.beats;
}
// Quarter-note-relative lengths; scaled by what one pulse means in this meter.
const QUARTER_LEN: Record<NoteValue, number> = {
  w: 4, h: 2, 'h.': 3, q: 1, 'q.': 1.5, e: 0.5, 'e.': 0.75, s: 0.25,
};
export function valuePulses(value: NoteValue, meter: Meter): number {
  // One pulse in quarter-note units: simple x/4 → 1; compound → 1.5; x/8 odd → 0.5.
  const pulseQuarters = isCompound(meter) ? 1.5 : meter.beatType === 8 ? 0.5 : 1;
  return QUARTER_LEN[value] / pulseQuarters;
}

const C = (pulses: number, ...events: RhythmCellEvent[]): RhythmCell => ({ pulses, events });
const S44: Meter = { beats: 4, beatType: 4 };
const S34: Meter = { beats: 3, beatType: 4 };
const S24: Meter = { beats: 2, beatType: 4 };
const C68: Meter = { beats: 6, beatType: 8 };
const O58: Meter = { beats: 5, beatType: 8 };
const O78: Meter = { beats: 7, beatType: 8 };

export const RHYTHM_LEVELS: RhythmLevel[] = [
  { id: 1, label: 'Steady Beat', meters: [S44], measures: 4, defaultBpm: 80,
    cells: [C(1, { value: 'q' })] },
  { id: 2, label: 'Quarters & Eighths', meters: [S44, S24], measures: 2, defaultBpm: 84,
    cells: [C(1, { value: 'q' }), C(1, { value: 'e' }, { value: 'e' }), C(2, { value: 'h' })] },
  { id: 3, label: 'Rests', meters: [S44, S34], measures: 2, defaultBpm: 84,
    cells: [C(1, { value: 'q' }), C(1, { value: 'e' }, { value: 'e' }), C(1, { value: 'q', rest: true }),
            C(1, { value: 'e', rest: true }, { value: 'e' })] },
  { id: 4, label: 'Dotted Rhythms', meters: [S44, S34], measures: 2, defaultBpm: 80,
    cells: [C(1, { value: 'q' }), C(1, { value: 'e' }, { value: 'e' }), C(1, { value: 'q', rest: true }),
            C(1.5, { value: 'q.' }), C(1, { value: 'e.' }, { value: 's' }),
            C(1, { value: 's' }, { value: 's' }, { value: 'e' }), C(1, { value: 'e' }, { value: 's' }, { value: 's' })] },
  { id: 5, label: 'Compound 6/8', meters: [C68], measures: 2, defaultBpm: 60,
    cells: [C(1, { value: 'q.' }), C(1, { value: 'e' }, { value: 'e' }, { value: 'e' }),
            C(1, { value: 'q' }, { value: 'e' }), C(1, { value: 'e' }, { value: 'q' }),
            C(1, { value: 'e', rest: true }, { value: 'e' }, { value: 'e' })] },
  { id: 6, label: 'Syncopation', meters: [S44], measures: 2, defaultBpm: 88,
    cells: [C(1, { value: 'q' }), C(1, { value: 'e' }, { value: 'e' }),
            C(2, { value: 'e' }, { value: 'q' }, { value: 'e' }),
            C(1, { value: 'e', rest: true }, { value: 'e' }),
            C(1, { value: 's' }, { value: 'e' }, { value: 's' })] },
  { id: 7, label: 'Ties & Longer Syncopes', meters: [S44], measures: 2, defaultBpm: 88,
    cells: [C(1, { value: 'q' }), C(2, { value: 'e' }, { value: 'q' }, { value: 'e' }),
            C(3, { value: 'e' }, { value: 'h' }, { value: 'e' }),
            C(2, { value: 'q.' }, { value: 'e' }), C(2, { value: 'e' }, { value: 'q.' })] },
  { id: 8, label: 'Odd Meters', meters: [O58, O78], measures: 2, defaultBpm: 160,
    cells: [C(1, { value: 'e' }), C(2, { value: 'q' }), C(3, { value: 'q.' }),
            C(2, { value: 'e' }, { value: 'e' }), C(1, { value: 'e', rest: true })] },
];
```

- [ ] **Step 4: Run to verify pass** — same command, expect PASS.
- [ ] **Step 5: Commit** — `git add src/lib/rhythm && git commit -m "feat(rhythm): pattern model + 8-level catalog"`

---

### Task 2: Seeded generator — `src/lib/rhythm/generate.ts`

**Files:**
- Create: `src/lib/rhythm/generate.ts`
- Test: `src/lib/rhythm/__tests__/generate.test.ts`

**Interfaces:**
- Consumes: `RHYTHM_LEVELS`, `RhythmPattern`, `RhythmCell`, `pulsesPerMeasure`, `valuePulses` from Task 1.
- Produces: `generatePattern(levelId: number, seed: number, meterIndex?: number): RhythmPattern` — fills `measures` measures by drawing legal cells that fit the remaining pulses in the current measure; deterministic under seed (mulberry32). First event of the whole pattern is never a rest (students need a clear start).

- [ ] **Step 1: Failing test**

```ts
// src/lib/rhythm/__tests__/generate.test.ts
import { describe, it, expect } from 'vitest';
import { generatePattern } from '../generate';
import { RHYTHM_LEVELS, pulsesPerMeasure, valuePulses } from '../pattern';

describe('generatePattern', () => {
  it('is deterministic under a seed', () => {
    const a = generatePattern(4, 42);
    const b = generatePattern(4, 42);
    expect(a).toEqual(b);
    const c = generatePattern(4, 43);
    expect(JSON.stringify(c)).not.toEqual(JSON.stringify(a));
  });
  it.each(RHYTHM_LEVELS.map((l) => [l.id] as const))('level %i bar math is exact and cells are legal', (id) => {
    const lvl = RHYTHM_LEVELS.find((l) => l.id === id)!;
    for (let seed = 0; seed < 25; seed++) {
      const p = generatePattern(id, seed);
      const ppm = pulsesPerMeasure(p.meter);
      expect(p.totalPulses).toBeCloseTo(ppm * lvl.measures, 6);
      // Events tile the whole span with no gaps or overlaps.
      let cursor = 0;
      for (const e of p.events) {
        expect(e.startPulse).toBeCloseTo(cursor, 6);
        expect(e.durPulses).toBeCloseTo(valuePulses(e.value, p.meter), 6);
        cursor += e.durPulses;
      }
      expect(cursor).toBeCloseTo(p.totalPulses, 6);
      // No event crosses a barline (cells are drawn to fit measures).
      for (const e of p.events) {
        const barStart = Math.floor(e.startPulse / ppm + 1e-9) * ppm;
        expect(e.startPulse + e.durPulses).toBeLessThanOrEqual(barStart + ppm + 1e-6);
      }
      expect(p.events[0].rest).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run to verify fail.**
- [ ] **Step 3: Implement**

```ts
// src/lib/rhythm/generate.ts
import { RHYTHM_LEVELS, pulsesPerMeasure, valuePulses } from './pattern';
import type { RhythmPattern, RhythmEvent, RhythmCell, Meter } from './pattern';

// Deterministic PRNG so tests can assert exact output.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generatePattern(levelId: number, seed: number, meterIndex = 0): RhythmPattern {
  const lvl = RHYTHM_LEVELS.find((l) => l.id === levelId);
  if (!lvl) throw new Error(`unknown rhythm level ${levelId}`);
  const meter: Meter = lvl.meters[meterIndex % lvl.meters.length];
  const ppm = pulsesPerMeasure(meter);
  const rand = mulberry32(seed * 8 + levelId);
  const events: RhythmEvent[] = [];
  let cursor = 0;
  for (let m = 0; m < lvl.measures; m++) {
    let remaining = ppm;
    while (remaining > 1e-6) {
      const fits: RhythmCell[] = lvl.cells.filter((c) => c.pulses <= remaining + 1e-6
        && !(events.length === 0 && c.events[0].rest)); // never open the pattern on a rest
      const cell = fits[Math.floor(rand() * fits.length)];
      for (const ce of cell.events) {
        const dur = valuePulses(ce.value, meter);
        events.push({ startPulse: cursor, durPulses: dur, value: ce.value, rest: !!ce.rest });
        cursor += dur;
      }
      remaining -= cell.pulses;
    }
  }
  return { meter, pulsesPerMeasure: ppm, measures: lvl.measures, events, totalPulses: ppm * lvl.measures };
}
```

Note: every level must keep at least one 1-pulse cell whose first event isn't a rest, or the `fits` filter can come up empty — the Task 1 catalog satisfies this; the 25-seed test would catch a regression by throwing on `cell.events` of `undefined`.

- [ ] **Step 4: Run to verify pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat(rhythm): seeded cell-based pattern generator"`

---

### Task 3: Syllable labeler — `src/lib/rhythm/syllables.ts`

**Files:**
- Create: `src/lib/rhythm/syllables.ts`
- Test: `src/lib/rhythm/__tests__/syllables.test.ts`

**Interfaces:**
- Consumes: `RhythmPattern`, `isCompound` from Task 1.
- Produces: `export type SyllableSystem = 'takadimi' | 'kodaly' | 'counting';` and `export function labelPattern(pattern: RhythmPattern, system: SyllableSystem): string[]` — one label per event (`''` for rests), from the event's position within its pulse.

- [ ] **Step 1: Failing test**

```ts
// src/lib/rhythm/__tests__/syllables.test.ts
import { describe, it, expect } from 'vitest';
import { labelPattern } from '../syllables';
import type { RhythmPattern } from '../pattern';

const p = (meter: { beats: number; beatType: number }, evs: Array<[number, number, string, boolean?]>): RhythmPattern => ({
  meter, pulsesPerMeasure: meter.beatType === 8 && meter.beats === 6 ? 2 : meter.beats, measures: 1,
  events: evs.map(([startPulse, durPulses, value, rest]) => ({ startPulse, durPulses, value: value as never, rest: !!rest })),
  totalPulses: evs.reduce((s, e) => s + e[1], 0),
});

describe('labelPattern', () => {
  const simple = p({ beats: 2, beatType: 4 }, [[0, 1, 'q'], [1, 0.5, 'e'], [1.5, 0.5, 'e']]);
  it('takadimi simple: ta / ta di', () => {
    expect(labelPattern(simple, 'takadimi')).toEqual(['ta', 'ta', 'di']);
  });
  it('kodaly simple: ta / ti ti', () => {
    expect(labelPattern(simple, 'kodaly')).toEqual(['ta', 'ti', 'ti']);
  });
  it('counting simple: 1 / 2 &', () => {
    expect(labelPattern(simple, 'counting')).toEqual(['1', '2', '&']);
  });
  const sixteenths = p({ beats: 1, beatType: 4 }, [[0, 0.25, 's'], [0.25, 0.25, 's'], [0.5, 0.25, 's'], [0.75, 0.25, 's']]);
  it('takadimi sixteenths: ta ka di mi', () => {
    expect(labelPattern(sixteenths, 'takadimi')).toEqual(['ta', 'ka', 'di', 'mi']);
  });
  it('counting sixteenths: 1 e & a', () => {
    expect(labelPattern(sixteenths, 'counting')).toEqual(['1', 'e', '&', 'a']);
  });
  const compound = p({ beats: 6, beatType: 8 }, [[0, 1 / 3, 'e'], [1 / 3, 1 / 3, 'e'], [2 / 3, 1 / 3, 'e'], [1, 1, 'q.']]);
  it('takadimi compound: ta ki da / ta', () => {
    expect(labelPattern(compound, 'takadimi')).toEqual(['ta', 'ki', 'da', 'ta']);
  });
  it('counting compound: 1 la li / 2', () => {
    expect(labelPattern(compound, 'counting')).toEqual(['1', 'la', 'li', '2']);
  });
  it('rests label as empty string', () => {
    const withRest = p({ beats: 2, beatType: 4 }, [[0, 1, 'q'], [1, 1, 'q', true]]);
    expect(labelPattern(withRest, 'takadimi')).toEqual(['ta', '']);
  });
});
```

- [ ] **Step 2: Run to verify fail.**
- [ ] **Step 3: Implement**

```ts
// src/lib/rhythm/syllables.ts
import { isCompound } from './pattern';
import type { RhythmPattern } from './pattern';

export type SyllableSystem = 'takadimi' | 'kodaly' | 'counting';

// Onset syllable by fractional position within the pulse. Nearest-key lookup
// absorbs float error from compound thirds.
const SIMPLE: Record<SyllableSystem, Record<string, string>> = {
  takadimi: { '0': 'ta', '0.25': 'ka', '0.5': 'di', '0.75': 'mi' },
  kodaly:   { '0': 'ta', '0.25': 'ri', '0.5': 'ti', '0.75': 'ri' },
  counting: { '0': 'BEAT', '0.25': 'e', '0.5': '&', '0.75': 'a' },
};
const COMPOUND: Record<SyllableSystem, Record<string, string>> = {
  takadimi: { '0': 'ta', '0.333': 'ki', '0.667': 'da' },
  kodaly:   { '0': 'ta', '0.333': 'ti', '0.667': 'ti' },
  counting: { '0': 'BEAT', '0.333': 'la', '0.667': 'li' },
};

function nearest(table: Record<string, string>, frac: number): string {
  let best = '0'; let bestD = Infinity;
  for (const k of Object.keys(table)) {
    const d = Math.abs(Number(k) - frac);
    if (d < bestD) { bestD = d; best = k; }
  }
  return table[best];
}

export function labelPattern(pattern: RhythmPattern, system: SyllableSystem): string[] {
  const compound = isCompound(pattern.meter);
  const tables = compound ? COMPOUND : SIMPLE;
  return pattern.events.map((e) => {
    if (e.rest) return '';
    const pulseIdx = Math.floor(e.startPulse + 1e-6);
    const frac = e.startPulse - pulseIdx;
    // Kodály: a full-pulse-or-longer note is 'ta'; shorter on-pulse notes are 'ti'.
    if (system === 'kodaly' && frac < 1e-6) return e.durPulses >= 1 - 1e-6 ? 'ta' : 'ti';
    const syl = nearest(tables[system], frac);
    if (syl === 'BEAT') return String((pulseIdx % pattern.pulsesPerMeasure) + 1);
    return syl;
  });
}
```

- [ ] **Step 4: Run to verify pass.** Note the kodaly simple test expects `['ta','ti','ti']` — the eighths are on-pulse (frac 0, dur 0.5 → 'ti') and off-pulse (frac 0.5 → 'ti'). Verify; if the on-pulse quarter in `sixteenths`-style patterns mislabels, the special-case handles it.
- [ ] **Step 5: Commit** — `git commit -m "feat(rhythm): syllable labeler (takadimi/kodaly/counting)"`

---

### Task 4: Grader — `src/lib/rhythm/grade.ts`

**Files:**
- Create: `src/lib/rhythm/grade.ts`
- Test: `src/lib/rhythm/__tests__/grade.test.ts`

**Interfaces:**
- Consumes: `RhythmPattern` from Task 1.
- Produces:
```ts
export const PASS_THRESHOLD = 80;
export interface GradeOptions { secondsPerPulse: number; tolerancePct: number } // 0.10 practice / 0.06 assessment
export type Verdict = 'on_time' | 'early' | 'late' | 'missed';
export interface NoteVerdict { expectedSec: number; actualSec: number | null; deltaSec: number | null; verdict: Verdict }
export interface GradeResult { notes: NoteVerdict[]; extraOnsets: number[]; score: number; passed: boolean }
export function expectedOnsets(pattern: RhythmPattern, secondsPerPulse: number): number[]; // non-rest events → seconds
export function gradeOnsets(expected: number[], actual: number[], opts: GradeOptions): GradeResult;
```
Scoring: on_time 1pt, early/late 0.5pt, missed 0; each extra onset −0.25 (clamped ≥0); `score = round(100 × pts / max(1, expected.length))`; `passed = score >= PASS_THRESHOLD`.

- [ ] **Step 1: Failing test**

```ts
// src/lib/rhythm/__tests__/grade.test.ts
import { describe, it, expect } from 'vitest';
import { gradeOnsets, expectedOnsets, PASS_THRESHOLD } from '../grade';
import { generatePattern } from '../generate';

const opts = { secondsPerPulse: 0.6, tolerancePct: 0.10 }; // 100bpm → tol 60ms, window 120ms

describe('gradeOnsets', () => {
  it('perfect performance scores 100', () => {
    const exp = [0, 0.6, 1.2, 1.8];
    const r = gradeOnsets(exp, [0.01, 0.61, 1.19, 1.81], opts);
    expect(r.notes.map((n) => n.verdict)).toEqual(['on_time', 'on_time', 'on_time', 'on_time']);
    expect(r.score).toBe(100);
    expect(r.passed).toBe(true);
  });
  it('early/late within window score half; outside window = missed', () => {
    const r = gradeOnsets([0, 0.6], [0.09, 0.6 + 0.13], opts); // +90ms late (window 120) ; +130ms → missed
    expect(r.notes[0].verdict).toBe('late');
    expect(r.notes[1].verdict).toBe('missed');
    expect(r.score).toBe(25); // (0.5 + 0) / 2
  });
  it('extra onsets penalize 0.25 each', () => {
    const r = gradeOnsets([0, 0.6], [0.0, 0.6, 0.3], opts);
    expect(r.extraOnsets).toEqual([0.3]);
    expect(r.score).toBe(88); // (2 - 0.25)/2 = 0.875
  });
  it('each actual onset matches at most one expected note', () => {
    const r = gradeOnsets([0, 0.05], [0.0], { secondsPerPulse: 0.6, tolerancePct: 0.5 });
    const matched = r.notes.filter((n) => n.actualSec !== null);
    expect(matched).toHaveLength(1);
  });
  it('tolerance has a 30ms floor at fast tempos', () => {
    const fast = { secondsPerPulse: 0.2, tolerancePct: 0.06 }; // 6% = 12ms → floored to 30ms
    const r = gradeOnsets([0], [0.025], fast);
    expect(r.notes[0].verdict).toBe('on_time');
  });
  it('score never goes below 0 and empty expected is safe', () => {
    const r = gradeOnsets([], [0.1, 0.2, 0.3], opts);
    expect(r.score).toBe(0);
    expect(r.passed).toBe(false);
  });
  it('expectedOnsets skips rests and converts pulses to seconds', () => {
    const p = generatePattern(3, 7); // level with rests
    const exp = expectedOnsets(p, 0.5);
    expect(exp.length).toBe(p.events.filter((e) => !e.rest).length);
    const first = p.events.find((e) => !e.rest)!;
    expect(exp[0]).toBeCloseTo(first.startPulse * 0.5, 9);
  });
  it('PASS_THRESHOLD is 80', () => expect(PASS_THRESHOLD).toBe(80));
});
```

- [ ] **Step 2: Run to verify fail.**
- [ ] **Step 3: Implement**

```ts
// src/lib/rhythm/grade.ts
import type { RhythmPattern } from './pattern';

export const PASS_THRESHOLD = 80;
export const TOLERANCE_FLOOR_SEC = 0.03;
export interface GradeOptions { secondsPerPulse: number; tolerancePct: number }
export type Verdict = 'on_time' | 'early' | 'late' | 'missed';
export interface NoteVerdict { expectedSec: number; actualSec: number | null; deltaSec: number | null; verdict: Verdict }
export interface GradeResult { notes: NoteVerdict[]; extraOnsets: number[]; score: number; passed: boolean }

export function expectedOnsets(pattern: RhythmPattern, secondsPerPulse: number): number[] {
  return pattern.events.filter((e) => !e.rest).map((e) => e.startPulse * secondsPerPulse);
}

export function gradeOnsets(expected: number[], actual: number[], opts: GradeOptions): GradeResult {
  const tol = Math.max(opts.tolerancePct * opts.secondsPerPulse, TOLERANCE_FLOOR_SEC);
  const window = 2 * tol;
  const used = new Array(actual.length).fill(false);
  const notes: NoteVerdict[] = expected.map((exp) => {
    let bestIdx = -1; let bestD = Infinity;
    actual.forEach((a, i) => {
      if (used[i]) return;
      const d = Math.abs(a - exp);
      if (d <= window && d < bestD) { bestD = d; bestIdx = i; }
    });
    if (bestIdx === -1) return { expectedSec: exp, actualSec: null, deltaSec: null, verdict: 'missed' };
    used[bestIdx] = true;
    const delta = actual[bestIdx] - exp;
    const verdict: Verdict = Math.abs(delta) <= tol ? 'on_time' : delta < 0 ? 'early' : 'late';
    return { expectedSec: exp, actualSec: actual[bestIdx], deltaSec: delta, verdict };
  });
  const extraOnsets = actual.filter((_, i) => !used[i]);
  const pts = notes.reduce((s, n) => s + (n.verdict === 'on_time' ? 1 : n.verdict === 'missed' ? 0 : 0.5), 0)
    - 0.25 * extraOnsets.length;
  const score = Math.max(0, Math.round((100 * Math.max(0, pts)) / Math.max(1, expected.length)));
  const passed = expected.length > 0 && score >= PASS_THRESHOLD;
  return { notes, extraOnsets, score, passed };
}
```

- [ ] **Step 4: Run to verify pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat(rhythm): %-of-beat onset grader"`

---

### Task 5: Onset inputs — tap + mic — `src/lib/rhythm/onsets/`

**Files:**
- Create: `src/lib/rhythm/onsets/tap.ts`, `src/lib/rhythm/onsets/flux.ts`, `src/lib/rhythm/onsets/mic.ts`
- Test: `src/lib/rhythm/__tests__/flux.test.ts`

**Interfaces:**
- Produces (the shared contract — both sources fill a plain array):
```ts
// tap.ts
export interface TapSession { onsets: number[]; dispose(): void }
export function startTapSession(ctx: AudioContext, t0: number, el: HTMLElement): TapSession;
// flux.ts (pure, testable core)
export function frameEnergies(samples: Float32Array, frameSize: number, hop: number): number[];
export function fluxPeaks(energies: number[], opts: { refractoryFrames: number; floorAlpha: number; ratio: number }): number[]; // frame indices
// mic.ts (runtime wrapper)
export interface MicOnsetSession { onsets: number[]; level: () => number; dispose(): void }
export function startMicOnsetSession(ctx: AudioContext, stream: MediaStream, t0: number): MicOnsetSession;
```
- `t0` is the AudioContext time of exercise beat zero; sessions push onset seconds relative to `t0`.
- `mic.ts`: `MediaStreamAudioSourceNode` → `AnalyserNode` (fftSize 2048); a `setInterval` at ~12ms reads `getFloatTimeDomainData`, computes frame energy, keeps an EMA noise floor (`floorAlpha` 0.995), and registers an onset when energy > `ratio` (6×) × floor after being below it (rising edge), with an 80ms refractory. Timestamps use `ctx.currentTime` at read minus half the analyser window.
- `tap.ts`: `pointerdown` on the pad element + `keydown` (Space, `!e.repeat`) on window; both push `ctx.currentTime - t0`.

- [ ] **Step 1: Failing test (pure core only — the runtime wrappers are browser-only)**

```ts
// src/lib/rhythm/__tests__/flux.test.ts
import { describe, it, expect } from 'vitest';
import { frameEnergies, fluxPeaks } from '../onsets/flux';

function impulseTrain(sampleRate: number, seconds: number, onsetsSec: number[], noise = 0): Float32Array {
  const buf = new Float32Array(Math.round(sampleRate * seconds));
  for (let i = 0; i < buf.length; i++) buf[i] = (Math.sin(i * 12.9898) * 43758.5453 % 1) * noise;
  for (const t of onsetsSec) {
    const at = Math.round(t * sampleRate);
    for (let i = 0; i < 220; i++) if (at + i < buf.length) buf[at + i] += (1 - i / 220) * (i % 2 ? -0.9 : 0.9);
  }
  return buf;
}

describe('onset core', () => {
  const SR = 48000, FRAME = 512, HOP = 512;
  it('detects clean impulse train within one frame of truth', () => {
    const truth = [0.10, 0.55, 1.00, 1.45];
    const energies = frameEnergies(impulseTrain(SR, 2, truth), FRAME, HOP);
    const peaks = fluxPeaks(energies, { refractoryFrames: 8, floorAlpha: 0.99, ratio: 4 });
    expect(peaks).toHaveLength(4);
    peaks.forEach((f, i) => expect(Math.abs((f * HOP) / SR - truth[i])).toBeLessThan(0.015));
  });
  it('refractory suppresses double-triggers', () => {
    const energies = frameEnergies(impulseTrain(SR, 1, [0.3, 0.31]), FRAME, HOP);
    const peaks = fluxPeaks(energies, { refractoryFrames: 8, floorAlpha: 0.99, ratio: 4 });
    expect(peaks).toHaveLength(1);
  });
  it('survives noise floor', () => {
    const truth = [0.25, 0.75];
    const energies = frameEnergies(impulseTrain(SR, 1.2, truth, 0.02), FRAME, HOP);
    const peaks = fluxPeaks(energies, { refractoryFrames: 8, floorAlpha: 0.99, ratio: 4 });
    expect(peaks).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run to verify fail.**
- [ ] **Step 3: Implement `flux.ts`, `tap.ts`, `mic.ts`**

```ts
// src/lib/rhythm/onsets/flux.ts — pure onset-detection core.
export function frameEnergies(samples: Float32Array, frameSize: number, hop: number): number[] {
  const out: number[] = [];
  for (let start = 0; start + frameSize <= samples.length; start += hop) {
    let sum = 0;
    for (let i = 0; i < frameSize; i++) { const v = samples[start + i]; sum += v * v; }
    out.push(Math.sqrt(sum / frameSize));
  }
  return out;
}

// Rising-edge peaks over an adaptive floor. Returns frame indices.
export function fluxPeaks(energies: number[], opts: { refractoryFrames: number; floorAlpha: number; ratio: number }): number[] {
  const peaks: number[] = [];
  let floor = energies.length ? Math.max(energies[0], 1e-4) : 1e-4;
  let armed = true;
  let lastPeak = -Infinity;
  for (let i = 0; i < energies.length; i++) {
    const e = energies[i];
    const threshold = Math.max(floor * opts.ratio, 1e-3);
    if (armed && e > threshold && i - lastPeak >= opts.refractoryFrames) {
      peaks.push(i); lastPeak = i; armed = false;
    } else if (!armed && e < threshold * 0.5) {
      armed = true;
    }
    // Only adapt the floor on quiet frames so the clap itself doesn't raise it.
    if (e < threshold) floor = opts.floorAlpha * floor + (1 - opts.floorAlpha) * Math.max(e, 1e-4);
  }
  return peaks;
}
```

```ts
// src/lib/rhythm/onsets/tap.ts
export interface TapSession { onsets: number[]; dispose(): void }

export function startTapSession(ctx: AudioContext, t0: number, el: HTMLElement): TapSession {
  const onsets: number[] = [];
  const onPointer = (e: PointerEvent) => { e.preventDefault(); onsets.push(ctx.currentTime - t0); };
  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'Space' && !e.repeat) { e.preventDefault(); onsets.push(ctx.currentTime - t0); }
  };
  el.addEventListener('pointerdown', onPointer);
  window.addEventListener('keydown', onKey);
  return {
    onsets,
    dispose() { el.removeEventListener('pointerdown', onPointer); window.removeEventListener('keydown', onKey); },
  };
}
```

```ts
// src/lib/rhythm/onsets/mic.ts
import { frameEnergies, fluxPeaks } from './flux';

export interface MicOnsetSession { onsets: number[]; level: () => number; dispose(): void }

const FRAME = 512;

// Polls the analyser ~every 12ms; incremental version of the flux.ts logic so
// onsets appear in real time. Timestamps are relative to t0 on the ctx clock.
export function startMicOnsetSession(ctx: AudioContext, stream: MediaStream, t0: number): MicOnsetSession {
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  src.connect(analyser);
  const buf = new Float32Array(analyser.fftSize);
  const onsets: number[] = [];
  let floor = 1e-4; let armed = true; let lastOnsetAt = -Infinity; let lastLevel = 0;
  const RATIO = 6; const FLOOR_ALPHA = 0.995; const REFRACTORY_SEC = 0.08;
  const timer = window.setInterval(() => {
    analyser.getFloatTimeDomainData(buf);
    const now = ctx.currentTime;
    // Only the freshest frame matters for edge detection.
    const e = frameEnergies(buf.subarray(buf.length - FRAME), FRAME, FRAME)[0] ?? 0;
    lastLevel = e;
    const threshold = Math.max(floor * RATIO, 1e-3);
    if (armed && e > threshold && now - lastOnsetAt >= REFRACTORY_SEC) {
      onsets.push(now - t0 - FRAME / (2 * ctx.sampleRate));
      lastOnsetAt = now; armed = false;
    } else if (!armed && e < threshold * 0.5) {
      armed = true;
    }
    if (e < threshold) floor = FLOOR_ALPHA * floor + (1 - FLOOR_ALPHA) * Math.max(e, 1e-4);
  }, 12);
  return {
    onsets,
    level: () => lastLevel,
    dispose() { window.clearInterval(timer); src.disconnect(); },
  };
}
```

- [ ] **Step 4: Run to verify pass** (`fluxPeaks` re-arm hysteresis is what makes the 0.3/0.31 double-trigger case pass — verify).
- [ ] **Step 5: Commit** — `git commit -m "feat(rhythm): tap + mic-clap onset sources with pure detection core"`

---

### Task 6: Migration — `gw_reading_music_attempts` + override RPC + view

**Files:**
- Create: `supabase/migrations/20260802210000_reading_music_attempts.sql`

**Interfaces:**
- Produces: table `gw_reading_music_attempts` (exact schema in spec §3), RPC `override_reading_music_attempt(p_attempt_id uuid, p_new_score numeric)`, updated `reading_music_domain_summary` view with a rhythm branch.

- [ ] **Step 1: Write the migration**

```sql
-- Reading Music consolidated attempts (Phase 2). Mirrors gw_pitch_match_attempts'
-- RLS pattern. Rhythm writes here now; pitch/sight-singing migrate later.
CREATE TABLE IF NOT EXISTS gw_reading_music_attempts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL DEFAULT current_tenant_id() REFERENCES gw_tenants(id),
  user_id        uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  domain         text NOT NULL CHECK (domain IN ('pitch_intervals','rhythm','sight_singing','dictation','harmony','scales_theory')),
  drill          text NOT NULL,
  mode           text NOT NULL DEFAULT 'practice' CHECK (mode IN ('practice','assessment')),
  level          integer NOT NULL,
  score          numeric NOT NULL,
  passed         boolean NOT NULL DEFAULT false,
  payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
  override_score numeric,
  overridden_by  uuid REFERENCES auth.users(id),
  overridden_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_rm_attempts_user_idx ON gw_reading_music_attempts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS gw_rm_attempts_tenant_idx ON gw_reading_music_attempts (tenant_id, created_at DESC);

ALTER TABLE gw_reading_music_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gw_rm_attempts_tenant_iso ON gw_reading_music_attempts;
CREATE POLICY gw_rm_attempts_tenant_iso
  ON gw_reading_music_attempts AS RESTRICTIVE
  FOR ALL TO authenticated, anon
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS gw_rm_attempts_self_all ON gw_reading_music_attempts;
CREATE POLICY gw_rm_attempts_self_all
  ON gw_reading_music_attempts FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS gw_rm_attempts_teacher_read ON gw_reading_music_attempts;
CREATE POLICY gw_rm_attempts_teacher_read
  ON gw_reading_music_attempts FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM gw_profiles p
            WHERE p.user_id = auth.uid()
              AND (p.is_super_admin = true OR p.is_admin = true))
  );

DROP TRIGGER IF EXISTS trg_rm_attempts_tenant_default ON gw_reading_music_attempts;
CREATE TRIGGER trg_rm_attempts_tenant_default
  BEFORE INSERT ON gw_reading_music_attempts
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id_default();

-- Teacher override: SECURITY DEFINER RPC instead of a column-limited UPDATE
-- policy — simpler to audit, impossible to widen by accident.
CREATE OR REPLACE FUNCTION override_reading_music_attempt(p_attempt_id uuid, p_new_score numeric)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_tenant FROM gw_reading_music_attempts WHERE id = p_attempt_id;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'attempt not found'; END IF;
  IF v_tenant <> current_tenant_id() THEN RAISE EXCEPTION 'attempt not in current tenant'; END IF;
  IF NOT EXISTS (SELECT 1 FROM gw_profiles p WHERE p.user_id = auth.uid()
                 AND (p.is_super_admin = true OR p.is_admin = true)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_new_score < 0 OR p_new_score > 100 THEN RAISE EXCEPTION 'score out of range'; END IF;
  UPDATE gw_reading_music_attempts
     SET override_score = p_new_score, overridden_by = auth.uid(), overridden_at = now()
   WHERE id = p_attempt_id;
END $$;
REVOKE ALL ON FUNCTION override_reading_music_attempt(uuid, numeric) FROM public;
GRANT EXECUTE ON FUNCTION override_reading_music_attempt(uuid, numeric) TO authenticated;

-- Domain summary: add the rhythm branch. Effective score honors overrides.
CREATE OR REPLACE VIEW reading_music_domain_summary AS
WITH pitch AS (
  SELECT user_id, 'pitch_intervals'::text AS domain,
         COUNT(*)::int AS attempts,
         SUM(CASE WHEN matched THEN 1 ELSE 0 END)::int AS matched,
         MAX(created_at) AS last_activity_at
  FROM gw_pitch_match_attempts GROUP BY user_id
), rm AS (
  SELECT user_id, domain,
         COUNT(*)::int AS attempts,
         SUM(CASE WHEN COALESCE(override_score, score) >= 80 THEN 1 ELSE 0 END)::int AS matched,
         MAX(created_at) AS last_activity_at
  FROM gw_reading_music_attempts GROUP BY user_id, domain
)
SELECT user_id, domain, attempts, matched,
       CASE WHEN attempts = 0 THEN 0
            ELSE ROUND((matched::numeric / attempts::numeric) * 100)::int END AS accuracy_pct,
       last_activity_at
FROM (SELECT * FROM pitch UNION ALL SELECT * FROM rm) u;

GRANT SELECT ON reading_music_domain_summary TO authenticated;
```

- [ ] **Step 2: Sanity check** — `grep -c "CREATE POLICY" supabase/migrations/20260802210000_reading_music_attempts.sql` → 3; confirm view still selects the same column list (api.ts depends on `user_id, domain, attempts, matched, accuracy_pct, last_activity_at`).
- [ ] **Step 3: Commit** — `git commit -m "feat(rhythm): gw_reading_music_attempts + override RPC + summary view rhythm branch"`
- Note: applying to prod is Kevin's step (harness blocks prod DB writes) — flagged at deploy time.

---

### Task 7: Attempts client API — `src/lib/readingMusic/attemptsApi.ts`

**Files:**
- Create: `src/lib/readingMusic/attemptsApi.ts`
- Test: `src/lib/readingMusic/__tests__/attemptsApi.test.ts`

**Interfaces:**
- Produces:
```ts
export interface RhythmAttemptPayload {
  bpm: number; input: 'tap' | 'mic'; syllables: string; tolerancePct: number;
  expected: number[]; actual: number[]; verdicts: string[]; meter: { beats: number; beatType: number };
  seed: number; no_input?: boolean;
}
export interface AttemptInsert { domain: string; drill: string; mode: 'practice' | 'assessment'; level: number; score: number; passed: boolean; payload: RhythmAttemptPayload }
export async function insertAttempt(a: AttemptInsert): Promise<boolean>;                 // toast + false on error/no-row
export interface AssessmentRow { id: string; user_id: string; drill: string; level: number; score: number; override_score: number | null; payload: RhythmAttemptPayload; created_at: string }
export async function listAssessmentAttempts(limit?: number): Promise<AssessmentRow[]>;  // teacher view
export async function overrideAttempt(id: string, newScore: number): Promise<boolean>;   // RPC
```

- [ ] **Step 1: Failing test** (mock the supabase client module the way `src/lib/readingMusic/__tests__/api.test.ts` does — read that file first and copy its mock idiom):

```ts
// src/lib/readingMusic/__tests__/attemptsApi.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const insertMock = vi.fn();
const rpcMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({ insert: insertMock })),
    rpc: rpcMock,
  },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { insertAttempt, overrideAttempt } from '../attemptsApi';

const attempt = { domain: 'rhythm', drill: 'echo', mode: 'practice' as const, level: 2, score: 90, passed: true,
  payload: { bpm: 84, input: 'tap' as const, syllables: 'takadimi', tolerancePct: 0.1, expected: [0], actual: [0.01], verdicts: ['on_time'], meter: { beats: 4, beatType: 4 }, seed: 1 } };

beforeEach(() => { insertMock.mockReset(); rpcMock.mockReset(); });

describe('attemptsApi', () => {
  it('insertAttempt returns true only when a row comes back (silent-fail gotcha)', async () => {
    insertMock.mockReturnValue({ select: () => ({ single: () => Promise.resolve({ data: { id: 'x' }, error: null }) }) });
    expect(await insertAttempt(attempt)).toBe(true);
    insertMock.mockReturnValue({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) });
    expect(await insertAttempt(attempt)).toBe(false);
    insertMock.mockReturnValue({ select: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'rls' } }) }) });
    expect(await insertAttempt(attempt)).toBe(false);
  });
  it('overrideAttempt calls the RPC with named args', async () => {
    rpcMock.mockResolvedValue({ error: null });
    expect(await overrideAttempt('abc', 95)).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith('override_reading_music_attempt', { p_attempt_id: 'abc', p_new_score: 95 });
    rpcMock.mockResolvedValue({ error: { message: 'not authorized' } });
    expect(await overrideAttempt('abc', 95)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify fail.**
- [ ] **Step 3: Implement**

```ts
// src/lib/readingMusic/attemptsApi.ts
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RhythmAttemptPayload {
  bpm: number; input: 'tap' | 'mic'; syllables: string; tolerancePct: number;
  expected: number[]; actual: number[]; verdicts: string[]; meter: { beats: number; beatType: number };
  seed: number; no_input?: boolean;
}
export interface AttemptInsert {
  domain: string; drill: string; mode: 'practice' | 'assessment';
  level: number; score: number; passed: boolean; payload: RhythmAttemptPayload;
}
export interface AssessmentRow {
  id: string; user_id: string; drill: string; level: number; score: number;
  override_score: number | null; payload: RhythmAttemptPayload; created_at: string;
}

export async function insertAttempt(a: AttemptInsert): Promise<boolean> {
  const { data, error } = await supabase
    .from('gw_reading_music_attempts')
    .insert(a as never)
    .select()
    .single();
  if (error || !data) {
    toast.error('Attempt not saved', { description: error?.message ?? 'No row returned — are you on a demo tenant?' });
    return false;
  }
  return true;
}

export async function listAssessmentAttempts(limit = 50): Promise<AssessmentRow[]> {
  const { data, error } = await supabase
    .from('gw_reading_music_attempts')
    .select('id, user_id, drill, level, score, override_score, payload, created_at')
    .eq('mode', 'assessment')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { toast.error('Could not load attempts', { description: error.message }); return []; }
  return (data ?? []) as AssessmentRow[];
}

export async function overrideAttempt(id: string, newScore: number): Promise<boolean> {
  const { error } = await supabase.rpc('override_reading_music_attempt', { p_attempt_id: id, p_new_score: newScore });
  if (error) { toast.error('Override failed', { description: error.message }); return false; }
  toast.success('Score updated');
  return true;
}
```

If `supabase.from('gw_reading_music_attempts')` fails typecheck (generated types don't know the new table yet), follow the repo's existing convention for pre-regen tables (check how `gw_pitch_match_attempts` calls were typed in the PR that added them — same trick, likely `as never` on the builder or an interim type patch). Do NOT regen types against prod.

- [ ] **Step 4: Run to verify pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat(rhythm): attempts client API with silent-fail guard"`

---

### Task 8: RhythmStrip renderer — `src/pages/readingMusic/RhythmStrip.tsx`

**Files:**
- Create: `src/pages/readingMusic/RhythmStrip.tsx`
- Test: `src/pages/readingMusic/__tests__/RhythmStrip.test.tsx`

**Interfaces:**
- Consumes: `RhythmPattern`, `labelPattern`, `SyllableSystem`.
- Produces: `export function RhythmStrip({ pattern, system, highlight }: { pattern: RhythmPattern; system: SyllableSystem; highlight?: Array<'on_time' | 'early' | 'late' | 'missed' | null> })` — responsive SVG, single horizontal line; per event: notehead (filled ≤ quarter, hollow for half+; stem up; flag/beam for sub-pulse values; dot for dotted), rest glyphs as text (`𝄻 𝄼 𝄽 𝄾`), barlines every `pulsesPerMeasure`, syllable text under each note (≥12px), optional verdict coloring (emerald/amber/amber/red-400) when `highlight` provided.

- [ ] **Step 1: Failing test**

```tsx
// src/pages/readingMusic/__tests__/RhythmStrip.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { RhythmStrip } from '../RhythmStrip';
import { generatePattern } from '@/lib/rhythm/generate';

describe('RhythmStrip', () => {
  const pattern = generatePattern(3, 11); // level with rests
  it('renders one glyph per event and syllables for non-rests', () => {
    const { container } = render(<RhythmStrip pattern={pattern} system="takadimi" />);
    const notes = container.querySelectorAll('[data-role="note"]');
    const rests = container.querySelectorAll('[data-role="rest"]');
    expect(notes.length + rests.length).toBe(pattern.events.length);
    expect(rests.length).toBe(pattern.events.filter((e) => e.rest).length);
    const syllables = container.querySelectorAll('[data-role="syllable"]');
    expect(syllables.length).toBe(pattern.events.filter((e) => !e.rest).length);
  });
  it('renders barlines between measures', () => {
    const { container } = render(<RhythmStrip pattern={pattern} system="counting" />);
    expect(container.querySelectorAll('[data-role="barline"]').length).toBe(pattern.measures + 1);
  });
  it('applies verdict coloring when highlight provided', () => {
    const highlight = pattern.events.map((e) => (e.rest ? null : 'missed' as const));
    const { container } = render(<RhythmStrip pattern={pattern} system="takadimi" highlight={highlight} />);
    expect(container.querySelectorAll('[data-verdict="missed"]').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to verify fail.**
- [ ] **Step 3: Implement** — key layout math (complete component; ~120 lines):

```tsx
// src/pages/readingMusic/RhythmStrip.tsx
import { labelPattern } from '@/lib/rhythm/syllables';
import type { SyllableSystem } from '@/lib/rhythm/syllables';
import type { RhythmPattern, RhythmEvent } from '@/lib/rhythm/pattern';

const VERDICT_COLOR: Record<string, string> = {
  on_time: '#059669', early: '#d97706', late: '#d97706', missed: '#ef4444',
};
const REST_GLYPH: Record<string, string> = { w: '𝄻', h: '𝄼', 'h.': '𝄼.', q: '𝄽', 'q.': '𝄽.', e: '𝄾', 'e.': '𝄾.', s: '𝄿' };

interface Props {
  pattern: RhythmPattern;
  system: SyllableSystem;
  highlight?: Array<'on_time' | 'early' | 'late' | 'missed' | null>;
}

export function RhythmStrip({ pattern, system, highlight }: Props) {
  const PX_PER_PULSE = 72;
  const PAD = 24;
  const LINE_Y = 56;
  const width = PAD * 2 + pattern.totalPulses * PX_PER_PULSE;
  const syllables = labelPattern(pattern, system);
  const x = (pulse: number) => PAD + pulse * PX_PER_PULSE;
  const isBeamed = (e: RhythmEvent) => !e.rest && (e.value === 'e' || e.value === 's');

  // Beam groups: consecutive beamable notes within the same pulse.
  const groups: number[][] = [];
  let current: number[] = [];
  pattern.events.forEach((e, i) => {
    const pulseOf = (idx: number) => Math.floor(pattern.events[idx].startPulse + 1e-6);
    if (isBeamed(e) && current.length > 0 && pulseOf(current[0]) === Math.floor(e.startPulse + 1e-6)) {
      current.push(i);
    } else {
      if (current.length > 1) groups.push(current);
      current = isBeamed(e) ? [i] : [];
    }
  });
  if (current.length > 1) groups.push(current);
  const inBeam = new Set(groups.flat());

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={96} viewBox={`0 0 ${width} 96`} role="img" aria-label="rhythm notation">
        <line x1={PAD - 8} y1={LINE_Y} x2={width - PAD + 8} y2={LINE_Y} stroke="#94a3b8" strokeWidth={1} />
        {Array.from({ length: pattern.measures + 1 }, (_, m) => (
          <line key={m} data-role="barline" x1={x(m * pattern.pulsesPerMeasure)} y1={LINE_Y - 18}
                x2={x(m * pattern.pulsesPerMeasure)} y2={LINE_Y + 18} stroke="#475569" strokeWidth={m === pattern.measures ? 2.5 : 1.5} />
        ))}
        {pattern.events.map((e, i) => {
          const cx = x(e.startPulse) + 10;
          const color = highlight?.[i] ? VERDICT_COLOR[highlight[i]!] : '#0f172a';
          if (e.rest) {
            return <text key={i} data-role="rest" x={cx} y={LINE_Y + 7} fontSize={26} fill="#64748b" textAnchor="middle">{REST_GLYPH[e.value]}</text>;
          }
          const hollow = e.value === 'h' || e.value === 'h.' || e.value === 'w';
          const dotted = e.value.endsWith('.');
          const flagged = (e.value === 'e' || e.value === 'e.' || e.value === 's') && !inBeam.has(i);
          return (
            <g key={i} data-role="note" data-verdict={highlight?.[i] ?? undefined}>
              <ellipse cx={cx} cy={LINE_Y} rx={7} ry={5.5} fill={hollow ? 'white' : color} stroke={color} strokeWidth={1.8}
                       transform={`rotate(-20 ${cx} ${LINE_Y})`} />
              {dotted && <circle cx={cx + 12} cy={LINE_Y - 3} r={2} fill={color} />}
              {e.value !== 'w' && <line x1={cx + 6.5} y1={LINE_Y - 2} x2={cx + 6.5} y2={LINE_Y - 34} stroke={color} strokeWidth={1.8} />}
              {flagged && <path d={`M ${cx + 6.5} ${LINE_Y - 34} q 10 4 8 16`} stroke={color} strokeWidth={1.8} fill="none" />}
              {e.value === 's' && !inBeam.has(i) && <path d={`M ${cx + 6.5} ${LINE_Y - 27} q 10 4 8 16`} stroke={color} strokeWidth={1.8} fill="none" />}
              <text data-role="syllable" x={cx} y={LINE_Y + 28} fontSize={12} fill="#334155" textAnchor="middle">{syllables[i]}</text>
            </g>
          );
        })}
        {groups.map((g, gi) => {
          const x1 = x(pattern.events[g[0]].startPulse) + 16.5;
          const x2 = x(pattern.events[g[g.length - 1]].startPulse) + 16.5;
          const sixteenth = g.some((i) => pattern.events[i].value === 's');
          return (
            <g key={`beam-${gi}`}>
              <rect x={x1 - 10} y={LINE_Y - 36} width={x2 - x1} height={4} fill="#0f172a" />
              {sixteenth && <rect x={x1 - 10} y={LINE_Y - 29} width={x2 - x1} height={4} fill="#0f172a" />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat(rhythm): RhythmStrip single-line notation renderer"`

---

### Task 9: RhythmTab UI + wiring

**Files:**
- Create: `src/pages/readingMusic/RhythmTab.tsx`, `src/pages/readingMusic/RhythmResults.tsx`
- Modify: `src/lib/readingMusic/domains.ts` (rhythm → `status: 'live'`, blurb "Clap-back, read-and-clap, steady beat — with Takadimi, Kodály, or counting."), `src/pages/dashboard/ReadingMusicPage.tsx` (replace rhythm `PlaceholderTab` with `<RhythmTab />`)
- Test: `src/pages/readingMusic/__tests__/RhythmTab.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–5, 7, 8; `clickSchedule`/`playClicks` from `src/lib/sightReading/metronome.ts`.
- Produces: `export function RhythmTab()` — self-contained (no props).

**Component structure (implement in full):**
- State: `drill: 'steady_beat' | 'echo' | 'read_clap'` (default per level: 1–2 steady_beat allowed; echo/read_clap from level 2), `level` (persisted `localStorage['rm_rhythm_level']`), `input: 'tap' | 'mic'` (`rm_rhythm_input`), `system: SyllableSystem` (`rm_rhythm_syllables`), `bpm` (level default, stepper 40–180 ±5), `assessment: boolean`, `phase: 'idle' | 'demo' | 'countin' | 'take' | 'result'`, `pattern`, `seed`, `result: GradeResult | null`, `stars: Record<number, number>` (`rm_rhythm_stars`, JSON).
- **Start flow (single button, gesture-safe):** on click → `getAudioCtx()` (module-level singleton created here, `resume()` if suspended) → if `input==='mic'`: `getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })`; on rejection toast "Mic unavailable — switched to tap input" and set input to tap → generate pattern (`seed = Math.floor(Math.random() * 1e9)`, steady_beat forces level-1 catalog but `measures: 4`) → phase sequence.
- **Echo:** `phase='demo'` — play pattern via `playPatternClicks(ctx, pattern, spb, startAt)` (local helper: one 1400Hz/60ms sine burst per non-rest onset, gain 0.25 — reuse the `playClicks` envelope idiom) → then count-in.
- **Count-in + take:** `t0 = ctx.currentTime + demoDur + countInDur`; schedule `clickSchedule({ bpm, countInBeats: pattern.pulsesPerMeasure, exerciseBeats: pattern.totalPulses, meterBeats: pattern.pulsesPerMeasure })` via `playClicks` offset to start after demo; start onset session (`startTapSession(ctx, t0, padRef.current)` or `startMicOnsetSession(ctx, stream, t0)` — for mic, start capture at `t0` minus one tolerance window, i.e. only begin the interval timer then, so the demo/count-in clicks are never captured); `setTimeout` until `t0 + totalDur + 0.35s` → stop session → grade.
- **Grade & persist:** `gradeOnsets(expectedOnsets(pattern, spb), session.onsets, { secondsPerPulse: spb, tolerancePct: assessment ? 0.06 : 0.10 })`; steady_beat expected = every pulse. Persist via `insertAttempt` (always, both modes; `payload.no_input = session.onsets.length === 0`). Stars for practice: best-kept per level (3★ ≥95, 2★ ≥88, 1★ ≥80). Confetti burst on 3★ or new level pass (copy `ConfettiBurst` from PitchMatchTab).
- **Assessment gating:** "Take assessment" button disabled until `stars[level] >= 1`; when assessment result lands, banner "Recorded — visible to your teacher".
- **Cleanup:** unmount + `visibilitychange`(hidden) → cancel timers, dispose session, stop stream tracks, no insert for a cancelled take.
- **Results (`RhythmResults.tsx`):** props `{ pattern, system, result, bpm }` → `RhythmStrip` with `highlight` mapped from verdicts (rests → null), timeline strip (absolute-positioned ticks: slate = expected, colored dots = actual), score badge, verdict counts, Retry + Next Level buttons.
- **Level select:** horizontal journey chips 1–8 with star counts (PitchMatchTab journey HUD idiom), locked chip when `stars[level-1] < 1` (level 1 always open).
- **Mic UX:** live level meter bar (from `session.level()` polled with rAF during take), hint text "Clap crisply near the mic".

- [ ] **Step 1: Failing smoke test**

```tsx
// src/pages/readingMusic/__tests__/RhythmTab.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
vi.mock('@/lib/readingMusic/attemptsApi', () => ({ insertAttempt: vi.fn().mockResolvedValue(true) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
import { RhythmTab } from '../RhythmTab';

describe('RhythmTab', () => {
  it('renders drills, input + syllable toggles, and start button', () => {
    render(<RhythmTab />);
    expect(screen.getByRole('button', { name: /steady beat/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /echo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /read & clap/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/input/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/syllables/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });
  it('shows the level journey with level 1 unlocked', () => {
    render(<RhythmTab />);
    expect(screen.getByRole('button', { name: /level 1/i })).toBeEnabled();
  });
});
```

- [ ] **Step 2: Run to verify fail.**
- [ ] **Step 3: Implement `RhythmTab.tsx` + `RhythmResults.tsx` per the structure above.** Follow PitchMatchTab conventions exactly: ref-mirrors for values read inside timers, `stopEverything()` callback, unmount cleanup effect, sonner toasts, Tailwind light-theme classes (white cards, `text-slate-*`), all interactive text ≥ `text-sm`, icons ≥ `w-4 h-4`.
- [ ] **Step 4: Wire into page** — in `ReadingMusicPage.tsx` replace the rhythm `TabsContent` placeholder with `<RhythmTab />`; flip `domains.ts` rhythm to `live`. Confirm `VALID_TABS` already contains `rhythm` (it derives from `DOMAINS` — it does).
- [ ] **Step 5: Run tests + typecheck + build** — `npx vitest run src/pages/readingMusic src/lib/rhythm && npx tsc --noEmit -p tsconfig.app.json && npm run build` (use the repo's real typecheck script if different — check `package.json`).
- [ ] **Step 6: Commit** — `git commit -m "feat(rhythm): RhythmTab — steady beat / echo / read & clap drills, tap+mic input, practice+assessment"`

---

### Task 10: Class tab assessment list + override

**Files:**
- Create: `src/pages/readingMusic/ClassAssessments.tsx`
- Modify: `src/pages/dashboard/ReadingMusicPage.tsx` (render inside the admin-only `class` TabsContent, replacing the placeholder copy)
- Test: `src/pages/readingMusic/__tests__/ClassAssessments.test.tsx`

**Interfaces:**
- Consumes: `listAssessmentAttempts`, `overrideAttempt` from Task 7.
- Produces: `export function ClassAssessments()` — table (student, drill, level, score with strikethrough original when overridden, date, Override button → inline number input 0–100 + confirm → `overrideAttempt` → refresh). Student display name: fetch `gw_profiles` name fields for the listed user_ids in one `.in()` query (check the exact column names in an existing roster component before writing the select — follow that component's pattern).

- [ ] **Step 1: Failing test**

```tsx
// src/pages/readingMusic/__tests__/ClassAssessments.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
const rows = [{ id: 'a1', user_id: 'u1', drill: 'echo', level: 3, score: 62, override_score: null,
  payload: { bpm: 84, input: 'tap', syllables: 'takadimi', tolerancePct: 0.06, expected: [0], actual: [], verdicts: ['missed'], meter: { beats: 4, beatType: 4 }, seed: 1 }, created_at: '2026-08-02T12:00:00Z' }];
vi.mock('@/lib/readingMusic/attemptsApi', () => ({
  listAssessmentAttempts: vi.fn().mockResolvedValue(rows),
  overrideAttempt: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => ({ select: () => ({ in: () => Promise.resolve({ data: [], error: null }) }) })) },
}));
import { ClassAssessments } from '../ClassAssessments';

describe('ClassAssessments', () => {
  it('lists assessment attempts with an override control', async () => {
    render(<ClassAssessments />);
    await waitFor(() => expect(screen.getByText(/echo/i)).toBeInTheDocument());
    expect(screen.getByText('62')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /override/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify fail.**
- [ ] **Step 3: Implement + wire into the Class tab.**
- [ ] **Step 4: Run tests to verify pass.**
- [ ] **Step 5: Commit** — `git commit -m "feat(rhythm): Class tab assessment attempts list with one-click override"`

---

### Task 11: Full verification + PR

- [ ] **Step 1:** `npx vitest run` (whole suite). Two pre-existing failures on main are known (SightReadingStudio nav control, NoteEditor armed accidental) — anything else must be fixed.
- [ ] **Step 2:** `npx tsc --noEmit` per repo script + `npm run build` — clean.
- [ ] **Step 3:** Manual spot-check in dev server: Read & Clap level 3 with tap input end-to-end (start → count-in → tap → results); syllable toggle changes labels under notes; `?tab=rhythm` deep link.
- [ ] **Step 4:** Push branch, open PR titled "Reading Music Phase 2: Rhythm Machine — drills, assessment mode, consolidated attempts" with the spec linked, migration called out for manual apply (Kevin, via `!`), and the standard PR footer.
