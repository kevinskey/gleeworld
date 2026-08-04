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
