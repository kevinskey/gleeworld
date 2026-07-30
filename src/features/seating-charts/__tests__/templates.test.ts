import { describe, it, expect } from 'vitest';
import { ALL_TEMPLATES, generateTemplate, getTemplate } from '../templates';

describe('seating-chart templates', () => {
  it('registers all 34 catalog entries', () => {
    // 9 choir + 6 band + 5 orchestra + 4 other + 9 classroom + 1 custom = 34
    expect(ALL_TEMPLATES).toHaveLength(34);
  });

  it('every template key is unique', () => {
    const keys = ALL_TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every template produces objects within a reasonable canvas margin', () => {
    // Users can pan + zoom, so we allow a generous margin. The intent is to
    // catch grossly-off templates (10× larger than the canvas), not to enforce
    // pixel-perfect fits.
    const MARGIN = 200;
    for (const t of ALL_TEMPLATES) {
      const spec = t.generate();
      expect(spec.objects.length).toBeGreaterThan(0);
      for (const o of spec.objects) {
        expect(Number(o.x)).toBeGreaterThanOrEqual(-MARGIN);
        expect(Number(o.y)).toBeGreaterThanOrEqual(-MARGIN);
        expect(Number(o.x) + Number(o.width)).toBeLessThanOrEqual(spec.canvas_width + MARGIN);
        expect(Number(o.y) + Number(o.height)).toBeLessThanOrEqual(spec.canvas_height + MARGIN);
      }
    }
  });

  it('generateTemplate returns null for unknown keys', () => {
    expect(generateTemplate('nope')).toBeNull();
  });

  it('classroom templates include a teacher desk + smartboard', () => {
    const desks = getTemplate('class_rows')!.generate();
    expect(desks.objects.some((o) => o.subtype === 'teacher')).toBe(true);
    expect(desks.objects.some((o) => o.subtype === 'smartboard')).toBe(true);
  });

  it('SATB sectional has 4 rows of 12 riser slots (48 total)', () => {
    const spec = getTemplate('choir_satb_sectional')!.generate();
    const slots = spec.objects.filter((o) => o.object_type === 'riser_slot');
    expect(slots).toHaveLength(48);
  });
});
