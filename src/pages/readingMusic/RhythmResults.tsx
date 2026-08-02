import { Button } from '@/components/ui/button';
import { RhythmStrip } from './RhythmStrip';
import type { SyllableSystem } from '@/lib/rhythm/syllables';
import type { RhythmPattern } from '@/lib/rhythm/pattern';
import type { GradeResult, Verdict } from '@/lib/rhythm/grade';

const TICK_COLOR: Record<Verdict, string> = {
  on_time: 'bg-emerald-500',
  early: 'bg-amber-500',
  late: 'bg-amber-500',
  missed: 'bg-red-400',
};

interface Props {
  pattern: RhythmPattern;
  system: SyllableSystem;
  result: GradeResult;
  bpm: number;
  assessment: boolean;
  onRetry: () => void;
  onNextLevel: (() => void) | null;
}

// Everything drawn here comes from data that is also stored in the attempt
// payload, so the teacher view can redraw the identical picture.
export function RhythmResults({ pattern, system, result, bpm, assessment, onRetry, onNextLevel }: Props) {
  const spp = 60 / bpm;
  const totalSec = pattern.totalPulses * spp;
  // Map note verdicts (non-rest order) back onto the full event list.
  let n = 0;
  const highlight = pattern.events.map((e) => (e.rest ? null : result.notes[n++]?.verdict ?? null));
  const counts = result.notes.reduce(
    (acc, note) => { acc[note.verdict] += 1; return acc; },
    { on_time: 0, early: 0, late: 0, missed: 0 } as Record<Verdict, number>,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className={`rounded-xl px-4 py-2 text-2xl font-bold ${result.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {result.score}
        </div>
        <div className="text-sm text-slate-600">
          <span className="text-emerald-700 font-medium">{counts.on_time} on time</span>
          {' · '}<span className="text-amber-700">{counts.early + counts.late} early/late</span>
          {' · '}<span className="text-red-500">{counts.missed} missed</span>
          {result.extraOnsets.length > 0 && <>{' · '}<span className="text-red-500">{result.extraOnsets.length} extra</span></>}
        </div>
      </div>

      {assessment && (
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">
          Assessment recorded — visible to your teacher.
        </p>
      )}

      <RhythmStrip pattern={pattern} system={system} highlight={highlight} />

      {/* Timing lane: slate ticks = expected grid, dots = your onsets. */}
      <div className="relative h-10 rounded-lg bg-slate-100" aria-label="timing comparison">
        {result.notes.map((note, i) => (
          <div key={`e-${i}`} className="absolute top-1 h-8 w-px bg-slate-400"
               style={{ left: `${(note.expectedSec / totalSec) * 100}%` }} />
        ))}
        {result.notes.filter((note) => note.actualSec !== null).map((note, i) => (
          <div key={`a-${i}`} className={`absolute top-3 h-4 w-4 -translate-x-1/2 rounded-full ${TICK_COLOR[note.verdict]}`}
               style={{ left: `${(Math.max(0, Math.min(note.actualSec!, totalSec)) / totalSec) * 100}%` }} />
        ))}
        {result.extraOnsets.map((t, i) => (
          <div key={`x-${i}`} className="absolute top-3 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-red-400 bg-white"
               style={{ left: `${(Math.max(0, Math.min(t, totalSec)) / totalSec) * 100}%` }} />
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onRetry}>Try again</Button>
        {onNextLevel && <Button onClick={onNextLevel}>Next level</Button>}
      </div>
    </div>
  );
}
