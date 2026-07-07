# Studio Mixer & Mastering (B1, web) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mixer view in Studio (channel strips + master strip), a real mastering chain (HPF → air shelf → glue comp → look-ahead limiter) with EBU R128 LUFS metering, one-knob −14 LUFS streaming target, and export presets (MP3 320 / WAV / SATB stems) with chunked offline rendering.

**Architecture:** Pure-DSP math lives in small unit-tested libs (`src/lib/studio/dsp/`); AudioWorklet processors wrap the pure math; a master-chain builder attaches the chain to both the live engine and offline renders; the Mixer is a new view inside StudioEditor over the existing engine state. Canonical parameters (spec §1) are stored on the Session and never passed to platform APIs by name.

**Tech Stack:** React + Tone.js/Web Audio, AudioWorklet, vitest, existing mp3-encoder.worker (stereo), existing WAV encoder.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-06-studio-mixer-mastering-design.md` — read it first. Research briefs in `docs/research/2026-07-06-*.md` are the authority for conventions/coefficients.
- Repo: `/private/tmp/claude-501/-Users-kevinjohnson/367461db-5a7c-4327-b1d7-b152e9f2ad34/scratchpad/gleeworld`, branch `studio-mixer-mastering`.
- All new Session fields OPTIONAL with defaults — existing saved sessions must load unchanged (backward-compat test required).
- Canonical semantics: `q` = RBJ cookbook Q; comp `attack_ms`/`release_ms` = time to reach 90% of target gain change. Comment this wherever params cross into platform APIs.
- Worklets: `channelCountMode: 'explicit'`, ≤6 combined input channels + AudioParams (Safari/WKWebView).
- Touch: 44pt targets; double-tap resets faders/pan; tint styling per design system; text ≥13px (11px only for tab-bar-class labels).
- Verify before each commit: `npx tsc --noEmit -p tsconfig.app.json` clean, `npx vitest run` all pass, `npx vite build` clean.
- Commit after every task; never push until the final task.

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/studio/dsp/faderTaper.ts` (+test) | dB↔fader-position taper, dB↔linear |
| `src/lib/studio/dsp/kWeighting.ts` (+test) | K-weighting biquad coefficient derivation + block filtering |
| `src/lib/studio/dsp/loudness.ts` (+test) | block powers → Momentary/Short-term/Integrated (gating) |
| `src/lib/studio/dsp/limiterCore.ts` (+test) | pure look-ahead gain computer |
| `public/worklets/gw-limiter.js` | AudioWorkletProcessor wrapping limiterCore math (self-contained JS — worklets can't import TS) |
| `public/worklets/gw-loudness.js` | AudioWorkletProcessor: K-filter + 100ms block powers → port messages |
| `src/lib/studio/engine/masterChain.ts` (+test) | builds HPF→shelf→comp→limiter→meter for a given BaseAudioContext; canonical→node adapters |
| `src/lib/studio/session.ts` | add TrackEqBand, session.master.mastering (optional) |
| `src/pages/studio/MixerView.tsx` | mixer surface: strips, master strip, mini-fader, meter bridge |
| `src/pages/studio/StudioEditor.tsx` | Mix toggle; mount MixerView; export sheet replaces Mixdown button |
| `src/lib/studio/engine/exportRender.ts` (+test for chunk math/splice) | preset renders, stems, chunked OfflineAudioContext + IndexedDB resume |

---

### Task 1: Session model + fader taper

**Files:** Modify `src/lib/studio/session.ts` · Create `src/lib/studio/dsp/faderTaper.ts` · Test `src/lib/studio/dsp/faderTaper.test.ts` + extend any existing session defaults test.

**Interfaces — Produces:**
```ts
// session.ts additions (all optional)
export interface TrackEqBand { type: 'highpass'|'lowshelf'|'peaking'|'highshelf'; freq_hz: number; gain_db: number; q: number; enabled: boolean; }
export interface MasteringParams { enabled: boolean; hpf_hz: number; air_gain_db: number;
  comp: { threshold_db: number; ratio: number; attack_ms: number; release_ms: number };
  limiter: { ceiling_db: number; release_ms: number }; loudness_target_lufs: number; }
export const DEFAULT_MASTERING: MasteringParams = { enabled: false, hpf_hz: 60, air_gain_db: 1,
  comp: { threshold_db: -18, ratio: 2, attack_ms: 10, release_ms: 250 },
  limiter: { ceiling_db: -1, release_ms: 200 }, loudness_target_lufs: -14 };
// Track gains eq?: TrackEqBand[]; SessionMaster gains mastering?: MasteringParams;

// faderTaper.ts
export function dbToLinear(db: number): number;              // 10^(db/20); -Infinity → 0
export function linearToDb(lin: number): number;             // 20*log10(max(lin,1e-6))
export function faderPosToDb(pos: number): number;           // pos∈[0,1] → dB, piecewise-linear through breakpoints below; pos 0 → -Infinity
export function dbToFaderPos(db: number): number;            // inverse (clamps)
export const FADER_BREAKPOINTS: Array<[pos: number, db: number]>; // [[0,-72],[0.05,-60],[0.25,-30],[0.5,-10],[0.75,0],[1,6]]
```
Taper follows the research convention (unity at ¾ travel, top quarter 0→+6, −10 at half). `faderPosToDb(0)` returns `-Infinity` (special-cased below the 0.05 breakpoint by linear interp to −72 then −Infinity exactly at 0).

- [ ] Write failing tests: `faderPosToDb(0.75)≈0`, `(1)≈6`, `(0.5)≈-10`, `(0)===-Infinity`; round-trip `dbToFaderPos(faderPosToDb(p))≈p` for p∈{0.1,0.3,0.6,0.9}; `dbToLinear(-Infinity)===0`, `dbToLinear(0)===1`, `linearToDb(0.5)≈-6.0206`. Session: construct a minimal legacy session object (no `mastering`, no `eq`) and assert whatever normalizer/loader the codebase uses leaves it valid and `DEFAULT_MASTERING` is exported with the exact values above (read session.ts first to find the normalize/load path; if none exists, assert types compile via a constructor helper `withMasteringDefaults(session)` you add).
- [ ] Run tests → fail. Implement. Run tests → pass.
- [ ] `git add -A && git commit -m "feat(studio): session mastering params + fader taper (B1 task 1)"`

### Task 2: K-weighting + loudness math

**Files:** Create `src/lib/studio/dsp/kWeighting.ts`, `src/lib/studio/dsp/loudness.ts` · Tests alongside.

**Interfaces — Produces:**
```ts
// kWeighting.ts
export interface Biquad { b0:number; b1:number; b2:number; a1:number; a2:number; }
export function kWeightingCoefficients(sampleRate: number): { shelf: Biquad; highpass: Biquad };
export function biquadProcess(coeffs: Biquad, samples: Float32Array, state?: [number,number,number,number]): Float32Array; // direct form 1, returns new array; mutable state for streaming
// loudness.ts
export function meanSquare(samples: Float32Array): number;
export function blockLoudness(msPerChannel: number[]): number;      // LK = -0.691 + 10*log10(Σ Gi*zi), Gi=1 for L/R
export function integratedLoudness(blockLoudnesses: number[], blockPowers: number[]): number; // -70 abs gate; relative gate = (power-mean of survivors → LUFS) − 10; re-mean survivors; returns LUFS or -Infinity if none survive
export function shortTermSeries(blockPowers: number[], blocksPerWindow: number): number[];    // sliding mean → LUFS per step
```
Derivation (port of libebur128, MIT): shelf stage `f0=1681.974450955533, G=+3.999843853973347 dB, Q=0.7071752369554196`; high-pass stage `f0=38.13547087602444, Q=0.5003270373238773`. Shelf via RBJ high-shelf bilinear transform with A=10^(G/40); high-pass via RBJ HP. Normalize so a0=1.

- [ ] Write failing tests FIRST: `kWeightingCoefficients(48000)` matches the published BS.1770-4 table within 0.5% per coefficient — expected values verbatim: shelf `b=[1.53512485958697, -2.69169618940638, 1.19839281085285]`, `a1=-1.69065929318241, a2=0.73248077421585`; HP `b=[1,-2,1]`, `a1=-1.99004745483398, a2=0.99007225036621`. `blockLoudness`: a full-scale sine (ms=0.5) stereo → `-0.691 + 10*log10(1.0) ≈ -0.691` (two channels of ms 0.5 sum to 1.0). `integratedLoudness`: (a) all-silent blocks (−90 LUFS) → -Infinity (all gated); (b) uniform −20 LUFS blocks → −20 ±0.01; (c) mix of −20 and −40 blocks → −40 ones fall below the −10 LU relative gate, result ≈ −20.
- [ ] Run → fail. Implement (RBJ formulas; keep functions pure). Run → pass.
- [ ] Commit `"feat(studio): EBU R128 K-weighting + gated loudness math (B1 task 2)"`

### Task 3: Limiter core

**Files:** Create `src/lib/studio/dsp/limiterCore.ts` · Test `src/lib/studio/dsp/limiterCore.test.ts`.

**Interfaces — Produces:**
```ts
export interface LimiterState { delayL: Float32Array; delayR: Float32Array; writeIdx: number; env: number; deque: Int32Array; dequeHead: number; dequeTail: number; }
export function createLimiterState(lookaheadSamples: number): LimiterState;
export function processLimiterBlock(
  state: LimiterState, inL: Float32Array, inR: Float32Array|null,
  outL: Float32Array, outR: Float32Array|null,
  ceilingLinear: number, releaseCoeff: number,   // releaseCoeff = exp(-1/(releaseMs/1000*sampleRate))
): void;
```
Algorithm (adapting the MIT monotonic-deque design, see web brief): per sample, push |max(|L|,|R|)| into a sliding-window max over the lookahead window (monotonic deque of indices); target gain `g = min(1, ceiling/windowMax)` (windowMax<ceiling → 1); envelope: attack instant downward (`env = min(env, g)` each sample), release exponential upward (`env = g + (env-g)*releaseCoeff` when env<g); output = delayed input sample × env. Delay line length = lookaheadSamples.

- [ ] Failing tests: (1) step over ceiling: input constant 1.0, ceiling 0.5 → after the first lookaheadSamples outputs, NO output sample exceeds 0.5+1e-4 EVER (including the first emitted samples — that's the whole point of look-ahead); (2) sub-ceiling passthrough: input 0.3, ceiling 0.5 → outputs equal inputs delayed by lookahead (compare arrays with offset); (3) release: after the loud region ends, env rises toward 1 with the expected exponential (sample env at k samples ≈ g + (1-g)... assert monotonic increase and ≥99% recovery after 5 release time constants); (4) stereo link: L loud / R quiet → both scaled by same gain.
- [ ] Run → fail. Implement. Run → pass. Commit `"feat(studio): look-ahead limiter core (B1 task 3)"`

### Task 4: Worklet processors + master chain builder

**Files:** Create `public/worklets/gw-limiter.js`, `public/worklets/gw-loudness.js`, `src/lib/studio/engine/masterChain.ts` · Test `src/lib/studio/engine/masterChain.test.ts` (node-level: adapters + param math only — worklets can't run in vitest).

**Interfaces — Consumes:** Task 1 `MasteringParams`, `dbToLinear`; Task 2 coefficient fn (INLINE a copy of the derivation in gw-loudness.js — worklets are standalone; add a comment `// KEEP IN SYNC WITH src/lib/studio/dsp/kWeighting.ts` both places); Task 3 algorithm (same: inline in gw-limiter.js with sync comment — the vitest-covered TS copies are the reference implementations).

**Produces:**
```ts
export interface MasterChainHandle {
  input: AudioNode; output: AudioNode; degraded: boolean;  // true when worklet load failed (HPF/shelf/comp only)
  update(p: MasteringParams): void;                     // live param changes, no rebuild
  setPreGainDb(db: number): void;                       // loudness servo control
  readonly meter: { onBlock(cb: (m: { momentary: number; shortTerm: number; integrated: number; peakDb: number }) => void): () => void };
  dispose(): void;
}
export async function buildMasterChain(ctx: BaseAudioContext, p: MasteringParams): Promise<MasterChainHandle>;
// Loads worklet modules via ctx.audioWorklet.addModule('/worklets/gw-limiter.js' | '/worklets/gw-loudness.js').
// On addModule failure: resolve with a DEGRADED chain (HPF→shelf→comp only), handle.degraded = true.
```
Chain: `input(Gain) → BiquadFilter(highpass, hpf_hz, Q .707) → BiquadFilter(highshelf, 8000, air_gain_db) → DynamicsCompressorNode(threshold_db, ratio, knee 12, attack attack_ms/1000 CANONICAL→NODE NOTE: Web Audio attack = time-to-10dB — apply factor 1.0 in B1 and document; release release_ms/1000) → preGain(Gain, servo) → AudioWorkletNode('gw-limiter', {ceiling, release AudioParams; channelCountMode:'explicit', outputChannelCount:[2]}) → AudioWorkletNode('gw-loudness') (tap: connect limiter→loudness AND loudness has passthrough output OR loudness taps via a parallel connection — implement as parallel analyzer: limiter → output gain AND limiter → loudness (loudness output NOT connected)) → output(Gain)`. `enabled:false` or degraded pieces = bypass wiring input→output directly (single connect, no zombie nodes).
gw-loudness.js: K-filter both channels (streaming biquad state), accumulate 100ms hops; every hop postMessage `{ hopPower }`; main-thread side (masterChain.ts) maintains the 400ms/3s windows + gated integrated using Task 2's `integratedLoudness` and emits meter callbacks. Peak: track max |sample| per hop, include as `hopPeak`.

- [ ] Failing tests (masterChain.test.ts, pure parts): canonical→node mapping table (attack seconds, knee 12, ceiling linear via dbToLinear); bypass wiring decision fn `chainTopology(p, workletOk) → ['hpf','shelf','comp','pregain','limiter','meter'] | ['hpf','shelf','comp'] | []` (empty when !enabled) — extract topology as a pure function so it's testable.
- [ ] Implement worklets + builder. Manual verify (no unit): `npx vite build` includes public/worklets in dist; add a tiny dev harness page check in the report (load Studio, enable mastering, confirm no console errors, meter messages flow).
- [ ] Commit `"feat(studio): master chain builder + limiter/loudness worklets (B1 task 4)"`

### Task 5: Wire master chain into live engine + Mastering UI on master strip data path

**Files:** Modify `src/lib/studio/engine/engine.ts` (find where master gain/master fx connect to destination — mirror `mixdown.ts`'s `masterIn → masterFx → toDestination()` topology) · Modify `src/lib/studio/session.ts` consumers if the engine snapshots master state.

**Interfaces — Consumes:** `buildMasterChain`. **Produces:** `engineState.masterChain?: MasterChainHandle` exposed the same way engineState exposes other live handles (read engine.ts to match its pattern — e.g. how metronome/fx are surfaced), rebuilt when `session.master.mastering` toggles enabled, `update()`d on param changes (debounced 50ms).

- [ ] Read engine.ts fully first. Insert chain between master FX output and destination when `mastering?.enabled`. ALSO: per-track EQ — in `src/lib/studio/engine/tracks.ts` `buildTrack`, insert one BiquadFilterNode per enabled `track.eq` band (type/freq/gain/Q map 1:1 — canonical q IS Web Audio Q for RBJ types; comment it) between the track's FX chain and its output; rebuild-on-change follows however buildTrack currently reacts to fx changes (read it; if fx changes rebuild the track, eq joins that path). Keep the servo OUT of the engine (UI drives setPreGainDb — Task 6). Recording-armed guard per spec §5: engine exposes current recording-armed state already (`setRecordingActive`) — masterChain.update must be a no-op for preGain while armed (document).
- [ ] Verify: build + existing engine tests (`npx vitest run src/lib/studio/engine`) stay green; manual: play a session with mastering on/off, hear level change, no errors.
- [ ] Commit `"feat(studio): live engine master-chain insertion (B1 task 5)"`

### Task 6: MixerView UI

**Files:** Create `src/pages/studio/MixerView.tsx` · Modify `src/pages/studio/StudioEditor.tsx` (add `view` state `'tracks'|'mix'`, a `Mix` toggle button beside the Mixdown button, render MixerView in place of the timeline `<div className="flex gap-2 items-start">` block when `view==='mix'` — transport/header stay).

**Interfaces — Consumes:** Task 1 taper fns; engineState setters ALREADY USED by Inspector/strips (volume_db, pan, mute, solo — grep `onStripChange` and Inspector for the exact call pattern and reuse it); `engineState.masterChain` (Task 5); `update()` session mutator; per-track metering: reuse the engine's existing analyser/meter access if present (grep `getPeakDb|waveAnalyser` in engine; if only recorder has meters, create one AnalyserNode per track tapped off each track's output in engine.ts and expose `engineState.getTrackPeakDb(trackId)`).

**Component structure (follow Studio's existing inline-component style):**
- `MixerView({ session, update, engineState, state })` — horizontal `overflow-x-auto` strip row + pinned master strip; meter rAF loop (pause on unmount); phone (`useIsPhone` hook exists): meter bridge on top + tap-strip → floating `MiniFader` (fixed bottom sheet-style card).
- `ChannelStrip` — name; **EQ disclosure**: a small `EQ` chip (badge dot when any band enabled) opening `StripEqSheet` — bottom Sheet listing up to 4 bands (add-band button; per band: enabled switch, type select [highpass/lowshelf/peaking/highshelf], freq slider 20–20k log, gain −12…+12 (hidden for highpass), Q 0.3–8 log) writing `track.eq` via `update()`; pan knob (VERTICAL drag: pointer events, 100px drag = full range; double-tap/dblclick → pan 0); `Fader` (vertical track+thumb, drag via pointer capture; `faderPosToDb`; double-tap → 0dB; dB readout `text-xs tabular-nums`; disabled color when track muted); `PeakMeter` (canvas or div-bar, PPM: attack instant, release 20dB/1.7s → per frame `db -= 20*(dt/1.7)`; peak-hold numeric, tap resets); M/S/R reusing the existing strip button styles from StudioEditor's track strip (copy the classNames).
- `MasterStrip` — mastering enable switch; sliders for hpf_hz (20–120), air_gain_db (0–4), comp threshold (−30…−6)/ratio (1–4); limiter ceiling (−3…−0.5); **loudness knob**: target LUFS (−16…−9, default −14) + `Master for streaming` engage toggle → servo: every 3s, if playing && !recordingArmed && integrated > −70: `delta = clamp(target − integrated, −0.5, 0.5); preGain = clamp(preGain + delta, −6, 6)`; LUFS readouts M/S/I (I amber when > target+0.5) + true-peak estimate; Export button → Task 7 sheet.
- ALL touch targets ≥44pt (pan knob/fader thumb hit areas padded), double-tap via own 300ms tap tracker (touch has no dblclick reliably).

- [ ] Implement; vitest for the pure PPM decay helper + servo step function (extract both as pure fns in MixerView or a small `mixerMath.ts`): `ppmDecay(db, dt)` and `servoStep(current, integrated, target) → next` with clamp tests.
- [ ] Verify: tsc/vitest/build; manual at 390px + desktop (report screenshots not required, but describe).
- [ ] Commit `"feat(studio): Mixer view — strips, master strip, LUFS servo (B1 task 6)"`

### Task 7: Export presets + chunked rendering

**Files:** Create `src/lib/studio/engine/exportRender.ts` · Test `src/lib/studio/engine/exportRender.test.ts` (chunk math + splice, pure parts) · Modify `src/pages/studio/StudioEditor.tsx` (replace the Mixdown button with an `Export` button opening a Sheet: `MP3 320` / `WAV (CD quality)` / `Stems (per track)`, mastering-applied badge when enabled, progress bar).

**Interfaces — Consumes:** `renderSessionToWav`/`Tone.Offline` pattern from mixdown.ts; `buildMasterChain` (offline ctx); `encodeMp3` (exists, stereo); `audioBufferToWavBlob` (exists). **Produces:**
```ts
export function projectedRenderBytes(session: Session, sampleRate: number): number; // 8 * rate * (length+1.5) * (tracks+2) — spec formula intent: f32 stereo per track + master
export function planChunks(lengthSeconds: number, chunkSeconds?: number /*45*/, leadInSeconds?: number /*3*/): Array<{ start: number; renderStart: number; end: number }>;
export function spliceChunks(chunks: Float32Array[][], crossfadeSamples: number): Float32Array[]; // 50ms xfade at seams, equal-power
export async function renderMaster(session: Session, opts: { mastering: boolean; onProgress: (f: number) => void }): Promise<AudioBuffer>;   // single-pass or chunked by projectedRenderBytes > 150MB; chunk renders re-schedule the session windowed [renderStart,end] and discard lead-in
export async function renderStems(session: Session, onProgress: (f: number) => void): Promise<Array<{ track: Track; buffer: AudioBuffer }>>; // per track, NO master chain, sequential
// IndexedDB resume: store {sessionId, preset, chunkIdx, Float32Array data} under 'gw-export-progress'; on start, offer resume if a matching record exists; clear on success.
```
Rendering per chunk: reuse mixdown.ts's `Tone.Offline` scheduling pattern (accepted by spec if builder-unification is too invasive — DECISION: keep Tone.Offline for scheduling, but pass its offline context's destination through `buildMasterChain` when mastering enabled; this satisfies "identical params" without rewriting scheduling). Normalization: non-mastered exports apply Overload-Protection-Only (scan peak; if >1.0 scale all by 1/peak).

- [ ] Failing tests: `planChunks(100)` → chunks covering [0,100] with 45s bodies, 3s lead-ins (first chunk renderStart 0), no gaps/overlaps in [start,end); `spliceChunks` sine continuity (concat two overlapping sine chunks, assert max discontinuity < 1e-3 at seam and length correct); `projectedRenderBytes` math.
- [ ] Implement render fns + Export sheet UI + progress + IndexedDB resume (idb via raw indexedDB API, small helper — no new dep). Stems: filename `01 — Soprano.wav` (index + track name, unicode-safe regex from clipOps export precedent). Run all tests + build.
- [ ] Commit `"feat(studio): export presets, stems, chunked rendering + resume (B1 task 7)"`

### Task 8: Rendered-reference fixtures + final verification

**Files:** Create `src/lib/studio/dsp/__tests__/renderedReference.test.ts` · Create `src/lib/studio/dsp/__tests__/fixtures.ts` (signal generators).

- [ ] Fixtures: `sineSweep(seconds, rate)` (20Hz→18kHz log sweep, 0.5 amplitude) and `drumTransient(rate)` (10ms 0-to-1 click + 200ms decay, repeated 4×/2s). Reference test: run each through the PURE chain equivalents (Task 2 K-weighting + Task 3 limiter at ceiling −1dB with the DEFAULT_MASTERING params, HPF/shelf via biquadProcess with RBJ coefficients from a helper `rbjBiquad(type, f0, gainDb, q, rate)` added to kWeighting.ts) and assert integrated LUFS + max output sample match committed reference constants ±0.5 LU / ±0.01 (FIRST RUN: compute and hard-code the reference values into the test with a comment `// B2 native chain must match these within ±1 LU`).
- [ ] Full gate: `npx tsc --noEmit -p tsconfig.app.json` && `npx vitest run` && `npx vite build` && `bash scripts/check-design-tokens.sh` — all green.
- [ ] Update spec status line to "Implemented (B1)". Commit `"test(studio): rendered-reference DSP fixtures — B2 parity gate (B1 task 8)"`. Push branch, open PR titled "Studio Mixer & Mastering (DAW sub-project B1)" with body summarizing spec compliance + research provenance; do NOT merge.
