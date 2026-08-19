/**
 * Lyric metrics for the engraver: how big a syllable is, and how much width a
 * measure needs before its syllables can be printed without touching.
 *
 * Pure and VexFlow-free on purpose. Every number here is expressed in
 * ENGRAVING UNITS — the coordinate space NotationView lays out in, where one
 * staff space is STAFF_SPACE units regardless of what `scale` later makes a
 * unit worth in CSS pixels. Keeping the arithmetic here means it can be
 * tested against its own invariant (see lyricSpacing.test.ts) instead of only
 * being looked at.
 */

/**
 * One staff space, in engraving units — VexFlow's Tables.STAVE_LINE_DISTANCE.
 *
 * Everything vertical in a score is a multiple of this: it is the unit an
 * engraver actually thinks in, and it does not change with `scale`.
 * notationMetrics.test.ts asserts VexFlow still agrees, so an upgrade that
 * moved it cannot slip past silently.
 */
export const STAFF_SPACE = 10;

/**
 * Lyric size, as a multiple of staff space.
 *
 * Engraving expresses lyric size RELATIVE to the staff, never in absolute
 * points, because a score is set at whatever rastral the page needs and the
 * words have to hold their proportion to the notes at any of them. The house
 * norm across full-size vocal scores is about 1.8–2.0 em per staff space
 * (MuseScore ships 10pt lyrics on a 1.75mm staff space ≈ 2.0; Sibelius 9.5pt
 * on 7mm staves ≈ 1.9). 1.6 sits deliberately at the tight end of that range:
 * these settings print on a four-inch system that has to hold two bars of
 * text, and the words crowd each other before they ever look small.
 *
 * What it replaces was not a choice at all. `LYRIC_SIZE = 10` was WRITTEN as
 * a pixel size — the measuring canvas said "10px", the no-canvas fallback
 * multiplied it as pixels — but HANDED to VexFlow, whose setFont reads a bare
 * number as POINTS. So the words were drawn at 13.33 units, 1.33 spaces,
 * while every width the layout reserved for them was computed at 10: one
 * constant, two units, and a third of every syllable's width missing from the
 * budget. Hence a single ratio with both consumers derived from it — there is
 * no longer a second place that can disagree.
 */
export const LYRIC_EM_PER_STAFF_SPACE = 1.6;

/** The drawn em, in engraving units. */
export const LYRIC_EM = STAFF_SPACE * LYRIC_EM_PER_STAFF_SPACE;

/** The same size in the POINTS VexFlow's setFont expects (72pt = 96 units). */
export const LYRIC_POINT_SIZE = LYRIC_EM * 0.75;

/**
 * Minimum clear space between one syllable and the next. Below about this the
 * words read as a single run even when they technically do not touch.
 */
export const LYRIC_GUTTER = 6;

/**
 * Width a measure needs beyond its syllables, in engraving units.
 *
 * A measure's allocated width is its STAVE width, but the syllables only get
 * the note-centre span inside it: the stave pads before its first note and
 * after its last, and the formatter reserves the final note's own glyph. That
 * overhead is what a budget expressed purely in syllable widths silently
 * spends, which is why a bar could be handed more width than its words
 * measured and still print them touching.
 *
 * Measured off the rendered SVG rather than derived: at the tightest packing
 * the row packer will accept, 26 lands the narrowest pair at 6.09 units of
 * clear space against a LYRIC_GUTTER of 6.
 */
export const LYRIC_STAVE_OVERHEAD = 26;

/**
 * The stave width a measure needs for its lyrics, in engraving units.
 *
 * The floor is the WIDEST ADJACENT PAIR, not the sum of the widths. That is
 * the difference between a budget that describes the layout and one that only
 * describes the ink. Every note in a bar of equal durations is spaced the SAME
 * distance apart — VexFlow justifies by ticks — so one bar-wide number buys
 * every pair the same room, and the pair that needs the most is the only one
 * that matters. A sum says "nations hear the word" fits in 140 units, and on
 * average it does; then "nations|hear" prints touching while "flock|O" carries
 * a quarter-inch of air. So: the pitch every pair will get has to clear the
 * hungriest pair, times the number of gaps, plus the half-widths the first and
 * last syllables hang past their own noteheads, plus the stave's own overhead.
 *
 * `widths` is one entry PER NOTE, in order, zero for a note with no syllable.
 * Lyric-less notes are not skipped: they still take a slot in the spacing, so
 * dropping them would shrink the span the words have to fit across. Returns 0
 * when there is nothing to set.
 */
export function lyricMeasureWidth(widths: number[]): number {
  if (!widths.some((w) => w > 0)) return 0;
  let maxPairPitch = 0;
  for (let i = 1; i < widths.length; i++) {
    maxPairPitch = Math.max(maxPairPitch, (widths[i - 1] + widths[i]) / 2 + LYRIC_GUTTER);
  }
  const span = maxPairPitch * Math.max(0, widths.length - 1);
  const overhang = (widths[0] + widths[widths.length - 1]) / 2;
  return span + overhang + LYRIC_STAVE_OVERHEAD;
}
