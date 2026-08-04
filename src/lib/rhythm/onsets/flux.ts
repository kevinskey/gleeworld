// Pure onset-detection core: RMS frame energies + rising-edge peaks over an
// adaptive noise floor. The mic session (mic.ts) runs the same logic
// incrementally; this module exists so the algorithm is unit-testable.

export function frameEnergies(samples: Float32Array, frameSize: number, hop: number): number[] {
  const out: number[] = [];
  for (let start = 0; start + frameSize <= samples.length; start += hop) {
    let sum = 0;
    for (let i = 0; i < frameSize; i++) { const v = samples[start + i]; sum += v * v; }
    out.push(Math.sqrt(sum / frameSize));
  }
  return out;
}

// Rising-edge peaks over an adaptive floor. Returns frame indices. `armed`
// hysteresis (re-arm at half threshold) plus a refractory window kills the
// double-triggers a decaying clap tail would otherwise produce.
export function fluxPeaks(
  energies: number[],
  opts: { refractoryFrames: number; floorAlpha: number; ratio: number },
): number[] {
  const peaks: number[] = [];
  let floor = energies.length ? Math.max(energies[0], 1e-4) : 1e-4;
  let armed = true;
  let lastPeak = -Infinity;
  for (let i = 0; i < energies.length; i++) {
    const e = energies[i];
    const threshold = Math.max(floor * opts.ratio, 1e-3);
    if (armed && e > threshold && i - lastPeak >= opts.refractoryFrames) {
      peaks.push(i);
      lastPeak = i;
      armed = false;
    } else if (!armed && e < threshold * 0.5) {
      armed = true;
    }
    // Only adapt the floor on quiet frames so the clap itself doesn't raise it.
    if (e < threshold) floor = opts.floorAlpha * floor + (1 - opts.floorAlpha) * Math.max(e, 1e-4);
  }
  return peaks;
}
