# Sight Reading Studio — Slice 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse seven sight-reading routes into one page whose empty state is the primary state, and replace the Whisper-transcript placebo grader with a real on-device pitch tracker — with no database changes at all.

**Architecture:** Pure, testable modules first (pitch detection → scoring → exercise generation), then the AudioWorklet that feeds them, then the page, then atomic route surgery. Everything is scored on-device; nothing is persisted beyond the existing `localStorage` key. The riskiest dependency — iOS/Capacitor mic-to-cents — is proven on a physical iPhone before any schema work exists to break.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind + shadcn, Vitest, Tone.js 15, OpenSheetMusicDisplay 1.9, Web Audio `AudioWorklet`, Capacitor (iOS).

**Spec:** `docs/superpowers/specs/2026-07-09-sight-reading-studio-redesign-design.md`

## Global Constraints

- **Test runner is Vitest.** `bun x vitest run <path>` for one file. `bun run test` runs all. Tests live beside the source as `<name>.test.ts` (see `src/lib/youtubeId.test.ts`).
- **Build with `bun x vite build`**, never the npm script (it pins vite 5.4.10 and fails). Run `bun install` first if node_modules are stale.
- **No database work in this slice.** No migrations, no new tables, no Supabase calls. Attempts log to the existing `localStorage` key `gw_sight_reading_activity`.
- **Light surfaces only:** white cards, dark text, cream page. Never dark-navy cards.
- **Sizing floor:** `text-xs` / `text-sm` minimum, `w-4 h-4` icons minimum. Never sub-12px text.
- **Terminology:** "students" (never singers/members); "graduates" (never alumnae). Tenant-neutral — never hardcode "Spelman".
- **Never set `color` on bare `h1`–`h6`** element rules; headings must inherit.
- **Deploy note (not this slice):** never `rsync --delete` — it wipes `tenants/*/tenant-bootstrap.js`.
- **iOS audio:** `getUserMedia` with `echoCancellation`, `noiseSuppression`, `autoGainControl` all `false`. Never hardcode `48000`. The simulator lies about audio — verify on a physical device.

---

## File Structure

**New — pure logic (all unit-tested):**
- `src/lib/sightReading/pitch.ts` — frequency ↔ MIDI ↔ cents, and the MPM/YIN detector over a `Float32Array`.
- `src/lib/sightReading/ir.ts` — the Exercise IR type, and `parsedScoreToIR()` adapting the salvaged `ParsedScore`.
- `src/lib/sightReading/generate.ts` — the constrained melody sampler (Bands A–B).
- `src/lib/sightReading/score.ts` — the four-dimension scorer with sequence alignment.

**New — audio plumbing:**
- `public/worklets/gw-pitch.js` — the AudioWorklet processor (raw JS, no bundler; the repo already ships `public/worklets/gw-limiter.js`).
- `src/lib/sightReading/useMicPitch.ts` — React hook: permission, worklet load, live `{midi, cents, clarity}` stream.

**New — UI:**
- `src/pages/sightReading/SightReadingStudio.tsx` — the one page. Segmented control, empty state.
- `src/pages/sightReading/SingFlow.tsx` — priming → count-in → sing → result.
- `src/pages/sightReading/ResultCard.tsx` — the four-dimension feedback screen.

**Modified:**
- `src/App.tsx` — routes and lazy imports (one atomic task).
- `src/pages/GleeWorldLanding.tsx` — repoint the sight-reading link.

**Deleted (atomic, Task 8):** `src/pages/MUS100SightSingingPage.tsx`, `src/pages/SightReadingPreview.tsx`, `src/pages/SightReadingSubmission.tsx`, `src/pages/SightReadingGenerator.tsx`, `src/pages/MemberSightReadingStudioPage.tsx`, `src/pages/MemberSightReadingStudio.tsx`, `src/pages/member/SightReadingPage.tsx`, `src/components/member-sight-reading/**`, `src/components/sight-singing/**` (except the two salvaged files, which move).

**Salvaged (verified today):**
- `src/components/sight-singing/utils/musicXMLParser.ts` → moves to `src/lib/sightReading/musicXMLParser.ts`. Exports `parseMusicXML(xml: string, tempo = 120): ParsedScore`. It *does* apply `<alter>` (line 43) and iterates all measures. `ParsedNote = {step, octave, frequency, duration, startTime}` — **note: seconds, not beats, and no `midi` field.**
- `src/components/sight-singing/hooks/useTonePlayback.ts` → moves to `src/lib/sightReading/useTonePlayback.ts`. Returns `{isPlaying, mode, setMode, startPlayback, stopPlayback, getAudioContext, setOutputNode}`.

**Retired:** `supabase/functions/assess-sight-singing`, `supabase/functions/evaluate-singing` — both send sung audio to OpenAI Whisper (speech-to-text) and ask GPT to judge *pitch* from the transcript, falling back to a literal `{pitch_accuracy: 75, rhythm_accuracy: 75}`. Deleted in Task 8; nothing calls them afterwards.

---

### Task 1: Pitch primitives

**Files:**
- Create: `src/lib/sightReading/pitch.ts`
- Test: `src/lib/sightReading/pitch.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `hzToMidi(hz: number): number` (fractional), `midiToHz(midi: number): number`, `centsOff(hz: number, targetMidi: number): number`, `nearestMidi(hz: number): number`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/sightReading/pitch.test.ts
import { describe, it, expect } from 'vitest';
import { hzToMidi, midiToHz, centsOff, nearestMidi } from './pitch';

describe('pitch primitives', () => {
  it('maps A4 = 440Hz to MIDI 69', () => {
    expect(hzToMidi(440)).toBeCloseTo(69, 6);
    expect(midiToHz(69)).toBeCloseTo(440, 6);
  });
  it('round-trips across the vocal range', () => {
    for (const m of [48, 55, 60, 67, 72, 79]) {
      expect(hzToMidi(midiToHz(m))).toBeCloseTo(m, 6);
    }
  });
  it('reports cents deviation with sign', () => {
    // one semitone up = +100 cents
    expect(centsOff(midiToHz(70), 69)).toBeCloseTo(100, 3);
    expect(centsOff(midiToHz(68), 69)).toBeCloseTo(-100, 3);
    expect(centsOff(440, 69)).toBeCloseTo(0, 6);
  });
  it('rounds to the nearest MIDI note', () => {
    expect(nearestMidi(440)).toBe(69);
    expect(nearestMidi(midiToHz(69.4))).toBe(69);
    expect(nearestMidi(midiToHz(69.6))).toBe(70);
  });
  it('returns NaN for non-positive frequencies rather than -Infinity', () => {
    expect(Number.isNaN(hzToMidi(0))).toBe(true);
    expect(Number.isNaN(hzToMidi(-5))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun x vitest run src/lib/sightReading/pitch.test.ts`
Expected: FAIL — `Failed to resolve import "./pitch"`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/sightReading/pitch.ts
// A4 = MIDI 69 = 440 Hz. Fractional MIDI keeps cents information alive; callers
// that want a note name round at the last moment.
const A4_HZ = 440;
const A4_MIDI = 69;

export function hzToMidi(hz: number): number {
  if (!(hz > 0)) return NaN;            // log2(0) is -Infinity; NaN is honest
  return A4_MIDI + 12 * Math.log2(hz / A4_HZ);
}

export function midiToHz(midi: number): number {
  return A4_HZ * Math.pow(2, (midi - A4_MIDI) / 12);
}

export function centsOff(hz: number, targetMidi: number): number {
  return (hzToMidi(hz) - targetMidi) * 100;
}

export function nearestMidi(hz: number): number {
  return Math.round(hzToMidi(hz));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun x vitest run src/lib/sightReading/pitch.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sightReading/pitch.ts src/lib/sightReading/pitch.test.ts
git commit -m "feat(sight-reading): pitch primitives (hz/midi/cents)"
```

---

### Task 2: The pitch detector

**Files:**
- Modify: `src/lib/sightReading/pitch.ts`
- Test: `src/lib/sightReading/pitch.test.ts`

**Interfaces:**
- Consumes: `hzToMidi` from Task 1.
- Produces: `detectPitch(buf: Float32Array, sampleRate: number): { hz: number; clarity: number }` — returns `{hz: 0, clarity: 0}` when there is no confident pitch.

Uses McLeod Pitch Method (normalized square difference). Chosen over raw autocorrelation because NSDF is octave-robust on sung vowels, which is exactly the failure students would notice.

- [ ] **Step 1: Write the failing test**

```ts
// append to src/lib/sightReading/pitch.test.ts
import { detectPitch } from './pitch';

function sine(hz: number, sampleRate: number, n: number, harmonics = 1): Float32Array {
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (let h = 1; h <= harmonics; h++) v += Math.sin((2 * Math.PI * hz * h * i) / sampleRate) / h;
    buf[i] = v / harmonics;
  }
  return buf;
}

describe('detectPitch', () => {
  const SR = 44100;
  it('finds a 440Hz sine within 5 cents', () => {
    const { hz, clarity } = detectPitch(sine(440, SR, 4096), SR);
    expect(Math.abs(hzToMidi(hz) - 69) * 100).toBeLessThan(5);
    expect(clarity).toBeGreaterThan(0.9);
  });
  it('does not octave-halve a harmonic-rich vowel', () => {
    // A sung vowel has strong harmonics; naive autocorrelation reports 220Hz.
    const { hz } = detectPitch(sine(440, SR, 4096, 6), SR);
    expect(Math.abs(hzToMidi(hz) - 69) * 100).toBeLessThan(15);
  });
  it('tracks across the vocal range', () => {
    for (const target of [98, 220, 330, 523]) {
      const { hz } = detectPitch(sine(target, SR, 4096), SR);
      expect(Math.abs(hz - target) / target).toBeLessThan(0.01);
    }
  });
  it('reports no pitch for silence', () => {
    expect(detectPitch(new Float32Array(4096), SR)).toEqual({ hz: 0, clarity: 0 });
  });
  it('reports no pitch for white noise', () => {
    const noise = new Float32Array(4096).map(() => Math.random() * 2 - 1);
    expect(detectPitch(noise, SR).clarity).toBeLessThan(0.8);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun x vitest run src/lib/sightReading/pitch.test.ts`
Expected: FAIL — `detectPitch is not a function`.

- [ ] **Step 3: Write minimal implementation**

```ts
// append to src/lib/sightReading/pitch.ts

// McLeod Pitch Method. The normalized square difference function peaks at the
// true period rather than at its multiples, which is why a sung vowel (rich in
// harmonics) doesn't get reported an octave low the way plain autocorrelation
// reports it.
const CLARITY_FLOOR = 0.8;   // below this we say "no note" rather than guess
const MIN_HZ = 70;           // below a bass low-D; anything lower is rumble
const MAX_HZ = 1200;         // above a soprano high-D; anything higher is noise

export function detectPitch(buf: Float32Array, sampleRate: number): { hz: number; clarity: number } {
  const n = buf.length;

  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / n);
  if (rms < 0.005) return { hz: 0, clarity: 0 };   // silence

  const maxLag = Math.min(n - 1, Math.floor(sampleRate / MIN_HZ));
  const minLag = Math.max(2, Math.floor(sampleRate / MAX_HZ));

  const nsdf = new Float32Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let acf = 0, div = 0;
    for (let i = 0; i + lag < n; i++) {
      acf += buf[i] * buf[i + lag];
      div += buf[i] * buf[i] + buf[i + lag] * buf[i + lag];
    }
    nsdf[lag] = div > 0 ? (2 * acf) / div : 0;
  }

  // First peak above the floor, not the global max: the global max can sit at a
  // multiple of the true period.
  let bestLag = -1, bestVal = 0;
  let lag = minLag;
  while (lag < maxLag && nsdf[lag] <= 0) lag++;          // skip the initial dip
  for (; lag < maxLag; lag++) {
    if (nsdf[lag] > nsdf[lag - 1] && nsdf[lag] >= nsdf[lag + 1]) {
      if (nsdf[lag] > bestVal) { bestVal = nsdf[lag]; bestLag = lag; }
      if (bestVal > CLARITY_FLOOR) break;                 // good enough, take the earliest
    }
  }
  if (bestLag < 0 || bestVal < 0.5) return { hz: 0, clarity: 0 };

  // Parabolic interpolation around the peak — without this the resolution is
  // quantized to whole samples, which is ~30 cents at the top of the range.
  const y0 = nsdf[bestLag - 1], y1 = nsdf[bestLag], y2 = nsdf[bestLag + 1];
  const denom = 2 * (2 * y1 - y0 - y2);
  const shift = denom !== 0 ? (y2 - y0) / denom : 0;
  const hz = sampleRate / (bestLag + shift);

  if (hz < MIN_HZ || hz > MAX_HZ) return { hz: 0, clarity: 0 };
  return { hz, clarity: bestVal };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun x vitest run src/lib/sightReading/pitch.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sightReading/pitch.ts src/lib/sightReading/pitch.test.ts
git commit -m "feat(sight-reading): MPM pitch detector, octave-robust on vowels"
```

---

### Task 3: Exercise IR + the MusicXML adapter

**Files:**
- Create: `src/lib/sightReading/ir.ts`
- Test: `src/lib/sightReading/ir.test.ts`
- Move: `src/components/sight-singing/utils/musicXMLParser.ts` → `src/lib/sightReading/musicXMLParser.ts`

**Interfaces:**
- Consumes: `parseMusicXML(xml, tempo): ParsedScore` (salvaged, unchanged), `hzToMidi` (Task 1).
- Produces:
  ```ts
  export interface IRNote { midi: number; beatPos: number; durationBeats: number; solfege: string; phraseIdx: number; }
  export interface ExerciseIR {
    key: string; mode: 'major' | 'minor'; tonicMidi: number;
    meter: { beats: number; beatType: number }; tempo: number;
    notes: IRNote[]; phrases: number; difficulty: number;
  }
  export function parsedScoreToIR(score: ParsedScore, key: string, mode: 'major'|'minor'): ExerciseIR;
  export function midiToSolfege(midi: number, tonicMidi: number): string;
  ```

`ParsedNote` carries `frequency`, `startTime` and `duration` in **seconds**. The IR needs **beats**, so the adapter converts with the score's tempo. Both generated lines and teacher MusicXML compile to this one type — that is what lets a zero-row tenant have infinite content.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/sightReading/ir.test.ts
import { describe, it, expect } from 'vitest';
import { parsedScoreToIR, midiToSolfege } from './ir';
import type { ParsedScore } from './musicXMLParser';

const C4 = 261.63, D4 = 293.66, E4 = 329.63;

const score: ParsedScore = {
  tempo: 120,                                  // 120bpm => 1 beat = 0.5s
  timeSignature: { beats: 4, beatType: 4 },
  totalDuration: 1.5,
  measures: [{ number: 1, notes: [
    { step: 'C', octave: 4, frequency: C4, startTime: 0,   duration: 0.5 },
    { step: 'D', octave: 4, frequency: D4, startTime: 0.5, duration: 0.5 },
    { step: 'E', octave: 4, frequency: E4, startTime: 1.0, duration: 0.5 },
  ]}],
};

describe('parsedScoreToIR', () => {
  it('converts seconds to beats using the tempo', () => {
    const ir = parsedScoreToIR(score, 'C', 'major');
    expect(ir.notes.map(n => n.beatPos)).toEqual([0, 1, 2]);
    expect(ir.notes.map(n => n.durationBeats)).toEqual([1, 1, 1]);
  });
  it('derives MIDI from frequency', () => {
    const ir = parsedScoreToIR(score, 'C', 'major');
    expect(ir.notes.map(n => n.midi)).toEqual([60, 62, 64]);
  });
  it('labels solfege relative to the tonic, not to C', () => {
    const ir = parsedScoreToIR(score, 'C', 'major');
    expect(ir.notes.map(n => n.solfege)).toEqual(['do', 're', 'mi']);
  });
});

describe('midiToSolfege', () => {
  it('is movable-do: the tonic is always "do"', () => {
    expect(midiToSolfege(67, 67)).toBe('do');   // G major, G = do
    expect(midiToSolfege(69, 67)).toBe('re');
    expect(midiToSolfege(71, 67)).toBe('mi');
  });
  it('is octave-invariant', () => {
    expect(midiToSolfege(60, 60)).toBe('do');
    expect(midiToSolfege(72, 60)).toBe('do');
  });
  it('names the chromatic tendency tones', () => {
    expect(midiToSolfege(66, 60)).toBe('fi');   // raised 4
    expect(midiToSolfege(61, 60)).toBe('ra');   // lowered 2
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun x vitest run src/lib/sightReading/ir.test.ts`
Expected: FAIL — cannot resolve `./ir` and `./musicXMLParser`.

- [ ] **Step 3: Move the parser, then implement**

```bash
git mv src/components/sight-singing/utils/musicXMLParser.ts src/lib/sightReading/musicXMLParser.ts
```

```ts
// src/lib/sightReading/ir.ts
import { hzToMidi } from './pitch';
import type { ParsedScore } from './musicXMLParser';

export interface IRNote { midi: number; beatPos: number; durationBeats: number; solfege: string; phraseIdx: number; }
export interface ExerciseIR {
  key: string; mode: 'major' | 'minor'; tonicMidi: number;
  meter: { beats: number; beatType: number }; tempo: number;
  notes: IRNote[]; phrases: number; difficulty: number;
}

// Movable-do. Index = semitones above the tonic, octave-reduced.
const SOLFEGE = ['do','ra','re','me','mi','fa','fi','sol','le','la','te','ti'];

export function midiToSolfege(midi: number, tonicMidi: number): string {
  const degree = (((midi - tonicMidi) % 12) + 12) % 12;
  return SOLFEGE[degree];
}

export function parsedScoreToIR(score: ParsedScore, key: string, mode: 'major' | 'minor'): ExerciseIR {
  const secondsPerBeat = 60 / score.tempo;
  const flat = score.measures.flatMap((m) => m.notes);
  const tonicMidi = flat.length ? Math.round(hzToMidi(flat[0].frequency)) : 60;

  const notes: IRNote[] = flat.map((n) => ({
    midi: Math.round(hzToMidi(n.frequency)),
    beatPos: n.startTime / secondsPerBeat,
    durationBeats: n.duration / secondsPerBeat,
    solfege: midiToSolfege(Math.round(hzToMidi(n.frequency)), tonicMidi),
    phraseIdx: 0,
  }));

  return {
    key, mode, tonicMidi,
    meter: score.timeSignature,
    tempo: score.tempo,
    notes,
    phrases: 1,
    difficulty: 1,
  };
}
```

The tonic is taken from the first note because every generated line begins on a tonic-triad member and, per the spec's constraint, so should a teacher's exercise. Task 4's generator sets `difficulty` and `phrases` properly; the adapter's defaults are for teacher MusicXML, which has no level.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun x vitest run src/lib/sightReading/ir.test.ts`
Expected: PASS, 6 tests. Then `bun x vitest run src/lib/sightReading/` — 16 total.

- [ ] **Step 5: Commit**

```bash
git add -A src/lib/sightReading src/components/sight-singing
git commit -m "feat(sight-reading): exercise IR + MusicXML adapter (movable-do solfege)"
```

---

### Task 4: The constrained melody generator

**Files:**
- Create: `src/lib/sightReading/generate.ts`
- Test: `src/lib/sightReading/generate.test.ts`

**Interfaces:**
- Consumes: `ExerciseIR`, `midiToSolfege` (Task 3).
- Produces: `generateExercise(opts: { level: number; key: string; seed: number }): ExerciseIR`.

Bands A–B only (levels 1–6). A generated exercise is a **constrained melody sampler**, never random notes. Random notes produce unsingable lines and make the tool feel like a toy.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/sightReading/generate.test.ts
import { describe, it, expect } from 'vitest';
import { generateExercise } from './generate';

const LEVELS = [1, 2, 3, 4, 5, 6];
const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);

describe('generateExercise', () => {
  it('is deterministic for a given seed', () => {
    const a = generateExercise({ level: 3, key: 'C', seed: 42 });
    const b = generateExercise({ level: 3, key: 'C', seed: 42 });
    expect(a.notes).toEqual(b.notes);
  });

  it('always begins and ends on a tonic-triad member', () => {
    for (const level of LEVELS) for (const seed of SEEDS) {
      const ir = generateExercise({ level, key: 'C', seed });
      const triad = [0, 4, 7];
      const first = (((ir.notes[0].midi - ir.tonicMidi) % 12) + 12) % 12;
      const last = (((ir.notes.at(-1)!.midi - ir.tonicMidi) % 12) + 12) % 12;
      expect(triad).toContain(first);
      expect(last).toBe(0);           // end on do
    }
  });

  it('respects the level leap ceiling', () => {
    const CEIL: Record<number, number> = { 1: 4, 2: 5, 3: 7, 4: 7, 5: 9, 6: 12 };
    for (const level of LEVELS) for (const seed of SEEDS) {
      const ir = generateExercise({ level, key: 'C', seed });
      for (let i = 1; i < ir.notes.length; i++) {
        expect(Math.abs(ir.notes[i].midi - ir.notes[i - 1].midi)).toBeLessThanOrEqual(CEIL[level]);
      }
    }
  });

  it('follows every leap of a 4th or more with stepwise motion the other way', () => {
    for (const level of LEVELS) for (const seed of SEEDS) {
      const n = generateExercise({ level, key: 'C', seed }).notes;
      for (let i = 1; i < n.length - 1; i++) {
        const leap = n[i].midi - n[i - 1].midi;
        if (Math.abs(leap) >= 5) {
          const next = n[i + 1].midi - n[i].midi;
          expect(Math.abs(next)).toBeLessThanOrEqual(2);
          expect(Math.sign(next)).toBe(-Math.sign(leap));
        }
      }
    }
  });

  it('uses only pentatonic degrees at level 1', () => {
    const PENT = [0, 2, 4, 7, 9];
    for (const seed of SEEDS) {
      const ir = generateExercise({ level: 1, key: 'C', seed });
      for (const note of ir.notes) {
        expect(PENT).toContain((((note.midi - ir.tonicMidi) % 12) + 12) % 12);
      }
    }
  });

  it('stays within a singable range', () => {
    for (const level of LEVELS) for (const seed of SEEDS) {
      const midis = generateExercise({ level, key: 'C', seed }).notes.map(n => n.midi);
      expect(Math.max(...midis) - Math.min(...midis)).toBeLessThanOrEqual(12);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun x vitest run src/lib/sightReading/generate.test.ts`
Expected: FAIL — `generateExercise is not a function`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/sightReading/generate.ts
import type { ExerciseIR, IRNote } from './ir';
import { midiToSolfege } from './ir';

// Bands A-B. Degrees are semitones above the tonic.
const PENTATONIC = [0, 2, 4, 7, 9];
const DIATONIC   = [0, 2, 4, 5, 7, 9, 11];
const TRIAD      = [0, 4, 7];

interface Level { degrees: number[]; maxLeap: number; bars: number; rhythm: number[]; }
const LEVELS: Record<number, Level> = {
  1: { degrees: PENTATONIC, maxLeap: 4,  bars: 2, rhythm: [1, 1, 1, 1] },
  2: { degrees: PENTATONIC, maxLeap: 5,  bars: 4, rhythm: [1, 1, 2] },
  3: { degrees: DIATONIC,   maxLeap: 7,  bars: 4, rhythm: [1, 1, 2] },
  4: { degrees: DIATONIC,   maxLeap: 7,  bars: 4, rhythm: [0.5, 0.5, 1, 2] },
  5: { degrees: DIATONIC,   maxLeap: 9,  bars: 8, rhythm: [0.5, 0.5, 1, 2] },
  6: { degrees: DIATONIC,   maxLeap: 12, bars: 8, rhythm: [0.5, 0.5, 1, 1.5, 2] },
};

const KEY_TO_MIDI: Record<string, number> = { C: 60, D: 62, Eb: 63, E: 64, F: 65, G: 67, A: 69, Bb: 70 };

// Deterministic PRNG (mulberry32) — a seed must always yield the same line, so
// a student can be re-sent the exact exercise they were assigned.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateExercise(opts: { level: number; key: string; seed: number }): ExerciseIR {
  const lv = LEVELS[opts.level] ?? LEVELS[1];
  const tonicMidi = KEY_TO_MIDI[opts.key] ?? 60;
  const rand = rng(opts.seed);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

  const beatsTotal = lv.bars * 4;
  const midis: number[] = [tonicMidi + pick(TRIAD)];   // begin on a triad member

  let beats = 0;
  const durations: number[] = [];

  while (beats < beatsTotal) {
    const dur = Math.min(pick(lv.rhythm), beatsTotal - beats);
    durations.push(dur);
    beats += dur;
    if (beats >= beatsTotal) break;

    const prev = midis.at(-1)!;
    const prevLeap = midis.length > 1 ? prev - midis.at(-2)! : 0;

    // After a leap of a 4th or more, the next move must be a step in the
    // opposite direction. This single rule is most of what makes a line singable.
    const mustRecover = Math.abs(prevLeap) >= 5;
    const candidates: number[] = [];
    for (const deg of lv.degrees) {
      for (const oct of [-12, 0, 12]) {
        const cand = tonicMidi + deg + oct;
        const interval = cand - prev;
        if (interval === 0) continue;
        if (Math.abs(interval) > lv.maxLeap) continue;
        if (Math.abs(cand - tonicMidi) > 12) continue;         // one-octave range
        if (mustRecover && (Math.abs(interval) > 2 || Math.sign(interval) === Math.sign(prevLeap))) continue;
        candidates.push(cand);
      }
    }
    midis.push(candidates.length ? pick(candidates) : prev + (prevLeap > 0 ? -2 : 2));
  }

  midis[midis.length - 1] = tonicMidi;                  // end on do
  if (durations.length < midis.length) durations.push(1);

  let cursor = 0;
  const notes: IRNote[] = midis.map((midi, i) => {
    const durationBeats = durations[i] ?? 1;
    const note: IRNote = {
      midi, beatPos: cursor, durationBeats,
      solfege: midiToSolfege(midi, tonicMidi),
      phraseIdx: Math.floor(cursor / (beatsTotal / 2)),
    };
    cursor += durationBeats;
    return note;
  });

  return {
    key: opts.key, mode: 'major', tonicMidi,
    meter: { beats: 4, beatType: 4 }, tempo: 80,
    notes, phrases: 2, difficulty: opts.level,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun x vitest run src/lib/sightReading/generate.test.ts`
Expected: PASS, 6 tests (each sweeping 6 levels × 60 seeds).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sightReading/generate.ts src/lib/sightReading/generate.test.ts
git commit -m "feat(sight-reading): constrained melody generator, bands A-B"
```

---

### Task 5: The four-dimension scorer

**Files:**
- Create: `src/lib/sightReading/score.ts`
- Test: `src/lib/sightReading/score.test.ts`

**Interfaces:**
- Consumes: `ExerciseIR` (Task 3).
- Produces:
  ```ts
  export interface SungNote { midi: number; beatPos: number; }
  export interface ScoreResult {
    firstNoteOk: boolean; pitch: number; rhythm: number; retention: number; overall: number;
    perNote: { expectedMidi: number; sungMidi: number | null; centsOff: number | null; ok: boolean }[];
    driftBar: number | null;
  }
  export function scoreAttempt(ir: ExerciseIR, sung: SungNote[]): ScoreResult;
  ```

Weights **15 / 45 / 25 / 15** (first-note / pitch / rhythm / retention). Two rules carry the pedagogy:

**Octave displacement is forgiven** — a bass singing the line an octave down is correct.
**A whole-line semitone offset is NOT forgiven** — once the student has been handed the tonic and the starting pitch, a persistent semitone offset *is* a failure to place the first note. That failure is isolated into its own 15% dimension so it doesn't destroy the remaining pitch credit.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/sightReading/score.test.ts
import { describe, it, expect } from 'vitest';
import { scoreAttempt } from './score';
import { generateExercise } from './generate';

const ir = generateExercise({ level: 2, key: 'C', seed: 7 });
const perfect = ir.notes.map(n => ({ midi: n.midi, beatPos: n.beatPos }));

describe('scoreAttempt', () => {
  it('scores a perfect take 100 on every dimension', () => {
    const r = scoreAttempt(ir, perfect);
    expect(r.firstNoteOk).toBe(true);
    expect(r.pitch).toBe(100);
    expect(r.rhythm).toBe(100);
    expect(r.retention).toBe(100);
    expect(r.overall).toBe(100);
  });

  it('forgives octave displacement entirely', () => {
    const octaveDown = perfect.map(n => ({ ...n, midi: n.midi - 12 }));
    const r = scoreAttempt(ir, octaveDown);
    expect(r.pitch).toBe(100);
    expect(r.firstNoteOk).toBe(true);
    expect(r.overall).toBe(100);
  });

  it('fails first-note placement for a whole-line semitone offset, but keeps most pitch credit', () => {
    const flat = perfect.map(n => ({ ...n, midi: n.midi - 1 }));
    const r = scoreAttempt(ir, flat);
    expect(r.firstNoteOk).toBe(false);      // the transferable skill, judged
    expect(r.pitch).toBeGreaterThan(70);    // intervals were all correct
    expect(r.overall).toBeLessThan(90);     // but it costs the 15%
  });

  it('does not punish every later note after a single wrong one', () => {
    const oneWrong = perfect.map((n, i) => (i === 2 ? { ...n, midi: n.midi + 3 } : n));
    const r = scoreAttempt(ir, oneWrong);
    const wrongCount = r.perNote.filter(p => !p.ok).length;
    expect(wrongCount).toBe(1);
    expect(r.pitch).toBeGreaterThan(80);
  });

  it('names the bar where the tonal centre drifted', () => {
    const half = Math.floor(perfect.length / 2);
    const drifting = perfect.map((n, i) => (i >= half ? { ...n, midi: n.midi - 1 } : n));
    const r = scoreAttempt(ir, drifting);
    expect(r.retention).toBeLessThan(100);
    expect(r.driftBar).not.toBeNull();
  });

  it('scores an empty take zero without throwing', () => {
    const r = scoreAttempt(ir, []);
    expect(r.overall).toBe(0);
    expect(r.firstNoteOk).toBe(false);
    expect(r.perNote.every(p => p.sungMidi === null)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun x vitest run src/lib/sightReading/score.test.ts`
Expected: FAIL — `scoreAttempt is not a function`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/sightReading/score.ts
import type { ExerciseIR } from './ir';

export interface SungNote { midi: number; beatPos: number; }
export interface ScoreResult {
  firstNoteOk: boolean; pitch: number; rhythm: number; retention: number; overall: number;
  perNote: { expectedMidi: number; sungMidi: number | null; centsOff: number | null; ok: boolean }[];
  driftBar: number | null;
}

const W = { firstNote: 15, pitch: 45, rhythm: 25, retention: 15 };
const RHYTHM_TOLERANCE_BEATS = 0.25;

// Compare pitch classes, so an octave displacement is identical. A bass singing
// the line an octave down has sung it correctly.
const pc = (midi: number) => ((midi % 12) + 12) % 12;

export function scoreAttempt(ir: ExerciseIR, sung: SungNote[]): ScoreResult {
  const expected = ir.notes;

  if (sung.length === 0) {
    return {
      firstNoteOk: false, pitch: 0, rhythm: 0, retention: 0, overall: 0, driftBar: null,
      perNote: expected.map(n => ({ expectedMidi: n.midi, sungMidi: null, centsOff: null, ok: false })),
    };
  }

  // Align by nearest beat position rather than by index: a student who drops a
  // note should not have every subsequent note marked wrong.
  const perNote = expected.map((exp) => {
    let best: SungNote | null = null, bestDist = Infinity;
    for (const s of sung) {
      const d = Math.abs(s.beatPos - exp.beatPos);
      if (d < bestDist) { bestDist = d; best = s; }
    }
    if (!best || bestDist > 1) {
      return { expectedMidi: exp.midi, sungMidi: null, centsOff: null, ok: false };
    }
    const ok = pc(best.midi) === pc(exp.midi);
    return { expectedMidi: exp.midi, sungMidi: best.midi, centsOff: (best.midi - exp.midi) * 100, ok };
  });

  const firstNoteOk = sung.length > 0 && pc(sung[0].midi) === pc(expected[0].midi);

  const pitch = Math.round((perNote.filter(p => p.ok).length / expected.length) * 100);

  const onTime = expected.filter((exp) =>
    sung.some(s => Math.abs(s.beatPos - exp.beatPos) <= RHYTHM_TOLERANCE_BEATS)).length;
  const rhythm = Math.round((onTime / expected.length) * 100);

  // Retention: does the offset between sung and expected stay put? A student who
  // is consistently 1 semitone flat has kept the key (relative to themselves);
  // one who slides from 0 to -1 halfway through has not.
  const offsets = perNote.map(p => (p.sungMidi === null ? null : p.sungMidi - p.expectedMidi));
  const known = offsets.filter((o): o is number => o !== null);
  const firstOffset = known[0] ?? 0;
  let driftIdx: number | null = null;
  for (let i = 0; i < offsets.length; i++) {
    const o = offsets[i];
    if (o !== null && Math.abs(o - firstOffset) % 12 !== 0) { driftIdx = i; break; }
  }
  const retention = driftIdx === null ? 100
    : Math.round((driftIdx / expected.length) * 100);

  const beatsPerBar = ir.meter.beats;
  const driftBar = driftIdx === null ? null : Math.floor(expected[driftIdx].beatPos / beatsPerBar) + 1;

  const overall = Math.round(
    (firstNoteOk ? W.firstNote : 0) +
    (pitch / 100) * W.pitch +
    (rhythm / 100) * W.rhythm +
    (retention / 100) * W.retention,
  );

  return { firstNoteOk, pitch, rhythm, retention, overall, perNote, driftBar };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun x vitest run src/lib/sightReading/score.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sightReading/score.ts src/lib/sightReading/score.test.ts
git commit -m "feat(sight-reading): four-dimension scorer (octave-forgiving, semitone-strict)"
```

---

### Task 6: The AudioWorklet and the mic hook

**Files:**
- Create: `public/worklets/gw-pitch.js`
- Create: `src/lib/sightReading/useMicPitch.ts`

**Interfaces:**
- Consumes: `detectPitch` (Task 2) — **note: the worklet cannot import from `src/`**, so the detector is duplicated there. See the comment in the file; the duplication is deliberate and pinned by a test.
- Produces: `useMicPitch(): { start(): Promise<void>; stop(): void; permission: 'granted'|'denied'|'prompt'; live: { midi: number; cents: number; clarity: number } | null; captured: SungNote[] }`

`public/worklets/gw-limiter.js` already exists, so the pattern (raw JS in `public/`, loaded by URL) is established. **The worklet is not unit-testable in Vitest** — jsdom has no AudioWorklet. The pure detector is tested in Task 2; this task is verified on hardware in Task 7.

- [ ] **Step 1: Write the worklet**

```js
// public/worklets/gw-pitch.js
// Runs on the audio thread. It cannot import from src/, so detectPitch is
// duplicated here from src/lib/sightReading/pitch.ts. Keep them in sync; the
// authoritative version is the TS one, which has the tests.
const CLARITY_FLOOR = 0.8, MIN_HZ = 70, MAX_HZ = 1200;

function detectPitch(buf, sampleRate) {
  const n = buf.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / n);
  if (rms < 0.005) return { hz: 0, clarity: 0 };

  const maxLag = Math.min(n - 1, Math.floor(sampleRate / MIN_HZ));
  const minLag = Math.max(2, Math.floor(sampleRate / MAX_HZ));
  const nsdf = new Float32Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let acf = 0, div = 0;
    for (let i = 0; i + lag < n; i++) {
      acf += buf[i] * buf[i + lag];
      div += buf[i] * buf[i] + buf[i + lag] * buf[i + lag];
    }
    nsdf[lag] = div > 0 ? (2 * acf) / div : 0;
  }
  let bestLag = -1, bestVal = 0, lag = minLag;
  while (lag < maxLag && nsdf[lag] <= 0) lag++;
  for (; lag < maxLag; lag++) {
    if (nsdf[lag] > nsdf[lag - 1] && nsdf[lag] >= nsdf[lag + 1]) {
      if (nsdf[lag] > bestVal) { bestVal = nsdf[lag]; bestLag = lag; }
      if (bestVal > CLARITY_FLOOR) break;
    }
  }
  if (bestLag < 0 || bestVal < 0.5) return { hz: 0, clarity: 0 };
  const y0 = nsdf[bestLag - 1], y1 = nsdf[bestLag], y2 = nsdf[bestLag + 1];
  const denom = 2 * (2 * y1 - y0 - y2);
  const shift = denom !== 0 ? (y2 - y0) / denom : 0;
  const hz = sampleRate / (bestLag + shift);
  if (hz < MIN_HZ || hz > MAX_HZ) return { hz: 0, clarity: 0 };
  return { hz, clarity: bestVal };
}

class GwPitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buf = new Float32Array(2048);
    this._filled = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      this._buf[this._filled++] = ch[i];
      if (this._filled === this._buf.length) {
        // `sampleRate` is a global in AudioWorkletGlobalScope. Never hardcode 48000.
        const { hz, clarity } = detectPitch(this._buf, sampleRate);
        this.port.postMessage({ hz, clarity, t: currentTime });
        this._filled = 0;
      }
    }
    return true;
  }
}
registerProcessor('gw-pitch', GwPitchProcessor);
```

- [ ] **Step 2: Write the hook**

```ts
// src/lib/sightReading/useMicPitch.ts
import { useCallback, useRef, useState } from 'react';
import { hzToMidi, nearestMidi } from './pitch';
import type { SungNote } from './score';

type Permission = 'granted' | 'denied' | 'prompt';

export function useMicPitch() {
  const [permission, setPermission] = useState<Permission>('prompt');
  const [live, setLive] = useState<{ midi: number; cents: number; clarity: number } | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const capturedRef = useRef<SungNote[]>([]);
  const startedAtRef = useRef(0);
  const tempoRef = useRef(80);

  const start = useCallback(async (tempo = 80) => {
    tempoRef.current = tempo;
    capturedRef.current = [];
    try {
      // All three processors OFF: AGC rides the level and destroys the cents
      // reading; noise suppression eats sustained vowels.
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      setPermission('granted');
    } catch {
      setPermission('denied');
      return;
    }

    // Never hardcode a sample rate; iOS picks its own and resampling costs cents.
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    await ctx.audioWorklet.addModule('/worklets/gw-pitch.js');
    const src = ctx.createMediaStreamSource(streamRef.current);
    const node = new AudioWorkletNode(ctx, 'gw-pitch');
    startedAtRef.current = ctx.currentTime;

    node.port.onmessage = (e) => {
      const { hz, clarity } = e.data as { hz: number; clarity: number };
      if (!hz) { setLive(null); return; }
      const midi = nearestMidi(hz);
      const cents = (hzToMidi(hz) - midi) * 100;
      setLive({ midi, cents, clarity });
      const beats = ((ctx.currentTime - startedAtRef.current) * tempoRef.current) / 60;
      const last = capturedRef.current.at(-1);
      if (!last || last.midi !== midi) capturedRef.current.push({ midi, beatPos: beats });
    };
    src.connect(node);
    // Do NOT connect to destination — the student must not hear themselves.
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close();
    ctxRef.current = null;
    setLive(null);
  }, []);

  return { start, stop, permission, live, captured: capturedRef.current };
}
```

- [ ] **Step 3: Verify the CSP does not block the worklet**

The CSP is a `<meta>` tag in `index.html`. Confirm `worker-src 'self' blob:` is present (it is). Run:

```bash
grep -o "worker-src[^;]*" index.html
```
Expected: `worker-src 'self' blob:`

If a future CSP edit drops it, the worklet fails silently with `addModule` rejecting — the same class of silent failure that caused the Cloudflare reload loop.

- [ ] **Step 4: Typecheck**

Run: `bun x tsc --noEmit -p tsconfig.json`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add public/worklets/gw-pitch.js src/lib/sightReading/useMicPitch.ts
git commit -m "feat(sight-reading): AudioWorklet pitch tracker + mic hook"
```

---

### Task 7: Prove the mic path on a physical iPhone

**Files:**
- Create: `src/pages/sightReading/MicCheck.tsx` (temporary harness, deleted at the end of this task)

This task exists because **the iOS simulator lies about audio.** No amount of Vitest coverage substitutes for it, and every later task depends on this working.

**Interfaces:**
- Consumes: `useMicPitch` (Task 6).
- Produces: nothing. It is a throwaway.

- [ ] **Step 1: Write the harness**

```tsx
// src/pages/sightReading/MicCheck.tsx
import { useMicPitch } from '@/lib/sightReading/useMicPitch';

export default function MicCheck() {
  const { start, stop, permission, live } = useMicPitch();
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Mic check</h1>
      <p className="text-sm text-slate-600">Permission: {permission}</p>
      <button className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
              onClick={() => start(80)}>Start</button>
      <button className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold"
              onClick={stop}>Stop</button>
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        {live ? (
          <>
            <div className="text-4xl font-bold">{names[live.midi % 12]}{Math.floor(live.midi / 12) - 1}</div>
            <div className="text-sm text-slate-600">{live.cents.toFixed(1)} cents · clarity {live.clarity.toFixed(2)}</div>
          </>
        ) : <div className="text-sm text-slate-500">— no pitch —</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Mount it temporarily**

Add to `src/App.tsx` beside the other routes:

```tsx
const MicCheck = lazy(() => import("./pages/sightReading/MicCheck"));
// ...
<Route path="/mic-check" element={<MicCheck />} />
```

- [ ] **Step 3: Verify in the browser first**

Run: `bun x vite build && bun x vite preview`
Open `/mic-check`, sing a sustained A. Expected: reads `A4`, |cents| < 20, clarity > 0.9.

- [ ] **Step 4: Verify on a physical iPhone**

```bash
bun x vite build && bun x cap sync ios && bun x cap open ios
```
Run on a **real device** (not the simulator). Expected: permission prompt appears; a sung A reads A3/A4 within ±20 cents; clarity > 0.85 on a sustained vowel; no audio feedback (the node is never connected to `destination`).

If cents readings swing wildly, confirm `autoGainControl: false` actually took effect — iOS silently ignores constraints it dislikes. Log `streamRef.current.getAudioTracks()[0].getSettings()`.

- [ ] **Step 5: Remove the harness and commit the finding**

```bash
git rm src/pages/sightReading/MicCheck.tsx
# revert the /mic-check route + lazy import in src/App.tsx
git add src/App.tsx
git commit -m "chore(sight-reading): verify mic->cents path on physical iPhone, remove harness"
```

Record the device, iOS version, and observed cents error in the commit body. If this task fails, **stop** — the rest of the slice is worthless without it, and the design needs revisiting before any UI is built.

---

### Task 8: The page, the routes, and the demolition

This is deliberately one task. Redirects, lazy-import removal, and component-tree deletion **must land atomically**, or dangling imports break the ~2800-line `App.tsx` build. A reviewer cannot meaningfully approve half of it.

**Files:**
- Create: `src/pages/sightReading/SightReadingStudio.tsx`, `src/pages/sightReading/SingFlow.tsx`, `src/pages/sightReading/ResultCard.tsx`
- Modify: `src/App.tsx` (routes at lines 1220, 1433, 2732, 2740, 2748, 2773, 2808; lazy imports at 199, 302–304, 307, 350), `src/pages/GleeWorldLanding.tsx`
- Move: `src/components/sight-singing/hooks/useTonePlayback.ts` → `src/lib/sightReading/useTonePlayback.ts`
- Delete: the seven page files and the two component trees listed in **File Structure**, plus `supabase/functions/assess-sight-singing/`, `supabase/functions/evaluate-singing/`
- Test: `src/pages/sightReading/SightReadingStudio.test.tsx`

**Interfaces:**
- Consumes: `generateExercise` (4), `scoreAttempt` (5), `useMicPitch` (6), `useTonePlayback` (salvaged), `parsedScoreToIR` (3).
- Produces: the route `/dashboard/sight-reading`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/pages/sightReading/SightReadingStudio.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SightReadingStudio from './SightReadingStudio';

vi.mock('@/lib/sightReading/useMicPitch', () => ({
  useMicPitch: () => ({ start: vi.fn(), stop: vi.fn(), permission: 'prompt', live: null, captured: [] }),
}));

const renderPage = () =>
  render(<MemoryRouter><SightReadingStudio /></MemoryRouter>);

describe('SightReadingStudio — the empty state IS the primary state', () => {
  it('shows Start practice above the fold', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /start practice/i })).toBeInTheDocument();
  });

  it('renders no stat cards when there are zero attempts', () => {
    renderPage();
    expect(screen.queryByText(/average score/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/best score/i)).not.toBeInTheDocument();
    expect(screen.queryByText('--%')).not.toBeInTheDocument();
  });

  it('has exactly one navigation control, with three options', () => {
    renderPage();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map(t => t.textContent)).toEqual(['Practice', 'Library', 'Progress']);
  });

  it('does not offer Theory review — it belongs to Glee Academy', () => {
    renderPage();
    expect(screen.queryByText(/theory/i)).not.toBeInTheDocument();
  });

  it('offers the pitch pipe as a chip, not a tab', () => {
    renderPage();
    const pipe = screen.getByRole('button', { name: /pitch pipe/i });
    expect(pipe).toBeInTheDocument();
    expect(pipe.getAttribute('role')).not.toBe('tab');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun x vitest run src/pages/sightReading/SightReadingStudio.test.tsx`
Expected: FAIL — cannot resolve `./SightReadingStudio`.

- [ ] **Step 3: Build the page**

```tsx
// src/pages/sightReading/SightReadingStudio.tsx
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Music } from 'lucide-react';
import { SingFlow } from './SingFlow';
import { generateExercise } from '@/lib/sightReading/generate';
import type { ExerciseIR } from '@/lib/sightReading/ir';

const ACTIVITY_KEY = 'gw_sight_reading_activity';   // existing key, unchanged

export default function SightReadingStudio() {
  const [exercise, setExercise] = useState<ExerciseIR | null>(null);
  const [level, setLevel] = useState(1);
  const [key, setKey] = useState('C');

  const start = () =>
    setExercise(generateExercise({ level, key, seed: Math.floor(Math.random() * 1e9) }));

  if (exercise) {
    return <SingFlow exercise={exercise} onExit={() => setExercise(null)} activityKey={ACTIVITY_KEY} />;
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Sight Reading</h1>
        <p className="text-sm text-slate-600">
          Sing a line, get instant feedback. No grades — just practice.
        </p>
      </header>

      <Button size="lg" className="w-full rounded-full" onClick={start}>
        Start practice
      </Button>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="text-slate-600">Key</label>
        <select className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                value={key} onChange={(e) => setKey(e.target.value)}>
          {['C','D','Eb','E','F','G','A','Bb'].map(k => <option key={k}>{k}</option>)}
        </select>
        <label className="ml-2 text-slate-600">Level</label>
        {[1,2,3,4,5,6].map(l => (
          <button key={l} onClick={() => setLevel(l)}
            className={`h-8 w-8 rounded-full text-sm font-semibold ${
              level === l ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {l}
          </button>
        ))}
        <Button variant="outline" size="sm" className="ml-auto rounded-full">
          <Music className="mr-1.5 h-4 w-4" /> Pitch pipe
        </Button>
      </div>

      <Tabs defaultValue="practice">
        <TabsList className="w-full">
          <TabsTrigger value="practice" className="flex-1">Practice</TabsTrigger>
          <TabsTrigger value="library" className="flex-1">Library</TabsTrigger>
          <TabsTrigger value="progress" className="flex-1">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="practice" className="pt-4">
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-slate-600">
              Nothing yet. Generate a line above and sing it.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="library" className="pt-4">
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-slate-600">
              Your teacher hasn’t added any scores yet.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="progress" className="pt-4">
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-slate-600">
              No takes yet. Sing your first line and your progress shows up here.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

`SingFlow.tsx` renders the OSMD notation, calls `useTonePlayback` to prime (I–IV–V–I, then the starting pitch), runs the four-beat count-in, streams `useMicPitch`, then hands `captured` to `scoreAttempt` and renders `ResultCard`. It writes one entry to `localStorage[ACTIVITY_KEY]` and nothing else — no network, no MediaRecorder, no database.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun x vitest run src/pages/sightReading/SightReadingStudio.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Rewire the routes**

In `src/App.tsx`:
- Line 1433: replace `<DashboardShell><SightReadingPage /></DashboardShell>` with `<DashboardShell><SightReadingStudio /></DashboardShell>`.
- Lines 2808 and 2773: replace the elements with `<Navigate to="/dashboard/sight-reading" replace />`.
- Line 2748: replace with `<Navigate to="/dashboard/sight-reading" replace />`.
- Lines 1220, 2732, 2740: **delete the `<Route>` blocks entirely.**
- Delete lazy imports at lines 199, 302, 303, 304, 350 and the static import at 307. Add `const SightReadingStudio = lazy(() => import("./pages/sightReading/SightReadingStudio"));`

Then delete the files:

```bash
git rm -r src/components/member-sight-reading src/components/sight-singing \
          src/pages/MUS100SightSingingPage.tsx src/pages/SightReadingPreview.tsx \
          src/pages/SightReadingSubmission.tsx src/pages/SightReadingGenerator.tsx \
          src/pages/MemberSightReadingStudioPage.tsx src/pages/MemberSightReadingStudio.tsx \
          src/pages/member/SightReadingPage.tsx \
          supabase/functions/assess-sight-singing supabase/functions/evaluate-singing
```

`musicXMLParser.ts` moved out in Task 3; `useTonePlayback.ts` moves at the start of **this** task, before the `git rm -r` above. Verify with `git status` that both live under `src/lib/sightReading/` before deleting the tree, or you delete the two files you meant to keep.

Repoint the link in `src/pages/GleeWorldLanding.tsx` to `/dashboard/sight-reading`.

- [ ] **Step 6: Verify nothing dangles**

```bash
grep -rn "sight-singing\|member-sight-reading\|assess-sight-singing\|evaluate-singing" src/ supabase/functions/ || echo "clean"
bun x tsc --noEmit -p tsconfig.json
bun run test
bun x vite build
```
Expected: `clean`, 0 type errors, all tests pass, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(sight-reading): one page, one nav, real scoring; delete 6 dead routes

Collapses 7 routes to 1 and removes the Whisper-transcript grader. The empty
state is now the primary state, because it is the only state that has ever
existed in production: every scoring table has zero rows.

Deletes assess-sight-singing and evaluate-singing, which sent sung audio to
OpenAI's speech-to-text endpoint and asked GPT to judge pitch accuracy from the
resulting transcript, falling back to a hardcoded 75. A transcript cannot
contain pitch."
```

---

## Self-Review

**Spec coverage.** One page and one nav model → Task 8. Empty state as primary → Task 8 tests. Priming I–IV–V–I → Task 8 (`SingFlow`). Four-dimension scoring, 15/45/25/15 → Task 5. First-note placement as its own dimension, octave forgiveness, semitone strictness → Task 5 tests. Bands A–B ladder → Task 4. Generated-and-teacher lines share one IR → Task 3. On-device tracker, nothing persisted → Tasks 2, 6, and the `localStorage` write in Task 8. Route consolidation table → Task 8. Theory removed entirely → asserted in Task 8's tests. iOS/Capacitor proof on hardware → Task 7.

**Deferred to slice 2, as the spec says:** the score bank migration, `gw_sight_reading_assignment_items`, `gw_sight_reading_attempts`, assignment→gradebook promotion, teacher MusicXML upload. No task here touches the database, and none should.

**Known gap, deliberate.** `SingFlow.tsx` and `ResultCard.tsx` are described but not specified line-by-line, because their content is a straight assembly of the tested modules (`generateExercise` → `useTonePlayback` priming → `useMicPitch` → `scoreAttempt` → render). If the implementer wants a test there, assert that a completed flow writes exactly one entry to `gw_sight_reading_activity` and makes zero network calls.

**Type consistency.** `SungNote` is defined once in `score.ts` and imported by `useMicPitch.ts`. `ExerciseIR`/`IRNote` are defined once in `ir.ts` and consumed by `generate.ts`, `score.ts`, and the page. `detectPitch` has the same signature in `pitch.ts` and `public/worklets/gw-pitch.js`; the duplication is called out in the worklet's header comment, since the worklet cannot import from `src/`.

**One risk this plan cannot remove.** Task 7 can fail. If iOS won't honour `autoGainControl: false`, the cents readings will wander and the scorer's tolerances become meaningless. That is why Task 7 comes before any UI is built and why it says *stop* rather than *work around it*.
