import { LYRIC_GUTTER } from './lyricSpacing';

/** One system (row) of measures: indexes [start, end) into the measure list. */
export interface PackedRow { start: number; end: number }

/**
 * Greedy row-packing for notation systems. Fills each row with measures until
 * the next one's minimum content width would overflow `availableW`, using
 * `maxPerRow` as a readability cap. Rows always contain at least one measure —
 * a bar wider than availableW overflows its own row rather than being dropped.
 * User-authored breaks take precedence: an entry `k` in `forcedBreaks` starts
 * a new row at measure k+1 regardless of remaining width.
 *
 * `pad` is breathing room added per measure in the fit check (not in the final
 * layout). Passing 0 packs rows tighter — used to prefer full rows on tablet.
 */
export function packRows({
  widths,
  availableW,
  maxPerRow,
  pad = 20,
  forcedBreaks = new Set<number>(),
}: {
  widths: number[];
  availableW: number;
  maxPerRow: number;
  pad?: number;
  forcedBreaks?: Set<number>;
}): PackedRow[] {
  const rows: PackedRow[] = [];
  let start = 0;
  let acc = 0;
  for (let i = 0; i < widths.length; i++) {
    const w = (widths[i] || 40) + pad;
    const inRow = i - start;
    const wouldOverflow = inRow > 0 && acc + w > availableW;
    const atCap = inRow >= maxPerRow;
    const userBreak = inRow > 0 && forcedBreaks.has(i - 1);
    if (wouldOverflow || atCap || userBreak) {
      rows.push({ start, end: i });
      start = i;
      acc = 0;
    }
    acc += w;
  }
  if (widths.length > 0) rows.push({ start, end: widths.length });
  return rows;
}

/**
 * Breathing room to leave per measure when fitting a scale, in engraving
 * units.
 *
 * LYRIC_GUTTER is the least clear space the lyric budget will put between two
 * syllables — the point below which words read as one run. Sizing a row to
 * exactly its measures' minimum widths lands every gap on that floor and puts
 * the row on the packer's own knife edge, where a rounding error in
 * `cssWidth / scale` decides whether the bars stay on one line. One more
 * gutter per measure buys the row off that edge and keeps the narrowest pair
 * a shade above the minimum, in the unit the minimum is already stated in
 * rather than a second number of its own.
 */
export const FIT_BREATHING_UNITS = LYRIC_GUTTER;

/**
 * The largest engraving scale at which `perRow` measures still share a system.
 *
 * `scale` is CSS pixels per engraving unit, so a system's room in engraving
 * units is `cssWidth / scale − overheadUnits`: raising the scale makes the
 * notes bigger and the room smaller. They are one lever, and when a caller has
 * asked for a specific number of bars per line the honest thing to give up is
 * SIZE, not the count — the count is a layout decision somebody made, and
 * quietly returning three bars and an orphan is not a smaller version of it.
 *
 * `widths` are the measures' minimum content widths in engraving units, the
 * same numbers packRows is handed; the widest run of `perRow` consecutive
 * measures is what has to fit, since any of them could end up sharing a
 * system. Returns `maxScale` unchanged when that run already fits — this only
 * ever shrinks, never magnifies a score past the size it asked for.
 *
 * `minScale` is where shrinking STOPS. Without one, a bar of very long
 * syllables sizes the whole score down to whatever arithmetic says, and print
 * that nobody can read is not a better answer than a line that holds fewer
 * bars. At the floor the caller is handed the floor, the packer refuses the
 * count in the ordinary way, and the caller can say so.
 */
export function fitScaleForRow({
  widths,
  perRow,
  cssWidth,
  maxScale,
  overheadUnits,
  minScale = 0,
  breathingUnits = FIT_BREATHING_UNITS,
}: {
  widths: number[];
  perRow: number;
  cssWidth: number;
  maxScale: number;
  /** Room a system spends before any measure gets any: clef, key, metre. */
  overheadUnits: number;
  /** The smallest size to shrink to. Clamped to maxScale, so a floor above
   *  the ceiling cannot magnify anything. */
  minScale?: number;
  breathingUnits?: number;
}): number {
  if (!(perRow > 0) || !(cssWidth > 0) || widths.length === 0) return maxScale;
  // packRows' own fallback for a measure that reported nothing.
  const w = widths.map((x) => x || 40);
  const run = Math.min(perRow, w.length);
  let widest = 0;
  for (let i = 0; i + run <= w.length; i++) {
    let sum = 0;
    for (let k = 0; k < run; k++) sum += w[i + k];
    widest = Math.max(widest, sum);
  }
  const needed = widest + run * breathingUnits + overheadUnits;
  if (!(needed > 0)) return maxScale;
  return Math.max(Math.min(minScale, maxScale), Math.min(maxScale, cssWidth / needed));
}
