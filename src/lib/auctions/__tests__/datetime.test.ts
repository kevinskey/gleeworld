import { describe, expect, it } from 'vitest';
import { fromLocalInput, toLocalInput } from '../datetime';

describe('toLocalInput', () => {
  it('renders a timestamp as a datetime-local value', () => {
    // Built from local parts so the expectation holds in any timezone.
    const d = new Date(2026, 8, 14, 10, 30);
    expect(toLocalInput(d.toISOString())).toBe('2026-09-14T10:30');
  });

  it('renders nothing for null or unparseable input', () => {
    expect(toLocalInput(null)).toBe('');
    expect(toLocalInput('nonsense')).toBe('');
  });
});

describe('fromLocalInput', () => {
  it('returns null for an empty field', () => {
    expect(fromLocalInput('')).toBeNull();
    expect(fromLocalInput('   ')).toBeNull();
  });

  it('returns null for an unparseable value rather than an Invalid Date', () => {
    expect(fromLocalInput('nonsense')).toBeNull();
  });

  it('produces a UTC ISO string', () => {
    const iso = fromLocalInput('2026-09-14T10:30');
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('round-trips through the local input format unchanged', () => {
    const value = '2026-09-14T10:30';
    expect(toLocalInput(fromLocalInput(value))).toBe(value);
  });

  it('round-trips a date on the other side of a DST boundary', () => {
    const value = '2026-01-20T23:45';
    expect(toLocalInput(fromLocalInput(value))).toBe(value);
  });
});
