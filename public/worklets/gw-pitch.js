// gw-pitch.js — AudioWorkletProcessor running the McLeod Pitch Method (MPM)
// pitch detector on the audio thread.
//
// KEEP IN SYNC WITH src/lib/sightReading/pitch.ts — this file is a
// standalone-JS duplicate of that module's `detectPitch` (AudioWorklet
// processors run in their own global scope and cannot `import` from src/ or
// bundle app modules, so the algorithm is duplicated here verbatim, with TS
// types stripped). src/lib/sightReading/pitch.ts is the AUTHORITATIVE
// version — it is the one covered by tests (pitch.test.ts). Any change to
// the algorithm there — most importantly the fix that computes `nsdf`
// starting at lag 1 (not `minLag`), so that `nsdf[minLag - 1]` is always a
// real sample rather than an uninitialized phantom zero (a phantom zero
// there reads as a false peak and makes low notes, e.g. a 98 Hz bass note,
// get rejected as out-of-range) — MUST be mirrored here, and vice versa.

const CLARITY_FLOOR = 0.8;   // early-exit threshold: once a peak this clear is found, stop searching and take the earliest (octave-robustness)
const MIN_CLARITY = 0.5;     // accept gate: below this we report no note rather than guess
const MIN_HZ = 70;           // below a bass low-D; anything lower is rumble
const MAX_HZ = 1200;         // above a soprano high-D; anything higher is noise

function detectPitch(buf, sampleRate) {
  const n = buf.length;

  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / n);
  if (rms < 0.005) return { hz: 0, clarity: 0 };   // silence

  const maxLag = Math.min(n - 1, Math.floor(sampleRate / MIN_HZ));
  const minLag = Math.max(2, Math.floor(sampleRate / MAX_HZ));

  // Computed from lag 1, not minLag: nsdf[minLag - 1] must be a real sample,
  // not an uninitialized zero. For low notes minLag sits on the natural
  // downslope from the tau=0 peak (before the curve has dipped negative), and
  // comparing against a phantom zero there reads as a false peak — MPM then
  // locks onto a spurious high-frequency lag instead of the true low pitch.
  const nsdf = new Float32Array(maxLag + 1);
  for (let lag = 1; lag <= maxLag; lag++) {
    let acf = 0, div = 0;
    for (let i = 0; i + lag < n; i++) {
      acf += buf[i] * buf[i + lag];
      div += buf[i] * buf[i] + buf[i + lag] * buf[i + lag];
    }
    nsdf[lag] = div > 0 ? (2 * acf) / div : 0;
  }

  // First peak above the floor, not the global max: the global max can sit at a
  // multiple of the true period. Walk the curve from its true start (lag 1) so
  // dip-skipping sees real data, but only record a candidate once lag is inside
  // the MIN_HZ..MAX_HZ band we actually search.
  let bestLag = -1, bestVal = 0;
  let lag = 1;
  while (lag < maxLag && nsdf[lag] <= 0) lag++;          // skip the initial dip
  for (; lag < maxLag; lag++) {
    if (nsdf[lag] > nsdf[lag - 1] && nsdf[lag] >= nsdf[lag + 1]) {
      if (lag >= minLag && nsdf[lag] > bestVal) { bestVal = nsdf[lag]; bestLag = lag; }
      if (bestVal > CLARITY_FLOOR) break;                 // good enough, take the earliest
    }
  }
  if (bestLag < 0 || bestVal < MIN_CLARITY) return { hz: 0, clarity: 0 };

  // Parabolic interpolation around the peak — without this the resolution is
  // quantized to whole samples, which is ~30 cents at the top of the range.
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
        // `sampleRate` is a global in AudioWorkletGlobalScope. Never hardcode
        // 48000 — iOS and other devices pick their own, and resampling to a
        // fixed rate costs pitch-detection accuracy (cents).
        const { hz, clarity } = detectPitch(this._buf, sampleRate);
        this.port.postMessage({ hz, clarity, t: currentTime });
        this._filled = 0;
      }
    }
    return true;
  }
}

registerProcessor('gw-pitch', GwPitchProcessor);
