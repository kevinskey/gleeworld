import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Eye, Loader2 } from 'lucide-react';
import { NotationView } from '@/pages/notation/NotationView';
import { irToEditorScore } from '@/lib/notation/fromIR';
import { playIr } from '@/lib/sightReading/irPlayback';
import type { ParsedExercise } from './parseExercise';

export function DictationCard({ ex, title }: {
  ex: Extract<ParsedExercise, { kind: 'dictation' }>; title: string;
}) {
  const [plays, setPlays] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const score = useMemo(() => irToEditorScore(ex.ir), [ex.ir]);

  const play = async () => {
    if (playing || plays >= ex.playLimit) return;
    setPlaying(true);
    setPlays((p) => p + 1);
    try { await playIr(ex.ir, 'pitch'); } finally { setPlaying(false); }
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <span className="text-sm font-medium text-foreground">{title}</span>
      <p className="text-sm text-foreground/85">{ex.prompt}</p>
      <div className="flex gap-2 flex-wrap">
        <Button type="button" variant="outline" size="sm" onClick={play}
          disabled={playing || plays >= ex.playLimit}>
          {playing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Play className="w-4 h-4 mr-1.5" />}
          Play ({ex.playLimit - plays} left)
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setRevealed(true)} disabled={revealed}>
          <Eye className="w-4 h-4 mr-1.5" /> Reveal answer
        </Button>
      </div>
      {revealed && <NotationView score={score} />}
    </div>
  );
}
