// Hero text fluid sizing: the auto-derived mobile floor must stay
// phone-fittable no matter how large the desktop size is (the corner
// resize handle makes 160px trivial to reach; 55% of that as a clamp
// MINIMUM overflowed 390px viewports — 2026-07-31 mobile regression).
import { describe, it, expect } from 'vitest';
import { fluidPx } from '../hero';

describe('fluidPx', () => {
  it('keeps the classic 55% floor for typical sizes', () => {
    expect(fluidPx(60)).toBe('clamp(33px, 5.00cqw, 60px)');
  });

  it('caps the auto mobile floor at 40px for huge desktop sizes', () => {
    expect(fluidPx(160)).toBe('clamp(40px, 13.33cqw, 160px)');
    expect(fluidPx(100)).toBe('clamp(40px, 8.33cqw, 100px)');
  });

  it('honors an explicit mobile size as-is', () => {
    expect(fluidPx(160, 60)).toBe('clamp(60px, 13.33cqw, 160px)');
  });

  it('never lets the floor exceed the desktop size', () => {
    expect(fluidPx(20, 60)).toBe('clamp(20px, 1.67cqw, 20px)');
  });

  // ── The h1 floor ─────────────────────────────────────────────────────────
  // Measured on a live tenant at a 386px container: h1 23px, hero spans 30px,
  // section h2 24px. The page's largest heading rendered SMALLER than the
  // headings beneath it, because the auto floor is 55% of desktop and
  // round(42 * 0.55) = 23. The floor is opt-in per call site so the
  // subheadline and CTA buttons, which share fluidPx, keep their own scale.
  const H1_FLOOR = 28;

  it('lifts a mid-size headline above the 24px h2 baseline', () => {
    // The exact reported case: 23px floor -> 28px.
    expect(fluidPx(42, undefined, H1_FLOOR)).toBe('clamp(28px, 3.50cqw, 42px)');
  });

  it('leaves headlines that already clear the baseline untouched', () => {
    expect(fluidPx(60, undefined, H1_FLOOR)).toBe('clamp(33px, 5.00cqw, 60px)');
    expect(fluidPx(160, undefined, H1_FLOOR)).toBe('clamp(40px, 13.33cqw, 160px)');
  });

  it('floors an explicit mobile size a tenant set too small', () => {
    // A stored headlineSizeMobile of 12 would otherwise reinstate the
    // inversion. Floored at render time rather than by tightening the zod
    // minimum, which would reject already-stored tenant configs.
    expect(fluidPx(60, 12, H1_FLOOR)).toBe('clamp(28px, 5.00cqw, 60px)');
  });

  it('still never lets the floor exceed a deliberately tiny headline', () => {
    // A 20px headline is a deliberate choice; the floor must not inflate it
    // to 28 and produce clamp(28px, ..., 20px).
    expect(fluidPx(20, undefined, H1_FLOOR)).toBe('clamp(20px, 1.67cqw, 20px)');
  });

  it('does not touch the shared default used by buttons and subheadline', () => {
    expect(fluidPx(18)).toBe('clamp(14px, 1.50cqw, 18px)');
    expect(fluidPx(22)).toBe('clamp(14px, 1.83cqw, 22px)');
  });
});
