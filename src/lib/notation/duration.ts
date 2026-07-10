// MusicXML "divisions" = ticks per quarter note. 480 is divisible by 2,3,4,5,6,8,
// so it represents dotted and common tuplet durations as integers.
export const DIVISIONS = 480;

export type BaseDur = 'whole' | 'half' | 'quarter' | 'eighth' | '16th' | '32nd';

const BASE_TICKS: Record<BaseDur, number> = {
  whole: DIVISIONS * 4,
  half: DIVISIONS * 2,
  quarter: DIVISIONS,
  eighth: DIVISIONS / 2,
  '16th': DIVISIONS / 4,
  '32nd': DIVISIONS / 8,
};

export function baseTicks(d: BaseDur): number {
  return BASE_TICKS[d];
}

// A dot adds half the note's value; a second dot adds a quarter; etc.
export function dottedTicks(d: BaseDur, dots: number): number {
  const base = BASE_TICKS[d];
  let total = base, add = base;
  for (let i = 0; i < dots; i++) { add /= 2; total += add; }
  return total;
}

export function musicXmlType(d: BaseDur): string {
  return d; // our names already match the MusicXML <type> vocabulary
}

const ORDER: BaseDur[] = ['whole', 'half', 'quarter', 'eighth', '16th', '32nd'];

export function ticksToDur(ticks: number): { base: BaseDur; dots: number } | null {
  if (ticks <= 0) return null;
  for (const base of ORDER) {
    for (let dots = 0; dots <= 2; dots++) {
      if (dottedTicks(base, dots) === ticks) return { base, dots };
    }
  }
  return null;
}
