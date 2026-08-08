// Per-student audition rounds and voice-part placement. Director surface.
//
// The acceptance test this exists for: "a multi-round audition is recorded
// correctly, including a student who auditions as Soprano II and is placed
// Soprano I." Hence two independent voice-part pickers (auditioned-as is set
// at registration, placed-as only after results) and a rounds table rather
// than a single status — states run one to four rounds and the round NAMES
// are the state's own (Region / Pre-Area / Area), so round_label is free text
// with the number as the ordering truth.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Mic2 } from 'lucide-react';
import {
  useProgramVoiceParts, useSaveAttempt, useDeleteAttempt, useSetVoiceParts,
  type AttemptRow, type ParticipationRow,
} from './useCohorts';

const RESULTS = ['advanced', 'not_advanced', 'accepted', 'alternate', 'not_selected'] as const;

interface Props {
  participation: ParticipationRow;
  programId: string;
  attempts: AttemptRow[];
}

export function AuditionRounds({ participation, programId, attempts }: Props) {
  const { data: parts } = useProgramVoiceParts(programId);
  const setParts = useSetVoiceParts();
  const saveAttempt = useSaveAttempt();
  const deleteAttempt = useDeleteAttempt();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AttemptRow | null>(null);

  // Form state for the round dialog.
  const [roundNumber, setRoundNumber] = useState('1');
  const [roundLabel, setRoundLabel] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [format, setFormat] = useState('');
  const [score, setScore] = useState('');
  const [scoreScale, setScoreScale] = useState('');
  const [rank, setRank] = useState('');
  const [result, setResult] = useState('');
  const [notes, setNotes] = useState('');

  function openFor(a: AttemptRow | null) {
    setEditing(a);
    setRoundNumber(String(a?.round_number ?? (attempts.length + 1)));
    setRoundLabel(a?.round_label ?? '');
    setScheduledAt(a?.scheduled_at ? a.scheduled_at.slice(0, 10) : '');
    setFormat(a?.format ?? '');
    setScore(a?.score != null ? String(a.score) : '');
    setScoreScale(a?.score_scale != null ? String(a.score_scale) : '');
    setRank(a?.rank != null ? String(a.rank) : '');
    setResult(a?.result ?? '');
    setNotes(a?.adjudicator_notes ?? '');
    setDialogOpen(true);
  }

  function submit() {
    saveAttempt.mutate(
      {
        id: editing?.id,
        values: {
          participation_id: participation.id,
          round_number: Number(roundNumber) || 1,
          round_label: roundLabel.trim() || null,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          format: (format || null) as AttemptRow['format'],
          score: score === '' ? null : Number(score),
          score_scale: scoreScale === '' ? null : Number(scoreScale),
          rank: rank === '' ? null : Number(rank),
          // `advanced` is derived from result rather than asked twice.
          advanced: result === 'advanced' ? true
                  : result === 'not_advanced' ? false
                  : result ? true : null,
          result: result || null,
          adjudicator_notes: notes.trim() || null,
        },
      },
      { onSuccess: () => setDialogOpen(false) },
    );
  }

  const partLabel = (id: string | null) =>
    parts?.find((p) => p.id === id)?.label ?? '—';

  return (
    <div className="mt-3 border-t pt-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Mic2 className="h-3.5 w-3.5" aria-hidden /> Audition
        </p>
        <Button size="sm" variant="outline" onClick={() => openFor(null)}>
          <Plus className="mr-1 h-3.5 w-3.5" aria-hidden /> Round
        </Button>
      </div>

      {/* The S2→S1 case: independent pickers using the STATE's own part labels. */}
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Auditioned as</Label>
          <Select
            value={participation.audition_voice_part_id ?? ''}
            onValueChange={(v) => setParts.mutate({ id: participation.id, audition: v || null })}
          >
            <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {parts?.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Placed as</Label>
          <Select
            value={participation.assigned_voice_part_id ?? ''}
            onValueChange={(v) => setParts.mutate({ id: participation.id, assigned: v || null })}
          >
            <SelectTrigger className="h-8"><SelectValue placeholder="Not placed" /></SelectTrigger>
            <SelectContent>
              {parts?.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {participation.assigned_voice_part_id
            && participation.audition_voice_part_id
            && participation.assigned_voice_part_id !== participation.audition_voice_part_id && (
            <p className="mt-1 text-xs text-muted-foreground">
              Placed on a different part than auditioned ({partLabel(participation.audition_voice_part_id)} → {partLabel(participation.assigned_voice_part_id)}).
            </p>
          )}
        </div>
      </div>

      {attempts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rounds recorded yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {attempts.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <span className="text-sm font-medium">
                Round {a.round_number}{a.round_label ? ` — ${a.round_label}` : ''}
              </span>
              {a.scheduled_at && (
                <span className="text-xs text-muted-foreground">
                  {new Date(a.scheduled_at).toLocaleDateString()}
                </span>
              )}
              {a.score != null && (
                <Badge variant="outline" className="font-normal tabular-nums">
                  {a.score}{a.score_scale ? `/${a.score_scale}` : ''}
                </Badge>
              )}
              {a.rank != null && (
                <Badge variant="outline" className="font-normal">rank {a.rank}</Badge>
              )}
              {a.result && (
                <Badge
                  variant="outline"
                  className={`font-normal ${
                    a.advanced === true || a.result === 'accepted'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : a.advanced === false || a.result === 'not_selected'
                        ? 'bg-muted text-muted-foreground' : ''
                  }`}
                >
                  {a.result.replace(/_/g, ' ')}
                </Badge>
              )}
              <span className="ml-auto flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => openFor(a)} aria-label="Edit round">
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => deleteAttempt.mutate(a.id)} aria-label="Delete round">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit round ${editing.round_number}` : 'Record a round'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="rn">Round #</Label>
                <Input id="rn" type="number" min={1} value={roundNumber}
                       onChange={(e) => setRoundNumber(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rl">The state&rsquo;s name for it</Label>
                <Input id="rl" value={roundLabel} placeholder="Region / Pre-Area / Area"
                       onChange={(e) => setRoundLabel(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="rd">Date</Label>
                <Input id="rd" type="date" value={scheduledAt}
                       onChange={(e) => setScheduledAt(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Format</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="recorded">Recorded</SelectItem>
                    <SelectItem value="virtual">Virtual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="sc">Score</Label>
                <Input id="sc" type="number" step="0.01" value={score}
                       onChange={(e) => setScore(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ss">Out of</Label>
                <Input id="ss" type="number" step="0.01" value={scoreScale}
                       placeholder="e.g. 204" onChange={(e) => setScoreScale(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rk">Rank</Label>
                <Input id="rk" type="number" value={rank}
                       onChange={(e) => setRank(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Result</Label>
              <Select value={result} onValueChange={setResult}>
                <SelectTrigger><SelectValue placeholder="Not yet known" /></SelectTrigger>
                <SelectContent>
                  {RESULTS.map((r) => (
                    <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="an">Adjudicator notes</Label>
              <Textarea id="an" rows={2} value={notes}
                        onChange={(e) => setNotes(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Never shown to the student — their view omits scores, rank, and these notes.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saveAttempt.isPending}>
              {saveAttempt.isPending ? 'Saving…' : 'Save round'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
