import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Check, X as XIcon, Loader2 } from 'lucide-react';
import { playIr } from '@/lib/sightReading/irPlayback';
import type { ParsedExercise } from './parseExercise';

export function EarTrainingCard({ ex, title }: {
  ex: Extract<ParsedExercise, { kind: 'ear_training' }>; title: string;
}) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [playing, setPlaying] = useState(false);
  const item = ex.items[idx];
  const done = idx >= ex.items.length;

  const play = async () => {
    if (playing || done) return;
    setPlaying(true);
    try { await playIr(item.ir, 'pitch'); } finally { setPlaying(false); }
  };
  const pick = (i: number) => {
    if (picked !== null || done) return;
    setPicked(i);
    if (i === item.answer) setScore((s) => s + 1);
  };
  const next = () => { setPicked(null); setIdx((i) => i + 1); };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">
          {done ? `Score: ${score}/${ex.items.length}` : `${idx + 1} of ${ex.items.length}`}
        </span>
      </div>
      <p className="text-sm text-foreground/85">{ex.prompt}</p>
      {done ? (
        <Button type="button" variant="outline" size="sm"
          onClick={() => { setIdx(0); setScore(0); setPicked(null); }}>
          Try again
        </Button>
      ) : (
        <>
          <Button type="button" variant="outline" size="sm" onClick={play} disabled={playing}>
            {playing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Play className="w-4 h-4 mr-1.5" />}
            Play example
          </Button>
          <div className="flex flex-wrap gap-2">
            {item.choices.map((c, i) => {
              const isAnswer = picked !== null && i === item.answer;
              const isWrongPick = picked === i && i !== item.answer;
              return (
                <Button key={i} type="button" size="sm"
                  variant={isAnswer ? 'default' : 'outline'}
                  className={isWrongPick ? 'border-destructive text-destructive' : ''}
                  onClick={() => pick(i)}>
                  {isAnswer && <Check className="w-4 h-4 mr-1" />}
                  {isWrongPick && <XIcon className="w-4 h-4 mr-1" />}
                  {c}
                </Button>
              );
            })}
          </div>
          {picked !== null && (
            <div className="space-y-2">
              {item.explanation && <p className="text-xs text-muted-foreground">{item.explanation}</p>}
              <Button type="button" size="sm" onClick={next}>
                {idx + 1 < ex.items.length ? 'Next' : 'Finish'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
