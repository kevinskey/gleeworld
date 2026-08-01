// Hero text fluid sizing: the auto-derived mobile floor must stay
// phone-fittable no matter how large the desktop size is (the corner
// resize handle makes 160px trivial to reach; 55% of that as a clamp
// MINIMUM overflowed 390px viewports — 2026-07-31 mobile regression).
import { describe, it, expect } from 'vitest';
import { fluidPx } from '../hero';

describe('fluidPx', () => {
  it('keeps the classic 55% floor for typical sizes', () => {
    expect(fluidPx(60)).toBe('clamp(33px, 5.00vw, 60px)');
  });

  it('caps the auto mobile floor at 40px for huge desktop sizes', () => {
    expect(fluidPx(160)).toBe('clamp(40px, 13.33vw, 160px)');
    expect(fluidPx(100)).toBe('clamp(40px, 8.33vw, 100px)');
  });

  it('honors an explicit mobile size as-is', () => {
    expect(fluidPx(160, 60)).toBe('clamp(60px, 13.33vw, 160px)');
  });

  it('never lets the floor exceed the desktop size', () => {
    expect(fluidPx(20, 60)).toBe('clamp(20px, 1.67vw, 20px)');
  });
});
