import { describe, expect, it } from 'vitest';
import { layoutTimeline, minutesIntoDay, snapMinutes, wouldConflict } from '../timeBlocks';

const item = (id: string, hour: number, minutes: number, min = 0) => ({
  id, kind: 'task' as const, label: id,
  startIso: `2026-07-11T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`,
  minutes,
});

describe('minutesIntoDay / snapMinutes', () => {
  it('measures from the 7am timeline start', () => {
    expect(minutesIntoDay('2026-07-11T07:00:00')).toBe(0);
    expect(minutesIntoDay('2026-07-11T09:30:00')).toBe(150);
  });
  it('snaps to the half-hour grid', () => {
    expect(snapMinutes(44)).toBe(30);
    expect(snapMinutes(46)).toBe(60);
  });
});

describe('layoutTimeline', () => {
  it('non-overlapping items each get full width', () => {
    const out = layoutTimeline([item('a', 8, 60), item('b', 10, 30)]);
    expect(out.every((i) => i.columns === 1 && !i.conflicted)).toBe(true);
  });

  it('overlapping items split into columns and flag conflict', () => {
    const out = layoutTimeline([item('a', 9, 60), item('b', 9, 60, 30)]);
    const a = out.find((i) => i.id === 'a')!;
    const b = out.find((i) => i.id === 'b')!;
    expect(a.columns).toBe(2);
    expect(b.columns).toBe(2);
    expect(a.column).not.toBe(b.column);
    expect(a.conflicted && b.conflicted).toBe(true);
  });

  it('a later item reuses a freed column', () => {
    const out = layoutTimeline([item('a', 9, 30), item('b', 9, 120, 15), item('c', 10, 30)]);
    const c = out.find((i) => i.id === 'c')!;
    expect(c.column).toBe(0); // a's column ended at 9:30
  });
});

describe('wouldConflict', () => {
  const items = [item('a', 9, 60)];
  it('detects overlap and respects ignoreId', () => {
    expect(wouldConflict(items, '2026-07-11T09:30:00', 30)).toBe(true);
    expect(wouldConflict(items, '2026-07-11T10:00:00', 30)).toBe(false);
    expect(wouldConflict(items, '2026-07-11T09:30:00', 30, 'a')).toBe(false);
  });
});
