import { describe, it, expect } from 'vitest';
import { ppmDecay, servoStep } from './mixerMath';

describe('ppmDecay', () => {
  it('releases 20dB over 1.7 seconds', () => {
    expect(ppmDecay(0, 1.7)).toBeCloseTo(-20, 5);
  });
  it('scales linearly with elapsed time', () => {
    expect(ppmDecay(-6, 0.85)).toBeCloseTo(-16, 5);
  });
  it('is a no-op for dt=0', () => {
    expect(ppmDecay(-12, 0)).toBe(-12);
  });
  it('passes -Infinity through unchanged (nothing to decay from silence)', () => {
    expect(ppmDecay(-Infinity, 1)).toBe(-Infinity);
  });
  it('passes NaN through unchanged', () => {
    expect(Number.isNaN(ppmDecay(NaN, 1))).toBe(true);
  });
});

describe('servoStep', () => {
  it('is a no-op when integrated loudness is at or below -70 LUFS', () => {
    expect(servoStep(2, -70, -14)).toBe(2);
    expect(servoStep(2, -90, -14)).toBe(2);
    expect(servoStep(-3.5, -71, -14)).toBe(-3.5);
  });
  it('clamps the per-tick step to ±0.5dB even for a large gap', () => {
    // integrated way below target -> would want a huge boost; step caps at +0.5
    expect(servoStep(0, -30, -14)).toBeCloseTo(0.5, 5);
    // integrated way above target -> would want a huge cut; step caps at -0.5
    expect(servoStep(0, 0, -14)).toBeCloseTo(-0.5, 5);
  });
  it('moves the full delta when within the ±0.5 step (converges smoothly)', () => {
    expect(servoStep(0, -14.3, -14)).toBeCloseTo(0.3, 5);
  });
  it('clamps total makeup gain to ±6dB from unity', () => {
    // Already near the ceiling, integrated still low -> would push past +6.
    expect(servoStep(5.8, -30, -14)).toBeCloseTo(6, 5);
    // Already near the floor, integrated still high -> would push past -6.
    expect(servoStep(-5.8, 0, -14)).toBeCloseTo(-6, 5);
  });
  it('is stable once it reaches the target (delta 0)', () => {
    expect(servoStep(1.5, -14, -14)).toBeCloseTo(1.5, 5);
  });
});
