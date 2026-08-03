import { useEffect, useRef, useState } from 'react';
import type { RhythmPattern, RhythmEvent } from '@/lib/rhythm/pattern';
import type { ClapBlastRound, ClapBlastEvent, NoteState } from '@/lib/rhythm/clapBlast';

// Scrolling-staff play surface for the Clap Blast drill. The whole pattern is
// one <g> translated left every frame off ctx.currentTime — a dropped frame
// delays pixels, never timing. RhythmStrip's glyph vocabulary, minus
// syllables (no room at speed) — the hit line is the focal point.

const PX_PER_PULSE = 72;
const VIEW_W = 800;
const VIEW_H = 120;
const HIT_X = VIEW_W * 0.2;
const LINE_Y = 64;

const STATE_COLOR: Record<NoteState, string> = {
  pending: '#0f172a',
  perfect: '#059669',
  good: '#d97706',
  missed: '#94a3b8',
};

interface Burst { id: number; grade: 'perfect' | 'good' }

interface Props {
  pattern: RhythmPattern;
  bpm: number;
  ctx: AudioContext;
  t0: number;
  round: ClapBlastRound;
  getOnsets: () => readonly number[];
  countIn: boolean;
}

export function ClapBlastStage({ pattern, bpm, ctx, t0, round, getOnsets, countIn }: Props) {
  const [nowSec, setNowSec] = useState(() => ctx.currentTime - t0);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [flash, setFlash] = useState<'perfect' | 'good' | 'stray' | null>(null);
  const burstSeq = useRef(0);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const now = ctx.currentTime - t0;
      const events = round.tick(now, getOnsets());
      if (events.length > 0) {
        const hits = events.filter((e): e is ClapBlastEvent & { grade: 'perfect' | 'good' } => e.kind === 'hit');
        if (hits.length > 0) {
          setBursts((b) => [...b.slice(-6), ...hits.map((h) => ({ id: ++burstSeq.current, grade: h.grade }))]);
          setFlash(hits[hits.length - 1].grade);
        } else if (events.some((e) => e.kind === 'stray')) {
          setFlash('stray');
        }
      }
      setNowSec(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ctx, t0, round, getOnsets]);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 350);
    return () => window.clearTimeout(t);
  }, [flash]);

  const spp = 60 / bpm;
  const pxPerSec = PX_PER_PULSE / spp;
  const translateX = HIT_X - nowSec * pxPerSec;
  const x = (pulse: number) => pulse * PX_PER_PULSE;
  const states = round.noteStates();
  const streak = round.streak();

  // Map event index → note index (rests don't grade)
  let noteIdx = -1;
  const noteIndexOf = new Map<number, number>();
  pattern.events.forEach((e, i) => { if (!e.rest) { noteIdx += 1; noteIndexOf.set(i, noteIdx); } });

  const isBeamed = (e: RhythmEvent) => !e.rest && (e.value === 'e' || e.value === 's');
  const pulseOf = (e: RhythmEvent) => Math.floor(e.startPulse + 1e-6);
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
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-sm">
        <span className="font-medium text-slate-700">Score {round.score()}</span>
        <span className={streak >= 3 ? 'font-semibold text-orange-600' : 'text-slate-500'}>
          🔥 {streak}
        </span>
        {countIn && nowSec < 0 && <span className="font-medium text-amber-700">Get ready…</span>}
        {flash === 'perfect' && <span className="font-semibold text-emerald-600">Perfect!</span>}
        {flash === 'good' && <span className="font-semibold text-amber-600">Good</span>}
      </div>

      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
        <svg
          width="100%" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" aria-label="clap blast stage"
          preserveAspectRatio="xMidYMid meet"
        >
          <line x1={0} y1={LINE_Y} x2={VIEW_W} y2={LINE_Y} stroke="#94a3b8" strokeWidth={1} />
          <line
            data-role="hit-line"
            x1={HIT_X} y1={LINE_Y - 34} x2={HIT_X} y2={LINE_Y + 26}
            stroke={flash === 'stray' ? '#ef4444' : '#0ea5e9'} strokeWidth={flash === 'stray' ? 4 : 3}
            strokeLinecap="round"
          />
          <g transform={`translate(${translateX} 0)`}>
            {Array.from({ length: pattern.measures + 1 }, (_, m) => (
              <line
                key={`bar-${m}`}
                x1={x(m * pattern.pulsesPerMeasure)} y1={LINE_Y - 18}
                x2={x(m * pattern.pulsesPerMeasure)} y2={LINE_Y + 18}
                stroke="#cbd5e1" strokeWidth={m === pattern.measures ? 2.5 : 1.5}
              />
            ))}
            {pattern.events.map((e, i) => {
              if (e.rest) return null;
              const ni = noteIndexOf.get(i)!;
              const st = states[ni];
              if (st === 'perfect' || st === 'good') return null; // exploded
              const color = STATE_COLOR[st];
              const cx = x(e.startPulse) + 10;
              const hollow = e.value === 'h' || e.value === 'h.' || e.value === 'w';
              const dotted = e.value.endsWith('.');
              const flagged = (e.value === 'e' || e.value === 'e.' || e.value === 's') && !inBeam.has(i);
              return (
                <g key={i} data-role="cb-note" data-state={st} opacity={st === 'missed' ? 0.45 : 1}>
                  <ellipse
                    cx={cx} cy={LINE_Y} rx={7} ry={5.5}
                    fill={hollow ? 'white' : color} stroke={color} strokeWidth={1.8}
                    transform={`rotate(-20 ${cx} ${LINE_Y})`}
                  />
                  {dotted && <circle cx={cx + 12} cy={LINE_Y - 3} r={2} fill={color} />}
                  {e.value !== 'w' && (
                    <line x1={cx + 6.5} y1={LINE_Y - 2} x2={cx + 6.5} y2={LINE_Y - 34} stroke={color} strokeWidth={1.8} />
                  )}
                  {flagged && (
                    <path d={`M ${cx + 6.5} ${LINE_Y - 34} q 10 4 8 16`} stroke={color} strokeWidth={1.8} fill="none" />
                  )}
                  {e.value === 's' && !inBeam.has(i) && (
                    <path d={`M ${cx + 6.5} ${LINE_Y - 27} q 10 4 8 16`} stroke={color} strokeWidth={1.8} fill="none" />
                  )}
                </g>
              );
            })}
            {groups.map((g, gi) => {
              // Hide a beam once every note in its group has exploded
              const allGone = g.every((i) => {
                const ni = noteIndexOf.get(i);
                return ni !== undefined && (states[ni] === 'perfect' || states[ni] === 'good');
              });
              if (allGone) return null;
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
          </g>
        </svg>

        {/* Explosions pinned to the hit line */}
        <div className="pointer-events-none absolute inset-y-0" style={{ left: '20%' }}>
          {bursts.map((b) => (
            <HitBurst key={b.id} grade={b.grade} />
          ))}
        </div>
      </div>
    </div>
  );
}

function HitBurst({ grade }: { grade: 'perfect' | 'good' }) {
  const n = grade === 'perfect' ? 10 : 6;
  const chars = grade === 'perfect' ? ['💥', '✨', '⭐'] : ['✨', '·'];
  const parts = Array.from({ length: n }, (_, i) => ({
    key: i,
    dx: Math.cos((i / n) * Math.PI * 2) * (grade === 'perfect' ? 46 : 28),
    dy: Math.sin((i / n) * Math.PI * 2) * (grade === 'perfect' ? 46 : 28),
    char: chars[i % chars.length],
  }));
  return (
    <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2">
      {parts.map((p) => (
        <span
          key={p.key}
          className="absolute text-lg"
          style={{
            animation: 'cbBurst 500ms ease-out forwards',
            ['--dx' as string]: `${p.dx}px`,
            ['--dy' as string]: `${p.dy}px`,
            opacity: 0,
          }}
        >
          {p.char}
        </span>
      ))}
      <style>{`
        @keyframes cbBurst {
          0%   { transform: translate(0,0) scale(0.4); opacity: 0; }
          20%  { opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(1.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
