import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Users, Loader2 } from 'lucide-react';
import { NotationView } from '@/pages/notation/NotationView';
import { irToEditorScore } from '@/lib/notation/fromIR';
import { playIr } from '@/lib/sightReading/irPlayback';
import type { ParsedExercise } from './parseExercise';

export function EnsembleCard({ ex, title }: {
  ex: Extract<ParsedExercise, { kind: 'ensemble' }>; title: string;
}) {
  const [busy, setBusy] = useState(false);
  const scores = useMemo(() => ex.parts.map((p) => irToEditorScore(p.ir)), [ex.parts]);

  const playPart = async (i: number) => {
    if (busy) return;
    setBusy(true);
    try { await playIr(ex.parts[i].ir, 'pitch'); } finally { setBusy(false); }
  };
  const playAll = async () => {
    if (busy) return;
    setBusy(true);
    try { await Promise.all(ex.parts.map((p) => playIr(p.ir, 'pitch'))); } finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <Button type="button" variant="outline" size="sm" onClick={playAll} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Users className="w-4 h-4 mr-1.5" />}
          Play all parts
        </Button>
      </div>
      {ex.instructions && <p className="text-sm text-foreground/85">{ex.instructions}</p>}
      {ex.parts.map((p, i) => (
        <div key={i}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{p.label}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => playPart(i)} disabled={busy}>
              <Play className="w-4 h-4" />
            </Button>
          </div>
          <NotationView score={scores[i]} />
        </div>
      ))}
    </div>
  );
}
