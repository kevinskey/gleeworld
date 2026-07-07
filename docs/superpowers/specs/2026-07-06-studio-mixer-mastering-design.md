# Studio Mixer & Mastering — Design Spec (Sub-project B)

**Date:** 2026-07-06
**Status:** Implemented (B1) — 2026-07-07
**Prerequisites:** READ the three research briefs first — `docs/research/2026-07-06-touch-daw-ux-brief.md`, `2026-07-06-web-audio-mastering-brief.md`, `2026-07-06-ios-audio-engineering-brief.md`. Every convention below is sourced there.
**Phasing:** B1 = web (this spec) · B2 = native iOS parity (separate spec, uses the canonical parameter model defined here) · B3 = later (buses, automation).

## Goal

A Mixer view inside Studio where a director mixes tracks (fader/pan/mute/solo/meters) and masters the final project (EQ → glue compressor → look-ahead limiter, LUFS/true-peak metering, one-knob streaming target), then exports via named presets including per-track SATB stems.

## 1. Data model — canonical parameters (the B2 parity contract)

Extend `Session` (src/lib/studio/session.ts) — all NEW fields optional with defaults so existing saved sessions load unchanged:

```ts
// Track additions (Track already has volume_db, pan, mute, solo)
interface TrackEqBand { type: 'highpass'|'lowshelf'|'peaking'|'highshelf'; freq_hz: number; gain_db: number; q: number; enabled: boolean; }
track.eq?: TrackEqBand[];          // default [] (no per-track EQ nodes created)

// Session additions
session.master.mastering?: {
  enabled: boolean;                 // default false — chain fully bypassed
  hpf_hz: number;                   // default 60, range 20–120
  air_gain_db: number;              // high-shelf @8kHz, default 1, range 0–4
  comp: { threshold_db: number; ratio: number; attack_ms: number; release_ms: number };
                                    // defaults −18 / 2 / 10 / 250 (choir glue, research-sourced)
  limiter: { ceiling_db: number; release_ms: number };   // defaults −1 / 200
  loudness_target_lufs: number;     // default −14 (the one-knob macro drives comp/limiter makeup toward this)
};
```

Canonical semantics (write these into code comments — B2 adapters translate them): `q` is RBJ cookbook Q; compressor `attack_ms`/`release_ms` = time to reach 90% of target gain change. NEVER pass canonical values to platform APIs by name (Web Audio Q ≠ AVAudioUnitEQ octave bandwidth; three definitions of "attack" exist — see iOS brief §5).

## 2. Mixer view UI

- **Entry:** a `Mix` toggle in the Studio header next to Mixdown — swaps the tracks timeline for the mixer surface (same route, view state; the transport stays). Phone (<sm): mixer takes the full main area.
- **Channel strip** (one per track, horizontal scroll when overflowing; strip width ~104px desktop, ~88px phone): top→bottom: track name (13px, truncate) → EQ disclosure (opens the strip's EQ sheet; badge dot when any band enabled) → pan knob (**vertical-swipe** to adjust, double-tap recenters; equal-power −3dB — Tone.Panner default) → **fader** (vertical, dB taper: +6…−60→−∞ with unity at ~75% travel; numeric dB readout below; **double-tap resets 0 dB**) → **peak meter** beside the fader (PPM ballistics: instant attack, ~1.7s/20dB release; green→amber above −12→red above −3; **numeric peak-hold** readout, tap to reset) → M / S / R buttons (existing strip semantics, 44pt).
- **Master strip** pinned right (visually distinct, wider): the mastering chain (§3) + LUFS meters + the one-knob macro + Export button.
- **Phone affordance** (Logic-iPad pattern): tapping a strip selects it and opens a **floating mini-fader** (selected track's fader/pan/M/S at thumb height); a horizontal **meter bridge** across the top shows all tracks' meters and scrolls the strip row.
- Fader/pan writes go through the EXISTING live-engine setters (`engineState` volume/pan/mute/solo paths used by the current Inspector) — the mixer is a new view over the same state, not a second engine.
- All meters run off ONE AnalyserNode per track + rAF loop with the PPM envelope follower in JS; meters pause when the Mixer view is closed (no background cost).

## 3. Master chain (web DSP)

Graph (inserted between the existing master gain and destination, built by the shared builder §4):

`masterIn → HPF (Biquad highpass, hpf_hz, Q 0.707) → Air (Biquad highshelf 8kHz, air_gain_db) → Glue (native DynamicsCompressorNode: canonical→node adapter; knee 12) → Limiter (custom AudioWorklet) → LUFS/TP meter tap → destination`

- **Limiter** — `src/lib/studio/engine/limiterWorklet.ts` + processor: look-ahead 4ms delay line, monotonic-deque sliding max (adapt MIT `chrisguttandin/limiter-audio-worklet-processor`), exponential release (`release_ms`), ceiling `ceiling_db` (sample-peak in B1; true-peak sidechain via 4× FIR is a stretch goal — ship sample-peak with ceiling −1 dB which keeps true peaks ≲ −0.5 dBTP for typical material, note in code). Bypass = disconnect, not zero-processing-through.
- **LUFS meter** — `src/lib/studio/engine/loudnessWorklet.ts`: K-weighting biquads (coefficients derived at ctx.sampleRate via bilinear transform — constants & 48k reference values in the web brief; validate with unit tests against the published 48kHz table), 400ms/75% blocks → Momentary; 3s window → Short-term; gated (−70 absolute, −10 LU relative) → Integrated; sample-peak-based true-peak estimate (4× FIR = same stretch goal). Displays M / S / I + peak, I turns amber when > target+0.5.
- **One-knob "Master for streaming"**: enabling mastering with the loudness macro engaged auto-adjusts limiter input gain so Integrated approaches `loudness_target_lufs` during playback preview (simple slow servo: ±0.5dB steps, 3s interval, clamp ±6dB). Export applies the settled gain. This is deliberately simple — no offline two-pass in B1.
- Worklets respect Safari/WKWebView limits: ≤6 input channels+params, `channelCountMode:'explicit'` (web brief).

## 4. Shared graph-builder + export

- **Refactor** `renderSessionToWav`/live engine so ONE builder constructs track chains + master chain against either the live context or `OfflineAudioContext` (raw — NOT Tone.Offline for the export path; web brief documents 10–30× overhead and long-render integrity bugs). The live path keeps Tone; the offline path may keep Tone.Offline ONLY if replacing it proves too invasive in the plan — decide there, but the master chain nodes must be identical objects/params in both.
- **Export presets** (replaces the bare Mixdown button with a small sheet):
  1. `MP3 320` — master render → existing stereo worker encode.
  2. `WAV (CD quality)` — 16-bit 44.1k (existing WAV encoder).
  3. `Stems (per track)` — solo-free per-track renders (track chain WITHOUT master chain, per Logic stem convention), zip via existing jszip dep if present else sequential downloads `<n> — <track>.wav`; this is the SATB part-tracks differentiator.
  - Mastering toggle state applies to 1–2; stems always dry of master chain. Normalization default = Logic's "Overload Protection Only" (downward-only if peak > 0 dBFS) on non-mastered exports.
- **Chunked rendering** (iOS OOM is silent ~100–200MB): projected bytes = 8 × sampleRate × length × (tracks+2). Above ~150MB → render in 45s segments with 3s lead-in discarded, crossfade splice 50ms, dispose each OfflineAudioContext; feed MP3 worker incrementally per chunk; progress bar + IndexedDB chunk persistence so an OOM kill resumes. Below threshold → single pass (desktop common case).

## 5. Error handling

- AudioWorklet module load failure (old browsers): mastering chain degrades to HPF+shelf+glue only, limiter slot bypassed, toast once; export still works.
- Export mid-failure: per-chunk try/catch → resume prompt from IndexedDB state; final failure surfaces the chunk index + reason.
- Sessions with mastering saved but chain unavailable natively (B2 not shipped): iOS app plays UNMASTERED and shows a "mix preview only" badge — never half-apply.
- The mastering servo never moves gain while recording is armed (interaction with take alignment).

## 6. Testing

- Unit: K-weighting coefficients vs published 48kHz table (±0.5% per BS.1770 tolerance); gating math on synthetic block sequences (silence gating, −10 LU relative); limiter processor math on a step signal (no sample above ceiling, release curve); dB↔linear taper mapping; chunk splice continuity (sine across seam, no discontinuity > ε).
- Rendered-reference fixtures (CI): render sine sweep + drum transient through master chain offline; assert LUFS-I and peak within tolerance of committed reference values — this is the B2 parity gate's web half.
- Manual: mix on iPad (strip gestures, mini-fader), master preview servo settles near −14, all 3 export presets on desktop + iPhone Safari, long-project chunked export on iPad.

## 7. Non-goals (B1)

Aux/send buses, automation lanes, per-track dynamics inserts, true-peak oversampling (stretch), VBR/format pickers, WAM packaging (revisit B3), native iOS chain (B2 — but the canonical parameter model above is binding on it).
