# Studio MIDI Step 1 — Sampler Upgrades (round-robin, loops, 8-layer piano) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web-side instrument-quality upgrades from the Studio MIDI engine spec (step 1): backward-compatible `roundRobin`-style multi-sample and `loop` manifest support in the gw: layered sampler, plus rebuilding the grand piano at 8 velocity layers.

**Architecture:** The gw: instrument manifest format (`src/lib/studio/gwInstruments.ts`) grows two optional capabilities — per-note sample *arrays* (round-robin) and per-note *loop points*. All selection math is pure, exported helpers in `gwInstruments.ts` (the studio vitest suite is hermetic — no Tone instantiation). `src/lib/studio/engine/layeredSampler.ts` consumes the helpers: round-robin builds one `Tone.Sampler` per slot per layer; looped layers bypass `Tone.Sampler` entirely and play per-note `ToneBufferSource` voices with loop points and a release envelope. The piano rebuild is a constant change in `scripts/studio-samples/build-recipes.mjs` (Salamander v-layers 4 → 8) plus a manual re-convert/upload runbook.

**Tech Stack:** TypeScript, Tone.js 15 (`Tone.Sampler`, `Tone.ToneBufferSource`, `Tone.Gain`), Vitest, Node pipeline scripts (`scripts/studio-samples/`), ffmpeg + rclone (runbook only).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-02-studio-midi-engine-design.md` (step 1 scope only — no iOS work, no new instruments beyond the piano rebuild).
- **Old manifests must behave byte-for-byte identically** — `urls: Record<string,string>` and absent `loop` follow exactly today's code paths.
- Studio unit tests are hermetic: never import `tone` from a test file; pure logic lives in `src/lib/studio/gwInstruments.ts`.
- Typecheck gate is `npm run typecheck:guard` (baseline diff — zero NEW errors). `tsc` alone is a no-op (`noCheck: true`).
- Samples serve ONLY via `https://supabase.gleeworld.org/storage/v1/object/public/studio-samples` (the CORS proxy). Never plain Spaces URLs.
- Piano size budget: ≤ 48 MB of MP3s. If 8 layers exceed it, fall back to 6 layers (`v2,v5,v8,v11,v14,v16` → maxVel `21,42,64,85,106,127`).
- Loop points are authored in seconds against the **encoded MP3** timeline and are only reliable for long sustained regions (≥ 1 s loop length) — MP3 encoder delay makes them ±50 ms imprecise. Loops are for pads (strings/organ, step 4); no step-1 manifest ships loop data.
- The shared checkout may sit on another session's branch. Execute in a worktree (superpowers:using-git-worktrees); verify `git branch --show-current` before every commit.
- Commit messages: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Manifest types + pure round-robin/loop helpers

**Files:**
- Modify: `src/lib/studio/gwInstruments.ts`
- Test: `src/lib/studio/gwInstruments.test.ts`
- Add (untracked, commit here): `docs/superpowers/specs/2026-08-02-studio-midi-engine-design.md`, `docs/superpowers/plans/2026-08-02-studio-midi-step1-sampler-upgrades.md`

**Interfaces:**
- Consumes: existing `GwLayer`, `gwLayerIndexForVelocity`.
- Produces (Tasks 2–3 rely on these exact signatures):
  - `interface GwLoop { start: number; end: number }` (seconds)
  - `GwLayer.urls: Record<string, string | string[]>` (was `Record<string, string>`)
  - `GwLayer.loop?: Record<string, GwLoop>`
  - `gwSampleChoices(urls: GwLayer['urls'], note: string): string[]`
  - `gwRrSlotCount(layer: GwLayer): number`
  - `gwUrlForSlot(urls: GwLayer['urls'], note: string, slot: number): string | null`
  - `gwSlotUrlMaps(layer: GwLayer): Record<string, string>[]`
  - `gwNoteToMidi(note: string): number | null`
  - `gwNearestSampledNote(available: string[], midiPitch: number): { note: string; semitones: number } | null`
  - `interface GwVoicePlan { url: string; playbackRate: number; loop?: GwLoop }`
  - `gwPitchedVoicePlan(layer: GwLayer, midiPitch: number, slot: number): GwVoicePlan | null`
  - `gwLayerIsLooped(layer: GwLayer): boolean`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/studio/gwInstruments.test.ts`:

```ts
import type { GwLayer } from './gwInstruments';
import {
  gwLayerIsLooped, gwNearestSampledNote, gwNoteToMidi, gwPitchedVoicePlan,
  gwRrSlotCount, gwSampleChoices, gwSlotUrlMaps, gwUrlForSlot,
} from './gwInstruments';

describe('round-robin helpers', () => {
  const layer: GwLayer = {
    maxVel: 127,
    urls: { C4: ['l0/C4_rr1.mp3', 'l0/C4_rr2.mp3', 'l0/C4_rr3.mp3'], D4: 'l0/D4.mp3' },
  };

  it('gwSampleChoices normalizes strings and arrays', () => {
    expect(gwSampleChoices(layer.urls, 'C4')).toEqual(['l0/C4_rr1.mp3', 'l0/C4_rr2.mp3', 'l0/C4_rr3.mp3']);
    expect(gwSampleChoices(layer.urls, 'D4')).toEqual(['l0/D4.mp3']);
    expect(gwSampleChoices(layer.urls, 'E4')).toEqual([]);
  });

  it('gwRrSlotCount is the max choices across notes, minimum 1', () => {
    expect(gwRrSlotCount(layer)).toBe(3);
    expect(gwRrSlotCount({ maxVel: 127, urls: { C4: 'a.mp3' } })).toBe(1);
    expect(gwRrSlotCount({ maxVel: 127, urls: {} })).toBe(1);
  });

  it('gwUrlForSlot wraps per-note (short lists cycle independently)', () => {
    expect(gwUrlForSlot(layer.urls, 'C4', 0)).toBe('l0/C4_rr1.mp3');
    expect(gwUrlForSlot(layer.urls, 'C4', 4)).toBe('l0/C4_rr2.mp3');
    expect(gwUrlForSlot(layer.urls, 'D4', 2)).toBe('l0/D4.mp3');
    expect(gwUrlForSlot(layer.urls, 'E4', 0)).toBeNull();
  });

  it('gwSlotUrlMaps expands every slot with per-note wrapping', () => {
    expect(gwSlotUrlMaps(layer)).toEqual([
      { C4: 'l0/C4_rr1.mp3', D4: 'l0/D4.mp3' },
      { C4: 'l0/C4_rr2.mp3', D4: 'l0/D4.mp3' },
      { C4: 'l0/C4_rr3.mp3', D4: 'l0/D4.mp3' },
    ]);
  });

  it('plain single-url layers produce exactly one slot map (legacy shape)', () => {
    const legacy: GwLayer = { maxVel: 64, urls: { A2: 'l1/A2.mp3', C3: 'l1/C3.mp3' } };
    expect(gwSlotUrlMaps(legacy)).toEqual([{ A2: 'l1/A2.mp3', C3: 'l1/C3.mp3' }]);
  });
});

describe('loop / voice-plan helpers', () => {
  it('gwNoteToMidi parses sharp note names', () => {
    expect(gwNoteToMidi('C4')).toBe(60);
    expect(gwNoteToMidi('A0')).toBe(21);
    expect(gwNoteToMidi('C#4')).toBe(61);
    expect(gwNoteToMidi('H2')).toBeNull();
    expect(gwNoteToMidi('Db4')).toBeNull(); // manifests use sharp form only
  });

  it('gwNearestSampledNote picks the closest sampled note', () => {
    expect(gwNearestSampledNote(['C4', 'G4'], 62)).toEqual({ note: 'C4', semitones: 2 });
    expect(gwNearestSampledNote(['C4', 'G4'], 66)).toEqual({ note: 'G4', semitones: -1 });
    expect(gwNearestSampledNote([], 60)).toBeNull();
  });

  it('gwPitchedVoicePlan repitches from the nearest sample and carries loop points', () => {
    const layer: GwLayer = {
      maxVel: 127,
      urls: { C4: 'l0/C4.mp3', G4: ['l0/G4_rr1.mp3', 'l0/G4_rr2.mp3'] },
      loop: { C4: { start: 1.0, end: 3.5 } },
    };
    expect(gwPitchedVoicePlan(layer, 62, 0)).toEqual({
      url: 'l0/C4.mp3',
      playbackRate: Math.pow(2, 2 / 12),
      loop: { start: 1.0, end: 3.5 },
    });
    // G4 has no loop entry → loop is undefined; slot 1 picks rr2.
    expect(gwPitchedVoicePlan(layer, 67, 1)).toEqual({
      url: 'l0/G4_rr2.mp3',
      playbackRate: 1,
      loop: undefined,
    });
    expect(gwPitchedVoicePlan({ maxVel: 127, urls: {} }, 60, 0)).toBeNull();
  });

  it('gwLayerIsLooped detects non-empty loop maps only', () => {
    expect(gwLayerIsLooped({ maxVel: 127, urls: {} })).toBe(false);
    expect(gwLayerIsLooped({ maxVel: 127, urls: {}, loop: {} })).toBe(false);
    expect(gwLayerIsLooped({ maxVel: 127, urls: {}, loop: { C4: { start: 0, end: 1 } } })).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/studio/gwInstruments.test.ts`
Expected: FAIL — the new exports don't exist yet (`gwSampleChoices is not a function` / TS module errors).

- [ ] **Step 3: Implement the types and helpers**

In `src/lib/studio/gwInstruments.ts`, replace the `GwLayer` interface and add below it (the `NOTE` array is new to this file — `layeredSampler.ts` has its own private copy today):

```ts
// One velocity layer of a pitched instrument. `urls` maps note names
// (e.g. 'C4') to files relative to the instrument folder; a string[] value
// is a round-robin group — repeated notes cycle through the alternates so
// they don't machine-gun. A note-on with MIDI velocity <= maxVel (1..127)
// plays from the first matching layer. `loop` gives per-note loop points
// (seconds, in the encoded file); a layer with any loop entries plays
// through looping buffer voices instead of Tone.Sampler. Loop regions must
// be long (>= 1s) — MP3 encoder delay makes the points ±50ms imprecise,
// fine for pads, wrong for rhythmic material.
export interface GwLoop { start: number; end: number }

export interface GwLayer {
  maxVel: number;
  urls: Record<string, string | string[]>;
  loop?: Record<string, GwLoop>;
}
```

Add the helpers (after `gwLayerIndexForVelocity`):

```ts
const NOTE = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// Normalize a urls entry to its round-robin choice list ([] if the note
// isn't sampled). Legacy string values become one-element lists.
export const gwSampleChoices = (urls: GwLayer['urls'], note: string): string[] => {
  const v = urls[note];
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
};

// How many round-robin slots this layer needs: the longest choice list.
export function gwRrSlotCount(layer: GwLayer): number {
  let max = 1;
  for (const note of Object.keys(layer.urls)) {
    max = Math.max(max, gwSampleChoices(layer.urls, note).length);
  }
  return max;
}

// The sample a given slot plays for a note; short lists wrap so every
// slot has a full keymap. Null if the note isn't sampled in this layer.
export function gwUrlForSlot(urls: GwLayer['urls'], note: string, slot: number): string | null {
  const choices = gwSampleChoices(urls, note);
  if (choices.length === 0) return null;
  return choices[slot % choices.length];
}

// Expand a layer into one complete note→url map per round-robin slot —
// exactly the shape Tone.Sampler wants, one Sampler per slot.
export function gwSlotUrlMaps(layer: GwLayer): Record<string, string>[] {
  return Array.from({ length: gwRrSlotCount(layer) }, (_, slot) => {
    const map: Record<string, string> = {};
    for (const note of Object.keys(layer.urls)) {
      const url = gwUrlForSlot(layer.urls, note, slot);
      if (url) map[note] = url;
    }
    return map;
  });
}

// Manifest note names are sharp-form only ('C#4', never 'Db4').
export function gwNoteToMidi(note: string): number | null {
  const m = /^([A-G]#?)(-?\d+)$/.exec(note);
  if (!m) return null;
  const idx = NOTE.indexOf(m[1]);
  if (idx < 0) return null;
  return (Number(m[2]) + 1) * 12 + idx;
}

// Closest sampled note to a target pitch (semitones = target − sample,
// i.e. how far the sample must be shifted UP). Ties resolve to the first
// listed note — stable, and inaudible at ±1 semitone.
export function gwNearestSampledNote(
  available: string[], midiPitch: number,
): { note: string; semitones: number } | null {
  let best: { note: string; semitones: number } | null = null;
  for (const note of available) {
    const m = gwNoteToMidi(note);
    if (m === null) continue;
    const d = midiPitch - m;
    if (!best || Math.abs(d) < Math.abs(best.semitones)) best = { note, semitones: d };
  }
  return best;
}

// Everything a looping buffer voice needs to sound one note: which file,
// how much to repitch it, and (for sustained instruments) loop points.
export interface GwVoicePlan { url: string; playbackRate: number; loop?: GwLoop }

export function gwPitchedVoicePlan(
  layer: GwLayer, midiPitch: number, slot: number,
): GwVoicePlan | null {
  const nearest = gwNearestSampledNote(Object.keys(layer.urls), midiPitch);
  if (!nearest) return null;
  const url = gwUrlForSlot(layer.urls, nearest.note, slot);
  if (url === null) return null;
  return {
    url,
    playbackRate: Math.pow(2, nearest.semitones / 12),
    loop: layer.loop?.[nearest.note],
  };
}

export function gwLayerIsLooped(layer: GwLayer): boolean {
  return !!layer.loop && Object.keys(layer.loop).length > 0;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/studio/gwInstruments.test.ts`
Expected: PASS (all existing + new tests).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck:guard`
Expected: PASS — the `urls` union type may surface consumers assuming `string`; **do not fix them here** (Tasks 2–3 rewrite those call sites). If the guard flags NEW errors only in `layeredSampler.ts`, note them and proceed — Task 2 resolves them; re-run the guard at Task 2 Step 4. Any other new error is a real bug in this task.

- [ ] **Step 6: Commit** (spec + plan + helpers)

```bash
git add docs/superpowers/specs/2026-08-02-studio-midi-engine-design.md \
        docs/superpowers/plans/2026-08-02-studio-midi-step1-sampler-upgrades.md \
        src/lib/studio/gwInstruments.ts src/lib/studio/gwInstruments.test.ts
git commit -m "feat(studio): manifest round-robin + loop types and pure helpers

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Round-robin playback in the layered sampler

**Files:**
- Modify: `src/lib/studio/engine/layeredSampler.ts` (functions `buildLayeredVoice`, `preloadGwSession`)

**Interfaces:**
- Consumes (Task 1): `gwSlotUrlMaps`, `gwSampleChoices`, `gwRrSlotCount`, `gwLayerIndexForVelocity`.
- Produces: unchanged `EngineInstrument` surface (`triggerAttackRelease/triggerAttack/triggerRelease/dispose`) — no caller changes anywhere.

No new unit test file: this is Tone wiring, excluded from the hermetic suite by design. Correctness is carried by Task 1's helper tests + the type system + browser verification in Task 5.

- [ ] **Step 1: Rewrite `buildLayeredVoice` sampler construction for slots**

In `src/lib/studio/engine/layeredSampler.ts`, extend the import from `../gwInstruments`:

```ts
import {
  GW_BY_NAME, GwManifest, fromGwPresetId, gwLayerIndexForVelocity, gwManifestUrl,
  gwSampleChoices, gwSampleUrl, gwSlotUrlMaps,
} from '../gwInstruments';
```

Replace the body of `buildLayeredVoice` from the `samplerUrls` declaration through the `samplers` construction with:

```ts
  const layers = manifest.layers ?? [];
  const toBuffers = (urls: Record<string, string>) =>
    Object.fromEntries(Object.entries(urls).map(([note, rel]) => [note, getBuffer(gwSampleUrl(name, rel))]));

  // No load gates: cached ToneAudioBuffers fill in as they arrive, and a
  // trigger that finds no loaded sample throws — caught below, note dropped.
  // A partially loaded layer plays the notes it has (one missing file must
  // not sink the layer).
  //
  // Round-robin: one Sampler per slot per layer (slot maps from
  // gwSlotUrlMaps — every slot has a full keymap, short lists wrap).
  // Decoded buffers are shared through the module cache, so RR multiplies
  // Sampler shells, not memory for audio data.
  const layerSamplers = layers.map((layer) =>
    gwSlotUrlMaps(layer).map((slotUrls) => new Tone.Sampler({
      urls: toBuffers(slotUrls),
      release: 0.3, // avoid clicky note-offs; samples carry their own decay
    }).connect(out)));

  // Per-pitch round-robin position: consecutive strikes of the same note
  // walk the slots; different pitches cycle independently.
  const rrCounter = new Map<number, number>();
  const nextSlot = (pitch: number, slots: number): number => {
    const c = rrCounter.get(pitch) ?? 0;
    rrCounter.set(pitch, c + 1);
    return c % slots;
  };
```

Keep `releaseSampler` exactly as-is, but its `samplerUrls(manifest.release.urls)` call becomes `toBuffers` over the (still plain-string) release map:

```ts
  let releaseSampler: Tone.Sampler | null = null;
  if (manifest.release) {
    releaseSampler = new Tone.Sampler({
      urls: toBuffers(manifest.release.urls),
      volume: -18,
    }).connect(out);
  }
```

(`GwManifest.release.urls` stays `Record<string, string>` — release samples don't round-robin.)

- [ ] **Step 2: Route triggers through the slot samplers**

`heldLayer` now remembers both indices, so note-off releases the exact sampler that attacked:

```ts
  // Which layer+slot holds each live note, so note-off releases the same
  // sampler that attacked (and dampers only fire for notes that sounded).
  const held = new Map<number, { layer: number; slot: number }>();

  const layerFor = (vel01: number): number =>
    gwLayerIndexForVelocity(layers, Math.max(1, Math.round(vel01 * 127)));

  return {
    output: out,
    triggerAttackRelease: (pitch, dur, time, vel) => {
      const li = layerFor(vel);
      const slot = nextSlot(pitch, layerSamplers[li].length);
      try { layerSamplers[li][slot].triggerAttackRelease(midiToNote(pitch), dur, time, vel); }
      catch { /* sample not loaded yet — drop the note */ }
    },
    triggerAttack: (pitch, time, vel) => {
      const li = layerFor(vel);
      const slot = nextSlot(pitch, layerSamplers[li].length);
      // Retriggered note-on without a note-off: release the old voice first
      // so it can't hang forever.
      const prev = held.get(pitch);
      if (prev !== undefined) {
        try { layerSamplers[prev.layer][prev.slot].triggerRelease(midiToNote(pitch), time); }
        catch { /* not sounding */ }
        held.delete(pitch);
      }
      try {
        layerSamplers[li][slot].triggerAttack(midiToNote(pitch), time, vel);
        held.set(pitch, { layer: li, slot });
      } catch { /* sample not loaded yet — drop the note */ }
    },
    triggerRelease: (pitch, time) => {
      const h = held.get(pitch);
      if (h === undefined) return; // never sounded — no release, no damper
      held.delete(pitch);
      try { layerSamplers[h.layer][h.slot].triggerRelease(midiToNote(pitch), time); }
      catch { /* already ended */ }
      if (releaseSampler) {
        try { releaseSampler.triggerAttackRelease(midiToNote(pitch), 0.8, time, 0.5); }
        catch { /* damper sample not loaded */ }
      }
    },
    dispose: () => {
      layerSamplers.forEach((slots) => slots.forEach((s) => s.dispose()));
      releaseSampler?.dispose();
      // cached buffers are shared — never disposed here
    },
  };
```

- [ ] **Step 3: Update `preloadGwSession` for round-robin arrays**

Replace the pitched-layer loop inside `preloadGwSession`:

```ts
      for (const layer of manifest.layers ?? []) {
        for (const note of Object.keys(layer.urls)) {
          for (const rel of gwSampleChoices(layer.urls, note)) getBuffer(gwSampleUrl(name, rel));
        }
      }
```

(Release + kit loops stay as they are.)

- [ ] **Step 4: Verify suite + typecheck**

Run: `npm run test:studio && npm run typecheck:guard`
Expected: PASS, including any `layeredSampler.ts` errors deferred from Task 1 Step 5 now resolved. Legacy manifests hit `gwSlotUrlMaps` → exactly one slot → one Sampler per layer, `nextSlot(pitch, 1)` always 0 — behavior identical to today.

- [ ] **Step 5: Commit**

```bash
git add src/lib/studio/engine/layeredSampler.ts
git commit -m "feat(studio): round-robin sample playback in the layered sampler

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Looping buffer voices for sustained layers

**Files:**
- Modify: `src/lib/studio/engine/layeredSampler.ts` (add loop-voice path inside `buildLayeredVoice`)

**Interfaces:**
- Consumes (Task 1): `gwLayerIsLooped`, `gwPitchedVoicePlan` (add both to the `../gwInstruments` import).
- Produces: unchanged `EngineInstrument` surface. A layer with loop entries plays entirely through loop voices; its Tone.Samplers are never constructed.

- [ ] **Step 1: Add the loop-voice machinery**

Inside `buildLayeredVoice`, after the `rrCounter`/`nextSlot` block, add:

```ts
  // Looped layers (sustained strings/organ) bypass Tone.Sampler: each
  // note-on builds its own ToneBufferSource with the manifest's loop
  // points and a gain envelope for release. One source+gain per voice —
  // overlapping restrikes keep their own level and tail. Notes without a
  // loop entry in a looped layer play the same path one-shot.
  const LOOP_RELEASE = 0.3;
  type LoopVoice = { src: Tone.ToneBufferSource; env: Tone.Gain };
  const heldLoops = new Map<number, LoopVoice>();

  const startLoopVoice = (
    layer: GwLayer, pitch: number, time: number, vel01: number, slot: number,
  ): LoopVoice | null => {
    const plan = gwPitchedVoicePlan(layer, pitch, slot);
    if (!plan) return null;
    const buf = getBuffer(gwSampleUrl(name, plan.url));
    if (!buf.loaded) return null; // not downloaded yet — drop the note
    const env = new Tone.Gain(Math.max(0.05, vel01)).connect(out);
    const src = new Tone.ToneBufferSource({
      url: buf, playbackRate: plan.playbackRate, fadeIn: 0.005, fadeOut: 0.01,
    }).connect(env);
    if (plan.loop) {
      src.loop = true;
      src.loopStart = plan.loop.start;
      src.loopEnd = plan.loop.end;
    }
    src.onended = () => { src.dispose(); env.dispose(); };
    src.start(time);
    return { src, env };
  };

  const stopLoopVoice = (v: LoopVoice, time: number) => {
    // setTargetAtTime reaches ~95% of the fall in 3 time-constants; stop
    // slightly after the envelope is inaudible.
    v.env.gain.setTargetAtTime(0, time, LOOP_RELEASE / 3);
    v.src.stop(time + LOOP_RELEASE);
  };
```

`GwLayer` joins the type-only import from `../gwInstruments`.

- [ ] **Step 2: Branch the triggers on `gwLayerIsLooped`**

Inside each of the three trigger methods from Task 2, handle looped layers first. **Placement matters:** each branch goes immediately after the `const li = layerFor(vel);` line and BEFORE the sampler path's `const slot = nextSlot(pitch, layerSamplers[li].length);` line — a looped layer has an empty `layerSamplers[li]`, so its slot count must come from `gwRrSlotCount` instead (the branch declares its own `slot` in its block scope and returns).

In `triggerAttackRelease`:

```ts
      if (gwLayerIsLooped(layers[li])) {
        const slot = nextSlot(pitch, gwRrSlotCount(layers[li]));
        const v = startLoopVoice(layers[li], pitch, time, vel, slot);
        if (v) stopLoopVoice(v, time + Tone.Time(dur).toSeconds());
        return;
      }
```

In `triggerAttack` (the retrigger-release block from Task 2 stays above this, since a sampler voice may hold the pitch from before an instrument-layer edit):

```ts
      if (gwLayerIsLooped(layers[li])) {
        const slot = nextSlot(pitch, gwRrSlotCount(layers[li]));
        const prevLoop = heldLoops.get(pitch);
        if (prevLoop) { stopLoopVoice(prevLoop, time); heldLoops.delete(pitch); }
        const v = startLoopVoice(layers[li], pitch, time, vel, slot);
        if (v) heldLoops.set(pitch, v);
        return;
      }
```

In `triggerRelease` (at the top, before the `held` lookup):

```ts
      const loopVoice = heldLoops.get(pitch);
      if (loopVoice) {
        heldLoops.delete(pitch);
        stopLoopVoice(loopVoice, time);
        // fall through: no sampler held this pitch, so the held-map lookup
        // below is a no-op; the damper (releaseSampler) still fires.
      }
```

And in `dispose`, stop live loop voices:

```ts
      heldLoops.forEach((v) => { try { v.src.stop(); } catch { /* already stopped */ } });
      heldLoops.clear();
```

Skip constructing samplers for looped layers (they'd never be triggered). In the `layerSamplers` construction from Task 2:

```ts
  const layerSamplers = layers.map((layer) =>
    gwLayerIsLooped(layer) ? [] : gwSlotUrlMaps(layer).map((slotUrls) => new Tone.Sampler({
      urls: toBuffers(slotUrls),
      release: 0.3,
    }).connect(out)));
```

(`gwRrSlotCount` joins the `../gwInstruments` import — the looped branches above already use it for their slot counts.)

- [ ] **Step 3: Verify suite + typecheck**

Run: `npm run test:studio && npm run typecheck:guard`
Expected: PASS. No manifest in production has `loop` yet, so live behavior is unchanged; the path activates with step-4 string rebuilds.

- [ ] **Step 4: Commit**

```bash
git add src/lib/studio/engine/layeredSampler.ts
git commit -m "feat(studio): looping buffer voices for sustained gw layers

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: 8-layer Salamander piano recipe

**Files:**
- Modify: `scripts/studio-samples/build-recipes.mjs` (the Salamander `LAYERS` constant)
- Modify: `scripts/studio-samples/README.md` (note the 8-layer piano + size budget)

**Interfaces:**
- Consumes: Salamander sample naming `<Note>v<1..16>.flac` (already encoded in the recipe).
- Produces: `recipes.json` whose `grand_piano` entry has 8 layers — consumed by `convert.mjs` unchanged (it already iterates arbitrary layer counts and emits plain-string manifests, which remain valid under the Task 1 union type).

- [ ] **Step 1: Widen the layer constant**

In `scripts/studio-samples/build-recipes.mjs`, Salamander block, replace:

```js
  const LAYERS = [{ v: 4, maxVel: 32 }, { v: 8, maxVel: 64 }, { v: 12, maxVel: 96 }, { v: 16, maxVel: 127 }];
```

with:

```js
  // 8 of Salamander's 16 layers (every other one), evenly splitting the
  // velocity range. Budget: <= 48 MB of MP3s; if the converted set blows
  // it, drop to 6 layers: v2,v5,v8,v11,v14,v16 → maxVel 21,42,64,85,106,127.
  const LAYERS = [
    { v: 2,  maxVel: 16 }, { v: 4,  maxVel: 32 }, { v: 6,  maxVel: 48 }, { v: 8,  maxVel: 64 },
    { v: 10, maxVel: 80 }, { v: 12, maxVel: 96 }, { v: 14, maxVel: 112 }, { v: 16, maxVel: 127 },
  ];
```

- [ ] **Step 2: Document in the pipeline README**

Add to the "Gotchas encoded in build-recipes.mjs" list in `scripts/studio-samples/README.md`:

```markdown
- Grand piano uses 8 of Salamander's 16 velocity layers (v2..v16 step 2)
  under a 48 MB MP3 budget — measure `du -sh $OUT/grand_piano` after
  convert; fallback layer set is noted next to LAYERS in build-recipes.mjs.
```

- [ ] **Step 3: Sanity-check the recipe script parses**

Run: `node --check scripts/studio-samples/build-recipes.mjs`
Expected: no output (clean parse). (The full pipeline needs the downloaded libraries — that's Task 5.)

- [ ] **Step 4: Commit**

```bash
git add scripts/studio-samples/build-recipes.mjs scripts/studio-samples/README.md
git commit -m "feat(studio): 8-velocity-layer grand piano recipe

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Rebuild, upload, and verify the piano (manual runbook)

**Files:** none in-repo — this produces new `studio-samples/grand_piano/` content in the glee-world Space.

**Interfaces:**
- Consumes: Task 4's recipe; the Salamander library download; ffmpeg; rclone on the droplet.
- Produces: live 8-layer `grand_piano` manifest + samples behind the storage proxy.

**This task needs Kevin (or a session with the sample sources + droplet access).** The web code from Tasks 1–3 plays the current 4-layer manifest identically in the meantime — deploy order is free.

- [ ] **Step 1: Regenerate recipes and convert** (machine with `$SRC` = downloaded libraries and ffmpeg)

```sh
node scripts/studio-samples/build-recipes.mjs "$SRC" "$SRC/recipes.json"
node scripts/studio-samples/convert.mjs "$SRC/recipes.json" "$SRC" "$OUT"
du -sh "$OUT/grand_piano"   # budget: <= 48 MB (else 6-layer fallback, see Task 4)
node -e "const m=require(process.argv[1]);console.log(m.layers.length, m.layers.map(l=>l.maxVel))" "$OUT/grand_piano/manifest.json"
# expect: 8 [16,32,48,64,80,96,112,127]
```

- [ ] **Step 2: Upload only the piano** (droplet, rclone — immutable cache headers exactly as the README's recipe)

```sh
rclone copy "$OUT/grand_piano" :s3:glee-world/studio-samples/grand_piano \
  --header-upload "Cache-Control: public, max-age=31536000, immutable"
```

**Cache note:** samples are immutable-cached by URL. New layer files (`l0`..`l7` vs today's `l0`..`l3`) get fresh URLs automatically, but `manifest.json` itself must not be stale — verify the proxy serves the new one; if the droplet nginx proxy caches it, purge that path.

- [ ] **Step 3: Verify live**

```sh
curl -s https://supabase.gleeworld.org/storage/v1/object/public/studio-samples/grand_piano/manifest.json \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const m=JSON.parse(d);console.log(m.layers.length);})"
# expect: 8
```

Then spot-check one new-layer sample URL returns 200 audio (`curl -sI .../grand_piano/l1/C4.mp3` — take an actual path from the manifest).

- [ ] **Step 4: Listen**

In Studio (any tenant), set a MIDI track to Grand Piano and play soft→loud on the WP06: soft playing should now step through genuinely soft samples (8 dynamics instead of 4), with no gaps or level jumps at layer boundaries.

---

### Task 6: Final verification pass

**Files:** none new.

- [ ] **Step 1: Full studio suite + typecheck + lint**

Run: `npm run test:studio && npm run typecheck:guard && npm run lint`
Expected: all PASS, zero new type errors, no new lint findings in touched files.

- [ ] **Step 2: Full test suite** (studio changes can't break elsewhere, but the gate is cheap)

Run: `npm run test`
Expected: PASS.

- [ ] **Step 3: Browser smoke** (dev server, real audio graph — the hermetic suite can't cover this)

Run: `npm run dev`, open Studio, and verify with a gw: instrument (Grand Piano):
1. Notes sound on trigger (Sampler path intact after the slot refactor).
2. Rapid same-note repeats sound natural (RR counter path; with the 1-slot legacy manifest this exercises the wrap logic at slot 0).
3. Sustain pedal chord + release still shortens correctly (held-map refactor didn't break CC64 note-off pairing).
4. Export a short MIDI clip to MP3 (preload path with the new choices iteration).

- [ ] **Step 4: Merge/PR per repo convention**

Branch → PR to main (Kevin merges), then `bash scripts/deploy-frontend.sh` when he's ready. Task 5 (sample upload) is independent and can land before or after the web deploy.
