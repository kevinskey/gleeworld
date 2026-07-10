# Sight Singing and Aural Skills — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the college-level "Sight Singing and Aural Skills" template course with real notated, playable, interactive exercises, plus the generator/seed pipeline and the ExercisePlayer UI it renders through.

**Architecture:** Content is generated deterministically by a Node script into the `courses.json` shape the existing seed pipeline consumes; exercises store Sight Reading Studio `ExerciseIR` JSON in `gw_academy_exercises.data`; a new `ExercisePlayer` component tree renders them on `TemplateCoursePage` via the existing `irToEditorScore` → `NotationView` (VexFlow) path; melodies deep-link into the Sight Reading Studio pitch tracker.

**Tech Stack:** React + TypeScript + Vite, vitest, VexFlow (via existing `NotationView`), WebAudio (oscillator scheduling, same idiom as `SingFlow`), Supabase JS client, Node `.mjs` scripts.

**Spec:** `docs/superpowers/specs/2026-07-10-sight-singing-course-design.md` (Appendix A is the content authority).

## Global Constraints

- Repo: `~/Documents/GitHub/gleeworld`, branch off `main` (`git checkout -b sight-singing-course`).
- `gw_course_product.price_cents` is `int not null` → deferred pricing = `0`. `stripe_price_id` stays null.
- **Phase 1 seeds ONLY `COURSE-SSAT-COLL`** (course slug `sight-singing-college`). Do NOT seed the bundle or other level products: `grant_course_entitlement` treats any product with `template_course_id is null and bundle_key is not null` as a bundle, so a level product whose course isn't seeded yet would misbehave. Bundle + ELEM/MS/HS products ship in Phase 2 with their courses.
- IR duration rule: every note/rest duration must be a single base value + dots (`ticksToDur` returns null otherwise and the note is silently dropped). Whitelists — beatType 4: `0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4`; beatType 8: `0.5, 1, 1.5, 2, 3, 4, 6`. No note may cross a barline.
- Generated solfège uses the app's do-based movable-do table (`SOLFEGE` in `src/lib/sightReading/ir.ts`: do ra re me mi fa fi sol le la te ti). La-based minor is taught in lesson text only.
- No `Date.now()`/randomness in generated content: the generator seeds a mulberry32 PRNG from a stable string hash per exercise, so re-runs are byte-identical.
- Follow `gleeworld-design` skill for all UI (light surfaces, `text-xs`/`text-sm` chrome, `w-4 h-4` icons min). Never hardcode "Spelman".
- Tests: `npx vitest run <path>` per task; full suite `npm test` before the final commit of each task if the task touched shared code.
- Commit after every task. Never `rsync --delete` when deploying.

## Exercise `data` schemas (single source of truth for all tasks)

```ts
// type: 'solfege_drill' | 'melody'
{ ir: ExerciseIR, instructions?: string, prepChecklist?: string[], segments?: ExerciseIR[] }
// when `segments` is present it replaces `ir` (mixed-meter sets); `ir` may be omitted then
// type: 'rhythm'  — same shape; notes may leave gaps (rendered as rests); play as clicks
{ ir: ExerciseIR, instructions?: string, segments?: ExerciseIR[] }
// type: 'ear_training'
{ prompt: string, items: [{ ir: ExerciseIR, choices: string[], answer: number, explanation?: string }] }
// type: 'dictation'
{ prompt: string, ir: ExerciseIR, playLimit: number }   // reveal shows this same ir as the answer
// type: 'ensemble'
{ instructions?: string, parts: [{ label: string, ir: ExerciseIR }] }
// type: 'assignment'
{ instructions: string[], deliverables: string[], rubric: [{ criterion: string, percent: number }] }
// melody extras (week 12): { modulation?: { atBeat: number, toKey: string } } — display-only annotation
```

---

### Task 1: IR validation lib

**Files:**
- Create: `src/lib/sightReading/irValidate.ts`
- Test: `src/lib/sightReading/irValidate.test.ts`

**Interfaces:**
- Produces: `isValidIr(x: unknown): x is ExerciseIR` — structural + musical sanity. Used by ExercisePlayer (Task 3) and the studio loader (Task 5).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/sightReading/irValidate.test.ts
import { describe, it, expect } from 'vitest';
import { isValidIr } from './irValidate';
import type { ExerciseIR } from './ir';

const good: ExerciseIR = {
  key: 'C', mode: 'major', tonicMidi: 60, meter: { beats: 4, beatType: 4 }, tempo: 90,
  notes: [
    { midi: 60, beatPos: 0, durationBeats: 1, solfege: 'do', phraseIdx: 0 },
    { midi: 62, beatPos: 1, durationBeats: 1, solfege: 're', phraseIdx: 0 },
  ],
  phrases: 1, difficulty: 1,
};

describe('isValidIr', () => {
  it('accepts a well-formed IR', () => expect(isValidIr(good)).toBe(true));
  it('rejects null / non-objects / missing fields', () => {
    expect(isValidIr(null)).toBe(false);
    expect(isValidIr('x')).toBe(false);
    expect(isValidIr({ ...good, notes: undefined })).toBe(false);
    expect(isValidIr({ ...good, meter: { beats: 4 } })).toBe(false);
  });
  it('rejects empty notes and non-positive durations', () => {
    expect(isValidIr({ ...good, notes: [] })).toBe(false);
    expect(isValidIr({ ...good, notes: [{ ...good.notes[0], durationBeats: 0 }] })).toBe(false);
  });
  it('rejects overlapping notes', () => {
    expect(isValidIr({ ...good, notes: [
      { midi: 60, beatPos: 0, durationBeats: 2, solfege: 'do', phraseIdx: 0 },
      { midi: 62, beatPos: 1, durationBeats: 1, solfege: 're', phraseIdx: 0 },
    ] })).toBe(false);
  });
  it('rejects out-of-range midi', () => {
    expect(isValidIr({ ...good, notes: [{ ...good.notes[0], midi: 20 }] })).toBe(false);
    expect(isValidIr({ ...good, notes: [{ ...good.notes[0], midi: 100 }] })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/sightReading/irValidate.test.ts`
Expected: FAIL — cannot resolve `./irValidate`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/sightReading/irValidate.ts
import type { ExerciseIR } from './ir';

// Defensive gate for IR arriving from the database (gw_academy_exercises.data).
// Rejecting here keeps a malformed row from crashing a lesson page or the studio.
export function isValidIr(x: unknown): x is ExerciseIR {
  if (!x || typeof x !== 'object') return false;
  const ir = x as ExerciseIR;
  if (typeof ir.key !== 'string' || (ir.mode !== 'major' && ir.mode !== 'minor')) return false;
  if (!Number.isFinite(ir.tonicMidi) || !Number.isFinite(ir.tempo) || ir.tempo <= 0) return false;
  if (!ir.meter || !Number.isFinite(ir.meter.beats) || !Number.isFinite(ir.meter.beatType)) return false;
  if (!Array.isArray(ir.notes) || ir.notes.length === 0) return false;
  let cursor = -Infinity;
  for (const n of ir.notes) {
    if (!n || !Number.isFinite(n.midi) || n.midi < 36 || n.midi > 96) return false;
    if (!Number.isFinite(n.beatPos) || n.beatPos < 0) return false;
    if (!Number.isFinite(n.durationBeats) || n.durationBeats <= 0) return false;
    if (n.beatPos < cursor - 1e-6) return false; // overlap with previous note
    cursor = n.beatPos + n.durationBeats;
  }
  return true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/sightReading/irValidate.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sightReading/irValidate.ts src/lib/sightReading/irValidate.test.ts
git commit -m "feat(sight-reading): defensive ExerciseIR validator"
```

---

### Task 2: IR playback (pure scheduler + thin WebAudio wrapper)

**Files:**
- Create: `src/lib/sightReading/irPlayback.ts`
- Test: `src/lib/sightReading/irPlayback.test.ts`

**Interfaces:**
- Produces:
  - `irToToneEvents(ir: ExerciseIR, mode: 'pitch' | 'click'): ToneEvent[]` where `ToneEvent = { hz: number; at: number; dur: number; gain: number }` (`at`/`dur` in seconds from playback start) — pure, unit-tested.
  - `playIr(ir: ExerciseIR, mode?: 'pitch' | 'click'): Promise<void>` — resolves when playback finishes; safe to call without an AudioContext (no-op).
- Consumes: `ExerciseIR` from `src/lib/sightReading/ir.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/sightReading/irPlayback.test.ts
import { describe, it, expect } from 'vitest';
import { irToToneEvents } from './irPlayback';
import type { ExerciseIR } from './ir';

const ir: ExerciseIR = {
  key: 'C', mode: 'major', tonicMidi: 60, meter: { beats: 4, beatType: 4 }, tempo: 120,
  notes: [
    { midi: 60, beatPos: 0, durationBeats: 1, solfege: 'do', phraseIdx: 0 },
    { midi: 64, beatPos: 2, durationBeats: 2, solfege: 'mi', phraseIdx: 0 },
  ],
  phrases: 1, difficulty: 1,
};

describe('irToToneEvents', () => {
  it('schedules pitch events at beat positions (120bpm → 0.5s/beat)', () => {
    const ev = irToToneEvents(ir, 'pitch');
    expect(ev).toHaveLength(2);
    expect(ev[0].at).toBeCloseTo(0);
    expect(ev[0].dur).toBeCloseTo(0.5);
    expect(ev[0].hz).toBeCloseTo(261.63, 1); // C4
    expect(ev[1].at).toBeCloseTo(1.0);       // beat 2
    expect(ev[1].dur).toBeCloseTo(1.0);
  });
  it('compound meter: beat unit is the beatType (6/8 → eighth = tempo unit)', () => {
    const c: ExerciseIR = { ...ir, meter: { beats: 6, beatType: 8 }, tempo: 240,
      notes: [{ midi: 60, beatPos: 3, durationBeats: 3, solfege: 'do', phraseIdx: 0 }] };
    const ev = irToToneEvents(c, 'pitch');
    expect(ev[0].at).toBeCloseTo(0.75);  // 3 eighths at 240 eighth-bpm = 0.75s
    expect(ev[0].dur).toBeCloseTo(0.75);
  });
  it('click mode uses one fixed pitch for every note', () => {
    const ev = irToToneEvents(ir, 'click');
    expect(ev[0].hz).toBe(ev[1].hz);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/sightReading/irPlayback.test.ts`
Expected: FAIL — cannot resolve `./irPlayback`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/sightReading/irPlayback.ts
import type { ExerciseIR } from './ir';

export type ToneEvent = { hz: number; at: number; dur: number; gain: number };

const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const CLICK_HZ = 880; // rhythm exercises: every note sounds as the same short tick

// Pure scheduling: beatPos/durationBeats are in units of the meter's beatType,
// and ir.tempo is beats-per-minute in that same unit (matches SingFlow/generate.ts).
export function irToToneEvents(ir: ExerciseIR, mode: 'pitch' | 'click'): ToneEvent[] {
  const secPerBeat = 60 / ir.tempo;
  return ir.notes.map((n) => ({
    hz: mode === 'click' ? CLICK_HZ : midiToHz(n.midi),
    at: n.beatPos * secPerBeat,
    dur: mode === 'click' ? Math.min(0.09, n.durationBeats * secPerBeat) : n.durationBeats * secPerBeat * 0.92,
    gain: mode === 'click' ? 0.25 : 0.18,
  }));
}

// Thin WebAudio wrapper, same triangle-tone idiom as SingFlow's playPriming().
// Own short-lived context so it never collides with useMicPitch's context.
export async function playIr(ir: ExerciseIR, mode: 'pitch' | 'click' = 'pitch'): Promise<void> {
  const AC = window.AudioContext
    || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  try {
    if (ctx.state !== 'running') await ctx.resume();
    const t0 = ctx.currentTime + 0.05;
    const events = irToToneEvents(ir, mode);
    let end = 0;
    for (const e of events) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = e.hz;
      const at = t0 + e.at;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(e.gain, at + 0.015);
      g.gain.setValueAtTime(e.gain, Math.max(at + 0.015, at + e.dur - 0.05));
      g.gain.linearRampToValueAtTime(0, at + e.dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(at);
      osc.stop(at + e.dur + 0.02);
      end = Math.max(end, e.at + e.dur);
    }
    await new Promise((r) => setTimeout(r, (end + 0.25) * 1000));
  } finally {
    ctx.close().catch(() => {});
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/sightReading/irPlayback.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sightReading/irPlayback.ts src/lib/sightReading/irPlayback.test.ts
git commit -m "feat(sight-reading): IR tone scheduler and WebAudio playback"
```

---

### Task 3: ExercisePlayer component tree

**Files:**
- Create: `src/components/academy/exercise-player/ExercisePlayer.tsx`
- Create: `src/components/academy/exercise-player/parseExercise.ts`
- Create: `src/components/academy/exercise-player/NotatedCard.tsx`
- Create: `src/components/academy/exercise-player/EarTrainingCard.tsx`
- Create: `src/components/academy/exercise-player/DictationCard.tsx`
- Create: `src/components/academy/exercise-player/EnsembleCard.tsx`
- Create: `src/components/academy/exercise-player/AssignmentCard.tsx`
- Test: `src/components/academy/exercise-player/parseExercise.test.ts`
- Test: `src/components/academy/exercise-player/ExercisePlayer.test.tsx`

**Interfaces:**
- Consumes: `isValidIr` (Task 1), `playIr` (Task 2), `irToEditorScore` from `@/lib/notation/fromIR`, `NotationView` from `@/pages/notation/NotationView` (props: `{ score: EditorScore; width?: number }`).
- Produces: `<ExercisePlayer exercise={{ id, type, data }} />` — the only export Task 4 mounts. `parseExercise(type: string, data: unknown): ParsedExercise | null` (discriminated union below); null → badge fallback.

- [ ] **Step 1: Write the failing parser test**

```ts
// src/components/academy/exercise-player/parseExercise.test.ts
import { describe, it, expect } from 'vitest';
import { parseExercise } from './parseExercise';
import type { ExerciseIR } from '@/lib/sightReading/ir';

const ir: ExerciseIR = {
  key: 'C', mode: 'major', tonicMidi: 60, meter: { beats: 4, beatType: 4 }, tempo: 90,
  notes: [{ midi: 60, beatPos: 0, durationBeats: 1, solfege: 'do', phraseIdx: 0 }],
  phrases: 1, difficulty: 1,
};

describe('parseExercise', () => {
  it('parses a melody with ir', () => {
    const p = parseExercise('melody', { ir, instructions: 'Sing it.' });
    expect(p).toMatchObject({ kind: 'notated', mode: 'pitch', deepLink: true });
  });
  it('parses rhythm as click mode without deep link', () => {
    const p = parseExercise('rhythm', { ir });
    expect(p).toMatchObject({ kind: 'notated', mode: 'click', deepLink: false });
  });
  it('parses segments without top-level ir', () => {
    const p = parseExercise('melody', { segments: [ir, ir] });
    expect(p?.kind).toBe('notated');
    if (p?.kind === 'notated') expect(p.segments).toHaveLength(2);
  });
  it('parses ear_training items', () => {
    const p = parseExercise('ear_training', { prompt: 'Which interval?', items: [{ ir, choices: ['M2', 'M3'], answer: 1 }] });
    expect(p?.kind).toBe('ear_training');
  });
  it('parses assignment', () => {
    const p = parseExercise('assignment', { instructions: ['Do x'], deliverables: ['Video'], rubric: [{ criterion: 'Pitch Accuracy', percent: 30 }] });
    expect(p?.kind).toBe('assignment');
  });
  it('parses ensemble parts and dictation', () => {
    expect(parseExercise('ensemble', { parts: [{ label: 'Voice 1', ir }] })?.kind).toBe('ensemble');
    expect(parseExercise('dictation', { prompt: 'Notate it', ir, playLimit: 3 })?.kind).toBe('dictation');
  });
  it('returns null for unknown types and malformed data', () => {
    expect(parseExercise('mystery', { ir })).toBeNull();
    expect(parseExercise('melody', {})).toBeNull();
    expect(parseExercise('melody', { ir: { key: 'C' } })).toBeNull();
    expect(parseExercise('ear_training', { prompt: 'x', items: [{ ir, choices: ['a'], answer: 5 }] })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/academy/exercise-player/parseExercise.test.ts`
Expected: FAIL — cannot resolve `./parseExercise`.

- [ ] **Step 3: Write the parser**

```ts
// src/components/academy/exercise-player/parseExercise.ts
import type { ExerciseIR } from '@/lib/sightReading/ir';
import { isValidIr } from '@/lib/sightReading/irValidate';

export type ParsedExercise =
  | { kind: 'notated'; mode: 'pitch' | 'click'; segments: ExerciseIR[]; instructions?: string;
      prepChecklist?: string[]; deepLink: boolean; modulation?: { atBeat: number; toKey: string } }
  | { kind: 'ear_training'; prompt: string;
      items: { ir: ExerciseIR; choices: string[]; answer: number; explanation?: string }[] }
  | { kind: 'dictation'; prompt: string; ir: ExerciseIR; playLimit: number }
  | { kind: 'ensemble'; instructions?: string; parts: { label: string; ir: ExerciseIR }[] }
  | { kind: 'assignment'; instructions: string[]; deliverables: string[];
      rubric: { criterion: string; percent: number }[] };

const strArr = (x: unknown): x is string[] => Array.isArray(x) && x.every((s) => typeof s === 'string');

export function parseExercise(type: string, data: unknown): ParsedExercise | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;

  if (type === 'melody' || type === 'solfege_drill' || type === 'rhythm') {
    const segments = Array.isArray(d.segments) ? d.segments : d.ir ? [d.ir] : [];
    if (segments.length === 0 || !segments.every(isValidIr)) return null;
    const mod = d.modulation as { atBeat: number; toKey: string } | undefined;
    return {
      kind: 'notated',
      mode: type === 'rhythm' ? 'click' : 'pitch',
      segments: segments as ExerciseIR[],
      instructions: typeof d.instructions === 'string' ? d.instructions : undefined,
      prepChecklist: strArr(d.prepChecklist) ? d.prepChecklist : undefined,
      deepLink: type === 'melody',
      modulation: mod && Number.isFinite(mod.atBeat) && typeof mod.toKey === 'string' ? mod : undefined,
    };
  }
  if (type === 'ear_training') {
    if (typeof d.prompt !== 'string' || !Array.isArray(d.items) || d.items.length === 0) return null;
    const items = d.items as { ir: unknown; choices: unknown; answer: unknown; explanation?: unknown }[];
    for (const it of items) {
      if (!isValidIr(it.ir) || !strArr(it.choices)) return null;
      if (typeof it.answer !== 'number' || it.answer < 0 || it.answer >= it.choices.length) return null;
    }
    return { kind: 'ear_training', prompt: d.prompt, items: items as ParsedExercise & { kind: 'ear_training' } extends { items: infer I } ? I : never };
  }
  if (type === 'dictation') {
    if (typeof d.prompt !== 'string' || !isValidIr(d.ir)) return null;
    const playLimit = typeof d.playLimit === 'number' && d.playLimit > 0 ? d.playLimit : 3;
    return { kind: 'dictation', prompt: d.prompt, ir: d.ir, playLimit };
  }
  if (type === 'ensemble') {
    if (!Array.isArray(d.parts) || d.parts.length === 0) return null;
    const parts = d.parts as { label: unknown; ir: unknown }[];
    if (!parts.every((p) => typeof p.label === 'string' && isValidIr(p.ir))) return null;
    return { kind: 'ensemble', parts: parts as { label: string; ir: ExerciseIR }[],
      instructions: typeof d.instructions === 'string' ? d.instructions : undefined };
  }
  if (type === 'assignment') {
    if (!strArr(d.instructions) || !strArr(d.deliverables) || !Array.isArray(d.rubric)) return null;
    const rubric = d.rubric as { criterion: unknown; percent: unknown }[];
    if (!rubric.every((r) => typeof r.criterion === 'string' && typeof r.percent === 'number')) return null;
    return { kind: 'assignment', instructions: d.instructions, deliverables: d.deliverables,
      rubric: rubric as { criterion: string; percent: number }[] };
  }
  return null;
}
```

Note: if the conditional-type trick on the `ear_training` return reads poorly in review, replace with a plain interface `EarItem { ir: ExerciseIR; choices: string[]; answer: number; explanation?: string }` and cast to `EarItem[]` — behavior identical, do whichever typechecks cleanly.

- [ ] **Step 4: Run parser test to verify it passes**

Run: `npx vitest run src/components/academy/exercise-player/parseExercise.test.ts`
Expected: PASS (7 tests). If the `ear_training` return type fails `tsc`, apply the `EarItem[]` simplification from the note above.

- [ ] **Step 5: Write the cards**

```tsx
// src/components/academy/exercise-player/NotatedCard.tsx
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, ExternalLink, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotationView } from '@/pages/notation/NotationView';
import { irToEditorScore } from '@/lib/notation/fromIR';
import { playIr } from '@/lib/sightReading/irPlayback';
import type { ParsedExercise } from './parseExercise';

export function NotatedCard({ ex, exerciseId, title }: {
  ex: Extract<ParsedExercise, { kind: 'notated' }>; exerciseId: string; title: string;
}) {
  const navigate = useNavigate();
  const [playing, setPlaying] = useState(false);
  const scores = useMemo(() => ex.segments.map((s) => irToEditorScore(s)), [ex.segments]);

  const play = async () => {
    if (playing) return;
    setPlaying(true);
    try {
      for (const seg of ex.segments) await playIr(seg, ex.mode);
    } finally {
      setPlaying(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={play} disabled={playing}>
            {playing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Play className="w-4 h-4 mr-1.5" />}
            {ex.mode === 'click' ? 'Play rhythm' : 'Play'}
          </Button>
          {ex.deepLink && (
            <Button type="button" size="sm"
              onClick={() => navigate(`/dashboard/sight-reading?academyExercise=${exerciseId}`)}>
              <ExternalLink className="w-4 h-4 mr-1.5" /> Practice with pitch tracker
            </Button>
          )}
        </div>
      </div>
      {ex.instructions && <p className="text-sm text-foreground/85">{ex.instructions}</p>}
      {ex.modulation && (
        <p className="text-xs text-muted-foreground">
          Modulates to {ex.modulation.toKey} at beat {ex.modulation.atBeat}. Re-establish solfège in the new key.
        </p>
      )}
      {scores.map((s, i) => (
        <div key={i}>
          <NotationView score={s} />
          <p className="mt-1 text-xs text-muted-foreground">
            {ex.segments[i].key} {ex.segments[i].mode} · {ex.segments[i].meter.beats}/{ex.segments[i].meter.beatType} · {ex.segments[i].tempo} bpm
          </p>
        </div>
      ))}
      {ex.prepChecklist && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Preparation checklist</summary>
          <ol className="list-decimal ml-5 mt-1 space-y-0.5 text-foreground/85">
            {ex.prepChecklist.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </details>
      )}
    </div>
  );
}
```

```tsx
// src/components/academy/exercise-player/EarTrainingCard.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Check, X as XIcon, Loader2 } from 'lucide-react';
import { playIr } from '@/lib/sightReading/irPlayback';
import type { ParsedExercise } from './parseExercise';

export function EarTrainingCard({ ex, title }: {
  ex: Extract<ParsedExercise, { kind: 'ear_training' }>; title: string;
}) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [playing, setPlaying] = useState(false);
  const item = ex.items[idx];
  const done = idx >= ex.items.length;

  const play = async () => {
    if (playing || done) return;
    setPlaying(true);
    try { await playIr(item.ir, 'pitch'); } finally { setPlaying(false); }
  };
  const pick = (i: number) => {
    if (picked !== null || done) return;
    setPicked(i);
    if (i === item.answer) setScore((s) => s + 1);
  };
  const next = () => { setPicked(null); setIdx((i) => i + 1); };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">
          {done ? `Score: ${score}/${ex.items.length}` : `${idx + 1} of ${ex.items.length}`}
        </span>
      </div>
      <p className="text-sm text-foreground/85">{ex.prompt}</p>
      {done ? (
        <Button type="button" variant="outline" size="sm"
          onClick={() => { setIdx(0); setScore(0); setPicked(null); }}>
          Try again
        </Button>
      ) : (
        <>
          <Button type="button" variant="outline" size="sm" onClick={play} disabled={playing}>
            {playing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Play className="w-4 h-4 mr-1.5" />}
            Play example
          </Button>
          <div className="flex flex-wrap gap-2">
            {item.choices.map((c, i) => {
              const isAnswer = picked !== null && i === item.answer;
              const isWrongPick = picked === i && i !== item.answer;
              return (
                <Button key={i} type="button" size="sm"
                  variant={isAnswer ? 'default' : 'outline'}
                  className={isWrongPick ? 'border-destructive text-destructive' : ''}
                  onClick={() => pick(i)}>
                  {isAnswer && <Check className="w-4 h-4 mr-1" />}
                  {isWrongPick && <XIcon className="w-4 h-4 mr-1" />}
                  {c}
                </Button>
              );
            })}
          </div>
          {picked !== null && (
            <div className="space-y-2">
              {item.explanation && <p className="text-xs text-muted-foreground">{item.explanation}</p>}
              <Button type="button" size="sm" onClick={next}>
                {idx + 1 < ex.items.length ? 'Next' : 'Finish'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

```tsx
// src/components/academy/exercise-player/DictationCard.tsx
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Eye, Loader2 } from 'lucide-react';
import { NotationView } from '@/pages/notation/NotationView';
import { irToEditorScore } from '@/lib/notation/fromIR';
import { playIr } from '@/lib/sightReading/irPlayback';
import type { ParsedExercise } from './parseExercise';

export function DictationCard({ ex, title }: {
  ex: Extract<ParsedExercise, { kind: 'dictation' }>; title: string;
}) {
  const [plays, setPlays] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const score = useMemo(() => irToEditorScore(ex.ir), [ex.ir]);

  const play = async () => {
    if (playing || plays >= ex.playLimit) return;
    setPlaying(true);
    setPlays((p) => p + 1);
    try { await playIr(ex.ir, 'pitch'); } finally { setPlaying(false); }
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <span className="text-sm font-medium text-foreground">{title}</span>
      <p className="text-sm text-foreground/85">{ex.prompt}</p>
      <div className="flex gap-2 flex-wrap">
        <Button type="button" variant="outline" size="sm" onClick={play}
          disabled={playing || plays >= ex.playLimit}>
          {playing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Play className="w-4 h-4 mr-1.5" />}
          Play ({ex.playLimit - plays} left)
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setRevealed(true)} disabled={revealed}>
          <Eye className="w-4 h-4 mr-1.5" /> Reveal answer
        </Button>
      </div>
      {revealed && <NotationView score={score} />}
    </div>
  );
}
```

```tsx
// src/components/academy/exercise-player/EnsembleCard.tsx
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Users, Loader2 } from 'lucide-react';
import { NotationView } from '@/pages/notation/NotationView';
import { irToEditorScore } from '@/lib/notation/fromIR';
import { playIr } from '@/lib/sightReading/irPlayback';
import type { ParsedExercise } from './parseExercise';

export function EnsembleCard({ ex, title }: {
  ex: Extract<ParsedExercise, { kind: 'ensemble' }>; title: string;
}) {
  const [busy, setBusy] = useState(false);
  const scores = useMemo(() => ex.parts.map((p) => irToEditorScore(p.ir)), [ex.parts]);

  const playPart = async (i: number) => {
    if (busy) return;
    setBusy(true);
    try { await playIr(ex.parts[i].ir, 'pitch'); } finally { setBusy(false); }
  };
  const playAll = async () => {
    if (busy) return;
    setBusy(true);
    try { await Promise.all(ex.parts.map((p) => playIr(p.ir, 'pitch'))); } finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <Button type="button" variant="outline" size="sm" onClick={playAll} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Users className="w-4 h-4 mr-1.5" />}
          Play all parts
        </Button>
      </div>
      {ex.instructions && <p className="text-sm text-foreground/85">{ex.instructions}</p>}
      {ex.parts.map((p, i) => (
        <div key={i}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{p.label}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => playPart(i)} disabled={busy}>
              <Play className="w-4 h-4" />
            </Button>
          </div>
          <NotationView score={scores[i]} />
        </div>
      ))}
    </div>
  );
}
```

```tsx
// src/components/academy/exercise-player/AssignmentCard.tsx
import { ClipboardList } from 'lucide-react';
import type { ParsedExercise } from './parseExercise';

export function AssignmentCard({ ex, title }: {
  ex: Extract<ParsedExercise, { kind: 'assignment' }>; title: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-1.5">
        <ClipboardList className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      <ol className="list-decimal ml-5 space-y-1 text-sm text-foreground/85">
        {ex.instructions.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Submit</div>
        <ul className="list-disc ml-5 space-y-0.5 text-sm text-foreground/85">
          {ex.deliverables.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </div>
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Grading</div>
        <table className="text-sm w-full max-w-sm">
          <tbody>
            {ex.rubric.map((r, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
                <td className="py-1 text-foreground/85">{r.criterion}</td>
                <td className="py-1 text-right text-muted-foreground">{r.percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

```tsx
// src/components/academy/exercise-player/ExercisePlayer.tsx
import { Badge } from '@/components/ui/badge';
import { parseExercise } from './parseExercise';
import { NotatedCard } from './NotatedCard';
import { EarTrainingCard } from './EarTrainingCard';
import { DictationCard } from './DictationCard';
import { EnsembleCard } from './EnsembleCard';
import { AssignmentCard } from './AssignmentCard';

const TITLES: Record<string, string> = {
  solfege_drill: 'Solfège drill', melody: 'Sight-singing melody', rhythm: 'Rhythm exercise',
  ear_training: 'Ear training', dictation: 'Dictation', ensemble: 'Ensemble', assignment: 'Module assignment',
};

export function ExercisePlayer({ exercise }: {
  exercise: { id: string; type: string; data: unknown };
}) {
  const parsed = parseExercise(exercise.type, exercise.data);
  const title = TITLES[exercise.type] ?? exercise.type.replace(/_/g, ' ');
  // Unknown types and malformed data keep the legacy badge — a bad row never crashes a lesson.
  if (!parsed) {
    return <Badge variant="outline" className="text-xs">{exercise.type.replace(/_/g, ' ')}</Badge>;
  }
  switch (parsed.kind) {
    case 'notated': return <NotatedCard ex={parsed} exerciseId={exercise.id} title={title} />;
    case 'ear_training': return <EarTrainingCard ex={parsed} title={title} />;
    case 'dictation': return <DictationCard ex={parsed} title={title} />;
    case 'ensemble': return <EnsembleCard ex={parsed} title={title} />;
    case 'assignment': return <AssignmentCard ex={parsed} title={title} />;
  }
}
```

- [ ] **Step 6: Write the component smoke test (mock NotationView — VexFlow doesn't render in jsdom)**

```tsx
// src/components/academy/exercise-player/ExercisePlayer.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ExercisePlayer } from './ExercisePlayer';
import type { ExerciseIR } from '@/lib/sightReading/ir';

vi.mock('@/pages/notation/NotationView', () => ({
  NotationView: () => <div data-testid="notation" />,
}));

const ir: ExerciseIR = {
  key: 'C', mode: 'major', tonicMidi: 60, meter: { beats: 4, beatType: 4 }, tempo: 90,
  notes: [{ midi: 60, beatPos: 0, durationBeats: 1, solfege: 'do', phraseIdx: 0 }],
  phrases: 1, difficulty: 1,
};

describe('ExercisePlayer', () => {
  it('renders a badge fallback for unknown types', () => {
    render(<MemoryRouter><ExercisePlayer exercise={{ id: '1', type: 'mystery_thing', data: {} }} /></MemoryRouter>);
    expect(screen.getByText('mystery thing')).toBeTruthy();
  });
  it('renders a melody card with notation and deep link', () => {
    render(<MemoryRouter><ExercisePlayer exercise={{ id: 'abc', type: 'melody', data: { ir } }} /></MemoryRouter>);
    expect(screen.getByTestId('notation')).toBeTruthy();
    expect(screen.getByText(/Practice with pitch tracker/i)).toBeTruthy();
  });
  it('renders an assignment card with rubric', () => {
    render(<MemoryRouter><ExercisePlayer exercise={{ id: '2', type: 'assignment', data: {
      instructions: ['Sing the scale'], deliverables: ['One video'],
      rubric: [{ criterion: 'Pitch Accuracy', percent: 30 }],
    } }} /></MemoryRouter>);
    expect(screen.getByText('Sing the scale')).toBeTruthy();
    expect(screen.getByText('30%')).toBeTruthy();
  });
});
```

- [ ] **Step 7: Run the tests**

Run: `npx vitest run src/components/academy/exercise-player/`
Expected: PASS (parser 7, player 3). If jsdom complains about missing `AudioContext`, no fix needed — `playIr` guards on `window.AudioContext` and none of these tests trigger playback.

- [ ] **Step 8: Typecheck the new tree**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep exercise-player`
Expected: no output (note: repo-wide `tsc --noEmit` may show pre-existing noise; only exercise-player lines matter here).

- [ ] **Step 9: Commit**

```bash
git add src/components/academy/exercise-player/
git commit -m "feat(academy): ExercisePlayer — interactive notated exercises for template courses"
```

---

### Task 4: Mount ExercisePlayer in TemplateCoursePage

**Files:**
- Modify: `src/pages/academy/TemplateCoursePage.tsx:464-475` (the Exercises badge block)

**Interfaces:**
- Consumes: `ExercisePlayer` (Task 3). The page's query already fetches `gw_academy_exercises(id, sort_order, type, data)` — no query change.

- [ ] **Step 1: Replace the badge block**

In `TemplateCoursePage.tsx`, add the import:

```tsx
import { ExercisePlayer } from '@/components/academy/exercise-player/ExercisePlayer';
```

Replace this block (currently lines 464–475):

```tsx
          {lesson.gw_academy_exercises.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Exercises</div>
              <div className="flex flex-wrap gap-1.5">
                {lesson.gw_academy_exercises.map((ex) => (
                  <Badge key={ex.id} variant="outline" className="text-xs">
                    {ex.type.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}
```

with:

```tsx
          {lesson.gw_academy_exercises.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Exercises</div>
              <div className="space-y-3">
                {lesson.gw_academy_exercises.map((ex) => (
                  <ExercisePlayer key={ex.id} exercise={ex} />
                ))}
              </div>
            </div>
          )}
```

(`Badge` stays imported — the page header still uses it.)

- [ ] **Step 2: Verify the page compiles and existing tests still pass**

Run: `npm test`
Expected: PASS (full suite; nothing else consumed the badge block).

- [ ] **Step 3: Commit**

```bash
git add src/pages/academy/TemplateCoursePage.tsx
git commit -m "feat(academy): render interactive exercises on template course page"
```

---

### Task 5: Sight Reading Studio deep-link loader

**Files:**
- Modify: `src/pages/sightReading/SightReadingStudio.tsx`

**Interfaces:**
- Consumes: `isValidIr` (Task 1); URL shape from Task 3's NotatedCard: `/dashboard/sight-reading?academyExercise=<gw_academy_exercises.id>`.
- Behavior: on mount with the param, fetch the row, validate `data.ir`, and enter `SingFlow` with it. Missing/invalid → toast + normal studio (fallback per spec).

- [ ] **Step 1: Add the loader effect**

In `SightReadingStudio.tsx` add imports:

```tsx
import { isValidIr } from '@/lib/sightReading/irValidate';
import { toast } from 'sonner';
```

Inside `SightReadingStudio()` (after the `initialTab` line), add:

```tsx
  // Deep link from a Glee Academy template course: load that exercise's IR into
  // the practice flow instead of a generated line. Invalid/missing → toast and
  // fall back to the normal studio.
  const academyExerciseId = searchParams.get('academyExercise');
  useEffect(() => {
    if (!academyExerciseId) return;
    let cancelled = false;
    supabase
      .from('gw_academy_exercises')
      .select('id, data')
      .eq('id', academyExerciseId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        const ir = (data?.data as { ir?: unknown } | null)?.ir;
        if (error || !isValidIr(ir)) {
          toast.error('Could not load that exercise — generating a practice line instead.');
          return;
        }
        setExercise(ir);
      });
    return () => {
      cancelled = true;
    };
  }, [academyExerciseId]);
```

(`useEffect` is already imported; `supabase` is already imported.)

- [ ] **Step 2: Verify behavior locally**

Run: `npm run build` (or `npx vite build`)
Expected: build succeeds. Full E2E click-through happens in Task 9.

- [ ] **Step 3: Commit**

```bash
git add src/pages/sightReading/SightReadingStudio.tsx
git commit -m "feat(sight-reading): load academy template exercises via ?academyExercise deep link"
```

---

### Task 6: Generator engine (`scripts/ssat/engine.mjs`)

**Files:**
- Create: `scripts/ssat/engine.mjs`
- Test: `scripts/ssat/engine.test.mjs`

**Interfaces (all exported from engine.mjs, consumed by Task 7's college.mjs and Task 8's main script):**
- `mulberry32(seed: number): () => number` and `hashSeed(s: string): number`
- `SOLFEGE`, `KEY_TO_MIDI`, `midiToSolfege(midi, tonicMidi)` — mirrors of `src/lib/sightReading/ir.ts` (the .mjs script can't import TS; keep values identical)
- `note(midi, beatPos, durationBeats, tonicMidi)` → IRNote (solfège auto-filled)
- `irFromDegrees({ key, mode, tempo, meter, degrees, durations, octave? })` → hand-authored drills: `degrees` are semitone offsets from tonic; `durations` beat values
- `makeRhythm({ meter, bars, palette, seed })` → `{ cells: Array<{ d: number, rest: boolean }> }` filled measure-exact from palette
- `makeMelody(spec)` → ExerciseIR. Spec: `{ key, mode, meter, tempo, bars, seed, range: [loMidi, hiMidi], leaps: number[] (allowed |semitone| jumps beyond 2), rhythmPalette, start?: number[] (allowed opening degrees, default [0,4,7]), chromatic?: { count: number }, endOnTonic?: boolean (default true) }`
- `assertValidExercise(ir)` → throws with a descriptive message on: non-contiguous rhythm misfit, duration not in whitelist, barline crossing, midi out of range, unsorted notes
- `concatIrs(irs: ExerciseIR[]): ExerciseIR` — sequential concat (for modulation: solfège of each segment computed against its own tonic before concat)

**Musicality rules `makeMelody` must implement (this is the pedagogy — do not simplify away):**
1. Pitch walk in scale-degree space over the mode's scale (major `[0,2,4,5,7,9,11]`, natural minor `[0,2,3,5,7,8,10]`, harmonic minor `[0,2,3,5,7,8,11]`, melodic minor ascending `[0,2,3,5,7,9,11]` — spec's `scale` option selects, default per mode).
2. Steps (±1 scale degree) are the default move; a leap is only taken when its interval in semitones ∈ `spec.leaps`, never twice in a row, and is always followed by a step in the opposite direction (leap recovery).
3. Range enforced hard; when the walk hits a bound, force direction inward.
4. Last note = tonic (do) when `endOnTonic`; penultimate note forced to re or ti (approach by step).
5. `chromatic.count` chromatic passing tones: post-process — find notes ≥ 1 beat whose next pitch is 2 semitones away, split into two halves (each half in the duration whitelist, else skip that site), the second half a chromatic passing tone; label solfège from the chromatic table; stop after `count` insertions; throw if fewer than `count` sites found (spec author picks a longer melody).
6. Rhythm from `makeRhythm`; rests only where the palette cell says rest (melodies use rest-free palettes; rhythm exercises may include rests).

- [ ] **Step 1: Write the failing test**

```js
// scripts/ssat/engine.test.mjs
import { describe, it, expect } from 'vitest';
import {
  mulberry32, hashSeed, makeMelody, makeRhythm, irFromDegrees, assertValidExercise, concatIrs,
} from './engine.mjs';

const beatsOf = (ir) => ir.notes.reduce((s, n) => Math.max(s, n.beatPos + n.durationBeats), 0);

describe('engine determinism', () => {
  it('same seed → identical melody; different seed → different', () => {
    const spec = { key: 'C', mode: 'major', meter: { beats: 4, beatType: 4 }, tempo: 90, bars: 8,
      seed: hashSeed('w1-melody'), range: [60, 72], leaps: [], rhythmPalette: [[1], [2], [1, 1]] };
    expect(JSON.stringify(makeMelody(spec))).toBe(JSON.stringify(makeMelody(spec)));
    expect(JSON.stringify(makeMelody({ ...spec, seed: hashSeed('other') })))
      .not.toBe(JSON.stringify(makeMelody(spec)));
  });
});

describe('makeMelody constraints', () => {
  const spec = { key: 'G', mode: 'major', meter: { beats: 4, beatType: 4 }, tempo: 90, bars: 8,
    seed: 42, range: [62, 79], leaps: [3, 4, 5], rhythmPalette: [[1], [1, 1], [2]] };
  const ir = makeMelody(spec);
  it('fills exactly bars × beats and validates', () => {
    expect(beatsOf(ir)).toBe(32);
    expect(() => assertValidExercise(ir)).not.toThrow();
  });
  it('stays in range and ends on the tonic', () => {
    for (const n of ir.notes) { expect(n.midi).toBeGreaterThanOrEqual(62); expect(n.midi).toBeLessThanOrEqual(79); }
    expect(ir.notes[ir.notes.length - 1].solfege).toBe('do');
  });
  it('never leaps outside the allowed set and recovers by step', () => {
    for (let i = 1; i < ir.notes.length; i++) {
      const iv = Math.abs(ir.notes[i].midi - ir.notes[i - 1].midi);
      expect(iv === 0 || iv <= 2 || spec.leaps.includes(iv)).toBe(true);
    }
  });
  it('stepwise-only spec never leaps', () => {
    const s = makeMelody({ ...spec, leaps: [], seed: 7 });
    for (let i = 1; i < s.notes.length; i++) {
      expect(Math.abs(s.notes[i].midi - s.notes[i - 1].midi)).toBeLessThanOrEqual(2);
    }
  });
  it('inserts the requested number of chromatic tones', () => {
    const c = makeMelody({ ...spec, seed: 11, chromatic: { count: 3 } });
    const chroma = c.notes.filter((n) => ['ra', 'me', 'fi', 'le', 'te'].includes(n.solfege));
    expect(chroma.length).toBeGreaterThanOrEqual(3);
    expect(() => assertValidExercise(c)).not.toThrow();
  });
});

describe('makeRhythm + compound meter', () => {
  it('6/8 melody validates with eighth-unit palette', () => {
    const ir = makeMelody({ key: 'F', mode: 'major', meter: { beats: 6, beatType: 8 }, tempo: 200,
      bars: 8, seed: 3, range: [60, 77], leaps: [3, 4], rhythmPalette: [[3], [1, 1, 1], [2, 1]] });
    expect(beatsOf(ir)).toBe(48);
    expect(() => assertValidExercise(ir)).not.toThrow();
  });
});

describe('assertValidExercise', () => {
  it('throws on barline crossing and bad durations', () => {
    const base = irFromDegrees({ key: 'C', mode: 'major', tempo: 90,
      meter: { beats: 4, beatType: 4 }, degrees: [0, 2, 4], durations: [1, 1, 2] });
    expect(() => assertValidExercise(base)).not.toThrow();
    const crossing = { ...base, notes: [{ ...base.notes[0], beatPos: 3, durationBeats: 2 }] };
    expect(() => assertValidExercise(crossing)).toThrow(/barline/);
    const badDur = { ...base, notes: [{ ...base.notes[0], durationBeats: 1.25 }] };
    expect(() => assertValidExercise(badDur)).toThrow(/duration/);
  });
});

describe('concatIrs', () => {
  it('offsets the second segment after the first', () => {
    const a = irFromDegrees({ key: 'C', mode: 'major', tempo: 90, meter: { beats: 4, beatType: 4 }, degrees: [0, 4, 7, 0], durations: [1, 1, 1, 1] });
    const b = irFromDegrees({ key: 'G', mode: 'major', tempo: 90, meter: { beats: 4, beatType: 4 }, degrees: [0, 4, 7, 0], durations: [1, 1, 1, 1] });
    const joined = concatIrs([a, b]);
    expect(joined.notes).toHaveLength(8);
    expect(joined.notes[4].beatPos).toBe(4);
    expect(joined.notes[4].solfege).toBe('do'); // solfège kept from segment B's own tonic
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/ssat/engine.test.mjs`
Expected: FAIL — cannot resolve `./engine.mjs`.

- [ ] **Step 3: Write the engine**

```js
// scripts/ssat/engine.mjs
// Deterministic melody/rhythm engine for the Sight Singing & Aural Skills template
// courses. Mirrors src/lib/sightReading/ir.ts conventions (solfège table, key map,
// durations in beatType units). Node-only — never imported by app code.

export const SOLFEGE = ['do', 'ra', 're', 'me', 'mi', 'fa', 'fi', 'sol', 'le', 'la', 'te', 'ti'];
export const KEY_TO_MIDI = { C: 60, D: 62, Eb: 63, E: 64, F: 65, G: 67, A: 69, Bb: 70 };
export const midiToSolfege = (midi, tonicMidi) => SOLFEGE[(((midi - tonicMidi) % 12) + 12) % 12];

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashSeed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  natural: [0, 2, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  melodic: [0, 2, 3, 5, 7, 9, 11],
};
const DUR_WHITELIST = { 4: [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4], 8: [0.5, 1, 1.5, 2, 3, 4, 6], 2: [0.5, 1, 1.5, 2] };

export function note(midi, beatPos, durationBeats, tonicMidi) {
  return { midi, beatPos, durationBeats, solfege: midiToSolfege(midi, tonicMidi), phraseIdx: 0 };
}

export function irFromDegrees({ key, mode, tempo, meter, degrees, durations, octave = 0 }) {
  const tonicMidi = KEY_TO_MIDI[key] + octave * 12;
  let pos = 0;
  const notes = degrees.map((deg, i) => {
    const n = note(tonicMidi + deg, pos, durations[i], tonicMidi);
    pos += durations[i];
    return n;
  });
  return { key, mode, tonicMidi, meter, tempo, notes, phrases: 1, difficulty: 1 };
}

// Fill `bars` measures exactly from palette cells. A cell is an array of durations,
// each optionally an object { d, rest: true } — plain numbers are sounding notes.
export function makeRhythm({ meter, bars, palette, seed }) {
  const rng = mulberry32(seed);
  const cellDur = (cell) => cell.reduce((s, x) => s + (typeof x === 'number' ? x : x.d), 0);
  const cells = [];
  for (let bar = 0; bar < bars; bar++) {
    let left = meter.beats;
    while (left > 1e-6) {
      const fits = palette.filter((c) => cellDur(c) <= left + 1e-6);
      if (!fits.length) throw new Error(`makeRhythm: no palette cell fits remaining ${left} beats — include a filler cell`);
      const cell = pick(rng, fits);
      for (const x of cell) cells.push(typeof x === 'number' ? { d: x, rest: false } : { d: x.d, rest: !!x.rest });
      left -= cellDur(cell);
    }
  }
  return { cells };
}

export function makeMelody(spec) {
  const { key, mode, meter, tempo, bars, seed, range, leaps = [], rhythmPalette,
          start = [0, 4, 7], chromatic, endOnTonic = true, scale } = spec;
  const rng = mulberry32(seed);
  const tonicMidi = KEY_TO_MIDI[key];
  const scaleSemis = SCALES[scale ?? (mode === 'minor' ? 'natural' : 'major')];

  // All scale pitches inside the range, ascending; melody indexes into this ladder.
  const ladder = [];
  for (let m = range[0]; m <= range[1]; m++) {
    if (scaleSemis.includes((((m - tonicMidi) % 12) + 12) % 12)) ladder.push(m);
  }
  const idxOfNearest = (midi) => {
    let best = 0;
    for (let i = 1; i < ladder.length; i++) if (Math.abs(ladder[i] - midi) < Math.abs(ladder[best] - midi)) best = i;
    return best;
  };

  const { cells } = makeRhythm({ meter, bars, palette: rhythmPalette, seed: seed ^ 0x9e3779b9 });
  const sounding = cells.filter((c) => !c.rest).length;

  // Walk the ladder: steps by default, allowed leaps sometimes, leap recovery by
  // contrary step, hard range bounds, cadence re/ti → do.
  const startMidis = start.map((deg) => tonicMidi + deg).filter((m) => m >= range[0] && m <= range[1]);
  let idx = idxOfNearest(pick(rng, startMidis.length ? startMidis : [tonicMidi]));
  const pitches = [ladder[idx]];
  let lastWasLeap = false;
  let lastDir = 1;
  for (let i = 1; i < sounding; i++) {
    const candidates = [];
    for (let j = 0; j < ladder.length; j++) {
      const iv = Math.abs(ladder[j] - ladder[idx]);
      const isStep = j !== idx && Math.abs(j - idx) === 1;
      const isLeap = iv > 2 && leaps.includes(iv);
      const isRepeat = j === idx;
      if (!isStep && !isLeap && !isRepeat) continue;
      if (isLeap && lastWasLeap) continue;
      if (lastWasLeap) { // recovery: contrary step only
        if (!isStep || Math.sign(j - idx) === lastDir) continue;
      }
      // weights: steps 5, repeats 1, leaps 2
      const w = isStep ? 5 : isLeap ? 2 : 1;
      for (let k = 0; k < w; k++) candidates.push(j);
    }
    const next = candidates.length ? pick(rng, candidates) : Math.max(0, idx - 1);
    lastWasLeap = Math.abs(ladder[next] - ladder[idx]) > 2;
    lastDir = Math.sign(next - idx) || lastDir;
    idx = next;
    pitches.push(ladder[idx]);
  }

  if (endOnTonic && sounding >= 3) {
    // Nearest tonic to the walk's end, approached from re (above) or ti (below).
    const tonics = ladder.filter((m) => (((m - tonicMidi) % 12) + 12) % 12 === 0);
    const finalDo = tonics.reduce((a, b) => (Math.abs(b - pitches[sounding - 1]) < Math.abs(a - pitches[sounding - 1]) ? b : a));
    const doIdx = ladder.indexOf(finalDo);
    pitches[sounding - 1] = finalDo;
    pitches[sounding - 2] = ladder[doIdx + 1] ?? ladder[doIdx - 1]; // re above (or ti below at ladder top)
  }

  // Lay pitches onto the rhythm.
  const notes = [];
  let pos = 0, p = 0;
  for (const c of cells) {
    if (!c.rest) notes.push(note(pitches[p++], pos, c.d, tonicMidi));
    pos += c.d;
  }
  let ir = { key, mode, tonicMidi, meter, tempo, notes, phrases: Math.max(1, Math.round(bars / 4)), difficulty: 1 };

  if (chromatic?.count) ir = insertChromatics(ir, chromatic.count, rng);
  assertValidExercise(ir);
  return ir;
}

// Split whole-step moves into two halves with a chromatic passing tone between.
function insertChromatics(ir, count, rng) {
  const whitelist = DUR_WHITELIST[ir.meter.beatType] ?? DUR_WHITELIST[4];
  const notes = ir.notes.map((n) => ({ ...n }));
  const sites = [];
  for (let i = 0; i < notes.length - 1; i++) {
    const iv = notes[i + 1].midi - notes[i].midi;
    const half = notes[i].durationBeats / 2;
    const sameBar = Math.floor(notes[i].beatPos / ir.meter.beats)
      === Math.floor((notes[i].beatPos + notes[i].durationBeats - 1e-6) / ir.meter.beats);
    if (Math.abs(iv) === 2 && whitelist.includes(half) && sameBar) sites.push(i);
  }
  if (sites.length < count) throw new Error(`insertChromatics: only ${sites.length} sites for ${count} chromatics — lengthen the melody or relax the rhythm`);
  // deterministic pick: shuffle sites with rng, take `count`, apply right-to-left
  const shuffled = [...sites];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const chosen = shuffled.slice(0, count).sort((a, b) => b - a);
  for (const i of chosen) {
    const n = notes[i];
    const dir = Math.sign(notes[i + 1].midi - n.midi);
    const half = n.durationBeats / 2;
    const passing = note(n.midi + dir, n.beatPos + half, half, ir.tonicMidi);
    n.durationBeats = half;
    notes.splice(i + 1, 0, passing);
  }
  return { ...ir, notes };
}

export function concatIrs(irs) {
  const first = irs[0];
  let offset = 0;
  const notes = [];
  for (const ir of irs) {
    for (const n of ir.notes) notes.push({ ...n, beatPos: n.beatPos + offset });
    offset += ir.notes.reduce((s, n) => Math.max(s, n.beatPos + n.durationBeats), 0);
  }
  return { ...first, notes };
}

export function assertValidExercise(ir) {
  const whitelist = DUR_WHITELIST[ir.meter.beatType];
  if (!whitelist) throw new Error(`no duration whitelist for beatType ${ir.meter.beatType}`);
  let cursor = 0;
  for (const n of ir.notes) {
    if (n.beatPos < cursor - 1e-6) throw new Error(`overlap/unsorted at beat ${n.beatPos}`);
    if (!whitelist.some((d) => Math.abs(d - n.durationBeats) < 1e-6)) {
      throw new Error(`duration ${n.durationBeats} not renderable (beatType ${ir.meter.beatType})`);
    }
    const startBar = Math.floor((n.beatPos + 1e-6) / ir.meter.beats);
    const endBar = Math.floor((n.beatPos + n.durationBeats - 1e-6) / ir.meter.beats);
    if (startBar !== endBar) throw new Error(`note at beat ${n.beatPos} crosses a barline`);
    if (n.midi < 36 || n.midi > 96) throw new Error(`midi ${n.midi} out of range`);
    cursor = n.beatPos + n.durationBeats;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/ssat/engine.test.mjs`
Expected: PASS. If the chromatic test fails on "only N sites", bump that spec's melody to more bars or use palette `[[1],[2]]` (longer note values → more insertable sites) — adjust the test spec, not the rule.

- [ ] **Step 5: Commit**

```bash
git add scripts/ssat/engine.mjs scripts/ssat/engine.test.mjs
git commit -m "feat(ssat): deterministic melody/rhythm generator engine"
```

---

### Task 7: College course content (`scripts/ssat/college.mjs`)

**Files:**
- Create: `scripts/ssat/college.mjs`
- Test: `scripts/ssat/college.test.mjs`

**Interfaces:**
- Produces: `buildCollegeCourse(): { slug, title, level, grades, description, units[] }` in the exact seed-script JSON shape, plus `SSAT_RUBRIC` and `PREP_CHECKLIST` consts.
- Consumes: everything from `engine.mjs`.

**Content authority:** the spec's Appendix A. Every week: unit `Week N: <Title>` with 3 lessons (`Concepts & Warm-ups`, `Guided Practice`, `Module Assignment N: <Title>`). Lesson `content` text is condensed from Appendix A (2–5 sentences); objectives 3–4 bullets; assignment exercises carry Appendix A's instructions/deliverables verbatim-condensed; every assignment uses `SSAT_RUBRIC`.

Shared consts:

```js
export const SSAT_RUBRIC = [
  { criterion: 'Pitch Accuracy', percent: 30 },
  { criterion: 'Rhythmic Accuracy', percent: 30 },
  { criterion: 'Solfège and Music-Reading Accuracy', percent: 15 },
  { criterion: 'Steady Tempo and Conducting', percent: 10 },
  { criterion: 'Tone, Intonation, and Musicianship', percent: 10 },
  { criterion: 'Submission Quality and Reflection', percent: 5 },
];
export const PREP_CHECKLIST = [
  'Identify the key and establish tonic.',
  'Sing the scale and tonic triad.',
  'Identify the meter and conduct the beat pattern.',
  'Scan the rhythm without singing.',
  'Locate difficult intervals and altered pitches.',
  'Examine the opening and closing pitch.',
  'Audiate the first phrase.',
  'Begin at a steady, manageable tempo.',
  'Continue through minor errors without stopping.',
  'Evaluate the performance after completion.',
];
```

**Exercise manifest — implement each row exactly.** Common palettes: `Q = [[1], [1, 1], [2]]` (quarters/halves), `E = [[1], [0.5, 0.5], [1, 1], [1.5, 0.5], [2]]` (adds eighths + dotted-quarter-eighth), `SYNC = [[0.5, 1, 0.5], [0.5, 0.5, 0.5, 0.5], [0.75, 0.25], [1, 0.5, 0.5], [2]]` (offbeats, sixteenth pairs, dotted-eighth-sixteenth), `C68 = [[3], [1, 1, 1], [2, 1], [1.5, 0.5, 1]]` (compound, eighth units). Tempi: melodies 80–92, rhythms 72–84 (quarter) / 60 dotted-quarter (compound = eighth-bpm ≈ 180). Range default `[57, 76]` (A3–E5, mixed-voice-friendly; median keeps treble clef).

| Wk | Lesson | Exercises (type — construction) |
|---|---|---|
| 1 | Concepts | `solfege_drill` C major scale up+down (irFromDegrees `[0,2,4,5,7,9,11,12,12,11,9,7,5,4,2,0]`, all beats 1, 4/4, 80); `solfege_drill` do–sol–do (`[0,7,0]`, durations `[2,2,4]`) |
| 1 | Guided | `melody` gen: C, 8 bars, 4/4, leaps `[]` (stepwise), palette Q, prepChecklist: PREP_CHECKLIST; `ear_training` "Which scale degree ends this fragment?" 4 items: 2-note fragments do–sol / do–mi / sol–do / mi–do (irFromDegrees), choices `['do','mi','sol']` |
| 1 | Assignment | `assignment` Module 1 (Appendix A W1: scale, do–sol–do, 8-bar stepwise melody recording, reflection with 2 strengths + 2 improvements) |
| 2 | Concepts | `solfege_drill` tonic-triad arpeggio do-mi-sol-do'-sol-mi-do (durations 1); `rhythm` gen 4 bars in 3/4 palette Q |
| 2 | Guided | 3× `melody` gen: one each 2/4, 3/4, 4/4 (keys C, G, F), 8 bars, leaps `[3,4]` restricted via start `[0,4,7]` (triad skips: leaps 3,4,5,7,8,9 filtered to triad tones — see note below), palette Q |
| 2 | Assignment | `assignment` Module 2 (three melodies, one continuous video, conducting patterns shown) |
| 3 | Concepts | `solfege_drill` interval ladder: do–re–do–mi–do–fa–do–sol (durations 1, 4/4); `solfege_drill` same descending from do' |
| 3 | Guided | `ear_training` "Identify the melodic interval." 10 items: two-note irFromDegrees pairs for m2 `[0,1]`... use diatonic + chromatic degree pairs: `[0,2]` M2, `[0,4]` M3, `[0,3]` m3, `[0,5]` P4, `[0,7]` P5, `[2,3]` m2, `[4,7]` m3, `[0,12]` P8, `[7,12]` P4, `[5,9]` M3 — choices `['m2','M2','m3','M3','P4','P5','P8']`, explanations name the solfège pair; `melody` gen: F, 8 bars, leaps `[3,4,5,7]`, palette Q, prepChecklist |
| 3 | Assignment | `assignment` Module 3 (interval singing, 10 interval IDs, marked score, written solfège analysis) |
| 4 | Concepts | `rhythm` gen 8 bars 4/4 palette E; `rhythm` gen 8 bars 2/4 palette E |
| 4 | Guided | 3× `rhythm` gen 8 bars 4/4/3/4/2/4 palette E (the five-exercise portfolio: 2 from Concepts + 3 here); `melody` gen: G, 8 bars, leaps `[3,4]`, palette E, prepChecklist |
| 4 | Assignment | `assignment` Module 4 (five rhythm exercises clapped/spoken + conducted, one on neutral syllable, correct the 5-error rhythm, metronome count-in). Instruction reads "Correct the five-error rhythm provided by your instructor." (no PDF hosting in Phase 1) |
| 5 | Concepts | 3× `solfege_drill` A natural/harmonic/melodic minor scales (irFromDegrees with mode 'minor', scale arrays; melodic descends natural: degrees up `[0,2,3,5,7,9,11,12]` + down `[12,10,8,7,5,3,2,0]`) |
| 5 | Guided | `melody` gen: A natural minor (mode minor, scale 'natural'), 8 bars, leaps `[3,4]`, palette Q; `melody` gen: A harmonic minor (scale 'harmonic'), 8 bars, leaps `[3,4]`, palette Q, prepChecklist; `ear_training` "Natural, harmonic, or melodic minor?" 3 items: the three scale drills as playIr, choices `['natural','harmonic','melodic']` |
| 5 | Assignment | `assignment` Module 5 (three scale forms, natural-minor melody, harmonic/melodic melody, altered-degree ID, la-based vs do-based explanation) |
| 6 | Concepts | `rhythm` gen 4 bars 6/8 palette C68 (tempo 180 eighth-bpm); `rhythm` gen 4 bars 9/8 palette C68 (beats 9) |
| 6 | Guided | `melody` gen: C, 16 bars, 6/8, leaps `[3,4]`, palette C68, prepChecklist; `ear_training` "Does the beat divide in 2 or 3?" 4 items: 1-bar rhythm fragments in 2/4-E vs 6/8-C68, choices `['simple (2)','compound (3)']` |
| 6 | Assignment | `assignment` Module 6 (6/8 + 9/8 clapping, 16-bar compound melody conducted, division ID, written count analysis) |
| 7 | Concepts | 3× `solfege_drill` chord arpeggios: I do-mi-sol-mi-do, IV fa-la-do'-la-fa, V sol-ti-re'-ti-sol (durations 1, last 2) |
| 7 | Guided | `ear_training` "Identify the progression." 8 items: chord-root lines as irFromDegrees (e.g. I–IV–V–I `[0,5,7,0]` durations `[1,1,1,1]`; I–V–vi–IV `[0,7,9,5]`; I–IV–I `[0,5,0]` etc.), choices are Roman-numeral strings; `melody` gen: C, 8 bars, leaps `[3,4,5,7]`, palette Q, instructions "Melody outlines I, IV, and V — label the function under each measure.", prepChecklist |
| 7 | Assignment | `assignment` Module 7 (chord-tone singing, 8 progression IDs, function labeling, cadence ID) |
| 8 | Concepts | lesson content = exam procedures + review summary; `solfege_drill` C scale review (same construction as W1) |
| 8 | Guided | `melody` gen: D, 8 bars, leaps `[3,4,5]`, palette E (the PREPARED midterm melody, instructions say prepared); `ear_training` interval review 5 items (subset of W3 pairs); `dictation` "Notate this 4-bar melody. Play limit 4." gen: C, 4 bars, stepwise, palette Q, playLimit 4 |
| 8 | Assignment | `assignment` Module 8: Midterm (Appendix A's six components; unprepared items administered live by the instructor) |
| 9 | Concepts | 2× `rhythm` gen 8 bars 4/4 palette SYNC |
| 9 | Guided | 2× `rhythm` gen 8 bars 4/4/2/4 palette SYNC; `melody` gen: G, 8 bars, leaps `[3,4]`, palette SYNC, instructions "Mark every syncopation before singing.", prepChecklist |
| 9 | Assignment | `assignment` Module 9 (four syncopated rhythms, melody with ties/offbeats/sixteenths, conducted + unconducted recordings, marked score, pulse-strategy paragraph) |
| 10 | Concepts | `rhythm` gen 8 bars 4/4 palette E ×2 (two-part rhythm: perform as duo — instructions); `ensemble` canon: ONE gen melody (C, 8 bars, stepwise+`[3,4]`, palette Q) as both parts, part 2 labeled "Enter at m. 3" |
| 10 | Guided | `ensemble` two-part tonal: part 1 gen melody (C, 8 bars, leaps `[3,4]`, palette Q), part 2 = irFromDegrees counterline built a 3rd/6th below phrase tones (hand-authored 8-bar line: degrees `[-5,-3,0,-3,-5,-8,-5,-3,0,2,0,-3,-5,-3,-5,-5]`... author a consonant line and verify by ear in review), instructions on balance/tuning |
| 10 | Assignment | `assignment` Module 10 (ensemble recording + isolated own-part recording + balance/tuning/independence evaluation) |
| 11 | Concepts | `solfege_drill` chromatic scale segment do-di-re-ri-mi... use the app's table (ra/me/fi/le/te = flat spellings): ascending `[0,1,2,3,4,5,6,7,8,9,10,11,12]` all duration 1 in 4/4 (note: syllables render as ra/me/le/te even ascending — lesson text explains sharp-vs-flat chromatic syllables; acceptable Phase 1 limitation) |
| 11 | Guided | `melody` gen: F, 8 bars, leaps `[3,4]`, palette Q, chromatic `{count: 5}`, instructions "Five chromatic tones — resolve each by half step.", prepChecklist; `ear_training` "Diatonic or chromatic?" 4 items: stepwise fragments with/without an inserted chromatic (2 of each), choices `['diatonic','chromatic']` |
| 11 | Assignment | `assignment` Module 11 (chromatic drill, altered-degree ID, 5-chromatic melody, annotated score) |
| 12 | Concepts | lesson content = closely related keys, pivot analysis; `solfege_drill` pivot drill: do–sol in C then re-read as fa–do' in G (irFromDegrees C `[0,7,7,12]` with instructions explaining the re-hearing) |
| 12 | Guided | `melody` modulating: `concatIrs([gen C 4 bars ending on sol (endOnTonic false, force last degree 7 — use irFromDegrees for the final bar if needed), gen G 4 bars])`, data.modulation `{atBeat: 16, toKey: 'G'}`, instructions "Circle the modulation point; write solfège in both keys.", prepChecklist. Construction note: simplest correct build — gen segment A in C (4 bars, endOnTonic true), gen segment B in G (4 bars); concat keeps each segment's own solfège; `ir.key` stays 'C' |
| 12 | Assignment | `assignment` Module 12 (analyze, circle modulation, both keys ID'd, dual solfège, perform establishing both centers) |
| 13 | Concepts | `rhythm` segments: `{segments: [gen 2 bars 2/4 Q, gen 2 bars 3/4 Q, gen 2 bars 4/4 Q, gen 2 bars 3/4 Q]}` (changing simple meters); `rhythm` gen 4 bars 7/8 palette `[[2,2,3],[3,2,2],[2,3,2]]` wait — cells must fill exactly 7 eighths: use `[[2,2,3]]`, `[[3,2,2]]` variants as whole-bar cells; instructions label the grouping |
| 13 | Guided | `melody` segments: 3 gen segments (C 4/4 2 bars, C 3/4 2 bars, C 2/4 2 bars... at least three meter changes → 4 segments), leaps `[3,4]`, palette Q, instructions "Conduct the changing patterns.", prepChecklist; `rhythm` gen 4 bars 5/8 whole-bar cells `[[2,3]]` / `[[3,2]]` (pick per bar), instructions "Label each bar 2+3 or 3+2." |
| 13 | Assignment | `assignment` Module 13 (changing-meter rhythm, 5/8 or 7/8 with groupings labeled, melody with ≥3 meter changes, visible beat structure) |
| 14 | Concepts | lesson content = open score, clefs, inner voices, vertical tuning; `solfege_drill` chord-tuning drill: sustained do-mi-sol as arpeggiated whole notes |
| 14 | Guided | `ensemble` 3 parts: Soprano gen (C, 8 bars, stepwise+`[3,4]`, range `[64,79]`), Alto gen (range `[57,72]`), Bass gen (range `[48,64]`) — same key/meter/bars/palette Q so they align rhythmically bar-by-bar (they won't be counterpoint; instructions frame as independent-entrance practice: each voice enters 1 bar apart — stagger via a leading whole-bar rest? rests at line start aren't representable as leading gap → YES they are: first note beatPos = meter.beats × barIndex; fromIR fills leading rests). Part entries: Soprano bar 1, Alto bar 2 (offset all beatPos +4), Bass bar 3 (+8), trimmed to equal total length by using 8/7/6 bars respectively |
| 14 | Assignment | `assignment` Module 14 (small-ensemble performance, limited rehearsal, rehearsal plan, peer + self-assessment) |
| 15 | Concepts | lesson content = review + exam procedure + portfolio spec; `solfege_drill` comprehensive warm-up: major scale + chromatic segment + arpeggio (concatIrs of W1/W11/W7 drill constructions) |
| 15 | Guided | `melody` gen: Bb, 12 bars, leaps `[3,4,5,7]`, palette SYNC, chromatic `{count: 3}` (the PREPARED advanced melody), prepChecklist; `dictation` gen: F, 4 bars, leaps `[3,4]`, palette Q, playLimit 3; `ear_training` cadence/progression review 5 items (reuse W7 construction with different progressions: I–V–I, I–IV–V–I, i–iv–V–i in minor via mode) |
| 15 | Assignment | `assignment` Module 15: Final + Growth Portfolio (Appendix A's seven components + four portfolio items) |

**Triad-skip note (W2):** `leaps: [3, 4, 5]` allows m3/M3/P4 jumps — combined with `start: [0,4,7]` and stepwise weighting this approximates triad-outline melodies. Exact triad-membership enforcement is not required; review the generated output for tonal sense (Step 4).

**W4 correction:** the assignment instruction must read "Correct the five-error rhythm provided by your instructor." (No PDF hosting in Phase 1.)

- [ ] **Step 1: Write the failing test**

```js
// scripts/ssat/college.test.mjs
import { describe, it, expect } from 'vitest';
import { buildCollegeCourse, SSAT_RUBRIC } from './college.mjs';
import { assertValidExercise } from './engine.mjs';

const course = buildCollegeCourse();
const allExercises = course.units.flatMap((u) => u.lessons.flatMap((l) => l.exercises ?? []));

describe('college course structure', () => {
  it('has 15 units of 3 lessons each, titled Week N', () => {
    expect(course.slug).toBe('sight-singing-college');
    expect(course.level).toBe('college');
    expect(course.units).toHaveLength(15);
    course.units.forEach((u, i) => {
      expect(u.title).toMatch(new RegExp(`^Week ${i + 1}: `));
      expect(u.lessons).toHaveLength(3);
      expect(u.lessons[2].title).toMatch(/^Module Assignment/);
    });
  });
  it('every lesson has objectives and content', () => {
    for (const u of course.units) for (const l of u.lessons) {
      expect(l.objectives.length).toBeGreaterThanOrEqual(2);
      expect(l.content.length).toBeGreaterThan(80);
    }
  });
  it('every unit ends with an assignment exercise carrying the rubric', () => {
    for (const u of course.units) {
      const last = u.lessons[2].exercises.at(-1);
      expect(last.type).toBe('assignment');
      expect(last.rubric).toEqual(SSAT_RUBRIC);
      expect(last.instructions.length).toBeGreaterThanOrEqual(3);
      expect(last.deliverables.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('every notated exercise validates', () => {
  it('all irs, segments, parts, and items pass assertValidExercise', () => {
    let checked = 0;
    for (const ex of allExercises) {
      const irs = [
        ...(ex.ir ? [ex.ir] : []),
        ...(ex.segments ?? []),
        ...(ex.parts ?? []).map((p) => p.ir),
        ...(ex.items ?? []).map((i) => i.ir),
      ];
      for (const ir of irs) { assertValidExercise(ir); checked++; }
    }
    expect(checked).toBeGreaterThan(60);
  });
  it('is deterministic', () => {
    expect(JSON.stringify(buildCollegeCourse())).toBe(JSON.stringify(course));
  });
  it('covers the required breadth', () => {
    const types = new Set(allExercises.map((e) => e.type));
    for (const t of ['solfege_drill', 'melody', 'rhythm', 'ear_training', 'dictation', 'ensemble', 'assignment']) {
      expect(types.has(t)).toBe(true);
    }
    const meters = new Set(allExercises.flatMap((e) =>
      [e.ir, ...(e.segments ?? []), ...(e.parts ?? []).map((p) => p.ir)].filter(Boolean)
        .map((ir) => `${ir.meter.beats}/${ir.meter.beatType}`)));
    for (const m of ['2/4', '3/4', '4/4', '6/8', '9/8', '5/8', '7/8']) expect(meters.has(m)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/ssat/college.test.mjs`
Expected: FAIL — cannot resolve `./college.mjs`.

- [ ] **Step 3: Write `college.mjs`**

Implement the manifest table above. Structure the file as:

```js
// scripts/ssat/college.mjs
import { makeMelody, makeRhythm, irFromDegrees, concatIrs, hashSeed, note, KEY_TO_MIDI } from './engine.mjs';

export const SSAT_RUBRIC = [/* as defined above */];
export const PREP_CHECKLIST = [/* as defined above */];

const Q = [[1], [1, 1], [2]];
const E = [[1], [0.5, 0.5], [1, 1], [1.5, 0.5], [2]];
const SYNC = [[0.5, 1, 0.5], [0.5, 0.5, 0.5, 0.5], [0.75, 0.25], [1, 0.5, 0.5], [2]];
const C68 = [[3], [1, 1, 1], [2, 1], [1.5, 0.5, 1]];
const M44 = { beats: 4, beatType: 4 };
// ... M24, M34, M68, M98, M58, M78

const seed = (tag) => hashSeed(`ssat-college-${tag}`);
const gen = (tag, over) => makeMelody({ key: 'C', mode: 'major', meter: M44, tempo: 88,
  bars: 8, range: [57, 76], leaps: [], rhythmPalette: Q, seed: seed(tag), ...over });
const rhythmEx = (tag, over) => { /* makeMelody but fixed midi? NO — rhythm exercises are
  IRs on a single pitch: build via makeRhythm and lay every sounding cell on the tonic.
  Implement a small helper here: */ };

function rhythmIr(tag, { meter, bars, palette, tempo = 76, key = 'C' }) {
  const { cells } = makeRhythm({ meter, bars, palette, seed: seed(tag) });
  const tonicMidi = KEY_TO_MIDI[key];
  const notes = [];
  let pos = 0;
  for (const c of cells) {
    if (!c.rest) notes.push(note(tonicMidi, pos, c.d, tonicMidi));
    pos += c.d;
  }
  return { key, mode: 'major', tonicMidi, meter, tempo, notes, phrases: 1, difficulty: 1 };
}

function week(n, title, concepts, guided, assignment) {
  return { title: `Week ${n}: ${title}`, lessons: [concepts, guided, assignment] };
}
// ...build WEEKS 1–15 per the manifest, then:
export function buildCollegeCourse() {
  return {
    slug: 'sight-singing-college',
    title: 'Sight Singing and Aural Skills — College',
    level: 'college',
    grades: 'College',
    description: 'Read, hear, understand, and perform notated music accurately at sight: movable-do solfège, rhythmic reading, interval recognition, melodic dictation, harmonic hearing, and ensemble sight singing — from stepwise diatonic melodies to chromatic, modulating, and rhythmically advanced examples.',
    units: WEEKS,
  };
}
```

Fill in all 15 weeks. Lesson `content` text is condensed prose from Appendix A (the implementer writes 2–5 real sentences per lesson from the week's Topics list — e.g., W1 Concepts: "Sight singing begins with a firm tonal anchor. Before singing a note, establish tonic: hear the key, sing the scale, and arpeggiate the tonic triad. This course uses movable-do solfège, where do is always the tonic. This week covers the major scale, stepwise motion, whole/half/quarter rests and notes, and the basic 2-, 3-, and 4-beat conducting patterns."). Objectives come from the week's topic list. Assignment instructions/deliverables condense Appendix A's module text. Week 5 minor drills pass `mode: 'minor'` and the `scale` option. Week 14's staggered entries offset `beatPos` by `meter.beats × k` before building the IR object (leading gaps render as rests via `fromIR`).

- [ ] **Step 4: Run the test, then eyeball the music**

Run: `npx vitest run scripts/ssat/college.test.mjs`
Expected: PASS.

Then generate a human-readable digest for musical review:

```bash
node -e "
import('./scripts/ssat/college.mjs').then(({ buildCollegeCourse }) => {
  const c = buildCollegeCourse();
  for (const u of c.units) for (const l of u.lessons) for (const e of l.exercises ?? []) {
    if (e.ir) console.log(u.title, '·', e.type, '·', e.ir.key, e.ir.mode, \`\${e.ir.meter.beats}/\${e.ir.meter.beatType}\`, '·', e.ir.notes.map(n => n.solfege).join(' '));
  }
});"
```

Review the solfège lines for musicality (contour, cadences, no absurd passages). Tune seeds (change the tag string) for any line that reads badly. This step is the human musical-quality gate from the spec.

- [ ] **Step 5: Commit**

```bash
git add scripts/ssat/college.mjs scripts/ssat/college.test.mjs
git commit -m "feat(ssat): complete college-level 15-week course content"
```

---

### Task 8: Generator main script + products + JSON artifact

**Files:**
- Create: `scripts/generate-sight-singing-course.mjs`
- Modify: `scripts/seed-course-templates.mjs` (products-from-JSON support)
- Create (generated, committed): `scripts/sight-singing-courses.json`

**Interfaces:**
- Consumes: `buildCollegeCourse` (Task 7).
- Produces: `scripts/sight-singing-courses.json` = `{ template_courses: [college], products: [COURSE-SSAT-COLL] }`; seed script accepts optional top-level `products` array: `{ sku, slug, name, level, price_cents, bundle_key }`.

- [ ] **Step 1: Write the generator main**

```js
// scripts/generate-sight-singing-course.mjs
// Regenerates scripts/sight-singing-courses.json deterministically. Then seed with:
//   node scripts/seed-course-templates.mjs scripts/sight-singing-courses.json | psql ...
import { writeFileSync } from 'node:fs';
import { buildCollegeCourse } from './ssat/college.mjs';

const out = {
  template_courses: [buildCollegeCourse()],
  // Phase 1: college product only. The bundle and other level products ship with
  // their courses in Phase 2 — a level product whose course isn't seeded would get
  // template_course_id = null, which grant_course_entitlement treats as a bundle.
  products: [{
    sku: 'COURSE-SSAT-COLL',
    slug: 'sight-singing-college',
    name: 'Sight Singing and Aural Skills — College',
    level: 'college',
    price_cents: 0, // pricing deferred until launch; stripe_price_id stays null
    bundle_key: 'sight-singing',
  }],
};
writeFileSync(new URL('./sight-singing-courses.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.error(`wrote sight-singing-courses.json: ${out.template_courses.length} course(s), ${out.products.length} product(s)`);
```

- [ ] **Step 2: Add products-from-JSON to the seed script**

In `scripts/seed-course-templates.mjs`, change the destructure line to:

```js
const { template_courses, products: jsonProducts = [] } = JSON.parse(readFileSync(file, 'utf8'));
```

and after the hardcoded HCM products loop, add:

```js
// Products supplied by the JSON itself (newer course families carry their own).
for (const p of jsonProducts) {
  out.push(`insert into gw_course_product (template_course_id, sku, name, level, price_cents, bundle_key)
select ${p.slug ? `(select id from gw_academy_courses where slug = ${q(p.slug)} and is_template)` : 'null'},
  ${q(p.sku)}, ${q(p.name)}, ${q(p.level)}, ${Number(p.price_cents) || 0}, ${q(p.bundle_key)}
on conflict (sku) do nothing;`);
}
```

- [ ] **Step 3: Generate and sanity-check the SQL**

```bash
node scripts/generate-sight-singing-course.mjs
node scripts/seed-course-templates.mjs scripts/sight-singing-courses.json > /tmp/ssat-seed.sql
grep -c "insert into gw_academy_exercises" /tmp/ssat-seed.sql
grep -c "COURSE-SSAT-COLL" /tmp/ssat-seed.sql
grep -c "COURSE-HCM" /tmp/ssat-seed.sql
```

Expected: exercises count > 60; `COURSE-SSAT-COLL` = 1; `COURSE-HCM` = 5 (HCM block unchanged — idempotent on conflict). Regenerate twice and `git diff scripts/sight-singing-courses.json` → no diff (determinism).

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-sight-singing-course.mjs scripts/seed-course-templates.mjs scripts/sight-singing-courses.json
git commit -m "feat(ssat): course generator main + products-from-JSON seeding"
```

---

### Task 9: Local E2E verification

**Files:** none new (verification task).

- [ ] **Step 1: Seed a local/branch database** — per the repo's local dev setup, apply `/tmp/ssat-seed.sql` to the local Supabase (or, if local dev runs against the droplet DB, coordinate with Task 10 and verify there). If no local DB exists, this step merges into Task 10's droplet verification.

- [ ] **Step 2: Drive the app** — use the repo's `verify` skill (`Documents/GitHub/gleeworld:verify`): build, run preview, and with Playwright at phone (390px) and desktop viewports:
  1. Open the seeded course's TemplateCoursePage (find id: `select id from gw_academy_courses where slug='sight-singing-college'`).
  2. Expand Week 1 → all three lessons show; Guided Practice renders real notation (SVG present in the melody card).
  3. Click Play on the Week 1 melody — no console errors (audio itself can't be asserted headlessly; absence of errors + button state cycle is the check).
  4. Ear-training card: pick a wrong answer → destructive styling + explanation; Next advances; final shows score.
  5. Dictation card: play twice → "1 left"; reveal shows notation.
  6. Click "Practice with pitch tracker" on a melody → lands on `/dashboard/sight-reading?academyExercise=…` and SingFlow shows the same notation (not the generator config screen).
  7. Week 13 mixed-meter melody shows multiple stacked staves; Week 14 ensemble shows 3 labeled parts.
  8. Unknown-type fallback: temporarily `update gw_academy_exercises set type='legacy_thing' where id=<one>` → badge renders, page intact; revert.

- [ ] **Step 3: Fix anything found, re-run, commit fixes**

```bash
git add -A && git commit -m "fix(ssat): E2E verification fixes"
```

---

### Task 10: Deploy + seed production + adopt check

**Files:** none new (ops task). Follow repo deploy conventions strictly.

- [ ] **Step 1: Merge to main** — push branch, open PR, merge after review (or fast-forward per Kevin's call).

- [ ] **Step 2: Build + deploy web** — build locally, rsync `dist/` to the droplet **without `--delete`** (tenant bootstrap files live under the web root).

- [ ] **Step 3: Seed the droplet DB** — `node scripts/seed-course-templates.mjs scripts/sight-singing-courses.json | ssh <droplet> 'sudo -u postgres psql <db>'` (same superuser path as migrations). Verify: `select count(*) from gw_academy_exercises e join gw_academy_lessons l on e.lesson_id=l.id join gw_academy_units u on l.unit_id=u.id join gw_academy_courses c on u.course_id=c.id where c.slug='sight-singing-college';` → matches the local count. Re-run the seed once → notice "already seeded — skipping", counts unchanged (idempotency proof).

- [ ] **Step 4: Verify live** — on gleeworld.org: course store shows the college course (product row exists, price 0 = ungated adopt); TemplateCoursePage renders Week 1 with playable notation; deep link into the studio works.

- [ ] **Step 5: Adopt-clone check** — on the demo tenant (Harmony Hall), run `adopt_template_course(<college template id>)` as a tenant admin; verify the cloned course's exercise count matches and one melody renders + plays from the cloned rows.

- [ ] **Step 6: Update memory + report** — record shipped state (slug, product SKU, counts, any gotchas) in the project memory file.

---

## Self-review results

- **Spec coverage:** content architecture (T7), level differentiation (college only — Phase 1 per spec), exercise schemas (T3 header + T7), ExercisePlayer (T3/T4), studio deep link (T5), generator pipeline (T6/T7/T8), products (T8, narrowed to college with reasoning), error handling (T1 validator, badge fallback T3, loader fallback T5), all spec test bullets mapped (T6 generator checks, T8 idempotency, T3 player types, T10 adopt, T9 E2E). Gap vs spec: "all 5 products" intentionally narrowed — documented in Global Constraints.
- **Type consistency:** `isValidIr` (T1) used in T3/T5; `playIr(ir, mode)` (T2) used in T3; `parseExercise`/`ParsedExercise` internal to T3; engine exports (T6) match T7 usage; JSON shape (T7 output) matches seed script expectations (T8 verified against actual script source).
- **Placeholders:** W10 counterline marked "author a consonant line and verify by ear" — that IS the instruction (hand-authoring is the task); W13 7/8 palette corrected inline to whole-bar cells. Lesson prose is delegated to the implementer with an explicit worked example and source (Appendix A) — acceptable: the text is condensation, not invention.
