import { describe, it, expect } from 'vitest';
import {
  lyricMeasureWidth, LYRIC_GUTTER, LYRIC_STAVE_OVERHEAD,
  LYRIC_EM, LYRIC_EM_PER_STAFF_SPACE, LYRIC_POINT_SIZE, STAFF_SPACE,
} from './lyricSpacing';

/**
 * The widths below are the reported psalm's own syllables, measured off the
 * rendered SVG at LYRIC_EM: "nations hear the word" is the bar that printed
 * with "nations" and "hear" touching.
 */
const NATIONS_HEAR_THE_WORD = [49.2, 29.3, 24.9, 35.5];

/** What the measure's syllables get once its width is spread evenly — which
 *  is what VexFlow does with a bar of equal durations. */
function gapsAfterEvenSpacing(widths: number[], measureWidth: number): number[] {
  const span = measureWidth - LYRIC_STAVE_OVERHEAD
    - (widths[0] + widths[widths.length - 1]) / 2;
  const pitch = span / (widths.length - 1);
  return widths.slice(1).map((w, i) => pitch - (widths[i] + w) / 2);
}

describe('lyric metrics', () => {
  it('states the lyric size as a proportion of staff space, in engraving range', () => {
    // Engraved vocal scores run ~1.8-2.0 em per staff space; below ~1.4 the
    // words stop reading as lyrics and start reading as a footnote.
    expect(LYRIC_EM_PER_STAFF_SPACE).toBeGreaterThanOrEqual(1.4);
    expect(LYRIC_EM_PER_STAFF_SPACE).toBeLessThanOrEqual(2.0);
  });

  it('derives the drawn em and the point size from that one ratio', () => {
    // The bug this replaced was a single constant read as pixels in one place
    // and points in another. Both consumers must come from the same number.
    expect(LYRIC_EM).toBe(STAFF_SPACE * LYRIC_EM_PER_STAFF_SPACE);
    expect(LYRIC_POINT_SIZE).toBeCloseTo(LYRIC_EM * 0.75, 10);
  });
});

describe('lyricMeasureWidth', () => {
  it('reserves nothing for a measure with no syllables', () => {
    expect(lyricMeasureWidth([0, 0, 0, 0])).toBe(0);
  });

  it('leaves every adjacent pair at least a gutter apart once spread evenly', () => {
    const w = lyricMeasureWidth(NATIONS_HEAR_THE_WORD);
    for (const gap of gapsAfterEvenSpacing(NATIONS_HEAR_THE_WORD, w)) {
      expect(gap).toBeGreaterThanOrEqual(LYRIC_GUTTER - 1e-9);
    }
  });

  it('holds that guarantee for the widest pair, not the average', () => {
    // The failing case in the report, in miniature: three narrow syllables and
    // one wide one. A budget built from the SUM of the widths is satisfied by
    // the average and lets the wide pair collide, so assert directly that the
    // wide pair — not merely the total — clears the gutter.
    const widths = [8, 90, 90, 8];
    const gaps = gapsAfterEvenSpacing(widths, lyricMeasureWidth(widths));
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(LYRIC_GUTTER - 1e-9);
    // And the sum-based budget genuinely would not have: it is smaller.
    const sumBudget = widths.reduce((s, x) => s + x + LYRIC_GUTTER, 0);
    expect(lyricMeasureWidth(widths)).toBeGreaterThan(sumBudget);
  });

  it('counts a lyric-less note as a slot rather than skipping it', () => {
    // The unsung note still takes a position in the bar, so the sung words
    // have to reach across it. Dropping it would shorten the span and let the
    // words be squeezed back together.
    expect(lyricMeasureWidth([40, 0, 40])).toBeGreaterThan(lyricMeasureWidth([40, 40]));
  });

  it('grows with the syllables it has to hold', () => {
    expect(lyricMeasureWidth([60, 60, 60, 60]))
      .toBeGreaterThan(lyricMeasureWidth([20, 20, 20, 20]));
  });
});
