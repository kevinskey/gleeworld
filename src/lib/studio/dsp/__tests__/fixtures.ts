// Rendered-reference DSP fixtures — deterministic mono signal generators
// consumed ONLY by renderedReference.test.ts (B1 Task 8) to drive the
// pure mastering-chain math (HPF -> air-shelf -> limiter) and lock down
// reference LUFS/peak measurements as the B2 native-parity gate. These
// are not used anywhere in the shipped app.

/** 20Hz -> 18kHz exponential ("log") sine sweep, `seconds` long at
 * `rate` Hz, amplitude 0.5. Standard log-sweep (Farina) phase
 * construction: instantaneous frequency f(t) = f0 * (f1/f0)^(t/seconds),
 * so phase(t) = 2*pi*f0*K * (e^(t/K) - 1) with K = seconds/ln(f1/f0) —
 * chosen so d(phase)/dt at any t equals 2*pi*f(t) exactly. Exercises the
 * full audible band, including the mastering chain's HPF and air-shelf
 * corner frequencies, in one deterministic pass. */
export function sineSweep(seconds: number, rate: number): Float32Array {
  const F0 = 20;
  const F1 = 18000;
  const AMPLITUDE = 0.5;
  const n = Math.round(seconds * rate);
  const out = new Float32Array(n);
  const K = seconds / Math.log(F1 / F0);

  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const phase = 2 * Math.PI * F0 * K * (Math.exp(t / K) - 1);
    out[i] = AMPLITUDE * Math.sin(phase);
  }

  return out;
}

/** Percussive-transient fixture: a 10ms linear 0->1 "click" attack
 * followed by a 200ms exponential decay (time constant tau chosen so
 * the decay reaches -60dB, i.e. 1/1000, by the end of the 200ms
 * window: tau = decaySamples / ln(1000)), repeated 4x evenly spaced
 * (one hit every 500ms) over a 2-second buffer. Exercises the
 * limiter's look-ahead/attack/release behavior on isolated transient
 * peaks, as opposed to the sweep's continuous signal. */
export function drumTransient(rate: number): Float32Array {
  const TOTAL_SECONDS = 2;
  const HITS = 4;
  const CLICK_MS = 10;
  const DECAY_MS = 200;

  const n = Math.round(TOTAL_SECONDS * rate);
  const out = new Float32Array(n);

  const periodSamples = Math.round((TOTAL_SECONDS / HITS) * rate);
  const clickSamples = Math.round((CLICK_MS / 1000) * rate);
  const decaySamples = Math.round((DECAY_MS / 1000) * rate);
  const tau = decaySamples / Math.log(1000);

  for (let hit = 0; hit < HITS; hit++) {
    const start = hit * periodSamples;

    for (let j = 0; j < clickSamples && start + j < n; j++) {
      out[start + j] = j / clickSamples;
    }

    const decayStart = start + clickSamples;
    for (let j = 0; j < decaySamples && decayStart + j < n; j++) {
      out[decayStart + j] = Math.exp(-j / tau);
    }
  }

  return out;
}
