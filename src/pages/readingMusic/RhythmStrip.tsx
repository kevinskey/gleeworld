import { labelPattern } from '@/lib/rhythm/syllables';
import type { SyllableSystem } from '@/lib/rhythm/syllables';
import type { RhythmPattern, RhythmEvent } from '@/lib/rhythm/pattern';
import type { Verdict } from '@/lib/rhythm/grade';

// Single-line rhythm notation. Deliberately not NotationView: no staff/pitch
// machinery needed here, and the syllable underlay is custom either way.

const VERDICT_COLOR: Record<Verdict, string> = {
  on_time: '#059669',
  early: '#d97706',
  late: '#d97706',
  missed: '#ef4444',
};
const REST_GLYPH: Record<string, string> = {
  w: '𝄻', h: '𝄼', 'h.': '𝄼.', q: '𝄽', 'q.': '𝄽.', e: '𝄾', 'e.': '𝄾.', s: '𝄿',
};

interface Props {
  pattern: RhythmPattern;
  system: SyllableSystem;
  highlight?: Array<Verdict | null>;
}

export function RhythmStrip({ pattern, system, highlight }: Props) {
  const PX_PER_PULSE = 72;
  const PAD = 24;
  const LINE_Y = 56;
  const width = PAD * 2 + pattern.totalPulses * PX_PER_PULSE;
  const syllables = labelPattern(pattern, system);
  const x = (pulse: number) => PAD + pulse * PX_PER_PULSE;
  const isBeamed = (e: RhythmEvent) => !e.rest && (e.value === 'e' || e.value === 's');
  const pulseOf = (e: RhythmEvent) => Math.floor(e.startPulse + 1e-6);

  // Beam groups: runs of 2+ beamable notes within the same pulse.
  const groups: number[][] = [];
  let current: number[] = [];
  pattern.events.forEach((e, i) => {
    if (isBeamed(e) && current.length > 0 && pulseOf(pattern.events[current[0]]) === pulseOf(e)) {
      current.push(i);
    } else {
      if (current.length > 1) groups.push(current);
      current = isBeamed(e) ? [i] : [];
    }
  });
  if (current.length > 1) groups.push(current);
  const inBeam = new Set(groups.flat());

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={96} viewBox={`0 0 ${width} 96`} role="img" aria-label="rhythm notation">
        <line x1={PAD - 8} y1={LINE_Y} x2={width - PAD + 8} y2={LINE_Y} stroke="#94a3b8" strokeWidth={1} />
        {Array.from({ length: pattern.measures + 1 }, (_, m) => (
          <line
            key={m}
            data-role="barline"
            x1={x(m * pattern.pulsesPerMeasure)}
            y1={LINE_Y - 18}
            x2={x(m * pattern.pulsesPerMeasure)}
            y2={LINE_Y + 18}
            stroke="#475569"
            strokeWidth={m === pattern.measures ? 2.5 : 1.5}
          />
        ))}
        {pattern.events.map((e, i) => {
          const cx = x(e.startPulse) + 10;
          const color = highlight?.[i] ? VERDICT_COLOR[highlight[i]!] : '#0f172a';
          if (e.rest) {
            return (
              <text key={i} data-role="rest" x={cx} y={LINE_Y + 7} fontSize={26} fill="#64748b" textAnchor="middle">
                {REST_GLYPH[e.value]}
              </text>
            );
          }
          const hollow = e.value === 'h' || e.value === 'h.' || e.value === 'w';
          const dotted = e.value.endsWith('.');
          const flagged = (e.value === 'e' || e.value === 'e.' || e.value === 's') && !inBeam.has(i);
          return (
            <g key={i} data-role="note" data-verdict={highlight?.[i] ?? undefined}>
              <ellipse
                cx={cx} cy={LINE_Y} rx={7} ry={5.5}
                fill={hollow ? 'white' : color} stroke={color} strokeWidth={1.8}
                transform={`rotate(-20 ${cx} ${LINE_Y})`}
              />
              {dotted && <circle cx={cx + 12} cy={LINE_Y - 3} r={2} fill={color} />}
              {e.value !== 'w' && <line x1={cx + 6.5} y1={LINE_Y - 2} x2={cx + 6.5} y2={LINE_Y - 34} stroke={color} strokeWidth={1.8} />}
              {flagged && <path d={`M ${cx + 6.5} ${LINE_Y - 34} q 10 4 8 16`} stroke={color} strokeWidth={1.8} fill="none" />}
              {e.value === 's' && !inBeam.has(i) && (
                <path d={`M ${cx + 6.5} ${LINE_Y - 27} q 10 4 8 16`} stroke={color} strokeWidth={1.8} fill="none" />
              )}
              <text data-role="syllable" x={cx} y={LINE_Y + 28} fontSize={12} fill="#334155" textAnchor="middle">
                {syllables[i]}
              </text>
            </g>
          );
        })}
        {groups.map((g, gi) => {
          const x1 = x(pattern.events[g[0]].startPulse) + 16.5;
          const x2 = x(pattern.events[g[g.length - 1]].startPulse) + 16.5;
          const sixteenth = g.some((i) => pattern.events[i].value === 's');
          return (
            <g key={`beam-${gi}`}>
              <rect x={x1 - 10} y={LINE_Y - 36} width={x2 - x1} height={4} fill="#0f172a" />
              {sixteenth && <rect x={x1 - 10} y={LINE_Y - 29} width={x2 - x1} height={4} fill="#0f172a" />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
