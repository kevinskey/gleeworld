// A4 = MIDI 69 = 440 Hz. Fractional MIDI keeps cents information alive; callers
// that want a note name round at the last moment.
const A4_HZ = 440;
const A4_MIDI = 69;

export function hzToMidi(hz: number): number {
  if (!(hz > 0)) return NaN;            // log2(0) is -Infinity; NaN is honest
  return A4_MIDI + 12 * Math.log2(hz / A4_HZ);
}

export function midiToHz(midi: number): number {
  return A4_HZ * Math.pow(2, (midi - A4_MIDI) / 12);
}

export function centsOff(hz: number, targetMidi: number): number {
  return (hzToMidi(hz) - targetMidi) * 100;
}

export function nearestMidi(hz: number): number {
  return Math.round(hzToMidi(hz));
}

// McLeod Pitch Method. The normalized square difference function peaks at the
// true period rather than at its multiples, which is why a sung vowel (rich in
// harmonics) doesn't get reported an octave low the way plain autocorrelation
// reports it.
const CLARITY_FLOOR = 0.8;   // below this we say "no note" rather than guess
const MIN_HZ = 70;           // below a bass low-D; anything lower is rumble
const MAX_HZ = 1200;         // above a soprano high-D; anything higher is noise

export function detectPitch(buf: Float32Array, sampleRate: number): { hz: number; clarity: number } {
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
  if (bestLag < 0 || bestVal < 0.5) return { hz: 0, clarity: 0 };

  // Parabolic interpolation around the peak — without this the resolution is
  // quantized to whole samples, which is ~30 cents at the top of the range.
  const y0 = nsdf[bestLag - 1], y1 = nsdf[bestLag], y2 = nsdf[bestLag + 1];
  const denom = 2 * (2 * y1 - y0 - y2);
  const shift = denom !== 0 ? (y2 - y0) / denom : 0;
  const hz = sampleRate / (bestLag + shift);

  if (hz < MIN_HZ || hz > MAX_HZ) return { hz: 0, clarity: 0 };
  return { hz, clarity: bestVal };
}
