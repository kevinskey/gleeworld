import type { ScoreResult } from '@/lib/sightReading/score';
import type { ExerciseIR } from '@/lib/sightReading/ir';
import { Button } from '@/components/ui/button';

// Post-take feedback. This is NOT a landing-page stat card: it only ever
// renders after a real attempt, so it is allowed to show numbers. The landing
// view (SightReadingStudio) must never render any of this.
const DIMENSIONS: { key: keyof ScoreResult; label: string; weight: number }[] = [
  { key: 'pitch', label: 'Pitch', weight: 45 },
  { key: 'rhythm', label: 'Rhythm', weight: 25 },
  { key: 'retention', label: 'Tonal center', weight: 15 },
];

function band(score: number): string {
  if (score >= 90) return 'text-emerald-600';
  if (score >= 70) return 'text-amber-600';
  return 'text-rose-600';
}

export function ResultCard({
  ir,
  result,
  onAgain,
  onExit,
}: {
  ir: ExerciseIR;
  result: ScoreResult;
  onAgain: () => void;
  onExit: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-6">
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-xs uppercase tracking-widest text-slate-500">Your take</p>
        <p className={`mt-1 text-5xl font-bold ${band(result.overall)}`}>{result.overall}</p>
        <p className="text-sm text-slate-600">out of 100 · {ir.key} major · level {ir.difficulty}</p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className={`text-xl font-semibold ${result.firstNoteOk ? 'text-emerald-600' : 'text-rose-600'}`}>
              {result.firstNoteOk ? '✓' : '✗'}
            </p>
            <p className="text-xs text-slate-600">First note</p>
          </div>
          {DIMENSIONS.map((d) => (
            <div key={d.key} className="rounded-xl bg-slate-50 p-3">
              <p className={`text-xl font-semibold ${band(result[d.key] as number)}`}>
                {result[d.key] as number}
              </p>
              <p className="text-xs text-slate-600">{d.label}</p>
            </div>
          ))}
        </div>

        {result.driftBar !== null && (
          <p className="mt-3 text-sm text-amber-700">
            Your pitch center drifted starting around bar {result.driftBar}.
          </p>
        )}
      </div>

      {/* Per-note breakdown — honest about which notes landed. */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-medium text-slate-700">Note by note</p>
        <div className="flex flex-wrap gap-1.5">
          {result.perNote.map((n, i) => (
            <span
              key={i}
              title={n.sungMidi === null ? 'missed' : `sang ${n.sungMidi}, wanted ${n.expectedMidi}`}
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                n.ok
                  ? 'bg-emerald-100 text-emerald-700'
                  : n.sungMidi === null
                    ? 'bg-slate-100 text-slate-400'
                    : 'bg-rose-100 text-rose-700'
              }`}
            >
              {i + 1}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button className="flex-1 rounded-full" onClick={onAgain}>
          Sing again
        </Button>
        <Button variant="outline" className="flex-1 rounded-full" onClick={onExit}>
          Done
        </Button>
      </div>
    </div>
  );
}
