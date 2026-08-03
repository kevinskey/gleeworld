# Clap Blast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Clap Blast" — a scrolling-staff clap-timing arcade drill — as the fourth drill in the Reading Music Rhythm tab, per `docs/superpowers/specs/2026-08-03-clap-blast-design.md`.

**Architecture:** A pure engine (`src/lib/rhythm/clapBlast.ts`) does live per-note hit grading and calibration math; a stage component (`src/pages/readingMusic/ClapBlastStage.tsx`) renders the scrolling staff off the AudioContext clock; a calibration component measures device latency; `RhythmTab.tsx` wires it all into the existing drill/level/star/attempt machinery.

**Tech Stack:** React 18 + TypeScript, Web Audio (raw AudioContext, no Tone), SVG, Vitest (+ jsdom/@testing-library for components), existing `src/lib/rhythm/*` modules. **No new dependencies. No DB migrations.**

## Global Constraints

- Work in worktree `~/Documents/GitHub/gleeworld-wt-clap`, branch `feat/clap-blast`. All paths below are relative to that root.
- Timing tolerances are **percentages of the beat, never absolute ms**: reuse `PRACTICE_TOLERANCE_PCT` (0.10), `ASSESSMENT_TOLERANCE_PCT` (0.06), `TOLERANCE_FLOOR_SEC` (0.03) from `src/lib/rhythm/grade.ts`. Perfect = within `tol`; Good = within `2*tol`; else Miss.
- **Stray claps carry NO score penalty** (locked spec decision — deliberately different from `gradeOnsets`' −0.25 extras rule). They are still recorded in the payload as `extraOnsets`-derived values.
- Mic capture always uses `{ echoCancellation: false, noiseSuppression: false, autoGainControl: false }`.
- Under-take metronome click gains stay quiet: 0.08 accent / 0.05 other (count-in 0.4/0.3) — the existing `scheduleCountInAndClicks` in `RhythmTab.tsx` already does this; do not change it.
- All game timing derives from `ctx.currentTime` relative to `t0` (beat zero). Never `performance.now()` or `Date.now()` for gameplay.
- localStorage keys use the `rm_` prefix; the calibration key is `rm_clap_latency_ms` (integer ms as string).
- Styling follows the existing Rhythm tab's hardcoded `slate-*`/`emerald-*` Tailwind + literal hex SVG convention (matches `RhythmStrip`/`RhythmTab`, its direct siblings).
- Attempts persist via `insertAttempt({ domain: 'rhythm', drill: 'clap_blast', ... })` — `drill` is free text, `payload` is jsonb, zero migration.
- Commands: single test file `npx vitest run <path>`; full suite `npm run test`; lint `npm run lint`; typecheck `npm run typecheck:guard`. Run vitest from the worktree root (beware `.claude/worktrees` pollution — never run vitest from elsewhere).
- Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/rhythm/clapBlast.ts` (create) | Pure engine: live hit-window state machine (`createClapBlastRound`) + calibration median math (`calibrationOffsetSec`). No DOM, no audio. |
| `src/lib/rhythm/__tests__/clapBlast.test.ts` (create) | Engine unit tests. |
| `src/pages/readingMusic/audioCtx.ts` (create) | The `getAudioCtx()` singleton, lifted out of `RhythmTab.tsx` so the calibration component can share it. |
| `src/pages/readingMusic/ClapBlastStage.tsx` (create) | Scrolling staff, hit line, explosions, score/streak HUD. Owns the rAF loop; calls `round.tick()` each frame. |
| `src/pages/readingMusic/ClapCalibration.tsx` (create) | "Clap along with 8 clicks" latency measurement panel. |
| `src/pages/readingMusic/__tests__/ClapBlastStage.test.tsx` (create) | jsdom render smoke tests. |
| `src/pages/readingMusic/RhythmTab.tsx` (modify) | Add `clap_blast` drill, calibration gate + recalibrate button, stage rendering, engine-based finish path. |
| `src/lib/readingMusic/attemptsApi.ts` (modify) | Add optional `latency_ms` to `RhythmAttemptPayload`. |
| `src/pages/readingMusic/__tests__/RhythmTab.test.tsx` (modify) | Assert new drill chip renders. |

Interfaces already in the codebase that this plan consumes (do not redefine them):

- `generatePattern(levelId, seed, meterIndex?) → RhythmPattern` — `src/lib/rhythm/generate.ts`
- `expectedOnsets(pattern, secondsPerPulse) → number[]`, `GradeResult`, `NoteVerdict`, `Verdict`, `PASS_THRESHOLD`, tolerance constants — `src/lib/rhythm/grade.ts`
- `startMicOnsetSession(ctx, stream, t0) → MicOnsetSession` (`.onsets` is a **live-mutating** `number[]`, `.level()`, `.dispose()`) — `src/lib/rhythm/onsets/mic.ts`
- `startTapSession(ctx, t0, el) → TapSession` (same `.onsets` shape) — `src/lib/rhythm/onsets/tap.ts`
- `insertAttempt(a: AttemptInsert) → Promise<boolean>` — `src/lib/readingMusic/attemptsApi.ts`
- `RhythmResults` props: `{ pattern, system, result: GradeResult, bpm, assessment, onRetry, onNextLevel }` — `src/pages/readingMusic/RhythmResults.tsx`

---

### Task 1: Engine — `createClapBlastRound`

**Files:**
- Create: `src/lib/rhythm/clapBlast.ts`
- Test: `src/lib/rhythm/__tests__/clapBlast.test.ts`

**Interfaces:**
- Consumes: `TOLERANCE_FLOOR_SEC`, `PASS_THRESHOLD`, types `GradeResult`/`NoteVerdict`/`Verdict` from `./grade`.
- Produces (later tasks rely on these exact names):
  - `type NoteState = 'pending' | 'perfect' | 'good' | 'missed'`
  - `interface ClapBlastEvent { kind: 'hit' | 'miss' | 'stray'; noteIndex: number | null; grade?: 'perfect' | 'good'; deltaSec?: number }`
  - `interface ClapBlastRound { noteStates(): NoteState[]; streak(): number; bestStreak(): number; score(): number; strayCount(): number; tick(nowSec: number, onsets: readonly number[]): ClapBlastEvent[]; isFinished(): boolean; toGradeResult(): GradeResult }`
  - `createClapBlastRound(opts: { expected: number[]; secondsPerPulse: number; tolerancePct: number; latencySec?: number }): ClapBlastRound`

Semantics to encode (mirrors spec):
- `tol = max(tolerancePct * secondsPerPulse, TOLERANCE_FLOOR_SEC)`, `window = 2 * tol`.
- Grading runs in "mic time": expected times are shifted by `+latencySec` at construction. Reported `expectedSec`/`actualSec`/stray times are converted **back to musical time** (subtract `latencySec`) so payloads and the results screen are device-independent.
- `tick(nowSec, onsets)` consumes only onsets it hasn't seen (cursor into the live-mutating array — the array is append-only, never reset). Each new onset claims the nearest `pending` note within `window` (perfect/good by `tol`), else it's a stray. Then any `pending` note whose window has closed (`nowSec > shiftedExpected + window`) becomes `missed`.
- Streak: any hit increments, a miss resets to 0, strays don't reset.
- `score()` = `round(100 * (perfect·1 + good·0.5) / totalNotes)` — monotonically non-decreasing during play, **no stray penalty**.
- `toGradeResult()` maps perfect→`on_time`, good→`early`/`late` by delta sign, missed (and defensively any still-pending)→`missed`; `passed = notes.length > 0 && score >= PASS_THRESHOLD`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/rhythm/__tests__/clapBlast.test.ts
import { describe, it, expect } from 'vitest';
import { createClapBlastRound } from '../clapBlast';

// 100 bpm quarters → spp 0.6, tol 60ms, window 120ms
const mk = (over: Partial<Parameters<typeof createClapBlastRound>[0]> = {}) =>
  createClapBlastRound({ expected: [0, 0.6, 1.2, 1.8], secondsPerPulse: 0.6, tolerancePct: 0.10, ...over });

describe('createClapBlastRound', () => {
  it('perfect clap explodes the note and raises score/streak', () => {
    const r = mk();
    const ev = r.tick(0.05, [0.01]);
    expect(ev).toEqual([{ kind: 'hit', noteIndex: 0, grade: 'perfect', deltaSec: expect.closeTo(0.01, 5) }]);
    expect(r.noteStates()[0]).toBe('perfect');
    expect(r.streak()).toBe(1);
    expect(r.score()).toBe(25); // 1/4 notes
  });

  it('clap inside 2×tol but outside tol grades good', () => {
    const r = mk();
    const ev = r.tick(0.2, [0.09]); // +90ms, tol 60 / window 120
    expect(ev[0]).toMatchObject({ kind: 'hit', noteIndex: 0, grade: 'good' });
    expect(r.score()).toBe(13); // round(100*0.5/4)
  });

  it('a note whose window passes un-clapped emits miss and resets streak', () => {
    const r = mk();
    r.tick(0.05, [0.0]); // hit note 0 → streak 1
    const ev = r.tick(0.6 + 0.121, []); // past note 1's window
    expect(ev).toEqual([{ kind: 'miss', noteIndex: 1 }]);
    expect(r.noteStates()[1]).toBe('missed');
    expect(r.streak()).toBe(0);
    expect(r.bestStreak()).toBe(1);
  });

  it('stray claps emit stray, count, but never change the score', () => {
    const r = mk();
    r.tick(0.05, [0.0]);
    const before = r.score();
    const ev = r.tick(0.31, [0.0, 0.3]); // 0.3 is 300ms from notes 0(claimed) and 1 → stray
    expect(ev).toEqual([{ kind: 'stray', noteIndex: null }]);
    expect(r.strayCount()).toBe(1);
    expect(r.score()).toBe(before);
    expect(r.streak()).toBe(1); // strays don't reset streak
  });

  it('only consumes NEW onsets across ticks (live-mutating array)', () => {
    const r = mk();
    const onsets: number[] = [0.0];
    r.tick(0.05, onsets);
    onsets.push(0.61);
    const ev = r.tick(0.7, onsets);
    expect(ev).toEqual([{ kind: 'hit', noteIndex: 1, grade: 'perfect', deltaSec: expect.closeTo(0.01, 5) }]);
  });

  it('latencySec shifts grading but reports musical-time values', () => {
    const r = mk({ latencySec: 0.15 });
    // clap arrives 150ms "late" on the mic clock but is musically perfect
    const ev = r.tick(0.2, [0.15]);
    expect(ev[0]).toMatchObject({ kind: 'hit', noteIndex: 0, grade: 'perfect' });
    r.tick(3.0, []); // close everything out
    const g = r.toGradeResult();
    expect(g.notes[0].expectedSec).toBeCloseTo(0);
    expect(g.notes[0].actualSec).toBeCloseTo(0); // 0.15 − latency
  });

  it('toGradeResult maps grades to Verdicts, no stray penalty, pass at 80', () => {
    const r = mk();
    r.tick(0.05, [0.0]);          // perfect
    r.tick(0.75, [0.69]);         // +90ms → good/late
    r.tick(1.25, [1.19]);         // perfect
    r.tick(1.85, [1.81, 1.5]);    // perfect + stray
    r.tick(5, []);
    const g = r.toGradeResult();
    expect(g.notes.map((n) => n.verdict)).toEqual(['on_time', 'late', 'on_time', 'on_time']);
    expect(g.extraOnsets).toHaveLength(1);
    expect(g.score).toBe(88); // (1+0.5+1+1)/4 — stray NOT penalized
    expect(g.passed).toBe(true);
    expect(r.isFinished()).toBe(true);
  });

  it('isFinished is false while any note is pending', () => {
    const r = mk();
    r.tick(0.05, [0.0]);
    expect(r.isFinished()).toBe(false);
  });

  it('tolerance floor applies at fast tempos', () => {
    const r = createClapBlastRound({ expected: [0], secondsPerPulse: 0.2, tolerancePct: 0.06 }); // 12ms → floor 30ms
    const ev = r.tick(0.05, [0.025]);
    expect(ev[0]).toMatchObject({ grade: 'perfect' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/rhythm/__tests__/clapBlast.test.ts`
Expected: FAIL — `Cannot find module '../clapBlast'` (or equivalent resolve error).

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/rhythm/clapBlast.ts
import { PASS_THRESHOLD, TOLERANCE_FLOOR_SEC } from './grade';
import type { GradeResult, NoteVerdict, Verdict } from './grade';

// Live per-note grading for the Clap Blast drill. Same tolerance model as
// gradeOnsets (tol = pct·pulse with 30ms floor, claim window 2×tol) but
// resolved incrementally so notes can explode mid-take — and, per spec,
// stray claps are recorded yet carry NO score penalty (kid-friendly;
// deliberately different from gradeOnsets' −0.25 extras rule).
//
// Grading runs in "mic time": expected times are shifted by the calibrated
// device latency, and all reported times are shifted back to musical time so
// payloads and result screens are device-independent.

export type NoteState = 'pending' | 'perfect' | 'good' | 'missed';

export interface ClapBlastEvent {
  kind: 'hit' | 'miss' | 'stray';
  noteIndex: number | null;
  grade?: 'perfect' | 'good';
  deltaSec?: number;
}

export interface ClapBlastRound {
  noteStates(): NoteState[];
  streak(): number;
  bestStreak(): number;
  score(): number;
  strayCount(): number;
  tick(nowSec: number, onsets: readonly number[]): ClapBlastEvent[];
  isFinished(): boolean;
  toGradeResult(): GradeResult;
}

export function createClapBlastRound({
  expected,
  secondsPerPulse,
  tolerancePct,
  latencySec = 0,
}: {
  expected: number[];
  secondsPerPulse: number;
  tolerancePct: number;
  latencySec?: number;
}): ClapBlastRound {
  const tol = Math.max(tolerancePct * secondsPerPulse, TOLERANCE_FLOOR_SEC);
  const window = 2 * tol;
  const shifted = expected.map((t) => t + latencySec);
  const states: NoteState[] = expected.map(() => 'pending');
  const deltas: Array<number | null> = expected.map(() => null);
  const actuals: Array<number | null> = expected.map(() => null);
  const strays: number[] = [];
  let cursor = 0;
  let streak = 0;
  let bestStreak = 0;

  const points = () =>
    states.reduce((s, st) => s + (st === 'perfect' ? 1 : st === 'good' ? 0.5 : 0), 0);
  const score = () => Math.round((100 * points()) / Math.max(1, expected.length));

  return {
    noteStates: () => [...states],
    streak: () => streak,
    bestStreak: () => bestStreak,
    score,
    strayCount: () => strays.length,

    tick(nowSec, onsets) {
      const events: ClapBlastEvent[] = [];
      for (; cursor < onsets.length; cursor++) {
        const t = onsets[cursor];
        let best = -1;
        let bestD = Infinity;
        shifted.forEach((exp, i) => {
          if (states[i] !== 'pending') return;
          const d = Math.abs(t - exp);
          if (d <= window && d < bestD) { bestD = d; best = i; }
        });
        if (best === -1) {
          strays.push(t - latencySec);
          events.push({ kind: 'stray', noteIndex: null });
          continue;
        }
        const delta = t - shifted[best];
        const grade: 'perfect' | 'good' = Math.abs(delta) <= tol ? 'perfect' : 'good';
        states[best] = grade;
        deltas[best] = delta;
        actuals[best] = t - latencySec;
        streak += 1;
        bestStreak = Math.max(bestStreak, streak);
        events.push({ kind: 'hit', noteIndex: best, grade, deltaSec: delta });
      }
      shifted.forEach((exp, i) => {
        if (states[i] === 'pending' && nowSec > exp + window) {
          states[i] = 'missed';
          streak = 0;
          events.push({ kind: 'miss', noteIndex: i });
        }
      });
      return events;
    },

    isFinished: () => states.every((s) => s !== 'pending'),

    toGradeResult(): GradeResult {
      const notes: NoteVerdict[] = expected.map((exp, i) => {
        const st = states[i];
        const verdict: Verdict =
          st === 'perfect' ? 'on_time'
          : st === 'good' ? ((deltas[i] ?? 0) < 0 ? 'early' : 'late')
          : 'missed'; // 'missed' and (defensively) 'pending'
        return { expectedSec: exp, actualSec: actuals[i], deltaSec: deltas[i], verdict };
      });
      const s = score();
      return { notes, extraOnsets: [...strays], score: s, passed: expected.length > 0 && s >= PASS_THRESHOLD };
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/rhythm/__tests__/clapBlast.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/rhythm/clapBlast.ts src/lib/rhythm/__tests__/clapBlast.test.ts
git commit -m "feat(reading-music): clap blast live-grading engine

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Engine — `calibrationOffsetSec`

**Files:**
- Modify: `src/lib/rhythm/clapBlast.ts` (append)
- Test: `src/lib/rhythm/__tests__/clapBlast.test.ts` (append)

**Interfaces:**
- Produces:
  - `const CALIBRATION_CLICKS = 8`, `const CALIBRATION_BPM = 90`
  - `calibrationOffsetSec(clickTimes: number[], claps: number[]): number | null` — median clap−click offset in seconds, `null` if fewer than 5 of the 8 clicks matched a clap within ±0.35 s; result clamped to [−0.1, 0.6].

- [ ] **Step 1: Append the failing tests**

```ts
// append to src/lib/rhythm/__tests__/clapBlast.test.ts
import { calibrationOffsetSec, CALIBRATION_CLICKS, CALIBRATION_BPM } from '../clapBlast';

describe('calibrationOffsetSec', () => {
  const clicks = Array.from({ length: 8 }, (_, i) => i * (60 / 90)); // 8 clicks @90bpm

  it('returns the median offset when the user claps consistently late', () => {
    const claps = clicks.map((c, i) => c + 0.12 + (i % 2 ? 0.01 : -0.01));
    expect(calibrationOffsetSec(clicks, claps)).toBeCloseTo(0.12, 2);
  });

  it('ignores stray claps and survives one missed click', () => {
    const claps = [...clicks.slice(0, 7).map((c) => c + 0.1), 2.9]; // 7 matched + 1 stray
    expect(calibrationOffsetSec(clicks, claps)).toBeCloseTo(0.1, 2);
  });

  it('returns null with fewer than 5 matches', () => {
    const claps = clicks.slice(0, 4).map((c) => c + 0.1);
    expect(calibrationOffsetSec(clicks, claps)).toBeNull();
  });

  it('clamps implausible medians into [-0.1, 0.6]', () => {
    // −300ms is inside the ±350ms match window, so it matches; median −0.3 clamps to −0.1
    const early = clicks.map((c) => c - 0.3);
    expect(calibrationOffsetSec(clicks, early)).toBeCloseTo(-0.1, 5);
  });

  it('exports the click count and bpm the UI schedules with', () => {
    expect(CALIBRATION_CLICKS).toBe(8);
    expect(CALIBRATION_BPM).toBe(90);
  });
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `npx vitest run src/lib/rhythm/__tests__/clapBlast.test.ts`
Expected: FAIL — `calibrationOffsetSec` is not exported.

- [ ] **Step 3: Append the implementation**

```ts
// append to src/lib/rhythm/clapBlast.ts

// Calibration: play CALIBRATION_CLICKS loud clicks at CALIBRATION_BPM, record
// clap onsets on the same clock, and take the median clap−click delta as the
// device's input+output latency. Follows takeAlignment.ts's philosophy:
// measure the device-specific constant once, configure nothing else.
export const CALIBRATION_CLICKS = 8;
export const CALIBRATION_BPM = 90;
const CAL_MATCH_WINDOW_SEC = 0.35;
const CAL_MIN_MATCHES = 5;
const CAL_MIN_OFFSET_SEC = -0.1;
const CAL_MAX_OFFSET_SEC = 0.6;

export function calibrationOffsetSec(clickTimes: number[], claps: number[]): number | null {
  const used = new Array(claps.length).fill(false);
  const deltas: number[] = [];
  for (const c of clickTimes) {
    let best = -1;
    let bestD = CAL_MATCH_WINDOW_SEC;
    claps.forEach((t, i) => {
      if (used[i]) return;
      const d = Math.abs(t - c);
      if (d <= bestD) { bestD = d; best = i; }
    });
    if (best !== -1) { used[best] = true; deltas.push(claps[best] - c); }
  }
  if (deltas.length < CAL_MIN_MATCHES) return null;
  deltas.sort((a, b) => a - b);
  const mid = Math.floor(deltas.length / 2);
  const median = deltas.length % 2 ? deltas[mid] : (deltas[mid - 1] + deltas[mid]) / 2;
  return Math.min(CAL_MAX_OFFSET_SEC, Math.max(CAL_MIN_OFFSET_SEC, median));
}
```

- [ ] **Step 4: Run to verify all pass**

Run: `npx vitest run src/lib/rhythm/__tests__/clapBlast.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rhythm/clapBlast.ts src/lib/rhythm/__tests__/clapBlast.test.ts
git commit -m "feat(reading-music): clap calibration median math

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Shared `getAudioCtx` + `ClapBlastStage` component

**Files:**
- Create: `src/pages/readingMusic/audioCtx.ts`
- Create: `src/pages/readingMusic/ClapBlastStage.tsx`
- Modify: `src/pages/readingMusic/RhythmTab.tsx` (only the `getAudioCtx` extraction in this task)
- Test: `src/pages/readingMusic/__tests__/ClapBlastStage.test.tsx`

**Interfaces:**
- Consumes: `ClapBlastRound`, `ClapBlastEvent`, `NoteState` from `@/lib/rhythm/clapBlast`; `RhythmPattern`, `RhythmEvent` from `@/lib/rhythm/pattern`.
- Produces:
  - `getAudioCtx(): AudioContext | null` from `./audioCtx` (moved verbatim from `RhythmTab.tsx`).
  - `ClapBlastStage` props: `{ pattern: RhythmPattern; bpm: number; ctx: AudioContext; t0: number; round: ClapBlastRound; getOnsets: () => readonly number[]; countIn: boolean }`. The stage owns the rAF loop; the parent owns start/finish timing.

- [ ] **Step 1: Extract `getAudioCtx` into `audioCtx.ts`**

Create `src/pages/readingMusic/audioCtx.ts` containing exactly the module-level `toneCtx` variable and `getAudioCtx` function currently at `RhythmTab.tsx:33-47`, with `export function getAudioCtx…`. In `RhythmTab.tsx`, delete those lines and add `import { getAudioCtx } from './audioCtx';`.

Run: `npx vitest run src/pages/readingMusic/__tests__/RhythmTab.test.tsx`
Expected: PASS (pure extraction, no behavior change).

- [ ] **Step 2: Write the failing stage test**

```tsx
// src/pages/readingMusic/__tests__/ClapBlastStage.test.tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { createClapBlastRound } from '@/lib/rhythm/clapBlast';
import { generatePattern } from '@/lib/rhythm/generate';
import { expectedOnsets } from '@/lib/rhythm/grade';
import { ClapBlastStage } from '../ClapBlastStage';

const pattern = generatePattern(1, 42);
const spp = 60 / 80;
const round = createClapBlastRound({
  expected: expectedOnsets(pattern, spp), secondsPerPulse: spp, tolerancePct: 0.10,
});
const fakeCtx = { currentTime: 0 } as unknown as AudioContext;

describe('ClapBlastStage', () => {
  it('renders the staff, hit line, one glyph per event, and the HUD', () => {
    render(
      <ClapBlastStage
        pattern={pattern} bpm={80} ctx={fakeCtx} t0={1}
        round={round} getOnsets={() => []} countIn={true}
      />,
    );
    expect(screen.getByRole('img', { name: /clap blast/i })).toBeInTheDocument();
    expect(document.querySelector('[data-role="hit-line"]')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-role="cb-note"]').length).toBe(
      pattern.events.filter((e) => !e.rest).length,
    );
    expect(screen.getByText(/score/i)).toBeInTheDocument();
  });

  it('shows the count-in banner before beat zero', () => {
    render(
      <ClapBlastStage
        pattern={pattern} bpm={80} ctx={fakeCtx} t0={1}
        round={round} getOnsets={() => []} countIn={true}
      />,
    );
    expect(screen.getByText(/get ready/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/pages/readingMusic/__tests__/ClapBlastStage.test.tsx`
Expected: FAIL — cannot resolve `../ClapBlastStage`.

- [ ] **Step 4: Implement the stage**

```tsx
// src/pages/readingMusic/ClapBlastStage.tsx
import { useEffect, useRef, useState } from 'react';
import type { RhythmPattern, RhythmEvent } from '@/lib/rhythm/pattern';
import type { ClapBlastRound, ClapBlastEvent, NoteState } from '@/lib/rhythm/clapBlast';

// Scrolling-staff play surface for the Clap Blast drill. The whole pattern is
// one <g> translated left every frame off ctx.currentTime — a dropped frame
// delays pixels, never timing. RhythmStrip's glyph vocabulary, minus
// syllables (no room at speed) — the hit line is the focal point.

const PX_PER_PULSE = 72;
const VIEW_W = 800;
const VIEW_H = 120;
const HIT_X = VIEW_W * 0.2;
const LINE_Y = 64;

const STATE_COLOR: Record<NoteState, string> = {
  pending: '#0f172a',
  perfect: '#059669',
  good: '#d97706',
  missed: '#94a3b8',
};

interface Burst { id: number; grade: 'perfect' | 'good' }

interface Props {
  pattern: RhythmPattern;
  bpm: number;
  ctx: AudioContext;
  t0: number;
  round: ClapBlastRound;
  getOnsets: () => readonly number[];
  countIn: boolean;
}

export function ClapBlastStage({ pattern, bpm, ctx, t0, round, getOnsets, countIn }: Props) {
  const [nowSec, setNowSec] = useState(() => ctx.currentTime - t0);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [flash, setFlash] = useState<'perfect' | 'good' | 'stray' | null>(null);
  const burstSeq = useRef(0);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const now = ctx.currentTime - t0;
      const events = round.tick(now, getOnsets());
      if (events.length > 0) {
        const hits = events.filter((e): e is ClapBlastEvent & { grade: 'perfect' | 'good' } => e.kind === 'hit');
        if (hits.length > 0) {
          setBursts((b) => [...b.slice(-6), ...hits.map((h) => ({ id: ++burstSeq.current, grade: h.grade }))]);
          setFlash(hits[hits.length - 1].grade);
        } else if (events.some((e) => e.kind === 'stray')) {
          setFlash('stray');
        }
      }
      setNowSec(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ctx, t0, round, getOnsets]);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 350);
    return () => window.clearTimeout(t);
  }, [flash]);

  const spp = 60 / bpm;
  const pxPerSec = PX_PER_PULSE / spp;
  const translateX = HIT_X - nowSec * pxPerSec;
  const x = (pulse: number) => pulse * PX_PER_PULSE;
  const states = round.noteStates();
  const streak = round.streak();

  // Map event index → note index (rests don't grade)
  let noteIdx = -1;
  const noteIndexOf = new Map<number, number>();
  pattern.events.forEach((e, i) => { if (!e.rest) { noteIdx += 1; noteIndexOf.set(i, noteIdx); } });

  const isBeamed = (e: RhythmEvent) => !e.rest && (e.value === 'e' || e.value === 's');
  const pulseOf = (e: RhythmEvent) => Math.floor(e.startPulse + 1e-6);
  const groups: number[][] = [];
  let current: number[] = [];
  pattern.events.forEach((e, i) => {
    if (isBeamed(e) && current.length > 0 && pulseOf(pattern.events[current[0]]) === pulseOf(e)) {
      current.push(i);
    } else {
      if (current.length > 1) groups.push(current);
      current = isBeamed(e) ? [i] : [];
    }
  });
  if (current.length > 1) groups.push(current);
  const inBeam = new Set(groups.flat());

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-sm">
        <span className="font-medium text-slate-700">Score {round.score()}</span>
        <span className={streak >= 3 ? 'font-semibold text-orange-600' : 'text-slate-500'}>
          🔥 {streak}
        </span>
        {countIn && nowSec < 0 && <span className="font-medium text-amber-700">Get ready…</span>}
        {flash === 'perfect' && <span className="font-semibold text-emerald-600">Perfect!</span>}
        {flash === 'good' && <span className="font-semibold text-amber-600">Good</span>}
      </div>

      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
        <svg
          width="100%" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" aria-label="clap blast stage"
          preserveAspectRatio="xMidYMid meet"
        >
          <line x1={0} y1={LINE_Y} x2={VIEW_W} y2={LINE_Y} stroke="#94a3b8" strokeWidth={1} />
          <line
            data-role="hit-line"
            x1={HIT_X} y1={LINE_Y - 34} x2={HIT_X} y2={LINE_Y + 26}
            stroke={flash === 'stray' ? '#ef4444' : '#0ea5e9'} strokeWidth={flash === 'stray' ? 4 : 3}
            strokeLinecap="round"
          />
          <g transform={`translate(${translateX} 0)`}>
            {Array.from({ length: pattern.measures + 1 }, (_, m) => (
              <line
                key={`bar-${m}`}
                x1={x(m * pattern.pulsesPerMeasure)} y1={LINE_Y - 18}
                x2={x(m * pattern.pulsesPerMeasure)} y2={LINE_Y + 18}
                stroke="#cbd5e1" strokeWidth={m === pattern.measures ? 2.5 : 1.5}
              />
            ))}
            {pattern.events.map((e, i) => {
              if (e.rest) return null;
              const ni = noteIndexOf.get(i)!;
              const st = states[ni];
              if (st === 'perfect' || st === 'good') return null; // exploded
              const color = STATE_COLOR[st];
              const cx = x(e.startPulse) + 10;
              const hollow = e.value === 'h' || e.value === 'h.' || e.value === 'w';
              const dotted = e.value.endsWith('.');
              const flagged = (e.value === 'e' || e.value === 'e.' || e.value === 's') && !inBeam.has(i);
              return (
                <g key={i} data-role="cb-note" data-state={st} opacity={st === 'missed' ? 0.45 : 1}>
                  <ellipse
                    cx={cx} cy={LINE_Y} rx={7} ry={5.5}
                    fill={hollow ? 'white' : color} stroke={color} strokeWidth={1.8}
                    transform={`rotate(-20 ${cx} ${LINE_Y})`}
                  />
                  {dotted && <circle cx={cx + 12} cy={LINE_Y - 3} r={2} fill={color} />}
                  {e.value !== 'w' && (
                    <line x1={cx + 6.5} y1={LINE_Y - 2} x2={cx + 6.5} y2={LINE_Y - 34} stroke={color} strokeWidth={1.8} />
                  )}
                  {flagged && (
                    <path d={`M ${cx + 6.5} ${LINE_Y - 34} q 10 4 8 16`} stroke={color} strokeWidth={1.8} fill="none" />
                  )}
                  {e.value === 's' && !inBeam.has(i) && (
                    <path d={`M ${cx + 6.5} ${LINE_Y - 27} q 10 4 8 16`} stroke={color} strokeWidth={1.8} fill="none" />
                  )}
                </g>
              );
            })}
            {groups.map((g, gi) => {
              // Hide a beam once every note in its group has exploded
              const allGone = g.every((i) => {
                const ni = noteIndexOf.get(i);
                return ni !== undefined && (states[ni] === 'perfect' || states[ni] === 'good');
              });
              if (allGone) return null;
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
          </g>
        </svg>

        {/* Explosions pinned to the hit line */}
        <div className="pointer-events-none absolute inset-y-0" style={{ left: '20%' }}>
          {bursts.map((b) => (
            <HitBurst key={b.id} grade={b.grade} />
          ))}
        </div>
      </div>
    </div>
  );
}

function HitBurst({ grade }: { grade: 'perfect' | 'good' }) {
  const n = grade === 'perfect' ? 10 : 6;
  const chars = grade === 'perfect' ? ['💥', '✨', '⭐'] : ['✨', '·'];
  const parts = Array.from({ length: n }, (_, i) => ({
    key: i,
    dx: Math.cos((i / n) * Math.PI * 2) * (grade === 'perfect' ? 46 : 28),
    dy: Math.sin((i / n) * Math.PI * 2) * (grade === 'perfect' ? 46 : 28),
    char: chars[i % chars.length],
  }));
  return (
    <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2">
      {parts.map((p) => (
        <span
          key={p.key}
          className="absolute text-lg"
          style={{
            animation: 'cbBurst 500ms ease-out forwards',
            ['--dx' as string]: `${p.dx}px`,
            ['--dy' as string]: `${p.dy}px`,
            opacity: 0,
          }}
        >
          {p.char}
        </span>
      ))}
      <style>{`
        @keyframes cbBurst {
          0%   { transform: translate(0,0) scale(0.4); opacity: 0; }
          20%  { opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(1.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/pages/readingMusic/__tests__/ClapBlastStage.test.tsx src/pages/readingMusic/__tests__/RhythmTab.test.tsx`
Expected: PASS (both files — the second confirms the `getAudioCtx` extraction broke nothing).

- [ ] **Step 6: Commit**

```bash
git add src/pages/readingMusic/audioCtx.ts src/pages/readingMusic/ClapBlastStage.tsx \
        src/pages/readingMusic/__tests__/ClapBlastStage.test.tsx src/pages/readingMusic/RhythmTab.tsx
git commit -m "feat(reading-music): clap blast scrolling stage + shared audio ctx

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: `ClapCalibration` component

**Files:**
- Create: `src/pages/readingMusic/ClapCalibration.tsx`

**Interfaces:**
- Consumes: `getAudioCtx` from `./audioCtx`; `startMicOnsetSession` from `@/lib/rhythm/onsets/mic`; `calibrationOffsetSec`, `CALIBRATION_CLICKS`, `CALIBRATION_BPM` from `@/lib/rhythm/clapBlast`; `toast` from `sonner`.
- Produces: `ClapCalibration` props: `{ onDone: (ms: number) => void; onCancel: () => void }`. The component does NOT write localStorage — the parent owns persistence.

No unit test for this component (it is a thin audio-orchestration shell around the already-tested `calibrationOffsetSec`; jsdom has no real AudioContext/getUserMedia). It is covered by the Task 6 manual verification.

- [ ] **Step 1: Implement**

```tsx
// src/pages/readingMusic/ClapCalibration.tsx
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getAudioCtx } from './audioCtx';
import { startMicOnsetSession } from '@/lib/rhythm/onsets/mic';
import type { MicOnsetSession } from '@/lib/rhythm/onsets/mic';
import { calibrationOffsetSec, CALIBRATION_CLICKS, CALIBRATION_BPM } from '@/lib/rhythm/clapBlast';

// One-time device latency measurement: play 8 loud clicks, the player claps
// along, the median clap−click delta becomes rm_clap_latency_ms (persisted by
// the parent). Clicks here are LOUD on purpose — unlike a take, the mic is
// supposed to hear you clap WITH them, and clap transients dwarf sine clicks.

type CalState = 'idle' | 'running' | 'failed';

interface Props {
  onDone: (ms: number) => void;
  onCancel: () => void;
}

export function ClapCalibration({ onDone, onCancel }: Props) {
  const [state, setState] = useState<CalState>('idle');
  const timersRef = useRef<number[]>([]);
  const sessionRef = useRef<MicOnsetSession | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = () => {
    for (const t of timersRef.current) window.clearTimeout(t);
    timersRef.current = [];
    sessionRef.current?.dispose();
    sessionRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };
  useEffect(() => cleanup, []);

  const run = async () => {
    const ctx = getAudioCtx();
    if (!ctx) { toast.error('Audio unavailable'); return; }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch {
      toast.error('Microphone unavailable', { description: 'Calibration needs the mic. Tap input needs no calibration.' });
      onCancel();
      return;
    }
    streamRef.current = stream;
    setState('running');

    const spb = 60 / CALIBRATION_BPM;
    const t0 = ctx.currentTime + 0.35;
    const clickTimes = Array.from({ length: CALIBRATION_CLICKS }, (_, i) => i * spb);
    for (const c of clickTimes) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 1400;
      g.gain.setValueAtTime(0, t0 + c);
      g.gain.linearRampToValueAtTime(0.4, t0 + c + 0.004);
      g.gain.linearRampToValueAtTime(0, t0 + c + 0.05);
      osc.connect(g).connect(ctx.destination);
      osc.start(t0 + c);
      osc.stop(t0 + c + 0.06);
    }
    sessionRef.current = startMicOnsetSession(ctx, stream, t0);

    const endMs = (t0 + (CALIBRATION_CLICKS - 1) * spb + 0.7 - ctx.currentTime) * 1000;
    timersRef.current.push(window.setTimeout(() => {
      const claps = [...(sessionRef.current?.onsets ?? [])];
      cleanup();
      const offset = calibrationOffsetSec(clickTimes, claps);
      if (offset === null) {
        setState('failed');
        return;
      }
      onDone(Math.round(offset * 1000));
    }, endMs));
  };

  return (
    <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50 p-4">
      <p className="text-sm font-medium text-slate-800">Calibrate your clap timing</p>
      <p className="text-sm text-slate-600">
        Every device hears your claps a little late. Clap along with {CALIBRATION_CLICKS} clicks
        once, and Clap Blast will grade you fairly on this device.
      </p>
      {state === 'failed' && (
        <p className="text-sm font-medium text-red-600">
          We couldn't hear enough claps — get closer to the mic and try again.
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button onClick={() => void run()} disabled={state === 'running'}>
          {state === 'running' ? 'Clap with the clicks…' : state === 'failed' ? 'Try again' : 'Start calibration'}
        </Button>
        <Button variant="outline" onClick={() => { cleanup(); onCancel(); }} disabled={state === 'running'}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles and nothing regressed**

Run: `npm run typecheck:guard && npx vitest run src/pages/readingMusic/__tests__/`
Expected: typecheck introduces no new errors; existing page tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/pages/readingMusic/ClapCalibration.tsx
git commit -m "feat(reading-music): clap latency calibration panel

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: RhythmTab integration + payload type

**Files:**
- Modify: `src/pages/readingMusic/RhythmTab.tsx`
- Modify: `src/lib/readingMusic/attemptsApi.ts` (one field)
- Test: `src/pages/readingMusic/__tests__/RhythmTab.test.tsx` (extend)

**Interfaces:**
- Consumes: everything produced by Tasks 1–4.
- Produces: the `'clap_blast'` drill end-to-end. Attempt rows: `{ domain: 'rhythm', drill: 'clap_blast', mode, level, score, passed, payload: { …existing fields, latency_ms? } }`.

- [ ] **Step 1: Extend the failing test**

Append to `src/pages/readingMusic/__tests__/RhythmTab.test.tsx` inside the existing `describe`:

```tsx
  it('renders the Clap Blast drill chip', () => {
    render(<RhythmTab />);
    expect(screen.getByRole('button', { name: /clap blast/i })).toBeInTheDocument();
  });
```

Run: `npx vitest run src/pages/readingMusic/__tests__/RhythmTab.test.tsx`
Expected: FAIL — no such button.

- [ ] **Step 2: Add the payload field**

In `src/lib/readingMusic/attemptsApi.ts`, add to `RhythmAttemptPayload` (after `no_input?: boolean;`):

```ts
  /** Clap Blast only: calibrated device latency applied during grading (mic input). */
  latency_ms?: number;
```

- [ ] **Step 3: Wire the drill into `RhythmTab.tsx`**

All edits below are to `src/pages/readingMusic/RhythmTab.tsx`.

**3a. Imports** — add:

```ts
import { createClapBlastRound } from '@/lib/rhythm/clapBlast';
import type { ClapBlastRound } from '@/lib/rhythm/clapBlast';
import { ClapBlastStage } from './ClapBlastStage';
import { ClapCalibration } from './ClapCalibration';
```

**3b. Drill type + list** — change:

```ts
type Drill = 'steady_beat' | 'echo' | 'read_clap' | 'clap_blast';
```

and append to `DRILLS`:

```ts
  { id: 'clap_blast', label: '💥 Clap Blast', blurb: 'Clap each note as it crosses the line!' },
```

**3c. New state/refs** — alongside the existing state declarations:

```ts
  const [latencyMs, setLatencyMs] = useState<number | null>(() => {
    const v = localStorage.getItem('rm_clap_latency_ms');
    return v === null || Number.isNaN(Number(v)) ? null : Number(v);
  });
  const [calibrating, setCalibrating] = useState(false);
  const [takeT0, setTakeT0] = useState<number | null>(null);
  const roundRef = useRef<ClapBlastRound | null>(null);
```

**3d. Calibration gate at the top of `start()`** — first lines of the callback, before `if (activeRef.current) return;` keep that line first, then insert:

```ts
    if (drill === 'clap_blast' && input === 'mic' && latencyMs === null) {
      setCalibrating(true);
      return;
    }
```

(`latencyMs` joins the `useCallback` dependency array.)

**3e. Create the round in `start()`** — after `setPattern(p); setResult(null);` add:

```ts
    if (drill === 'clap_blast') {
      roundRef.current = createClapBlastRound({
        expected: expectedOnsets(p, 60 / bpm),
        secondsPerPulse: 60 / bpm,
        tolerancePct: assessment ? ASSESSMENT_TOLERANCE_PCT : PRACTICE_TOLERANCE_PCT,
        latencySec: effectiveInput === 'mic' ? (latencyMs ?? 0) / 1000 : 0,
      });
    } else {
      roundRef.current = null;
    }
```

and after `const t0 = countInStart + ppm * spp;` add `setTakeT0(t0);`.

**3f. Finish path** — in the final `setTimeout` (currently `ms(t0 + takeDur + 0.35)`), change the grading block to branch:

```ts
      const graded = (() => {
        if (drill === 'clap_blast' && roundRef.current) {
          roundRef.current.tick(ctx.currentTime - t0, sessionRef.current?.onsets ?? []);
          return roundRef.current.toGradeResult();
        }
        return gradeOnsets(expectedOnsets(p, spp), onsets, { secondsPerPulse: spp, tolerancePct });
      })();
```

and extend the end-of-take delay for clap_blast so the last note's window can close: schedule this timer at `ms(t0 + takeDur + 2 * tol + 0.35)` (this longer delay is harmless for the other drills — keep a single schedule expression). In the same block, build the payload's `actual` from the graded result when it came from the round, so stored claps are latency-corrected musical-time values:

```ts
      const payloadActual = drill === 'clap_blast'
        ? [...graded.notes.filter((n) => n.actualSec !== null).map((n) => n.actualSec as number), ...graded.extraOnsets].sort((a, b) => a - b)
        : onsets;
```

use `payloadActual` for `payload.actual`, and add to the payload object:

```ts
        ...(drill === 'clap_blast' && effectiveInput === 'mic' && latencyMs !== null ? { latency_ms: latencyMs } : {}),
```

Finally, in `cancelTake` add `roundRef.current = null;` and in the finish block add `setTakeT0(null);` after `cancelTake();`. `no_input` logic stays as-is.

**3g. Render** — three changes:

1. `showNotation` excludes the new drill: `const showNotation = drill !== 'echo' && drill !== 'clap_blast' && pattern && phase !== 'idle';`
2. After the Start/assessment button row, render the calibration panel and recalibrate affordance:

```tsx
          {calibrating && (
            <ClapCalibration
              onDone={(msVal) => {
                localStorage.setItem('rm_clap_latency_ms', String(msVal));
                setLatencyMs(msVal);
                setCalibrating(false);
                toast.success(`Calibrated — your device delay is ${msVal} ms`);
              }}
              onCancel={() => setCalibrating(false)}
            />
          )}
          {drill === 'clap_blast' && input === 'mic' && latencyMs !== null && !calibrating && (
            <button
              type="button"
              disabled={running}
              onClick={() => setCalibrating(true)}
              className="text-sm text-slate-500 underline-offset-2 hover:underline"
            >
              Device delay: {latencyMs} ms — recalibrate
            </button>
          )}
```

3. Render the stage while a clap_blast take runs (place directly above the `{running && input === 'tap' && (` pad block):

```tsx
          {drill === 'clap_blast' && running && pattern && takeT0 !== null && toneCtxForStage() && (
            <ClapBlastStage
              pattern={pattern}
              bpm={bpm}
              ctx={toneCtxForStage()!}
              t0={takeT0}
              round={roundRef.current!}
              getOnsets={() => sessionRef.current?.onsets ?? []}
              countIn={phase === 'countin'}
            />
          )}
```

where `toneCtxForStage` is simply `getAudioCtx` imported from `./audioCtx` (call it `getAudioCtx()` directly — it returns the existing singleton without side effects once created; no separate helper needed, write the guard as `getAudioCtx() !== null`). The tap pad and mic meter blocks below it remain unchanged and appear under the stage.

Note: `roundRef.current` is non-null whenever `drill === 'clap_blast'` and a take is running (set in `start()` before any timer fires), so the `!` assertion is safe; the `takeT0 !== null` guard covers the idle case.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/pages/readingMusic/__tests__/ src/lib/rhythm/__tests__/`
Expected: PASS, including the new drill-chip test.

- [ ] **Step 5: Lint + typecheck**

Run: `npm run lint && npm run typecheck:guard`
Expected: no new errors (baseline diff clean).

- [ ] **Step 6: Commit**

```bash
git add src/pages/readingMusic/RhythmTab.tsx src/lib/readingMusic/attemptsApi.ts \
        src/pages/readingMusic/__tests__/RhythmTab.test.tsx
git commit -m "feat(reading-music): wire Clap Blast drill into Rhythm tab

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Full unit suite**

Run: `npm run test`
Expected: entire suite PASS (watch for `.claude/worktrees` pollution — run from the worktree root).

- [ ] **Step 2: Lint + typecheck once more over the whole diff**

Run: `npm run lint && npm run typecheck:guard`
Expected: clean.

- [ ] **Step 3: In-app smoke test (tap path — automatable)**

Use the project's `verify` skill (preview server + Playwright). Script: log in as demo user (`demo@` / GleeDemo2026!), navigate to `/dashboard/reading-music?tab=rhythm`, select the **💥 Clap Blast** drill, set Input to **Tap / spacebar**, press **Start**, verify: count-in banner appears, the stage SVG with `data-role="hit-line"` renders, notes scroll left, pressing Space during the take explodes at least one note (a `[data-role="cb-note"]` disappears and the score text increases), and after the take ends the results screen shows a score and the attempt-insert call fired (mock/network log). Verify at 390px and desktop viewports.

Expected: all assertions pass; no console errors.

- [ ] **Step 4: Report real-device checklist as REMAINING work**

Mic path, calibration wizard accuracy, and iPad/iOS-app behavior cannot be verified headlessly. Report these as pending for Kevin's hands-on QA:
- Mac desktop: mic calibration completes, claps explode notes, Perfect achievable.
- iPad Safari + GleeWorld iOS app (WKWebView): same, plus calibration stores a plausibly larger offset with Bluetooth speakers.

Do NOT claim the feature verified until the tap-path smoke passes and the unit suite is green; state the device checklist explicitly in the final report.

---

## Self-Review (completed)

- **Spec coverage:** engine/live grading (T1), calibration math (T2), scrolling stage + explosions + HUD/streak (T3), calibration UI + first-run gate + recalibrate (T4, T5-3d/3g), drill wiring + stars + confetti + assessment gating inherited (T5), persistence with latency_ms + musical-time actuals (T5-3f), tap fallback (existing `start()` mic-failure path, unchanged), visibilitychange/teardown (existing `cancelTake`, extended with roundRef), quiet clicks (untouched), results screen reuse (GradeResult from `toGradeResult`), testing (T1/T2/T3/T5 unit + T6 smoke + device checklist). Phase 2 (authored exercises) intentionally out of scope.
- **Placeholder scan:** none remaining; every code step contains full code.
- **Type consistency:** `ClapBlastRound` methods (`noteStates()`, `tick()`, `isFinished()`, `toGradeResult()`) used identically in T3 and T5; `calibrationOffsetSec` (T2) consumed in T4; `getAudioCtx` (T3) consumed in T4/T5; `latency_ms` field (T5-2) written in T5-3f.
