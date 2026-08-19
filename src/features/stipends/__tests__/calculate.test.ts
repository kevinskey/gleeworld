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

  it('gives half credit for a check-in that was never scanned out', () => {
    // QR check-in writes 'in_rehearsal'; only a checkout scan upgrades it to
    // 'present'. The student was there, so this must not score zero.
    const r = calculateStanding({
      baseAmount: 500,
      requiredServices: 20,
      marks: marks(...Array(19).fill('present'), 'in_rehearsal'),
      weights: DEFAULT_STATUS_WEIGHTS,
    });
    expect(r.creditedServices).toBe(19.5);
    expect(r.absences).toBe(0);
    expect(r.unmappedCount).toBe(0);
    expect(r.earned).toBe(487.5);
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

  it('scores an unmarked service as zero, apart from a marked absence', () => {
    const r = calculateStanding({
      baseAmount: 500,
      requiredServices: 20,
      marks: marks(...Array(18).fill('present')),
      unmarkedUnits: 2,
      weights: DEFAULT_STATUS_WEIGHTS,
    });
    // Matches the view: unmarked adds nothing to credit and is reported apart
    // from absences, which count only a status that was actually recorded.
    expect(r.creditedServices).toBe(18);
    expect(r.unmarkedCount).toBe(2);
    expect(r.absences).toBe(0);
    expect(r.earned).toBe(450);
  });

  it('reports the shortfall when roll was never taken at some services', () => {
    // 15 services recorded against a 20-service requirement: a scholar present
    // at every one of them still cannot earn the full stipend, and the reason
    // is the calendar, not the student.
    const r = calculateStanding({
      baseAmount: 500,
      requiredServices: 20,
      marks: marks(...Array(15).fill('present')),
      uncoveredUnits: 10,
      weights: DEFAULT_STATUS_WEIGHTS,
    });
    expect(r.creditedServices).toBe(15);
    expect(r.absences).toBe(0);
    expect(r.uncoveredUnits).toBe(10);
    expect(r.shortfallUnits).toBe(5);
    expect(r.earned).toBe(375);
    expect(r.forfeited).toBe(125);
  });

  it('reports no shortfall once the calendar covers the requirement', () => {
    const r = calculateStanding({
      baseAmount: 500,
      requiredServices: 20,
      marks: marks(...Array(25).fill('present')),
      weights: DEFAULT_STATUS_WEIGHTS,
    });
    expect(r.shortfallUnits).toBe(0);
    // Over-attendance is clamped to the base amount, never more.
    expect(r.earned).toBe(500);
    expect(r.forfeited).toBe(0);
  });
});
