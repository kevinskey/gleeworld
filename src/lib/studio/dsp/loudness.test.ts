import { describe, it, expect } from 'vitest';
import { meanSquare, blockLoudness, integratedLoudness, shortTermSeries } from './loudness';

describe('meanSquare', () => {
  it('computes the mean of squared samples', () => {
    const samples = new Float32Array([1, -1, 1, -1]);
    expect(meanSquare(samples)).toBeCloseTo(1, 6);
  });

  it('is 0 for silence', () => {
    const samples = new Float32Array([0, 0, 0, 0]);
    expect(meanSquare(samples)).toBe(0);
  });

  it('handles a full-scale sine (rms 1/sqrt(2), ms 0.5)', () => {
    const n = 4800;
    const samples = new Float32Array(n);
    for (let i = 0; i < n; i++) samples[i] = Math.sin((2 * Math.PI * 1000 * i) / 48000);
    expect(meanSquare(samples)).toBeCloseTo(0.5, 2);
  });
});

describe('blockLoudness', () => {
  it('a full-scale sine stereo block (ms=0.5 per channel) is ≈ -0.691 LUFS', () => {
    // Two channels each contributing mean-square 0.5 sum to z=1.0 (Gi=1 for L/R).
    const lk = blockLoudness([0.5, 0.5]);
    expect(lk).toBeCloseTo(-0.691, 3);
  });

  it('matches the -0.691 + 10*log10(z) formula for an arbitrary single channel', () => {
    const lk = blockLoudness([0.25]);
    expect(lk).toBeCloseTo(-0.691 + 10 * Math.log10(0.25), 6);
  });

  it('is -Infinity for total silence', () => {
    expect(blockLoudness([0, 0])).toBe(-Infinity);
  });
});

describe('integratedLoudness', () => {
  it('gates out all-silent blocks (-90 LUFS) entirely -> -Infinity', () => {
    const n = 20;
    const blockLoudnesses = new Array(n).fill(-90);
    const blockPowers = new Array(n).fill(Math.pow(10, (-90 + 0.691) / 10));
    expect(integratedLoudness(blockLoudnesses, blockPowers)).toBe(-Infinity);
  });

  it('uniform -20 LUFS blocks -> integrated ≈ -20', () => {
    const n = 20;
    const power = Math.pow(10, (-20 + 0.691) / 10);
    const blockLoudnesses = new Array(n).fill(-20);
    const blockPowers = new Array(n).fill(power);
    const result = integratedLoudness(blockLoudnesses, blockPowers);
    expect(result).toBeCloseTo(-20, 2);
  });

  it('a mix of -20 and -40 LUFS blocks: the -40 blocks fall below the relative gate, result ≈ -20', () => {
    const n = 20;
    const powerLoud = Math.pow(10, (-20 + 0.691) / 10);
    const powerQuiet = Math.pow(10, (-40 + 0.691) / 10);
    const blockLoudnesses = [
      ...new Array(n).fill(-20),
      ...new Array(n).fill(-40),
    ];
    const blockPowers = [
      ...new Array(n).fill(powerLoud),
      ...new Array(n).fill(powerQuiet),
    ];
    const result = integratedLoudness(blockLoudnesses, blockPowers);
    expect(result).toBeCloseTo(-20, 1);
  });
});

describe('shortTermSeries', () => {
  it('returns one LUFS value per sliding window step, power-averaged', () => {
    const power = Math.pow(10, (-23 + 0.691) / 10);
    const blockPowers = new Array(10).fill(power);
    const series = shortTermSeries(blockPowers, 3);
    // 10 blocks, window of 3 -> 8 windows
    expect(series.length).toBe(8);
    for (const v of series) expect(v).toBeCloseTo(-23, 2);
  });

  it('is empty when there are fewer blocks than the window size', () => {
    const series = shortTermSeries([1, 2], 3);
    expect(series.length).toBe(0);
  });
});
