// Look-ahead limiter gain computer. Pure math only (no Web Audio / DOM) —
// B1 Task 3. The AudioWorklet wrapper that connects this to a live
// audio graph is a LATER task (B1 Task 4); this module only computes
// the delayed, gain-reduced sample stream.
//
// Algorithm (adapted from the MIT monotonic-deque sliding-window-max
// limiter design cited in docs/research/2026-07-06-web-audio-mastering-brief.md
// §Mastering chain — e.g. chrisguttandin/limiter-audio-worklet-processor):
// per sample, push |max(|L|,|R|)| (stereo-linked) into a sliding-window
// max over the lookahead window; target gain
// `g = min(1, ceiling / windowMax)`; envelope has an instant downward
// attack (`env = min(env, g)`) and an exponential upward release
// (`env = g + (env - g) * releaseCoeff`) when the envelope needs to
// rise back toward g. Output = the delayed input sample (delay line
// length = lookaheadSamples) times the envelope.
//
// CIRCULAR-BUFFER TRICK (why `deque` only stores positions, not
// magnitudes): the delay line length and the sliding-window length are
// both exactly `lookaheadSamples`, so every circular position 0..L-1 is
// written to exactly once per L-sample revolution. That means a deque
// entry can be represented purely as "which circular position", and its
// magnitude can always be reconstructed later with a plain lookup into
// delayL/delayR at that position — AS LONG AS a position's stale deque
// entry is evicted before that position's buffer slot gets overwritten
// by the next revolution's sample. `processLimiterBlock` is ordered
// specifically to guarantee that.

export interface LimiterState {
  delayL: Float32Array;
  delayR: Float32Array;
  writeIdx: number;
  env: number;
  deque: Int32Array;
  dequeHead: number;
  dequeTail: number;
}

/** Allocate limiter state for a given look-ahead window length (samples).
 * `lookaheadSamples` doubles as both the delay-line length and the
 * sliding-window-max length (see module doc). Clamped to >=1. */
export function createLimiterState(lookaheadSamples: number): LimiterState {
  const L = Math.max(1, Math.floor(lookaheadSamples));
  return {
    delayL: new Float32Array(L),
    delayR: new Float32Array(L),
    writeIdx: 0,
    env: 1,
    // A monotonic deque over an L-sample window holds at most L entries
    // (one per circular position); a circular ring buffer needs N+1
    // backing capacity to store up to N entries while still being able
    // to distinguish "full" from "empty" via head/tail pointers alone.
    deque: new Int32Array(L + 1),
    dequeHead: 0,
    dequeTail: 0,
  };
}

/** Magnitude (max of |L|,|R|) of the sample currently sitting at
 * circular position `pos` in the delay buffers. Valid for any position
 * still referenced by a live deque entry — see the ordering guarantee
 * in `processLimiterBlock`. */
function magnitudeAt(state: LimiterState, pos: number): number {
  const l = Math.abs(state.delayL[pos]);
  const r = Math.abs(state.delayR[pos]);
  return l > r ? l : r;
}

/** Process one block of audio through the look-ahead limiter, mutating
 * `state` so subsequent calls continue the same stream seamlessly
 * (streaming-safe: splitting one signal across many blocks of arbitrary,
 * even unaligned, size produces identical output to processing it as a
 * single block).
 *
 * Mono: pass `inR`/`outR` as `null`. Stereo is gain-linked — a single
 * envelope (derived from max(|L|,|R|) per sample) is applied to both
 * channels so stereo image never shifts under limiting. */
export function processLimiterBlock(
  state: LimiterState,
  inL: Float32Array,
  inR: Float32Array | null,
  outL: Float32Array,
  outR: Float32Array | null,
  ceilingLinear: number,
  releaseCoeff: number,
): void {
  const L = state.delayL.length;
  const capacity = state.deque.length; // L + 1
  const hasR = inR !== null && outR !== null;
  const n = inL.length;

  let writeIdx = state.writeIdx;
  let env = state.env;
  let dequeHead = state.dequeHead;
  let dequeTail = state.dequeTail;

  for (let i = 0; i < n; i++) {
    // 1. Capture the delayed output sample BEFORE this circular slot is
    // overwritten with new input.
    const delayedL = state.delayL[writeIdx];
    const delayedR = hasR ? state.delayR[writeIdx] : 0;

    // 2. New sample's magnitude (stereo-linked: one scalar drives gain
    // for both channels).
    const vL = Math.abs(inL[i]);
    const vR = hasR ? Math.abs(inR![i]) : 0;
    const v = vL > vR ? vL : vR;

    // 3. Evict the head entry if it refers to the slot we're about to
    // overwrite: that entry is, by construction, exactly `L` samples
    // old — the oldest the window can hold — so if it's still present
    // at all it must be at the head (monotonic deques are insertion-
    // ordered from head=oldest to tail=newest).
    if (dequeHead !== dequeTail && state.deque[dequeHead] === writeIdx) {
      dequeHead = (dequeHead + 1) % capacity;
    }

    // 4. Maintain the non-increasing (head->tail) monotonic invariant:
    // pop any tail entries that can never again beat the new sample
    // within the window.
    while (dequeHead !== dequeTail) {
      const prevTail = (dequeTail - 1 + capacity) % capacity;
      const lastPos = state.deque[prevTail];
      if (magnitudeAt(state, lastPos) <= v) {
        dequeTail = prevTail;
      } else {
        break;
      }
    }

    // 5. Only now write the new sample into the delay line — any deque
    // entry that pointed at this position has already been evicted or
    // popped above, so nothing will read stale data through it.
    state.delayL[writeIdx] = inL[i];
    if (hasR) state.delayR[writeIdx] = inR![i];

    // 6. Push the new position.
    state.deque[dequeTail] = writeIdx;
    dequeTail = (dequeTail + 1) % capacity;

    // 7. Sliding-window max = magnitude at the head.
    const windowMax = magnitudeAt(state, state.deque[dequeHead]);

    // 8. Target gain (windowMax <= ceiling, including silence, -> unity).
    const g = windowMax <= ceilingLinear ? 1 : ceilingLinear / windowMax;

    // 9. Envelope: instant attack downward, exponential release upward.
    if (g < env) {
      env = g;
    } else {
      env = g + (env - g) * releaseCoeff;
    }

    // 10. Output = delayed input sample * envelope.
    outL[i] = delayedL * env;
    if (hasR) outR![i] = delayedR * env;

    writeIdx = (writeIdx + 1) % L;
  }

  state.writeIdx = writeIdx;
  state.env = env;
  state.dequeHead = dequeHead;
  state.dequeTail = dequeTail;
}
