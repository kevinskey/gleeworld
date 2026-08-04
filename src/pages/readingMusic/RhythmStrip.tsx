import { useEffect, useRef } from 'react';
import { labelPattern } from '@/lib/rhythm/syllables';
import type { SyllableSystem } from '@/lib/rhythm/syllables';
import type { RhythmPattern } from '@/lib/rhythm/pattern';
import type { Verdict } from '@/lib/rhythm/grade';
import { drawRhythm, rhythmWidth } from './vexRhythm';

// Single-line rhythm notation, engraved by VexFlow (see vexRhythm.ts). Not
// NotationView: no pitch/staff machinery is wanted here, notes must sit at
// time-proportional x, and the syllable underlay is custom either way.

const VERDICT_COLOR: Record<Verdict, string> = {
  on_time: '#059669',
  early: '#d97706',
  late: '#d97706',
  missed: '#ef4444',
};

const HEIGHT = 104;
const LINE_Y = 52;

interface Props {
  pattern: RhythmPattern;
  system: SyllableSystem;
  highlight?: Array<Verdict | null>;
}

export function RhythmStrip({ pattern, system, highlight }: Props) {
  const groupRef = useRef<SVGGElement>(null);
  const width = rhythmWidth(pattern);
  // Serialised so the effect re-runs on a real verdict change, not on every
  // fresh array identity from the parent's render.
  const highlightKey = (highlight ?? []).join(',');

  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    g.replaceChildren();
    drawRhythm(g, pattern, {
      lineY: LINE_Y,
      colors: pattern.events.map((_, i) => (highlight?.[i] ? VERDICT_COLOR[highlight[i]!] : undefined)),
      syllables: labelPattern(pattern, system),
    });
    // Verdicts also travel as an attribute so result screens (and tests) can
    // select "the notes the student missed" without reading colours.
    pattern.events.forEach((_, i) => {
      const v = highlight?.[i];
      const el = g.querySelector(`[data-index="${i}"]`);
      if (el && v) el.setAttribute('data-verdict', v);
    });
    return () => g.replaceChildren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pattern, system, highlightKey]);

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} role="img" aria-label="rhythm notation">
        <g ref={groupRef} />
      </svg>
    </div>
  );
}
