// gw-limiter.js — AudioWorkletProcessor wrapping the look-ahead limiter
// for the Studio mastering chain (B1 Task 4).
//
// KEEP IN SYNC WITH src/lib/studio/dsp/limiterCore.ts — this file is a
// standalone-JS inlined copy of that module's algorithm (AudioWorklet
// processors run in their own global scope and cannot `import` TS or
// bundle app modules, so the math is duplicated here verbatim-adapted).
// Any change to the algorithm in limiterCore.ts — most importantly the
// ordering fix from commit d94461088 (deque maintenance deferred until
// AFTER output computation, so the sample being emitted this iteration
// still gets a vote in its own gain before it ages out of the window —
// see the step-by-step comments below, ported 1:1 from that file) — MUST
// be mirrored here, and vice versa.
//
// Algorithm summary (full derivation/rationale lives in limiterCore.ts):
// per sample, push |max(|L|,|R|)| (stereo-linked) into a sliding-window
// max over a fixed look-ahead window; target gain
// `g = min(1, ceiling / windowMax)`; envelope has an instant downward
// attack (`env = min(env, g)`) and an exponential upward release
// (`env = g + (env - g) * releaseCoeff`); output = the delayed input
// sample (delay length = look-ahead samples) times the envelope.
//
// `ceiling` (linear, 0..1) and `release` (ms) are live AudioParams
// (k-rate) so the main thread can update them without rebuilding the
// chain (see masterChain.ts `update()`).

const LOOKAHEAD_MS = 4; // fixed per B1 mastering-chain spec

class GwLimiterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      // Default ~= dbToLinear(-1) — matches DEFAULT_MASTERING.limiter.ceiling_db.
      { name: 'ceiling', defaultValue: 0.8912509381337456, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      // Default matches DEFAULT_MASTERING.limiter.release_ms.
      { name: 'release', defaultValue: 200, minValue: 1, maxValue: 5000, automationRate: 'k-rate' },
    ];
  }

  constructor() {
    super();
    // `sampleRate` is a global inside AudioWorkletGlobalScope.
    const L = Math.max(1, Math.round((LOOKAHEAD_MS / 1000) * sampleRate));
    this.L = L;
    this.capacity = L + 1; // ring needs N+1 slots to distinguish full/empty via head/tail alone
    this.delayL = new Float32Array(L);
    this.delayR = new Float32Array(L);
    this.writeIdx = 0;
    this.env = 1;
    this.deque = new Int32Array(this.capacity);
    this.dequeHead = 0;
    this.dequeTail = 0;
  }

  // Magnitude (max of |L|,|R|) of the sample currently sitting at
  // circular position `pos` — mirrors magnitudeAt() in limiterCore.ts.
  magnitudeAt(pos) {
    const l = Math.abs(this.delayL[pos]);
    const r = Math.abs(this.delayR[pos]);
    return l > r ? l : r;
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    if (!output || output.length === 0) return true;

    const outL = output[0];
    const outR = output.length > 1 ? output[1] : null;
    const n = outL.length;

    const input = inputs[0];
    const hasInput = !!(input && input.length > 0 && input[0] && input[0].length > 0);
    const inL = hasInput ? input[0] : new Float32Array(n);
    const hasR = hasInput && input.length > 1 && !!input[1];
    const inR = hasR ? input[1] : null;

    const ceilingLinear = parameters.ceiling[0];
    const releaseMs = parameters.release[0];
    const releaseCoeff = Math.exp(-1 / ((releaseMs / 1000) * sampleRate));

    const L = this.L;
    const capacity = this.capacity;
    let writeIdx = this.writeIdx;
    let env = this.env;
    let dequeHead = this.dequeHead;
    let dequeTail = this.dequeTail;

    for (let i = 0; i < n; i++) {
      // 1. Capture the delayed output sample BEFORE this circular slot is
      // overwritten with new input.
      const delayedL = this.delayL[writeIdx];
      const delayedR = hasR ? this.delayR[writeIdx] : 0;

      // 2. New sample's magnitude (stereo-linked: one scalar drives gain
      // for both channels).
      const vL = Math.abs(inL[i]);
      const vR = hasR ? Math.abs(inR[i]) : 0;
      const v = vL > vR ? vL : vR;

      // 3. Sliding-window max = magnitude at the head, read BEFORE any of
      // this iteration's deque maintenance runs. The sample being emitted
      // this step is exactly the entry the head points to once it has
      // aged the full `L` samples — reading the head here, before
      // eviction, gives that outgoing sample its vote in the gain about
      // to be applied to it; it only stops counting once we move on to
      // the next sample below.
      const windowMax = this.magnitudeAt(this.deque[dequeHead]);

      // 4. Target gain (windowMax <= ceiling, including silence -> unity).
      const g = windowMax <= ceilingLinear ? 1 : ceilingLinear / windowMax;

      // 5. Envelope: instant attack downward, exponential release upward.
      if (g < env) {
        env = g;
      } else {
        env = g + (env - g) * releaseCoeff;
      }

      // 6. Output = delayed input sample * envelope. Mono input still
      // produces a full stereo output (outputChannelCount [2]) by
      // mirroring L into R.
      outL[i] = delayedL * env;
      if (outR) outR[i] = (hasR ? delayedR : delayedL) * env;

      // 7. NOW evict the head entry if it refers to the slot we're about
      // to overwrite: by construction it is exactly `L` samples old — the
      // oldest the window can hold — so if it's still present it must be
      // at the head (monotonic deques are insertion-ordered head=oldest
      // to tail=newest). Deferred until after step 3 read it, so it still
      // voted in its own sample's gain (the d94461088 fix).
      if (dequeHead !== dequeTail && this.deque[dequeHead] === writeIdx) {
        dequeHead = (dequeHead + 1) % capacity;
      }

      // 8. Maintain the non-increasing (head->tail) monotonic invariant:
      // pop any tail entries that can never again beat the new sample
      // within the window.
      while (dequeHead !== dequeTail) {
        const prevTail = (dequeTail - 1 + capacity) % capacity;
        const lastPos = this.deque[prevTail];
        if (this.magnitudeAt(lastPos) <= v) {
          dequeTail = prevTail;
        } else {
          break;
        }
      }

      // 9. Only now write the new sample into the delay line — any deque
      // entry that pointed at this position has already been evicted or
      // popped above, so nothing will read stale data through it.
      this.delayL[writeIdx] = inL[i];
      if (hasR) this.delayR[writeIdx] = inR[i];

      // 10. Push the new position — it starts voting in the window max
      // starting next iteration.
      this.deque[dequeTail] = writeIdx;
      dequeTail = (dequeTail + 1) % capacity;

      writeIdx = (writeIdx + 1) % L;
    }

    this.writeIdx = writeIdx;
    this.env = env;
    this.dequeHead = dequeHead;
    this.dequeTail = dequeTail;

    return true;
  }
}

registerProcessor('gw-limiter', GwLimiterProcessor);
