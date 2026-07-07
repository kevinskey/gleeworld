// Master mastering-chain builder — Studio Mixer & Mastering B1 Task 4.
//
// Assembles the live Web Audio graph for a session's MasteringParams:
//   input(Gain) -> HPF -> air shelf -> glue comp -> preGain(servo)
//     -> gw-limiter (AudioWorklet) -> output(Gain)
//                          \-> gw-loudness (AudioWorklet, parallel tap;
//                              its own output is never connected)
//
// The two AudioWorkletProcessors (public/worklets/gw-limiter.js,
// public/worklets/gw-loudness.js) inline standalone-JS copies of the
// pure math in ../dsp/limiterCore.ts and ../dsp/kWeighting.ts — see the
// "KEEP IN SYNC" comments in all four files. This module owns:
//   - `chainTopology`: the pure bypass/degrade decision (which stages
//     actually get built for a given MasteringParams + worklet-load
//     outcome) — extracted so it's testable without a real AudioContext.
//   - canonical-params -> Web Audio node-params adapters (also pure,
//     also tested without a real AudioContext).
//   - `buildMasterChain`: the actual (impure, async) graph construction,
//     worklet loading, live-update wiring, and meter aggregation.
//
// Canonical semantics reminder (see session.ts / B1 plan Global
// Constraints): `comp.attack_ms`/`release_ms` are time-to-90%-of-target-
// gain-change, NOT the Web Audio DynamicsCompressorNode convention
// (attack = time-to-10dB). B1 ships the straight `/1000` (seconds)
// mapping with NO correction factor — the two conventions are close
// enough at these musical time constants that a glue compressor's exact
// curve isn't worth the complexity of solving for an equivalent attack
// time; this is documented here rather than silently assumed.

import type { MasteringParams } from '../session';
import { dbToLinear, linearToDb } from '../dsp/faderTaper';
import { blockLoudness, integratedLoudness, shortTermSeries } from '../dsp/loudness';

// ── Pure topology + param-mapping (unit-testable, no AudioContext) ────

export type ChainStage = 'hpf' | 'shelf' | 'comp' | 'pregain' | 'limiter' | 'meter';

/** Which stages actually get built, given the session's MasteringParams
 * and whether the AudioWorklet modules loaded successfully.
 *   - `!p.enabled` -> `[]` (bypass: input connects straight to output,
 *     no DSP nodes created at all).
 *   - `enabled && !workletOk` -> `['hpf','shelf','comp']` (degraded:
 *     limiter/meter slots skipped entirely, comp connects straight to
 *     output — no zombie worklet nodes).
 *   - `enabled && workletOk` -> the full chain. */
export function chainTopology(p: MasteringParams, workletOk: boolean): ChainStage[] {
  if (!p.enabled) return [];
  if (!workletOk) return ['hpf', 'shelf', 'comp'];
  return ['hpf', 'shelf', 'comp', 'pregain', 'limiter', 'meter'];
}

/** HPF: RBJ cookbook highpass, fixed Q per the B1 spec. */
export const HPF_Q = 0.707;

/** Air shelf: fixed corner frequency per the B1 spec. */
export const AIR_SHELF_HZ = 8000;

/** Fixed compressor knee (dB) per the B1 spec — not user-configurable. */
export const COMP_KNEE_DB = 12;

/** Canonical comp params (attack_ms/release_ms = time-to-90%) -> the
 * DynamicsCompressorNode's own param units (seconds, fixed knee). See
 * the module header CANONICAL->NODE note re: the attack-definition
 * mismatch (factor 1.0 applied in B1, documented rather than solved for). */
export function mapCompParams(comp: MasteringParams['comp']): {
  threshold: number;
  ratio: number;
  attack: number;
  release: number;
  knee: number;
} {
  return {
    threshold: comp.threshold_db,
    ratio: comp.ratio,
    attack: comp.attack_ms / 1000,
    release: comp.release_ms / 1000,
    knee: COMP_KNEE_DB,
  };
}

/** Canonical limiter params -> the gw-limiter AudioWorkletNode's own
 * AudioParam units: `ceiling` is linear (0..1, via dbToLinear — the same
 * conversion faders use), `release` stays in ms (the worklet computes
 * its own exponential coefficient from ms + its sampleRate each block). */
export function mapLimiterParams(limiter: MasteringParams['limiter']): {
  ceilingLinear: number;
  releaseMs: number;
} {
  return {
    ceilingLinear: dbToLinear(limiter.ceiling_db),
    releaseMs: limiter.release_ms,
  };
}

// ── Live graph construction (impure — needs a real BaseAudioContext) ──

export interface MeterBlock {
  momentary: number;
  shortTerm: number;
  integrated: number;
  peakDb: number;
}

export interface MasterChainHandle {
  input: AudioNode;
  output: AudioNode;
  /** true when the AudioWorklet modules failed to load — chain runs
   * HPF/shelf/comp only, limiter + loudness meter are skipped entirely. */
  degraded: boolean;
  /** Live param changes (frequency/gain/threshold/ratio/attack/release/
   * ceiling) on whatever stages were actually built. Does NOT rebuild
   * the graph — toggling `enabled` (which changes chainTopology's
   * result) requires `dispose()` + a fresh `buildMasterChain()` call. */
  update(p: MasteringParams): void;
  /** Loudness-servo control — sets the pre-limiter makeup-gain stage. */
  setPreGainDb(db: number): void;
  readonly meter: { onBlock(cb: (m: MeterBlock) => void): () => void };
  dispose(): void;
}

const MOMENTARY_HOPS = 4; // 400ms / 100ms hops
const SHORT_TERM_HOPS = 30; // 3s / 100ms hops

/** Loads the two worklet modules (never throws — resolves `false` on
 * failure so the caller can degrade instead). */
async function tryLoadWorklets(ctx: BaseAudioContext): Promise<boolean> {
  if (!ctx.audioWorklet) return false;
  try {
    await ctx.audioWorklet.addModule('/worklets/gw-limiter.js');
    await ctx.audioWorklet.addModule('/worklets/gw-loudness.js');
    return true;
  } catch (err) {
    console.warn('[masterChain] AudioWorklet module load failed — degrading to HPF/shelf/comp only.', err);
    return false;
  }
}

export interface BuildMasterChainOptions {
  /** Override AudioWorkletNode construction. Needed by the LIVE engine:
   * Tone 15's `getContext().rawContext` is a standardized-audio-context
   * wrapper at runtime (its .d.ts claims native AudioContext, but the JS
   * constructs `new stdAudioContext(...)` — see tone's
   * core/context/AudioContext.js), and the bare native
   * `new AudioWorkletNode(ctx, …)` constructor throws "not of type
   * 'BaseAudioContext'" for it. The engine passes Tone's own
   * `context.createAudioWorkletNode`, which branches native vs.
   * standardized exactly for this case. Truly-native contexts — e.g.
   * exportRender's OfflineAudioContext (Task 7) — omit this and get the
   * native-constructor default below. `ctx.createGain/-BiquadFilter/
   * -DynamicsCompressor` and `ctx.audioWorklet.addModule` behave the
   * same on both context flavors, so only worklet-NODE construction
   * needs the escape hatch. */
  createWorkletNode?: (name: string, options: AudioWorkletNodeOptions) => AudioWorkletNode;
}

export async function buildMasterChain(
  ctx: BaseAudioContext,
  p: MasteringParams,
  opts: BuildMasterChainOptions = {},
): Promise<MasterChainHandle> {
  const makeWorkletNode = opts.createWorkletNode
    ?? ((name: string, options: AudioWorkletNodeOptions) => new AudioWorkletNode(ctx, name, options));
  const workletOk = await tryLoadWorklets(ctx);
  const stages = chainTopology(p, workletOk);
  const degraded = p.enabled && !workletOk;

  const input = ctx.createGain();
  const output = ctx.createGain();

  let hpfNode: BiquadFilterNode | null = null;
  let shelfNode: BiquadFilterNode | null = null;
  let compNode: DynamicsCompressorNode | null = null;
  let preGainNode: GainNode | null = null;
  let limiterNode: AudioWorkletNode | null = null;
  let loudnessNode: AudioWorkletNode | null = null;

  if (stages.length === 0) {
    // Bypass: single direct connection, no DSP nodes at all.
    input.connect(output);
  } else {
    let node: AudioNode = input;

    if (stages.includes('hpf')) {
      hpfNode = ctx.createBiquadFilter();
      hpfNode.type = 'highpass';
      hpfNode.frequency.value = p.hpf_hz;
      hpfNode.Q.value = HPF_Q;
      node.connect(hpfNode);
      node = hpfNode;
    }

    if (stages.includes('shelf')) {
      shelfNode = ctx.createBiquadFilter();
      shelfNode.type = 'highshelf';
      shelfNode.frequency.value = AIR_SHELF_HZ;
      shelfNode.gain.value = p.air_gain_db;
      node.connect(shelfNode);
      node = shelfNode;
    }

    if (stages.includes('comp')) {
      const c = mapCompParams(p.comp);
      compNode = ctx.createDynamicsCompressor();
      compNode.threshold.value = c.threshold;
      compNode.ratio.value = c.ratio;
      compNode.attack.value = c.attack;
      compNode.release.value = c.release;
      compNode.knee.value = c.knee;
      node.connect(compNode);
      node = compNode;
    }

    if (stages.includes('pregain')) {
      preGainNode = ctx.createGain();
      preGainNode.gain.value = 1;
      node.connect(preGainNode);
      node = preGainNode;
    }

    if (stages.includes('limiter')) {
      const lim = mapLimiterParams(p.limiter);
      limiterNode = makeWorkletNode('gw-limiter', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 2,
        channelCountMode: 'explicit',
        outputChannelCount: [2],
        parameterData: { ceiling: lim.ceilingLinear, release: lim.releaseMs },
      });
      node.connect(limiterNode);
      node = limiterNode;
    }

    // Final stage always connects to output.
    node.connect(output);

    if (stages.includes('meter') && limiterNode) {
      // Parallel analyzer tap: limiter -> loudness, loudness's own
      // output is never connected anywhere (numberOfOutputs: 0).
      loudnessNode = makeWorkletNode('gw-loudness', {
        numberOfInputs: 1,
        numberOfOutputs: 0,
        channelCount: 2,
        channelCountMode: 'explicit',
      });
      limiterNode.connect(loudnessNode);
    }
  }

  // ── Meter aggregation (main thread) ──────────────────────────────
  // gw-loudness posts one { hopPower, hopPeak } message per 100ms hop.
  // We keep the full hop history (blockPowers/blockLoudnesses) so
  // Integrated is a true session-long gated mean per BS.1770-4; the
  // rolling Momentary/Short-term windows only ever look at the tail.
  const blockPowers: number[] = [];
  const blockLoudnesses: number[] = [];
  let peakLinear = 0;
  const listeners = new Set<(m: MeterBlock) => void>();

  if (loudnessNode) {
    loudnessNode.port.onmessage = (ev: MessageEvent<{ hopPower: number; hopPeak: number }>) => {
      const { hopPower, hopPeak } = ev.data;
      if (hopPeak > peakLinear) peakLinear = hopPeak;

      blockPowers.push(hopPower);
      blockLoudnesses.push(blockLoudness([hopPower]));

      const momentarySeries = shortTermSeries(blockPowers, MOMENTARY_HOPS);
      const shortTermSeriesValues = shortTermSeries(blockPowers, SHORT_TERM_HOPS);
      const momentary = momentarySeries.length > 0 ? momentarySeries[momentarySeries.length - 1] : -Infinity;
      const shortTerm = shortTermSeriesValues.length > 0
        ? shortTermSeriesValues[shortTermSeriesValues.length - 1]
        : -Infinity;
      const integrated = integratedLoudness(blockLoudnesses, blockPowers);
      const peakDb = linearToDb(peakLinear);

      const block: MeterBlock = { momentary, shortTerm, integrated, peakDb };
      for (const cb of listeners) cb(block);
    };
  }

  const handle: MasterChainHandle = {
    input,
    output,
    degraded,

    update(next: MasteringParams) {
      if (hpfNode) hpfNode.frequency.value = next.hpf_hz;
      if (shelfNode) shelfNode.gain.value = next.air_gain_db;
      if (compNode) {
        const c = mapCompParams(next.comp);
        compNode.threshold.value = c.threshold;
        compNode.ratio.value = c.ratio;
        compNode.attack.value = c.attack;
        compNode.release.value = c.release;
        compNode.knee.value = c.knee;
      }
      if (limiterNode) {
        const lim = mapLimiterParams(next.limiter);
        limiterNode.parameters.get('ceiling')!.value = lim.ceilingLinear;
        limiterNode.parameters.get('release')!.value = lim.releaseMs;
      }
    },

    setPreGainDb(db: number) {
      if (preGainNode) preGainNode.gain.value = dbToLinear(db);
    },

    meter: {
      onBlock(cb: (m: MeterBlock) => void): () => void {
        listeners.add(cb);
        return () => listeners.delete(cb);
      },
    },

    dispose() {
      listeners.clear();
      if (loudnessNode) loudnessNode.port.onmessage = null;
      for (const n of [input, hpfNode, shelfNode, compNode, preGainNode, limiterNode, loudnessNode, output]) {
        n?.disconnect();
      }
    },
  };

  return handle;
}
