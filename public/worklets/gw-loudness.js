// gw-loudness.js — parallel loudness-meter tap for the Studio mastering
// chain (B1 Task 4). Connected as a side branch off the limiter output
// (its own output is NOT connected anywhere downstream — see
// masterChain.ts wiring); it only exists to K-weight the post-limiter
// signal and report per-hop power/peak back to the main thread.
//
// KEEP IN SYNC WITH src/lib/studio/dsp/kWeighting.ts — the
// ebur128HighShelf/ebur128Highpass coefficient derivations below are a
// standalone-JS inlined copy of that module's math (AudioWorklet
// processors can't `import` TS / bundle app modules). Any change to
// those derivations there MUST be mirrored here, and vice versa. The
// gating/window logic (loudness.ts: blockLoudness/integratedLoudness/
// shortTermSeries) intentionally stays on the MAIN THREAD — this
// worklet only emits raw per-hop `{ hopPower, hopPeak }` messages;
// masterChain.ts assembles Momentary/Short-term/Integrated from the hop
// stream using that module.
//
// hopPower is already Σ Gi*zi (Gi=1 for each of L/R, summed here) for
// the hop — the exact quantity loudness.ts's blockLoudness/
// integratedLoudness/shortTermSeries expect as one "block power" entry
// (callers pass it through as a single-element array, e.g.
// `blockLoudness([hopPower])`, which reduces to the same value).
// hopPeak is the max |raw sample| (sample-peak, NOT true-peak — see the
// B1 spec's true-peak stretch-goal note) seen across all channels during
// the hop, measured on the un-K-weighted signal (K-weighting is a
// loudness curve, not a peak/ceiling measure).

const HOP_SECONDS = 0.1; // 100ms hops per B1 spec

const SHELF_F0 = 1681.974450955533;
const SHELF_GAIN_DB = 3.999843853973347;
const SHELF_Q = 0.7071752369554196;

const HP_F0 = 38.13547087602444;
const HP_Q = 0.5003270373238773;

// Mirrors ebur128HighShelf() in kWeighting.ts.
function ebur128HighShelf(f0, gainDb, q, rate) {
  const K = Math.tan((Math.PI * f0) / rate);
  const Vh = Math.pow(10, gainDb / 20);
  const Vb = Math.pow(Vh, 0.4996667741545416);
  const a0 = 1 + K / q + K * K;
  return {
    b0: (Vh + (Vb * K) / q + K * K) / a0,
    b1: (2 * (K * K - Vh)) / a0,
    b2: (Vh - (Vb * K) / q + K * K) / a0,
    a1: (2 * (K * K - 1)) / a0,
    a2: (1 - K / q + K * K) / a0,
  };
}

// Mirrors ebur128Highpass() in kWeighting.ts.
function ebur128Highpass(f0, q, rate) {
  const K = Math.tan((Math.PI * f0) / rate);
  const a0 = 1 + K / q + K * K;
  return {
    b0: 1,
    b1: -2,
    b2: 1,
    a1: (2 * (K * K - 1)) / a0,
    a2: (1 - K / q + K * K) / a0,
  };
}

const MAX_CHANNELS = 2;

class GwLoudnessProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.shelf = ebur128HighShelf(SHELF_F0, SHELF_GAIN_DB, SHELF_Q, sampleRate);
    this.hp = ebur128Highpass(HP_F0, HP_Q, sampleRate);

    // Per-channel streaming biquad state [x1,x2,y1,y2] for each cascade
    // stage — mirrors biquadProcess()'s state tuple in kWeighting.ts, one
    // pair of states per channel (L=0, R=1) so the two channels' filter
    // histories never cross.
    this.stateShelf = [[0, 0, 0, 0], [0, 0, 0, 0]];
    this.stateHp = [[0, 0, 0, 0], [0, 0, 0, 0]];
    this.sumSq = [0, 0];

    this.hopSamples = Math.max(1, Math.round(HOP_SECONDS * sampleRate));
    this.hopCount = 0;
    this.hopPeak = 0;
  }

  // Direct-form-1 biquad, cascaded shelf -> highpass, one sample at a
  // time (streaming form of biquadProcess() in kWeighting.ts, which
  // operates on whole Float32Array blocks — the worklet processes
  // sample-by-sample since it also needs the per-sample peak).
  kFilterSample(x, ch) {
    const shelf = this.shelf;
    const sState = this.stateShelf[ch];
    const y1 = shelf.b0 * x + shelf.b1 * sState[0] + shelf.b2 * sState[1]
      - shelf.a1 * sState[2] - shelf.a2 * sState[3];
    sState[1] = sState[0];
    sState[0] = x;
    sState[3] = sState[2];
    sState[2] = y1;

    const hp = this.hp;
    const hState = this.stateHp[ch];
    const y2 = hp.b0 * y1 + hp.b1 * hState[0] + hp.b2 * hState[1]
      - hp.a1 * hState[2] - hp.a2 * hState[3];
    hState[1] = hState[0];
    hState[0] = y1;
    hState[3] = hState[2];
    hState[2] = y2;

    return y2;
  }

  process(inputs) {
    const input = inputs[0];
    const hasInput = !!(input && input.length > 0 && input[0] && input[0].length > 0);
    if (!hasInput) return true;

    const numCh = Math.min(input.length, MAX_CHANNELS);
    const n = input[0].length;

    for (let i = 0; i < n; i++) {
      let sampleAbsMax = 0;
      for (let ch = 0; ch < numCh; ch++) {
        const raw = input[ch][i];
        const abs = raw < 0 ? -raw : raw;
        if (abs > sampleAbsMax) sampleAbsMax = abs;

        const filtered = this.kFilterSample(raw, ch);
        this.sumSq[ch] += filtered * filtered;
      }
      if (sampleAbsMax > this.hopPeak) this.hopPeak = sampleAbsMax;

      this.hopCount++;
      if (this.hopCount >= this.hopSamples) {
        let hopPower = 0;
        for (let ch = 0; ch < numCh; ch++) {
          hopPower += this.sumSq[ch] / this.hopCount; // mean-square per channel, Gi=1
          this.sumSq[ch] = 0;
        }
        this.port.postMessage({ hopPower, hopPeak: this.hopPeak });
        this.hopCount = 0;
        this.hopPeak = 0;
      }
    }

    return true;
  }
}

registerProcessor('gw-loudness', GwLoudnessProcessor);
