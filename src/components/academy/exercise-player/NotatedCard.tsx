import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, ExternalLink, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotationView } from '@/pages/notation/NotationView';
import { irToEditorScore } from '@/lib/notation/fromIR';
import { playIr } from '@/lib/sightReading/irPlayback';
import type { ParsedExercise } from './parseExercise';

export function NotatedCard({ ex, exerciseId, title }: {
  ex: Extract<ParsedExercise, { kind: 'notated' }>; exerciseId: string; title: string;
}) {
  const navigate = useNavigate();
  const [playing, setPlaying] = useState(false);
  const scores = useMemo(() => ex.segments.map((s) => irToEditorScore(s)), [ex.segments]);

  const play = async () => {
    if (playing) return;
    setPlaying(true);
    try {
      for (const seg of ex.segments) await playIr(seg, ex.mode);
    } finally {
      setPlaying(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={play} disabled={playing}>
            {playing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Play className="w-4 h-4 mr-1.5" />}
            {ex.mode === 'click' ? 'Play rhythm' : 'Play'}
          </Button>
          {ex.deepLink && (
            <Button type="button" size="sm"
              onClick={() => navigate(`/dashboard/sight-reading?academyExercise=${exerciseId}`)}>
              <ExternalLink className="w-4 h-4 mr-1.5" /> Practice with pitch tracker
            </Button>
          )}
        </div>
      </div>
      {ex.instructions && <p className="text-sm text-foreground/85">{ex.instructions}</p>}
      {ex.modulation && (
        <p className="text-xs text-muted-foreground">
          Modulates to {ex.modulation.toKey} at beat {ex.modulation.atBeat}. Re-establish solfège in the new key.
        </p>
      )}
      {scores.map((s, i) => (
        <div key={i}>
          <NotationView score={s} />
          <p className="mt-1 text-xs text-muted-foreground">
            {ex.segments[i].key} {ex.segments[i].mode} · {ex.segments[i].meter.beats}/{ex.segments[i].meter.beatType} · {ex.segments[i].tempo} bpm
          </p>
        </div>
      ))}
      {ex.prepChecklist && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Preparation checklist</summary>
          <ol className="list-decimal ml-5 mt-1 space-y-0.5 text-foreground/85">
            {ex.prepChecklist.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </details>
      )}
    </div>
  );
}
