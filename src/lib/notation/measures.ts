import { DIVISIONS } from './duration';
import { EditorScore, EditorElement, elementTicks } from './model';

export interface LaidMeasure {
  index: number; elements: EditorElement[]; ticks: number; capacity: number; overfull: boolean;
}

export function measureCapacity(timeSig: { beats: number; beatType: number }): number {
  // ticks per beat = whole-note ticks / beatType; capacity = beats * ticks-per-beat
  const wholeTicks = DIVISIONS * 4;
  return timeSig.beats * (wholeTicks / timeSig.beatType);
}

export function totalTicks(score: EditorScore): number {
  return score.elements.reduce((t, el) => t + elementTicks(el), 0);
}

export function layoutMeasures(score: EditorScore): LaidMeasure[] {
  const cap = measureCapacity(score.timeSig);
  const out: LaidMeasure[] = [];
  let cur: EditorElement[] = [];
  let curTicks = 0;

  const flush = () => {
    out.push({ index: out.length, elements: cur, ticks: curTicks, capacity: cap, overfull: curTicks > cap });
    cur = []; curTicks = 0;
  };

  for (const el of score.elements) {
    const t = elementTicks(el);
    // If the current measure is already full, start a new one before placing.
    if (curTicks >= cap && cur.length) flush();
    cur.push(el);
    curTicks += t;
    // Exactly full → close the measure so the next element opens a fresh bar.
    if (curTicks === cap) flush();
  }
  if (cur.length) flush();
  // A score with no elements still needs one empty measure so the writer
  // has somewhere to attach divisions/key/time/clef attributes.
  if (out.length === 0) flush();
  return out;
}
