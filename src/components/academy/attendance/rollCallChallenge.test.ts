import { describe, it, expect } from 'vitest';
import {
  ROLL_CALL_SYMBOLS, ROTATION_SECONDS, slotForTime, clockOffsetMs,
  parseSchedule, symbolIndexAt, secondsRemainingInSlot, deriveCardStatus,
} from './rollCallChallenge';

describe('rollCallChallenge', () => {
  it('has exactly 8 distinct symbols', () => {
    expect(ROLL_CALL_SYMBOLS).toHaveLength(8);
    expect(new Set(ROLL_CALL_SYMBOLS).size).toBe(8);
  });

  it('slotForTime matches floor(epochSeconds/30)', () => {
    expect(slotForTime(0)).toBe(0);
    expect(slotForTime(29_999)).toBe(0);
    expect(slotForTime(30_000)).toBe(1);
    expect(slotForTime(1_754_000_000_000)).toBe(Math.floor(1_754_000_000 / ROTATION_SECONDS));
  });

  it('clockOffsetMs is server minus client', () => {
    const client = Date.UTC(2026, 7, 2, 12, 0, 0);
    expect(clockOffsetMs('2026-08-02T12:00:05.000Z', client)).toBe(5000);
    expect(clockOffsetMs('2026-08-02T11:59:55.000Z', client)).toBe(-5000);
  });

  it('parseSchedule accepts the RPC payload and rejects junk', () => {
    const ok = parseSchedule({
      success: true, first_slot: 100, slots: [1, 2, 3],
      interval_seconds: 30, server_now: '2026-08-02T12:00:00Z', closes_at: '2026-08-02T14:00:00Z',
    });
    expect(ok).toEqual({
      firstSlot: 100, slots: [1, 2, 3], intervalSeconds: 30,
      serverNow: '2026-08-02T12:00:00Z', closesAt: '2026-08-02T14:00:00Z',
    });
    expect(parseSchedule(null)).toBeNull();
    expect(parseSchedule({ success: false, error: 'NOT_AUTHORIZED' })).toBeNull();
    expect(parseSchedule({ success: true, slots: 'nope' })).toBeNull();
  });

  it('symbolIndexAt indexes by absolute slot and returns null out of range', () => {
    const schedule = {
      firstSlot: 100, slots: [5, 6, 7], intervalSeconds: 30,
      serverNow: '', closesAt: '',
    };
    expect(symbolIndexAt(schedule, 100 * 30_000)).toBe(5);
    expect(symbolIndexAt(schedule, 102 * 30_000 + 29_999)).toBe(7);
    expect(symbolIndexAt(schedule, 99 * 30_000)).toBeNull();
    expect(symbolIndexAt(schedule, 103 * 30_000)).toBeNull();
  });

  it('secondsRemainingInSlot counts down within the 30s window', () => {
    expect(secondsRemainingInSlot(100 * 30_000)).toBe(30);
    expect(secondsRemainingInSlot(100 * 30_000 + 29_000)).toBe(1);
  });

  it('deriveCardStatus maps server state to card status', () => {
    expect(deriveCardStatus({ checked_in: true, status: 'present', locked: false })).toBe('present');
    expect(deriveCardStatus({ checked_in: true, status: 'late', locked: false })).toBe('late');
    expect(deriveCardStatus({ checked_in: false, status: null, locked: true })).toBe('locked');
    expect(deriveCardStatus({ checked_in: false, status: null, locked: false })).toBe('ready');
    // checked_in wins over locked (they succeeded eventually)
    expect(deriveCardStatus({ checked_in: true, status: 'present', locked: true })).toBe('present');
  });
});
