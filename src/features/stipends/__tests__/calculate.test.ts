import { describe, it, expect } from 'vitest';
import { DEFAULT_STATUS_WEIGHTS } from '../policy';
import { calculateStanding } from '../calculate';

const marks = (...statuses: string[]) =>
  statuses.map((status, i) => ({ eventId: `e${i}`, status }));

describe('calculateStanding', () => {
  it('pays the full stipend for perfect attendance', () => {
    const r = calculateStanding({
      baseAmount: 500,
      requiredServices: 20,
      marks: marks(...Array(20).fill('present')),
      weights: DEFAULT_STATUS_WEIGHTS,
    });
    expect(r.earned).toBe(500);
    expect(r.forfeited).toBe(0);
    expect(r.perServiceValue).toBe(25);
  });

  it('deducts one service share per absence', () => {
    const r = calculateStanding({
      baseAmount: 500,
      requiredServices: 20,
      marks: marks(...Array(18).fill('present'), 'absent', 'absent'),
      weights: DEFAULT_STATUS_WEIGHTS,
    });
    expect(r.creditedServices).toBe(18);
    expect(r.absences).toBe(2);
    expect(r.earned).toBe(450);
    expect(r.forfeited).toBe(50);
  });

  it('gives late arrivals half credit', () => {
    const r = calculateStanding({
      baseAmount: 500,
      requiredServices: 20,
      marks: marks(...Array(19).fill('present'), 'late'),
      weights: DEFAULT_STATUS_WEIGHTS,
    });
    expect(r.creditedServices).toBe(19.5);
    expect(r.earned).toBe(487.5);
  });

  it('treats tardy the same as late', () => {
    const r = calculateStanding({
      baseAmount: 500,
      requiredServices: 20,
      marks: marks('tardy'),
      weights: DEFAULT_STATUS_WEIGHTS,
    });
    expect(r.creditedServices).toBe(0.5);
  });

  it('holds approved excuses harmless by default', () => {
    const r = calculateStanding({
      baseAmount: 500,
      requiredServices: 20,
      marks: marks(...Array(19).fill('present'), 'excused'),
      weights: DEFAULT_STATUS_WEIGHTS,
    });
    expect(r.earned).toBe(500);
    expect(r.absences).toBe(0);
  });

  it('rounds to cents', () => {
    const r = calculateStanding({
      baseAmount: 500,
      requiredServices: 3,
      marks: marks('present', 'present'),
      weights: DEFAULT_STATUS_WEIGHTS,
    });
    expect(r.earned).toBe(333.33);
  });

  it('rounds to whole dollars when the policy says so', () => {
    const r = calculateStanding({
      baseAmount: 500,
      requiredServices: 3,
      marks: marks('present', 'present'),
      weights: DEFAULT_STATUS_WEIGHTS,
      rounding: 'dollar',
    });
    expect(r.earned).toBe(333);
  });

  it('clamps at the full stipend when a student attends extra services', () => {
    const r = calculateStanding({
      baseAmount: 500,
      requiredServices: 20,
      marks: marks(...Array(22).fill('present')),
      weights: DEFAULT_STATUS_WEIGHTS,
    });
    expect(r.earned).toBe(500);
    expect(r.forfeited).toBe(0);
  });

  it('pays nothing when every service is missed', () => {
    const r = calculateStanding({
      baseAmount: 500,
      requiredServices: 20,
      marks: marks(...Array(20).fill('absent')),
      weights: DEFAULT_STATUS_WEIGHTS,
    });
    expect(r.earned).toBe(0);
    expect(r.forfeited).toBe(500);
  });

  it('counts an unmapped status as zero credit and flags it', () => {
    const r = calculateStanding({
      baseAmount: 500,
      requiredServices: 20,
      marks: marks('present', 'sabbatical'),
      weights: DEFAULT_STATUS_WEIGHTS,
    });
    expect(r.creditedServices).toBe(1);
    expect(r.unmappedCount).toBe(1);
    expect(r.absences).toBe(0);
  });

  it('returns a zeroed standing rather than dividing by zero', () => {
    const r = calculateStanding({
      baseAmount: 500,
      requiredServices: 0,
      marks: marks('present'),
      weights: DEFAULT_STATUS_WEIGHTS,
    });
    expect(r.earned).toBe(0);
    expect(r.perServiceValue).toBe(0);
  });
});
