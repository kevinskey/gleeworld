import { useState } from 'react';
import { Play, ListMusic, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMyPlacement } from '@/lib/readingMusic/api';
import { LEVELS } from '@/lib/readingMusic/domains';
import { PlacementDiagnostic } from '@/pages/readingMusic/PlacementDiagnostic';

interface Props {
  onGoTo: (tab: string) => void;
}

export function ContinueTab({ onGoTo }: Props) {
  const placement = useMyPlacement();
  const [diagOpen, setDiagOpen] = useState(false);
  const level = placement.data?.level ?? null;
  const levelDef = level ? LEVELS.find((l) => l.id === level) : null;

  return (
    <div className="space-y-4">
      {/* Placement CTA / Continue card */}
      {!placement.isLoading && !level && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white p-6 shadow-md">
          <p className="text-[11px] uppercase tracking-widest text-slate-300">Start here</p>
          <p className="text-xl font-semibold mt-1">Where should we start you?</p>
          <p className="text-sm text-slate-300 mt-1 max-w-md">
            5 quick questions to place you at the right level. You can skip and start at Level 1 if you'd rather.
          </p>
          <div className="flex gap-2 mt-3">
            <Button onClick={() => setDiagOpen(true)}>Take placement</Button>
            <Button variant="outline" className="bg-transparent text-white border-white/40" onClick={() => onGoTo('sight_singing')}>
              Skip — start at Level 1
            </Button>
          </div>
        </div>
      )}
      {level && levelDef && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white p-6 shadow-md">
          <p className="text-[11px] uppercase tracking-widest text-slate-300">Continue</p>
          <p className="text-xl font-semibold mt-1">Level {level} — {levelDef.name}</p>
          <p className="text-sm text-slate-300 mt-1">{levelDef.focus}</p>
          <div className="flex gap-2 mt-3">
            <Button onClick={() => onGoTo('sight_singing')}>
              <Play className="w-4 h-4 mr-1" /> Continue
            </Button>
            <Button variant="outline" className="bg-transparent text-white border-white/40" onClick={() => setDiagOpen(true)}>
              Retake placement
            </Button>
          </div>
        </div>
      )}

      {/* Daily Warm-up card */}
      <button
        type="button"
        onClick={() => onGoTo('pitch_intervals')}
        className="w-full text-left rounded-2xl bg-white p-5 shadow-sm border-2 border-emerald-200 hover:border-emerald-400 transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-emerald-700">Daily warm-up</p>
            <p className="text-lg font-semibold text-slate-900 mt-0.5">60 seconds — Home Tone</p>
            <p className="text-xs text-slate-600 mt-1">Anchor your ear before drills. Sing the tonic 5 times.</p>
          </div>
          <div className="shrink-0 w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
        </div>
      </button>

      {/* Assignments strip (empty for Phase 1) */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Assignments</p>
        <div className="rounded-xl bg-slate-50 border border-dashed border-slate-200 p-6 text-center">
          <p className="text-sm text-slate-600">No assignments right now.</p>
          <p className="text-xs text-slate-500 mt-1">Teachers can assign practice starting in Phase 3.</p>
        </div>
      </div>

      {/* Jump into any domain */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Or jump to a domain</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => onGoTo('pitch_intervals')}>
            <ListMusic className="w-4 h-4 mr-1" /> Pitch & Intervals
          </Button>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => onGoTo('sight_singing')}>
            <ListMusic className="w-4 h-4 mr-1" /> Sight-Singing
          </Button>
          <Badge variant="outline" className="text-xs">Rhythm · Dictation · Harmony · Scales — coming soon</Badge>
        </div>
      </div>

      <PlacementDiagnostic
        open={diagOpen}
        onOpenChange={setDiagOpen}
        onComplete={() => { /* onSuccess in the modal already invalidates the query */ }}
      />
    </div>
  );
}
