import { describe, it, expect } from 'vitest';
import {
  automationValueAt, sortAutomationPoints, type AutomationPoint,
} from '../automation';

const P = (t: number, v: number, curve: AutomationPoint['curve'] = 'linear'): AutomationPoint =>
  ({ time_seconds: t, value: v, curve });

describe('automationValueAt', () => {
  it('returns undefined for an empty points list', () => {
    expect(automationValueAt([], 5)).toBeUndefined();
  });

  it('clamps to the first point value for times at or before the first point', () => {
    const pts = [P(2, -6), P(4, 0)];
    expect(automationValueAt(pts, 0)).toBe(-6);
    expect(automationValueAt(pts, 2)).toBe(-6);
  });

  it('clamps to the last point value for times at or after the last point', () => {
    const pts = [P(2, -6), P(4, 0)];
    expect(automationValueAt(pts, 4)).toBe(0);
    expect(automationValueAt(pts, 10)).toBe(0);
  });

  it('linearly interpolates between two points', () => {
    const pts = [P(0, 0), P(2, 10, 'linear')];
    expect(automationValueAt(pts, 0)).toBe(0);
    expect(automationValueAt(pts, 1)).toBeCloseTo(5, 6);
    expect(automationValueAt(pts, 2)).toBe(10);
  });

  it('holds the previous value up to the next point when curve is "hold"', () => {
    const pts = [P(0, -6), P(2, 0, 'hold')];
    expect(automationValueAt(pts, 0.5)).toBe(-6);
    expect(automationValueAt(pts, 1.9)).toBe(-6);
    expect(automationValueAt(pts, 2)).toBe(0); // exact hit uses the point's value
  });

  it('exponentially interpolates between two positive points', () => {
    const pts = [P(0, 1), P(2, 4, 'exponential')];
    // Halfway: 1 * (4/1)^0.5 = 2
    expect(automationValueAt(pts, 1)).toBeCloseTo(2, 6);
  });

  it('falls back to linear when an exponential pair crosses zero', () => {
    const pts = [P(0, 0), P(2, 4, 'exponential')];
    expect(automationValueAt(pts, 1)).toBeCloseTo(2, 6); // linear midpoint
  });

  it('handles a three-point ramp+hold+ramp curve', () => {
    // Ramp 0->10 (linear), hold at 10, then ramp 10->0 (linear).
    const pts = [
      P(0, 0),
      P(2, 10, 'linear'),
      P(4, 10, 'hold'),
      P(6, 0, 'linear'),
    ];
    expect(automationValueAt(pts, 1)).toBeCloseTo(5, 6);
    expect(automationValueAt(pts, 3)).toBe(10); // held through the hold segment
    expect(automationValueAt(pts, 5)).toBeCloseTo(5, 6); // ramp back down
  });

  it('tolerates unordered input by sorting internally', () => {
    const pts = [P(4, 0), P(0, -6), P(2, -3)];
    expect(automationValueAt(pts, 1)).toBeCloseTo(-4.5, 6);
    expect(automationValueAt(pts, 3)).toBeCloseTo(-1.5, 6);
  });

  it('returns the next point value when two points share a time (degenerate span)', () => {
    // Guards the divide-by-zero branch inside interpolate.
    const pts = [P(2, -6), P(2, 3, 'linear')];
    expect(automationValueAt(pts, 2)).toBe(-6); // clamps to first via at<=first branch
    expect(automationValueAt(pts, 2.0001)).toBe(3);
  });
});

describe('sortAutomationPoints', () => {
  it('does not mutate the input array', () => {
    const pts = [P(4, 0), P(0, -6)];
    const sorted = sortAutomationPoints(pts);
    expect(pts.map((p) => p.time_seconds)).toEqual([4, 0]);
    expect(sorted.map((p) => p.time_seconds)).toEqual([0, 4]);
  });

  it('is stable for equal times', () => {
    const a = P(2, 1);
    const b = P(2, 2);
    const sorted = sortAutomationPoints([a, b]);
    expect(sorted).toEqual([a, b]);
  });
});
