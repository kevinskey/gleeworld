// EBU R128 / BS.1770 gated-loudness math. Pure math only (no Web Audio /
// DOM) — operates on K-weighted mean-square ("power") values already
// filtered via kWeighting.ts. Reference implementation for the loudness
// meter (B1 Task 2); the gating algorithm here is the classic two-stage
// absolute + relative gate from BS.1770-4 / EBU Tech 3341-3342.
//
// IMPORTANT: the relative-gate re-mean MUST happen in the power domain
// (mean of linear mean-square values), never by averaging dB/LUFS values
// directly — averaging in the log domain is the textbook bug this
// algorithm is designed to avoid.

/** Mean of squared samples (a single channel's instantaneous power). */
export function meanSquare(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return sum / samples.length;
}

/** LK = -0.691 + 10*log10(Σ Gi*zi). `msPerChannel` is the per-channel
 * mean-square (z) for one gating block; channel gain Gi=1 for L/R (the
 * only channels B1 supports — surround Gi=1.41 is out of scope). Returns
 * -Infinity for total silence (log10(0)). */
export function blockLoudness(msPerChannel: number[]): number {
  const z = msPerChannel.reduce((sum, ms) => sum + ms, 0);
  if (z <= 0) return -Infinity;
  return -0.691 + 10 * Math.log10(z);
}

/** Convert a power-domain block-power (Σ Gi*zi) back to LUFS. */
function powerToLufs(power: number): number {
  if (power <= 0) return -Infinity;
  return -0.691 + 10 * Math.log10(power);
}

/** Power-domain mean of a set of block powers (NOT a dB/LUFS average). */
function powerMean(powers: number[]): number {
  if (powers.length === 0) return 0;
  return powers.reduce((sum, p) => sum + p, 0) / powers.length;
}

/** Integrated (gated) loudness per BS.1770-4 / EBU Tech 3341:
 * 1. Absolute gate: discard blocks at or below -70 LUFS.
 * 2. Relative gate: threshold = LUFS-of-(power-mean of absolute-gate
 *    survivors) - 10 LU; discard blocks at or below that threshold.
 * 3. Result = LUFS-of-(power-mean of relative-gate survivors).
 * Returns -Infinity if no blocks survive either gate (e.g. all-silent
 * program). `blockLoudnesses[i]` and `blockPowers[i]` must correspond to
 * the same block (LUFS value and its underlying Σ Gi*zi power). */
export function integratedLoudness(blockLoudnesses: number[], blockPowers: number[]): number {
  const absoluteSurvivorPowers: number[] = [];
  for (let i = 0; i < blockLoudnesses.length; i++) {
    if (blockLoudnesses[i] > -70) absoluteSurvivorPowers.push(blockPowers[i]);
  }
  if (absoluteSurvivorPowers.length === 0) return -Infinity;

  const relativeThreshold = powerToLufs(powerMean(absoluteSurvivorPowers)) - 10;

  const relativeSurvivorPowers: number[] = [];
  for (let i = 0; i < blockLoudnesses.length; i++) {
    if (blockLoudnesses[i] > -70 && blockLoudnesses[i] > relativeThreshold) {
      relativeSurvivorPowers.push(blockPowers[i]);
    }
  }
  if (relativeSurvivorPowers.length === 0) return -Infinity;

  return powerToLufs(powerMean(relativeSurvivorPowers));
}

/** Sliding-window power-mean converted to LUFS per step — used for both
 * Momentary (window = 4 x 100ms hops) and Short-term (window = 30 x
 * 100ms hops) metering, which are UNGATED (no absolute/relative gate
 * applied — that's only for Integrated). Returns one LUFS value per
 * valid window position (length = blockPowers.length - blocksPerWindow +
 * 1), or an empty array when there are fewer blocks than the window
 * size. */
export function shortTermSeries(blockPowers: number[], blocksPerWindow: number): number[] {
  const stepCount = blockPowers.length - blocksPerWindow + 1;
  if (stepCount <= 0) return [];

  const series: number[] = [];
  for (let i = 0; i < stepCount; i++) {
    const window = blockPowers.slice(i, i + blocksPerWindow);
    series.push(powerToLufs(powerMean(window)));
  }
  return series;
}
