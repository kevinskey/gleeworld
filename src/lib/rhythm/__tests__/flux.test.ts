import { describe, it, expect } from 'vitest';
import { frameEnergies, fluxPeaks } from '../onsets/flux';

function impulseTrain(sampleRate: number, seconds: number, onsetsSec: number[], noise = 0): Float32Array {
  const buf = new Float32Array(Math.round(sampleRate * seconds));
  for (let i = 0; i < buf.length; i++) buf[i] = ((Math.sin(i * 12.9898) * 43758.5453) % 1) * noise;
  for (const t of onsetsSec) {
    const at = Math.round(t * sampleRate);
    for (let i = 0; i < 220; i++) if (at + i < buf.length) buf[at + i] += (1 - i / 220) * (i % 2 ? -0.9 : 0.9);
  }
  return buf;
}

describe('onset core', () => {
  const SR = 48000, FRAME = 512, HOP = 512;
  it('detects clean impulse train within one frame of truth', () => {
    const truth = [0.10, 0.55, 1.00, 1.45];
    const energies = frameEnergies(impulseTrain(SR, 2, truth), FRAME, HOP);
    const peaks = fluxPeaks(energies, { refractoryFrames: 8, floorAlpha: 0.99, ratio: 4 });
    expect(peaks).toHaveLength(4);
    peaks.forEach((f, i) => expect(Math.abs((f * HOP) / SR - truth[i])).toBeLessThan(0.015));
  });
  it('refractory suppresses double-triggers', () => {
    const energies = frameEnergies(impulseTrain(SR, 1, [0.3, 0.31]), FRAME, HOP);
    const peaks = fluxPeaks(energies, { refractoryFrames: 8, floorAlpha: 0.99, ratio: 4 });
    expect(peaks).toHaveLength(1);
  });
  it('survives noise floor', () => {
    const truth = [0.25, 0.75];
    const energies = frameEnergies(impulseTrain(SR, 1.2, truth, 0.02), FRAME, HOP);
    const peaks = fluxPeaks(energies, { refractoryFrames: 8, floorAlpha: 0.99, ratio: 4 });
    expect(peaks).toHaveLength(2);
  });
});
