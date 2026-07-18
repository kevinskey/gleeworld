import { describe, it, expect } from 'vitest';
import { format } from 'date-fns';
import { hasParsableEventAt } from './eventAt';

describe('hasParsableEventAt', () => {
  it('accepts a well-formed ISO timestamp', () => {
    expect(hasParsableEventAt('2026-07-18T09:30:00Z')).toBe(true);
  });

  it('rejects an unparseable event_at', () => {
    expect(hasParsableEventAt('not-a-date')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(hasParsableEventAt('')).toBe(false);
  });

  it('documents the hazard: date-fns v4 throws on the value this guard rejects', () => {
    // This is the exact call the up_next/today cards make. Confirms the
    // guard is filtering out precisely the input that would crash format().
    expect(() => format(new Date('not-a-date'), 'h:mm a')).toThrow(RangeError);
  });
});
