import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { RhythmPattern } from '@/lib/rhythm/pattern';
import type { ClapBlastRound, ClapBlastEvent, NoteState } from '@/lib/rhythm/clapBlast';
import { DEFAULT_NOTE_COLOR, PAD_LEFT, PX_PER_PULSE, drawRhythm, paintRhythmEl } from './vexRhythm';
import type { DrawnRhythm } from './vexRhythm';

// Scrolling-staff play surface for the Clap Blast drill. The whole pattern is
// one <g> translated left every frame off ctx.currentTime — a dropped frame
// delays pixels, never timing. Same VexFlow engraving as RhythmStrip (see
// vexRhythm.ts), minus syllables (no room at speed) — the hit line is the focal
// point. The notation is drawn ONCE per round; each frame only moves the
// transform and flips per-note state, never re-runs VexFlow.

const VIEW_W = 800;
const VIEW_H = 120;
const HIT_X = VIEW_W * 0.2;
const LINE_Y = 64;

const STATE_COLOR: Record<NoteState, string> = {
  pending: DEFAULT_NOTE_COLOR,
  perfect: '#059669',
  good: '#d97706',
  missed: '#94a3b8',
};

interface Burst { id: number; grade: 'perfect' | 'good' }

// Streak milestones, Pitch Match convention (PitchMatchTab.tsx). Fired at most
// once per round — a rAF tick can resolve several hits, so match on >= not ==.
const MILESTONES: Array<{ at: number; title: string; description: string }> = [
  { at: 10, title: '10-streak!', description: 'Locked in.' },
  { at: 25, title: '25-streak!', description: 'Incredible pulse.' },
  { at: 50, title: '50-streak!', description: 'Legendary.' },
];

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
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [flash, setFlash] = useState<'perfect' | 'good' | 'stray' | null>(null);
  const [score, setScore] = useState(() => round.score());
  const [streak, setStreak] = useState(() => round.streak());
  const [preRoll, setPreRoll] = useState(() => ctx.currentTime - t0 < 0);
  const burstSeq = useRef(0);
  const milestonesRef = useRef<Set<number>>(new Set());
  const scrollRef = useRef<SVGGElement>(null);
  const drawnRef = useRef<DrawnRhythm | null>(null);
  // Last state pushed to the DOM per event index, so a frame only touches nodes
  // whose state actually changed.
  const paintedRef = useRef<string[]>([]);
  const paintedBeamsRef = useRef<string[]>([]);

  // Map event index → graded-note index (rests don't grade).
  const noteIndexOf = useRef(new Map<number, number>());
  useEffect(() => {
    const map = new Map<number, number>();
    let n = -1;
    pattern.events.forEach((e, i) => { if (!e.rest) { n += 1; map.set(i, n); } });
    noteIndexOf.current = map;
  }, [pattern]);

  // Engrave once per pattern. Static content that merely scrolls — re-running
  // VexFlow per frame would be both slow and pointless.
  useEffect(() => {
    const g = scrollRef.current;
    if (!g) return;
    g.replaceChildren();
    const drawn = drawRhythm(g, pattern, { lineY: LINE_Y, staffLine: false });
    // The stage's own selector, kept from the hand-drawn version: only graded
    // events answer to [data-role="cb-note"].
    drawn.noteEls.forEach((el, i) => {
      if (!pattern.events[i].rest) {
        el.setAttribute('data-role', 'cb-note');
        el.setAttribute('data-state', 'pending');
      }
    });
    drawnRef.current = drawn;
    paintedRef.current = pattern.events.map(() => 'pending');
    paintedBeamsRef.current = drawn.beams.map(() => '');
    return () => { drawnRef.current = null; g.replaceChildren(); };
  }, [pattern]);

  useEffect(() => {
    const spp = 60 / bpm;
    const pxPerSec = PX_PER_PULSE / spp;
    let raf = 0;
    const loop = () => {
      const now = ctx.currentTime - t0;
      const events = round.tick(now, getOnsets());
      if (events.length > 0) {
        const hits = events.filter((e): e is ClapBlastEvent & { grade: 'perfect' | 'good' } => e.kind === 'hit');
        if (hits.length > 0) {
          setBursts((b) => [...b.slice(-6), ...hits.map((h) => ({ id: ++burstSeq.current, grade: h.grade }))]);
          setFlash(hits[hits.length - 1].grade);
          const s = round.streak();
          for (const m of MILESTONES) {
            if (s >= m.at && !milestonesRef.current.has(m.at)) {
              milestonesRef.current.add(m.at);
              toast.success(m.title, { description: m.description });
            }
          }
        } else if (events.some((e) => e.kind === 'stray')) {
          setFlash('stray');
        }
        setScore(round.score());
        setStreak(round.streak());
      }
      setPreRoll(now < 0);

      // Scroll. Everything downstream of ctx.currentTime: a slow frame moves
      // the pixels late, it never moves the music. The extra PAD_LEFT +
      // headHalfWidth puts the hit line through the note HEAD, not its left edge.
      const drawn = drawnRef.current;
      const g = scrollRef.current;
      if (g && drawn) {
        g.setAttribute('transform', `translate(${HIT_X - PAD_LEFT - drawn.headHalfWidth - now * pxPerSec} 0)`);
        paintStates(drawn, pattern, round.noteStates(), noteIndexOf.current, paintedRef.current, paintedBeamsRef.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ctx, t0, round, getOnsets, bpm, pattern]);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 350);
    return () => window.clearTimeout(t);
  }, [flash]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-sm">
        <span className="font-medium text-slate-700">Score {score}</span>
        <span className={streak >= 3 ? 'font-semibold text-orange-600' : 'text-slate-500'}>
          🔥 {streak}
        </span>
        {countIn && preRoll && <span className="font-medium text-amber-700">Get ready…</span>}
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
          <g ref={scrollRef} transform={`translate(${HIT_X} 0)`} />
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

/**
 * Push the round's per-note states onto the already-engraved notation.
 * Exploded (perfect/good) notes disappear — the burst at the hit line replaces
 * them; missed notes gray out. Only nodes whose state changed are touched, so a
 * steady frame does no DOM work at all.
 */
function paintStates(
  drawn: DrawnRhythm,
  pattern: RhythmPattern,
  states: NoteState[],
  noteIndexOf: Map<number, number>,
  painted: string[],
  paintedBeams: string[],
): void {
  const stateOf = (i: number): NoteState => {
    const ni = noteIndexOf.get(i);
    return ni === undefined ? 'pending' : states[ni];
  };
  pattern.events.forEach((e, i) => {
    if (e.rest) return;
    const st = stateOf(i);
    if (painted[i] === st) return;
    painted[i] = st;
    const el = drawn.noteEls[i];
    if (!el) return;
    const gone = st === 'perfect' || st === 'good';
    el.setAttribute('data-state', st);
    el.style.display = gone ? 'none' : '';
    el.setAttribute('opacity', st === 'missed' ? '0.45' : '1');
    if (!gone) paintRhythmEl(el, STATE_COLOR[st]);
  });
  drawn.beams.forEach(({ el, indexes }, bi) => {
    const live = indexes.filter((i) => { const s = stateOf(i); return s !== 'perfect' && s !== 'good'; });
    const key = live.map((i) => stateOf(i)).join('|');
    if (paintedBeams[bi] === key) return;
    paintedBeams[bi] = key;
    // A beam belongs to its notes: it vanishes with the last of them, and it
    // only takes a state colour when every surviving note agrees.
    el.style.display = live.length === 0 ? 'none' : '';
    if (live.length === 0) return;
    const first = stateOf(live[0]);
    const uniform = live.every((i) => stateOf(i) === first);
    el.setAttribute('opacity', uniform && first === 'missed' ? '0.45' : '1');
    paintRhythmEl(el, uniform ? STATE_COLOR[first] : DEFAULT_NOTE_COLOR);
  });
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
