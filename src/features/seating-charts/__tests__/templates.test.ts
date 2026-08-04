import { describe, it, expect } from 'vitest';
import {
  ALL_TEMPLATES, generateTemplate, getTemplate, templatesByCategory,
  CHOIR_TEMPLATES, BAND_TEMPLATES, ORCHESTRA_TEMPLATES,
  OTHER_MUSIC_TEMPLATES, CLASSROOM_TEMPLATES, STAGE_PLOT_TEMPLATES, CUSTOM_TEMPLATES,
} from '../templates';

describe('seating-chart templates', () => {
  it('registers every catalog entry (extensive template set)', () => {
    // Every category contributes at least the counts below. The test tracks a
    // floor, not a ceiling, so adding new templates never breaks the suite.
    expect(CHOIR_TEMPLATES.length).toBeGreaterThanOrEqual(18);
    expect(BAND_TEMPLATES.length).toBeGreaterThanOrEqual(14);
    expect(ORCHESTRA_TEMPLATES.length).toBeGreaterThanOrEqual(11);
    expect(OTHER_MUSIC_TEMPLATES.length).toBeGreaterThanOrEqual(12);
    expect(CLASSROOM_TEMPLATES.length).toBeGreaterThanOrEqual(17);
    expect(STAGE_PLOT_TEMPLATES.length).toBeGreaterThanOrEqual(7);
    expect(CUSTOM_TEMPLATES.length).toBeGreaterThanOrEqual(5);
    // Total is the sum of the parts.
    expect(ALL_TEMPLATES.length).toBe(
      CHOIR_TEMPLATES.length + BAND_TEMPLATES.length + ORCHESTRA_TEMPLATES.length
      + OTHER_MUSIC_TEMPLATES.length + CLASSROOM_TEMPLATES.length
      + STAGE_PLOT_TEMPLATES.length + CUSTOM_TEMPLATES.length,
    );
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
      expect(spec.objects.length, `template ${t.key} has no objects`).toBeGreaterThan(0);
      for (const o of spec.objects) {
        expect(Number(o.x), `${t.key} left`).toBeGreaterThanOrEqual(-MARGIN);
        expect(Number(o.y), `${t.key} top`).toBeGreaterThanOrEqual(-MARGIN);
        expect(Number(o.x) + Number(o.width), `${t.key} right`).toBeLessThanOrEqual(spec.canvas_width + MARGIN);
        expect(Number(o.y) + Number(o.height), `${t.key} bottom`).toBeLessThanOrEqual(spec.canvas_height + MARGIN);
      }
    }
  });

  it('generateTemplate returns null for unknown keys', () => {
    expect(generateTemplate('nope')).toBeNull();
  });

  it('classroom templates include a teacher desk + smartboard', () => {
    // Only "room-style" classroom templates advertise a teacher desk; the
    // rehearsal room deliberately omits the desk to reclaim wall space.
    const seedKeys = ['class_rows', 'class_pairs', 'class_pods', 'class_music_room'];
    for (const key of seedKeys) {
      const spec = getTemplate(key)!.generate();
      expect(spec.objects.some((o) => o.subtype === 'teacher'), `${key} teacher desk`).toBe(true);
      expect(spec.objects.some((o) => o.subtype === 'smartboard'), `${key} smartboard`).toBe(true);
    }
  });

  it('SATB sectional has 4 rows of 12 riser slots (48 total)', () => {
    const spec = getTemplate('choir_satb_sectional')!.generate();
    const slots = spec.objects.filter((o) => o.object_type === 'riser_slot');
    expect(slots).toHaveLength(48);
  });

  it('stage-plot templates all declare chart_mode = stage_plot', () => {
    for (const t of STAGE_PLOT_TEMPLATES) {
      expect(t.category).toBe('stage_plot');
      expect(t.generate().chart_mode).toBe('stage_plot');
    }
  });

  it('every template returns a spec whose category matches the registry', () => {
    for (const t of ALL_TEMPLATES) {
      const spec = t.generate();
      // All non-classroom / non-stage-plot generate 'seating'.
      const mode = spec.chart_mode;
      expect(['seating', 'classroom', 'stage_plot']).toContain(mode);
      if (t.category === 'classroom') {
        expect(mode).toBe('classroom');
      }
    }
  });

  it('templatesByCategory buckets every entry exactly once', () => {
    const by = templatesByCategory();
    const flat = Object.values(by).flat();
    expect(flat.length).toBe(ALL_TEMPLATES.length);
    const keys = flat.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('double choir template contains both Choir I and Choir II groups', () => {
    const spec = getTemplate('choir_double')!.generate();
    const groupI = spec.objects.filter((o) => (o.properties as { choir?: string })?.choir === 'I');
    const groupII = spec.objects.filter((o) => (o.properties as { choir?: string })?.choir === 'II');
    expect(groupI.length).toBeGreaterThan(0);
    expect(groupII.length).toBeGreaterThan(0);
  });

  it('drumline includes both battery and front ensemble sections', () => {
    const spec = getTemplate('band_drumline')!.generate();
    expect(spec.objects.some((o) => o.subtype === 'drumline')).toBe(true);
    expect(spec.objects.some((o) => o.subtype === 'front_ensemble')).toBe(true);
  });

  it('opera pit template renders both the stage lip and the pit area', () => {
    const spec = getTemplate('orch_opera_pit')!.generate();
    expect(spec.objects.some((o) => o.subtype === 'stage')).toBe(true);
    expect(spec.objects.some((o) => o.subtype === 'pit')).toBe(true);
  });
});
