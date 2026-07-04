import { describe, it, expect } from 'vitest';
import { selectUpNext, fuseProgress, greetingFor } from '../upNext';

const row = (title: string, iso: string) =>
  ({ section: 'schedule', title, detail: null, event_at: iso });

describe('selectUpNext', () => {
  const now = new Date('2026-07-09T20:00:00Z');
  it('picks the earliest upcoming schedule row', () => {
    const rows = [row('Late', '2026-07-09T23:00:00Z'), row('Soon', '2026-07-09T21:00:00Z')];
    expect(selectUpNext(rows, now)?.title).toBe('Soon');
  });
  it('keeps an event that started <30 min ago', () => {
    expect(selectUpNext([row('Started', '2026-07-09T19:45:00Z')], now)?.title).toBe('Started');
  });
  it('drops events older than 30 min and non-schedule rows', () => {
    const rows = [row('Old', '2026-07-09T19:00:00Z'),
      { section: 'announcement', title: 'A', detail: null, event_at: '2026-07-09T21:00:00Z' }];
    expect(selectUpNext(rows, now)).toBeNull();
  });
});

describe('fuseProgress', () => {
  const at = new Date('2026-07-09T21:00:00Z');
  it('is 1 outside the window, 0 at start, 0.5 halfway', () => {
    expect(fuseProgress(at, new Date('2026-07-09T18:00:00Z'))).toBe(1);
    expect(fuseProgress(at, at)).toBe(0);
    expect(fuseProgress(at, new Date('2026-07-09T20:00:00Z'))).toBeCloseTo(0.5);
  });
});

describe('greetingFor', () => {
  it('morning/afternoon/evening by hour', () => {
    expect(greetingFor(8, 'Amara')).toBe('Morning, Amara');
    expect(greetingFor(14, 'Amara')).toBe('Afternoon, Amara');
    expect(greetingFor(20, 'Amara')).toBe('Evening, Amara');
  });
});
