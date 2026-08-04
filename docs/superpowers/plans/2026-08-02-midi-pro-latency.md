# MIDI Pro (Latency + Accuracy + Audit Fixes) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce Studio MIDI monitoring latency from ~110–140ms to hardware floor (~10–30ms), make takes capture exactly what was played, and fix all seven confirmed bugs from the 2026-08-02 MIDI audit.

**Architecture:** Live monitoring (`LiveVoices`) switches from lookahead-scheduled (`Tone.now()`) to immediate (`Tone.immediate()`) triggering; transport scheduling is untouched. Capture-path fixes extract small pure/testable units into `src/lib/studio/midiRecord.ts` and `midiEdit.ts` rather than growing `StudioEditor.tsx`. The MIDI input facade gains a managed subscription (mutable device filter) so device switching never restarts the session.

**Tech Stack:** Vite + React 18 + TS, Tone.js 15, Vitest (`vi.mock('tone')` per house pattern in `src/lib/studio/__tests__/enginePausePlayers.test.ts`), Web MIDI / GWMidi Capacitor plugin.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-02-midi-pro-latency-design.md`. Web first; iOS-facing code must remain web-safe.
- Do NOT change Tone's global `lookAhead` or any transport scheduling path (metronome is phase-locked and shipped — see design note atop `src/lib/studio/engine/engine.ts`).
- Gates per PR: `npm run typecheck:guard`, `npm run test:studio`, `npm run lint` — all green.
- Facade back-compat: `MidiInputSource.subscribe()`'s existing signature must keep working for `VirtualPiano.tsx`, `StandalonePiano.tsx`, `useHandsFreeControls.ts`.
- Deploy only via `bash scripts/deploy-frontend.sh` (never bare rsync; never `--delete`).
- Branch/PR flow: work on `feat/midi-pro-<letter>` branches cut from `origin/main`, one PR per letter below, merged in order A→E.
- Worktree: `/private/tmp/claude-501/-Users-kevinjohnson/aeb17153-0200-46f8-8915-61483574fd44/scratchpad/gw-main` (currently on `feat/midi-pro`; rename/cut per-PR branches from it).

---

## PR A — Monitoring latency core

### Task A1: LiveVoices triggers at `Tone.immediate()`

**Files:**
- Modify: `src/lib/studio/engine/liveVoices.ts` (lines 81–111: `noteOn`, `noteOff`, `sustain`)
- Test: `src/lib/studio/__tests__/liveVoicesLatency.test.ts` (create)

**Interfaces:**
- Consumes: `Tone.immediate()` (existing Tone API — `currentTime` without lookahead).
- Produces: no signature changes; behavior only.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/studio/__tests__/liveVoicesLatency.test.ts
// Live monitoring must trigger at Tone.immediate() (context.currentTime),
// NOT Tone.now() (currentTime + lookAhead, default 0.1s) — the lookahead
// is pure added latency for a live key-press. Regression for the
// 100ms-monitoring-latency bug.
import { describe, it, expect, vi } from 'vitest';

const calls = vi.hoisted(() => ({
  attacks: [] as Array<{ time: number }>,
  releases: [] as Array<{ time: number }>,
}));

vi.mock('tone', () => {
  class MockParam { value = 0; }
  class MockNode {
    volume = new MockParam();
    pan = new MockParam();
    gain = new MockParam();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(..._args: any[]) {}
    connect() { return this; }
    disconnect() { return this; }
    dispose() {}
  }
  class PolySynth extends MockNode {
    triggerAttack(_n: string, time: number) { calls.attacks.push({ time }); }
    triggerRelease(_n: string, time: number) { calls.releases.push({ time }); }
    triggerAttackRelease() {}
  }
  return {
    PanVol: MockNode,
    Gain: MockNode,
    BiquadFilter: MockNode,
    PolySynth,
    Synth: MockNode,
    Sampler: MockNode,
    MembraneSynth: MockNode,
    NoiseSynth: MockNode,
    MetalSynth: MockNode,
    getDestination: () => new MockNode(),
    now: () => 100.1,        // currentTime + lookAhead
    immediate: () => 100.0,  // currentTime
  };
});

import { LiveVoices } from '../engine/liveVoices';

describe('LiveVoices latency', () => {
  it('triggers attack and release at Tone.immediate(), not Tone.now()', () => {
    const lv = new LiveVoices();
    lv.setInstrument({ type: 'synth_basic', preset_id: 'sine', params: {} });
    lv.noteOn(60, 0.8);
    lv.noteOff(60);
    expect(calls.attacks[0].time).toBe(100.0);
    expect(calls.releases[0].time).toBe(100.0);
  });

  it('pedal-up releases sustained notes at immediate time', () => {
    calls.releases.length = 0;
    const lv = new LiveVoices();
    lv.setInstrument({ type: 'synth_basic', preset_id: 'sine', params: {} });
    lv.sustain(true);
    lv.noteOn(64, 0.8);
    lv.noteOff(64);            // damper holds — no release yet
    expect(calls.releases.length).toBe(0);
    lv.sustain(false);
    expect(calls.releases[0].time).toBe(100.0);
  });
});
```

Note: if the `Instrument` type import path complains, the spec object literal matches `src/lib/studio/session.ts`'s `Instrument` (`{ type, preset_id, params }`); cast with `as Instrument` importing the type.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/studio/__tests__/liveVoicesLatency.test.ts`
Expected: FAIL — received time `100.1` (from `Tone.now()`).

- [ ] **Step 3: Implement**

In `src/lib/studio/engine/liveVoices.ts` replace every `Tone.now()` in `noteOn`, `noteOff`, `sustain` with `Tone.immediate()` (4 call sites: noteOn's `now` const, noteOff's release, sustain's `now` const). Update the class header comment: add one line — "Triggers use Tone.immediate(): monitoring must not pay the transport lookAhead (~100ms); scheduled playback keeps its lookahead elsewhere."

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/studio/__tests__/liveVoicesLatency.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the whole studio suite + typecheck**

Run: `npm run test:studio && npm run typecheck:guard`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/studio/engine/liveVoices.ts src/lib/studio/__tests__/liveVoicesLatency.test.ts
git commit -m "studio: live MIDI monitoring triggers at Tone.immediate() — removes 100ms lookahead latency"
```

### Task A2: Monitoring-latency readout in MIDI settings

**Files:**
- Modify: `src/pages/studio/StudioEditor.tsx` — the `MidiInputSection` component (grep `MidiInputSection`; the device `<select>` lives near line 6386)
- Modify: `src/lib/studio/midiTimebase.ts` — add pure formatter
- Test: `src/lib/studio/__tests__/midiTimebase.test.ts` — extend

**Interfaces:**
- Consumes: `getOutputLatencyMs()` from `src/lib/studio/midiTimebase.ts` (existing) and `engineState.engine?.getOutputLatencyMs()` (existing engine method used by `resetMidiCapture`).
- Produces: `formatMonitoringLatency(ms: number): string` exported from `midiTimebase.ts`.

- [ ] **Step 1: Write the failing test** (append to existing `midiTimebase.test.ts` describe file)

```ts
import { formatMonitoringLatency } from '../midiTimebase';

describe('formatMonitoringLatency', () => {
  it('rounds and labels', () => {
    expect(formatMonitoringLatency(12.4)).toBe('monitoring ≈ 12ms');
    expect(formatMonitoringLatency(0)).toBe('monitoring ≈ 0ms');
  });
  it('clamps negatives to 0', () => {
    expect(formatMonitoringLatency(-3)).toBe('monitoring ≈ 0ms');
  });
});
```

- [ ] **Step 2: Run to verify FAIL** — `npx vitest run src/lib/studio/__tests__/midiTimebase.test.ts`

- [ ] **Step 3: Implement**

In `midiTimebase.ts`:

```ts
/** Human label for the Studio MIDI settings panel. */
export function formatMonitoringLatency(ms: number): string {
  return `monitoring ≈ ${Math.max(0, Math.round(ms))}ms`;
}
```

In `MidiInputSection` (StudioEditor.tsx), under the device select, render:

```tsx
<p className="text-xs text-muted-foreground mt-1">
  {formatMonitoringLatency(engineState.engine?.getOutputLatencyMs() ?? getOutputLatencyMs())}
</p>
```

Match surrounding markup (the section already uses `text-xs` per the Studio sizing standard — never sub-12px). Import `formatMonitoringLatency` alongside the existing `getOutputLatencyMs` import.

- [ ] **Step 4: PASS + gates** — `npx vitest run src/lib/studio/__tests__/midiTimebase.test.ts && npm run typecheck:guard && npm run lint`

- [ ] **Step 5: Commit**

```bash
git add src/lib/studio/midiTimebase.ts src/lib/studio/__tests__/midiTimebase.test.ts src/pages/studio/StudioEditor.tsx
git commit -m "studio: show measured monitoring latency in MIDI settings"
```

---

## PR B — Autosave unmount flush

### Task B1: Flush the latest session on unmount

**Files:**
- Modify: `src/hooks/useStudio.ts:275-310` (the `queueSave`/`update`/`flushSave`/unmount-effect block)
- Test: `src/hooks/__tests__/useStudioUnmountFlush.test.tsx` (create; check `src/hooks/__tests__/` exists, else create dir)

**Interfaces:**
- Consumes: `saveSession` from `@/lib/studio/storage` (mocked in test).
- Produces: no API change; `useStudioSession` behavior only.

- [ ] **Step 1: Write the failing test**

```tsx
// The unmount cleanup previously closed over the mount-time session
// (null — it loads async) with [] deps, so it cancelled the pending
// debounced save and then skipped its replacement flush. Edits made in
// the last <800ms before an in-app navigation were silently lost.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const storage = vi.hoisted(() => ({
  saved: [] as unknown[],
}));

vi.mock('@/lib/studio/storage', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/studio/storage')>();
  return {
    ...mod,
    loadSession: vi.fn(async () => ({
      id: 's1', title: 'T', tempo_bpm: 120,
      time_signature: { numerator: 4, denominator: 4 },
      tracks: [], schema_version: '1.0.0',
    })),
    saveSession: vi.fn(async (s: unknown) => { storage.saved.push(s); }),
  };
});

import { useStudioSession } from '../useStudio';

describe('useStudioSession unmount flush', () => {
  beforeEach(() => { storage.saved.length = 0; });

  it('flushes the LATEST session when unmounted inside the debounce window', async () => {
    const { result, unmount } = renderHook(() => useStudioSession('s1'));
    await waitFor(() => expect(result.current.session).not.toBeNull());
    act(() => {
      result.current.update((s) => ({ ...s, title: 'EDITED' }));
    });
    unmount(); // within the 800ms debounce
    await waitFor(() => expect(storage.saved.length).toBe(1));
    expect((storage.saved[0] as { title: string }).title).toBe('EDITED');
  });
});
```

Adapt the mocked `loadSession` return to the real `Session` shape — copy a minimal valid object from `src/lib/studio/__example.session.json` / `defaults.ts` if validation rejects the literal above. If the hook's real name differs (`grep "export function useStudio" src/hooks/useStudio.ts`), use the actual export; the file exposes the session hook used by `StudioEditor` (`{ session, loading, error, update, flushSave, reload }`).

- [ ] **Step 2: Run to verify FAIL** — `npx vitest run src/hooks/__tests__/useStudioUnmountFlush.test.tsx`
Expected: FAIL — `storage.saved.length` stays 0.

- [ ] **Step 3: Implement**

In `useStudio.ts`, inside the hook:

```ts
// Latest session for the unmount flush — the cleanup closure below is
// created once (deps []), so reading state directly there would see the
// mount-time value (null) forever.
const sessionRef = useRef<Session | null>(null);
sessionRef.current = session;
```

Replace the unmount effect:

```ts
// Flush on unmount. Reads sessionRef (not `session`) — see above.
useEffect(() => () => {
  if (saveTimer.current) clearTimeout(saveTimer.current);
  if (sessionRef.current) saveSession(sessionRef.current).catch(() => { /* swallow */ });
}, []);
```

Delete the now-unneeded `eslint-disable-next-line react-hooks/exhaustive-deps` on that effect.

- [ ] **Step 4: PASS + gates** — `npx vitest run src/hooks/__tests__/useStudioUnmountFlush.test.tsx && npm run test:studio && npm run typecheck:guard`

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useStudio.ts src/hooks/__tests__/useStudioUnmountFlush.test.tsx
git commit -m "studio: unmount flush saves the LATEST session — closes 800ms edit-loss window on navigation"
```

---

## PR C — Punch & capture accuracy

### Task C1: Extract a testable MIDI commit queue; cancel discards it

**Files:**
- Modify: `src/lib/studio/midiRecord.ts` (append)
- Modify: `src/pages/studio/StudioEditor.tsx:595-646` (replace `pendingMidiCommitsRef`/`pendingFlushTimerRef` plumbing) and `cancelPunch` (~line 1953)
- Test: `src/lib/studio/__tests__/midiCommitQueue.test.ts` (create)

**Interfaces:**
- Produces (in `midiRecord.ts`):

```ts
export interface MidiCommitQueue<T> {
  add(item: T): void;        // starts/extends the coalesce timer
  flushNow(): T[];           // cancel timer, drain, return items
  clear(): void;             // cancel timer, drop items — "leave no trace"
  size(): number;
}
export function createMidiCommitQueue<T>(opts: {
  coalesceMs: number;
  onFlush: (items: T[]) => void;
  setTimer?: typeof setTimeout;   // injectable for tests
  clearTimer?: typeof clearTimeout;
}): MidiCommitQueue<T>;
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest';
import { createMidiCommitQueue } from '../midiRecord';

describe('createMidiCommitQueue', () => {
  it('coalesces adds into one onFlush after coalesceMs', () => {
    vi.useFakeTimers();
    const flushed: number[][] = [];
    const q = createMidiCommitQueue<number>({ coalesceMs: 250, onFlush: (i) => flushed.push(i) });
    q.add(1); q.add(2);
    expect(flushed.length).toBe(0);
    vi.advanceTimersByTime(250);
    expect(flushed).toEqual([[1, 2]]);
    expect(q.size()).toBe(0);
    vi.useRealTimers();
  });

  it('flushNow drains synchronously and cancels the timer', () => {
    vi.useFakeTimers();
    const flushed: number[][] = [];
    const q = createMidiCommitQueue<number>({ coalesceMs: 250, onFlush: (i) => flushed.push(i) });
    q.add(7);
    expect(q.flushNow()).toEqual([7]);
    vi.advanceTimersByTime(1000);
    expect(flushed).toEqual([[7]]); // exactly once, via flushNow
    vi.useRealTimers();
  });

  it('clear discards items and cancels the timer — nothing ever flushes', () => {
    vi.useFakeTimers();
    const flushed: number[][] = [];
    const q = createMidiCommitQueue<number>({ coalesceMs: 250, onFlush: (i) => flushed.push(i) });
    q.add(9);
    q.clear();
    vi.advanceTimersByTime(1000);
    expect(flushed).toEqual([]);
    expect(q.size()).toBe(0);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: FAIL** — `npx vitest run src/lib/studio/__tests__/midiCommitQueue.test.ts`

- [ ] **Step 3: Implement in `midiRecord.ts`**

```ts
/** Coalescing commit queue for captured MIDI presses. StudioEditor batches
 * note commits ~250ms so chords land as one manifest write; punch-cancel
 * must be able to discard the batch entirely ("leave no trace"). */
export function createMidiCommitQueue<T>(opts: {
  coalesceMs: number;
  onFlush: (items: T[]) => void;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
}): MidiCommitQueue<T> {
  const setT = opts.setTimer ?? setTimeout;
  const clearT = opts.clearTimer ?? clearTimeout;
  let items: T[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  const cancel = () => { if (timer !== null) { clearT(timer); timer = null; } };
  const drain = () => { const out = items; items = []; return out; };
  return {
    add(item) {
      items.push(item);
      if (timer === null) timer = setT(() => { timer = null; opts.onFlush(drain()); }, opts.coalesceMs);
    },
    flushNow() { cancel(); const out = drain(); if (out.length) opts.onFlush(out); return out; },
    clear() { cancel(); items = []; },
    size() { return items.length; },
  };
}
```

(+ the `MidiCommitQueue<T>` interface above it.)

- [ ] **Step 4: PASS** — rerun the test file.

- [ ] **Step 5: Wire into StudioEditor**

Replace `pendingMidiCommitsRef` + `pendingFlushTimerRef` (lines ~595–646): create once via `useRef` lazily:

```ts
const midiCommitQueueRef = useRef<MidiCommitQueue<{ presses: HeldPress[]; upAbs: number }> | null>(null);
if (!midiCommitQueueRef.current) {
  midiCommitQueueRef.current = createMidiCommitQueue({
    coalesceMs: 250,
    onFlush: (batch) => flushPendingMidiCommits(batch),
  });
}
```

`flushPendingMidiCommits` changes signature to receive `batch` instead of reading/clearing the refs. `commitMidiPresses(presses, upAbs, immediate)`: `immediate ? queue.add(...) + queue.flushNow()` (or add a direct path) — preserve current behavior exactly: today `immediate=true` forces a synchronous flush of everything pending.

In `cancelPunch()` add:

```ts
midiCommitQueueRef.current?.clear();  // discard coalesced-but-unflushed notes
midiTakeClipRef.current = null;       // next take must not adopt this clip
```

Keep the existing `midiHeld.flush(); midiCcRef.current = [];` lines.

- [ ] **Step 6: Gates** — `npm run test:studio && npm run typecheck:guard && npm run lint`

- [ ] **Step 7: Commit**

```bash
git add src/lib/studio/midiRecord.ts src/lib/studio/__tests__/midiCommitQueue.test.ts src/pages/studio/StudioEditor.tsx
git commit -m "studio: punch-cancel discards coalesced MIDI commits — extract testable commit queue"
```

### Task C2: Punch capture gates on the actual punch phase

**Files:**
- Modify: `src/lib/studio/midiRecord.ts` (append pure predicate)
- Modify: `src/pages/studio/StudioEditor.tsx` — `handleMidiNoteOn/Off/Sustain/Cc` (lines ~648–700) and the punch-in transition (`beginPunchTake`, grep it; the watcher lives near `punchWatchRef` ~line 2043)
- Test: `src/lib/studio/__tests__/midiCaptureGate.test.ts` (create)

**Interfaces:**
- Produces: `export function shouldCaptureMidi(recordingActive: boolean, punchPhase: 'pre' | 'rec' | 'post' | null): boolean` — capture iff `recordingActive && (punchPhase === null || punchPhase === 'rec')`.

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { shouldCaptureMidi } from '../midiRecord';

describe('shouldCaptureMidi', () => {
  it('captures during a normal (non-punch) take', () => {
    expect(shouldCaptureMidi(true, null)).toBe(true);
  });
  it('never captures when not recording', () => {
    expect(shouldCaptureMidi(false, null)).toBe(false);
    expect(shouldCaptureMidi(false, 'rec')).toBe(false);
  });
  it('punch pass: captures only inside the punch range', () => {
    expect(shouldCaptureMidi(true, 'pre')).toBe(false);
    expect(shouldCaptureMidi(true, 'rec')).toBe(true);
    expect(shouldCaptureMidi(true, 'post')).toBe(false);
  });
});
```

- [ ] **Step 2: FAIL**, **Step 3: implement** (one-liner per Interfaces), **Step 4: PASS**.

- [ ] **Step 5: Wire the gate**

In each `handleMidi*` handler replace `if (state?.recordingActive)` with:

```ts
if (shouldCaptureMidi(!!state?.recordingActive, punchRef.current?.phase ?? null))
```

(`handleMidiNoteOff`/`handleMidiSustain` commit paths get the same gate where they currently check `recordingActive` implicitly by committing — read each handler; live-monitoring calls (`liveVoicesRef`) stay UNgated.)

At the punch-in transition (`beginPunchTake`), before starting the recorder, add:

```ts
resetMidiCapture();
midiTakeClipRef.current = null;
midiCommitQueueRef.current?.clear();
```

so pre-roll noodling armed at `startPunchRecord` time can't leak into the take.

- [ ] **Step 6: Gates + Commit**

```bash
npm run test:studio && npm run typecheck:guard
git add src/lib/studio/midiRecord.ts src/lib/studio/__tests__/midiCaptureGate.test.ts src/pages/studio/StudioEditor.tsx
git commit -m "studio: punch takes capture MIDI only inside the punch range"
```

### Task C3: Pedal state survives take start; CC-only takes produce a clip

**Files:**
- Modify: `src/pages/studio/StudioEditor.tsx` — `handleMidiSustain` (~line 665), `resetMidiCapture` (~1457), `commitTakeCc` (~1691)
- Modify: `src/lib/studio/midiRecord.ts` — add `ensureTakeClip`
- Test: extend `src/lib/studio/midiInput.test.ts` (house suite for capture helpers)

**Interfaces:**
- Produces: `export function ensureTakeClip(existing: MidiClip | null, firstEventAbsSeconds: number, minDuration: number): MidiClip` — returns `existing` unchanged, or a fresh empty-notes clip (`start_seconds = firstEventAbsSeconds`, `duration_seconds = minDuration`, `notes: []`) matching the clip shape `appendTakeNote` creates (copy its construction — same id generator, same defaults).

- [ ] **Step 1: Failing tests** (append to `midiInput.test.ts`)

```ts
describe('ensureTakeClip', () => {
  it('returns the existing clip untouched', () => {
    const existing = ensureTakeClip(null, 4.0, 0.5);
    expect(ensureTakeClip(existing, 9.9, 0.5)).toBe(existing);
  });
  it('creates a clip at the first CC event when no notes were played', () => {
    const clip = ensureTakeClip(null, 4.0, 0.5);
    expect(clip.start_seconds).toBe(4.0);
    expect(clip.duration_seconds).toBe(0.5);
    expect(clip.notes).toEqual([]);
  });
});
```

- [ ] **Step 2: FAIL → implement → PASS** (mirror `appendTakeNote`'s clip construction for id/defaults — read it first at `midiRecord.ts:74-81`).

- [ ] **Step 3: Wire pedal truth + CC-only takes in StudioEditor**

Add near the other midi refs: `const lastPedalDownRef = useRef(false);`
- In `handleMidiSustain`, FIRST line (before any gating): `lastPedalDownRef.current = down;` — tracks physical state continuously.
- In `resetMidiCapture` replace `midiPedalRef.current = false;` with `midiPedalRef.current = lastPedalDownRef.current;` and update its comment.
- In `commitTakeCc`, replace the early-return on `!midiTakeClipRef.current` with: if captured CC exists but no clip, `midiTakeClipRef.current = ensureTakeClip(null, firstCcAbsSeconds, MIN_NOTE_SECONDS)` inserted through the same manifest-update path `appendTakeNote` uses (read `commitTakeCc`'s update call and mirror it), then attach CC as today.

- [ ] **Step 4: Gates + Commit**

```bash
npm run test:studio && npm run typecheck:guard
git add src/lib/studio/midiRecord.ts src/lib/studio/midiInput.test.ts src/pages/studio/StudioEditor.tsx
git commit -m "studio: pedal-down survives take start; CC-only takes produce a clip"
```

---

## PR D — Trim honesty, voice release, engine MIDI tests

### Task D1: MIDI clip trim truncates notes; scheduler clamps

**Files:**
- Modify: `src/lib/studio/midiEdit.ts` (append `trimNotesToDuration`)
- Modify: `src/pages/studio/StudioEditor.tsx` — `MidiClipBlock` onChange (~3604–3635)
- Modify: `src/lib/studio/engine/tracks.ts` — `scheduleMidiClip` (~257–279)
- Test: `src/lib/studio/midiEdit.test.ts` (extend)

**Interfaces:**
- Produces: `export function trimNotesToDuration(notes: MidiNote[], durationSeconds: number, minNoteSeconds?: number): MidiNote[]` — drops notes with `start_seconds >= durationSeconds`; truncates straddlers to `durationSeconds - start_seconds` floored at `minNoteSeconds` (default the module's `MIN_NOTE_SECONDS`); returns new array, untouched notes keep identity.

- [ ] **Step 1: Failing tests**

```ts
describe('trimNotesToDuration', () => {
  const n = (start: number, dur: number) => ({ pitch: 60, velocity: 100, start_seconds: start, duration_seconds: dur });
  it('drops notes starting at/after the new end', () => {
    expect(trimNotesToDuration([n(0, 1), n(2, 1)], 2)).toHaveLength(1);
  });
  it('truncates straddlers', () => {
    const out = trimNotesToDuration([n(1, 4)], 2);
    expect(out[0].duration_seconds).toBe(1);
  });
  it('floors truncation at MIN_NOTE_SECONDS and keeps identity of untouched notes', () => {
    const keep = n(0, 0.5);
    const out = trimNotesToDuration([keep, n(1.999, 1)], 2);
    expect(out[0]).toBe(keep);
    expect(out[1].duration_seconds).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: FAIL → implement → PASS.**

- [ ] **Step 3: Wire**

`MidiClipBlock` right-trim onChange: when `p.duration` is present and `< clip.duration_seconds`, also write `notes: trimNotesToDuration(clip.notes, p.duration)`.
`scheduleMidiClip` defense-in-depth: iterate `applySustain(trimNotesToDuration(clip.notes, clip.duration_seconds), sanitizeCc(clip.cc))` — with a one-line comment that persisted clips are already trimmed; this guards legacy manifests.

- [ ] **Step 4: Gates + Commit**

```bash
npm run test:studio && npm run typecheck:guard
git add src/lib/studio/midiEdit.ts src/lib/studio/midiEdit.test.ts src/pages/studio/StudioEditor.tsx src/lib/studio/engine/tracks.ts
git commit -m "studio: trimming a MIDI clip truncates its notes — what you see is what plays"
```

### Task D2: Instruments release voices on pause/stop/seek

**Files:**
- Modify: `src/lib/studio/engine/instruments.ts` — add `releaseAll?` to `EngineInstrument` + implement per builder
- Modify: `src/lib/studio/engine/layeredSampler.ts` — implement `releaseAll`
- Modify: `src/lib/studio/engine/engine.ts` — call in `pause()` (~1238), `stop()` (~1263), `seek()` `wasPlaying` branch (~1290)
- Modify: `src/lib/studio/engine/tracks.ts` — expose the track's instrument to the engine (verify how `EngineTrack` stores it: grep `instrument` in `tracks.ts`; if `scheduleMidiClip`'s `inst` isn't retained on the track object, add `track.instrument = inst` where the track is built)
- Test: covered by Task D3's engine suite

**Interfaces:**
- Produces: `EngineInstrument.releaseAll?: () => void`.
  - `buildSynth`: `releaseAll: () => synth.releaseAll()` (Tone.PolySynth has it).
  - `buildGmSampler`: `releaseAll: () => { if (loaded) sampler.releaseAll(); }` (Tone.Sampler has it).
  - `buildBasicKit`: one-shot percussion — omit (optional member; engine uses `inst.releaseAll?.()`).
  - `layeredSampler`: track live voices in a `Set<number>` at `triggerAttack`, delete at `triggerRelease`; `releaseAll` releases each (read the file's voice bookkeeping first — it already auto-releases on retrigger, so a held-pitch set exists or is trivial to add).

- [ ] **Step 1: Implement** the interface member + builders + engine calls:

```ts
// engine.ts — in pause(), stop(), and seek()'s wasPlaying branch,
// beside the existing pb.player.stop() loops:
for (const track of this.tracks.values()) track.instrument?.releaseAll?.();
```

(Adjust member access to the actual `EngineTrack` field name found above.)

- [ ] **Step 2: Gates** — `npm run test:studio && npm run typecheck:guard` (D3 adds the behavioral test).

- [ ] **Step 3: Commit**

```bash
git add src/lib/studio/engine/instruments.ts src/lib/studio/engine/layeredSampler.ts src/lib/studio/engine/engine.ts src/lib/studio/engine/tracks.ts
git commit -m "studio: pause/stop/seek release all MIDI voices — notes stop when the transport does"
```

### Task D3: Engine MIDI scheduling test suite (the audit's coverage gap)

**Files:**
- Test: `src/lib/studio/__tests__/engineMidiScheduling.test.ts` (create)

**Interfaces:** consumes the `vi.mock('tone')` pattern from `enginePausePlayers.test.ts` — copy its mock skeleton (MockParam/MockNode/transport with a `ScheduledEvent` timeline) and extend the mock transport so tests can fire events (`fireUpTo(seconds)`) and assert `clear()`ed ids.

- [ ] **Step 1: Write tests** (these pin CURRENT correct behavior + D2's new behavior):

```ts
// 1. Replay: transport.schedule events persist — a MIDI note fires again
//    after stop() + play() with no session edit (regression guard: the
//    engine must never wholesale transport.cancel() outside dispose()).
// 2. Pause releases voices: build a session with one MIDI track (synth),
//    fire its note event, call engine.pause() → the mock synth records a
//    releaseAll call. Same assertion for stop() and seek()-while-playing.
// 3. Trim clamp: a clip with duration 2 and a note at start 3 schedules
//    nothing past the clip end (D1's scheduleMidiClip clamp).
// 4. Dispose clears MIDI events: after engine dispose, every scheduled
//    id was clear()ed or transport.cancel() was called.
```

Build each as a real test against `StudioEngine.loadSession()` with a minimal session literal (copy shape from `engine.test.ts` — it already constructs sessions for the mock engine; reuse its helper if one exists, else copy its minimal session object and add a `midi` track with one clip `{ start_seconds: 0, duration_seconds: 2, notes: [...] }`).

- [ ] **Step 2: Run** — `npx vitest run src/lib/studio/__tests__/engineMidiScheduling.test.ts` — tests 1/3/4 should PASS against current+D1 code (they pin behavior); test 2 passes with D2. If test 1 FAILS, stop and re-investigate before proceeding (it would mean the replay contract is genuinely broken — do not "fix" the test).

- [ ] **Step 3: Gates + Commit**

```bash
npm run test:studio && npm run typecheck:guard
git add src/lib/studio/__tests__/engineMidiScheduling.test.ts
git commit -m "studio: engine test suite for MIDI scheduling under replay/pause/seek/trim"
```

---

## PR E — Selection integrity, device switching, notation facade

### Task E1: Piano-roll selection survives undo safely

**Files:**
- Modify: `src/pages/studio/pianoroll/PianoRollPanel.tsx` (selection state; `editClip` ~line 111)
- Test: `src/pages/studio/pianoroll/__tests__/selectionSync.test.ts` (create — pure helper test)

**Interfaces:**
- Produces (exported from PianoRollPanel.tsx or a sibling `selectionSync.ts` — prefer sibling file): `export function reconcileSelection(selection: number[], notesLength: number, notesChangedExternally: boolean): number[]` — returns `[]` when `notesChangedExternally`, else `selection.filter(i => i < notesLength)`.

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { reconcileSelection } from '../selectionSync';

describe('reconcileSelection', () => {
  it('clears on external notes change (undo)', () => {
    expect(reconcileSelection([2], 3, true)).toEqual([]);
  });
  it('clamps out-of-range indices, keeps valid ones', () => {
    expect(reconcileSelection([0, 5], 3, false)).toEqual([0]);
  });
});
```

- [ ] **Step 2: FAIL → implement → PASS.**

- [ ] **Step 3: Wire**

In PianoRollPanel: add `const internalEditRef = useRef(false);` — `editClip` sets it `true` right before calling the update. Add:

```ts
const notesRef = useRef(clip?.notes);
useEffect(() => {
  if (clip?.notes !== notesRef.current) {
    const external = !internalEditRef.current;
    internalEditRef.current = false;
    notesRef.current = clip?.notes;
    setSelection((sel) => reconcileSelection(sel, clip?.notes.length ?? 0, external));
  }
});
```

(Selection-updating edit paths like add/delete already set selection explicitly after `editClip`; the reconcile only clears when the change came from OUTSIDE the panel — undo, collaborator refresh.)

- [ ] **Step 4: Gates + Commit**

```bash
npm run test:studio && npm run typecheck:guard
git add src/pages/studio/pianoroll/selectionSync.ts src/pages/studio/pianoroll/__tests__/selectionSync.test.ts src/pages/studio/pianoroll/PianoRollPanel.tsx
git commit -m "studio: piano-roll selection reconciles after undo — no more wrong-note edits"
```

### Task E2: Device switch without session teardown; dropdown locked while recording

**Files:**
- Modify: `src/lib/midi/midiInputSource.ts` — add `subscribeManaged` to the interface + both backends
- Modify: `src/hooks/useStudioMidiInput.ts` — use it; effect keyed on `[enabled]` only
- Modify: `src/pages/studio/StudioEditor.tsx` — device `<select>` (~6386) gets `disabled={!!recording || !!punchRef.current}`
- Test: `src/lib/midi/__tests__/midiInputSource.test.ts` (extend — it already fakes `nav.requestMIDIAccess`)

**Interfaces:**
- Produces on `MidiInputSource`:

```ts
subscribeManaged(deviceId: string, onMessage: (data: Uint8Array, timeStampMs?: number) => void):
  Promise<{ close(): void; setDevice(id: string): void }>;
```

Both backends implement it by making the internal `Subscriber.deviceId` mutable (`setDevice` assigns it) — dispatch already reads `s.deviceId` per message, so filtering changes instantly with **no** port re-attach (web) and **no** plugin stop/start (native). `subscribe()` keeps its exact current signature/behavior for the other three consumers.

- [ ] **Step 1: Failing test** (extend the existing web-source test file, reusing its fake navigator/port helpers):

```ts
it('subscribeManaged switches device filter without re-requesting access', async () => {
  // arrange: fake nav with two ports 'a' and 'b' (copy the file's existing helper)
  const src = createWebMidiInputSource(fakeNav);
  const seen: string[] = [];
  const sub = await src.subscribeManaged('a', () => seen.push('hit'));
  emit(portA, [0x90, 60, 100]); // helper from existing tests
  emit(portB, [0x90, 61, 100]);
  expect(seen.length).toBe(1);
  sub.setDevice('b');
  emit(portA, [0x90, 60, 100]);
  emit(portB, [0x90, 61, 100]);
  expect(seen.length).toBe(2);
  expect(requestAccessCallCount).toBe(1); // no second permission round-trip
  sub.close();
});
```

Adapt helper names to the existing test file's actual fixtures (read it first).

- [ ] **Step 2: FAIL → implement → PASS.** Implementation per backend:

```ts
async subscribeManaged(deviceId, onMessage) {
  await getAccess();                       // web; native: run(startOp) after add
  const sub: Subscriber = { deviceId, cb: onMessage };
  subscribers.add(sub);
  return {
    close: () => { subscribers.delete(sub); /* native: void run(stopOp); */ },
    setDevice: (id: string) => { sub.deviceId = id; },
  };
}
```

(Native version mirrors `subscribe`'s error rollback: delete sub + rethrow if `run(startOp)` rejects.)

- [ ] **Step 3: Rewire `useStudioMidiInput`**

Effect deps become `[enabled]`. Hold `subRef = useRef<{close():void; setDevice(id:string):void} | null>`. A second tiny effect: `useEffect(() => { subRef.current?.setDevice(deviceId); }, [deviceId]);`. Cleanup closes the managed sub. Everything else (refs for callbacks, status, inputs, onStateChange refresh) unchanged.

- [ ] **Step 4: Lock the dropdown** — add the `disabled` prop; add `title="Locked while recording"` when disabled.

- [ ] **Step 5: Gates + Commit**

```bash
npx vitest run src/lib/midi/__tests__/midiInputSource.test.ts && npm run test:studio && npm run typecheck:guard
git add src/lib/midi/midiInputSource.ts src/lib/midi/__tests__/midiInputSource.test.ts src/hooks/useStudioMidiInput.ts src/pages/studio/StudioEditor.tsx
git commit -m "midi: switch devices without tearing down the MIDI session; lock device picker during takes"
```

### Task E3: Notation editor onto the shared facade

**Files:**
- Rewrite: `src/lib/notation/useMidiInput.ts` (keep the exported API: `{ state: MidiInputState; enable(): Promise<void>; disable(): void }` and the `MidiInputState` shape — `NoteEditor.tsx` consumes them as-is)
- Test: `src/lib/notation/__tests__/useMidiInput.test.tsx` (create)

**Interfaces:**
- Consumes: `getMidiInputSource()` + `parseMidiMessage` (delete the hook's inline parsing).
- Produces: unchanged public API; `supported` now comes from `source.supported` (true on iOS native → the NoteEditor MIDI button appears on iPad).

- [ ] **Step 1: Failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const fake = vi.hoisted(() => {
  let handler: ((data: Uint8Array, ts?: number) => void) | null = null;
  return {
    source: {
      kind: 'native' as const,
      supported: true,
      listInputs: async () => [{ id: 'p1', name: 'Keys' }],
      subscribe: async (_d: string, cb: (data: Uint8Array, ts?: number) => void) => {
        handler = cb;
        return () => { handler = null; };
      },
      onStateChange: () => () => {},
      showBluetoothPairing: async () => false,
    },
    emit(bytes: number[]) { handler?.(Uint8Array.from(bytes)); },
    get subscribed() { return handler !== null; },
  };
});

vi.mock('@/lib/midi/midiInputSource', () => ({
  getMidiInputSource: () => fake.source,
}));

import { useMidiInput } from '../useMidiInput';

describe('notation useMidiInput on the shared facade', () => {
  it('is supported wherever the facade is (e.g. iOS native)', () => {
    const { result } = renderHook(() => useMidiInput(() => {}));
    expect(result.current.state.supported).toBe(true);
  });

  it('enable subscribes; note-on reaches the handler; disable unsubscribes', async () => {
    const notes: number[] = [];
    const { result } = renderHook(() => useMidiInput((m) => notes.push(m)));
    await act(async () => { await result.current.enable(); });
    await waitFor(() => expect(result.current.state.connected).toBe(true));
    expect(result.current.state.inputNames).toEqual(['Keys']);
    fake.emit([0x90, 60, 100]);
    expect(notes).toEqual([60]);
    fake.emit([0x90, 61, 0]); // vel-0 = note-off → not a note-on
    expect(notes).toEqual([60]);
    act(() => result.current.disable());
    expect(fake.subscribed).toBe(false);
  });
});
```

- [ ] **Step 2: FAIL** (current hook reports `supported: false` under the mock — it reads `navigator`).

- [ ] **Step 3: Rewrite the hook**

Keep file header's crib-sheet comment but note parsing now lives in `parseMidiMessage`. Body: `supported = source.supported`; `enable()` → `source.subscribe('', (data, ts) => { const ev = parseMidiMessage(data); if (ev.type === 'noteon') handlerRef.current(ev.pitch, ev.velocity); })`, sets `connected`, fills `inputNames` from `listInputs()`, subscribes `onStateChange` to refresh names; `disable()` → unsub + reset state; store unsub + state-listener in refs; on error set `state.error` with the caught message (same strings as today where feasible).

- [ ] **Step 4: PASS + full gates** — `npx vitest run src/lib/notation/__tests__/useMidiInput.test.tsx && npm run test:studio && npm run typecheck:guard && npm run lint`

- [ ] **Step 5: Commit**

```bash
git add src/lib/notation/useMidiInput.ts src/lib/notation/__tests__/useMidiInput.test.tsx
git commit -m "notation: MIDI input on the shared facade — lights up CoreMIDI on iPad"
```

---

## Final verification (after PR E)

- [ ] `npm run test` (full suite, not just studio) — green.
- [ ] `npm run typecheck:guard` — green.
- [ ] Deploy PR A (or the whole stack once merged) via `bash scripts/deploy-frontend.sh`; verify live hash per the script's built-in check.
- [ ] Acceptance: Kevin plays a MIDI keyboard against deployed web — feel check on monitoring latency; record a take with pedal held at start; punch in/out with pre-roll noodling; trim a MIDI clip and replay.
