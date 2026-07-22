// Canvas-backed outcomes + Learning Mastery for a course.
// Two tabs: Outcomes (list + create) and Mastery (rollup grid).

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, ArrowLeft, AlertCircle, Plus, Trash2, Target } from 'lucide-react';
import { useCanvasOutcomes, useCreateOutcome, useOutcomeRollups } from '@/hooks/useCanvasAcademy';
import { toast } from 'sonner';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

interface RatingDraft { description: string; points: number }

const DEFAULT_RATINGS: RatingDraft[] = [
  { description: 'Exceeds Mastery', points: 4 },
  { description: 'Mastery', points: 3 },
  { description: 'Near Mastery', points: 2 },
  { description: 'Below Mastery', points: 1 },
];

export default function CanvasOutcomes() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId ? Number(params.courseId) : null;
  const [open, setOpen] = useState(false);

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
    <DashboardPageShell
      title="Outcomes & Mastery"
      actions={<Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> New outcome</Button>}
    >
      <Link to={`/academy/canvas/courses/${courseId}`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> Back to course
      </Link>

      {courseId && <NewOutcomeDialog open={open} onOpenChange={setOpen} courseId={courseId} />}

      <Tabs defaultValue="outcomes">
        <TabsList>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
          <TabsTrigger value="mastery">Learning Mastery</TabsTrigger>
        </TabsList>
        <TabsContent value="outcomes" className="mt-4">
          {courseId && <OutcomesList courseId={courseId} />}
        </TabsContent>
        <TabsContent value="mastery" className="mt-4">
          {courseId && <MasteryGrid courseId={courseId} />}
        </TabsContent>
      </Tabs>
    </DashboardPageShell>
    </DashboardShell>
    </UniversalLayout>
  );
}

function OutcomesList({ courseId }: { courseId: number }) {
  const { data, isLoading } = useCanvasOutcomes(courseId);
  if (isLoading) return <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>;
  if (!data || 'error' in data) return <div className="text-sm text-destructive">Could not load outcomes.</div>;
  if (data.outcomes.length === 0) return (
    <Card className="border-dashed"><CardContent className="py-10 text-center text-sm text-muted-foreground space-y-2">
      <Target className="w-6 h-6 mx-auto opacity-40" />
      <p>No outcomes yet. Add one to start tracking student mastery.</p>
    </CardContent></Card>
  );
  return (
    <ul className="space-y-2">
      {data.outcomes.map((o) => (
        <li key={o.id}>
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-primary shrink-0" />
              <div className="font-semibold text-sm">{o.title}</div>
            </div>
            {o.description && <div className="text-xs text-muted-foreground mb-2">{o.description}</div>}
            <div className="flex flex-wrap gap-1.5">
              {o.ratings.map((r, i) => (
                <span key={i} className={`text-xs px-2 py-0.5 rounded-md border ${r.points >= o.mastery_points ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-muted/40 border-border text-muted-foreground'}`}>
                  <span className="font-mono">{r.points}</span> {r.description}
                </span>
              ))}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Mastery at <span className="font-mono">{o.mastery_points}</span> / {o.points_possible}
            </div>
          </CardContent></Card>
        </li>
      ))}
    </ul>
  );
}

function MasteryGrid({ courseId }: { courseId: number }) {
  const { data, isLoading } = useOutcomeRollups(courseId);
  if (isLoading) return <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading rollups…</div>;
  if (!data || 'error' in data) return <div className="text-sm text-destructive">Could not load rollups.</div>;
  if (data.outcomes.length === 0 || data.users.length === 0) return (
    <Card className="border-dashed"><CardContent className="py-10 text-center text-sm text-muted-foreground">
      No outcome data yet. Score some aligned assignments first.
    </CardContent></Card>
  );
  const masteryById = new Map(data.outcomes.map((o) => [o.id, o.mastery_points]));
  return (
    <Card><CardContent className="p-0 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 border-b border-border">
          <tr>
            <th className="text-left p-3 font-semibold sticky left-0 bg-muted/40">Student</th>
            {data.outcomes.map((o) => (
              <th key={o.id} className="text-center p-3 font-semibold whitespace-nowrap">{o.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.users.sort((a, b) => a.name.localeCompare(b.name)).map((u) => {
            const rollup = data.rollups.find((r) => r.user_id === u.id);
            return (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="p-3 sticky left-0 bg-card">{u.name}</td>
                {data.outcomes.map((o) => {
                  const score = rollup?.scores.find((s) => s.outcome_id === o.id)?.score ?? null;
                  const mastery = masteryById.get(o.id) ?? 0;
                  const tone = score === null
                    ? 'text-muted-foreground'
                    : score >= mastery ? 'text-emerald-700 font-semibold'
                    : 'text-amber-700';
                  return (
                    <td key={o.id} className={`p-3 text-center tabular-nums ${tone}`}>
                      {score !== null ? score.toFixed(1) : '—'}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </CardContent></Card>
  );
}

function NewOutcomeDialog({
  open, onOpenChange, courseId,
}: { open: boolean; onOpenChange: (o: boolean) => void; courseId: number }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ratings, setRatings] = useState<RatingDraft[]>(DEFAULT_RATINGS);
  const [mastery, setMastery] = useState(3);
  const create = useCreateOutcome(courseId);

  const updateRating = (i: number, patch: Partial<RatingDraft>) =>
    setRatings(ratings.map((r, j) => j === i ? { ...r, ...patch } : r));
  const addRating = () => setRatings([...ratings, { description: 'New rating', points: 0 }]);
  const removeRating = (i: number) => setRatings(ratings.filter((_, j) => j !== i));

  const submit = async () => {
    if (!title.trim()) return;
    try {
      await create.mutateAsync({
        title: title.trim(), description: description.trim() || undefined,
        mastery_points: mastery, ratings,
      });
      toast.success('Outcome created');
      setTitle(''); setDescription(''); setRatings(DEFAULT_RATINGS); setMastery(3);
      onOpenChange(false);
    } catch (e) {
      toast.error('Could not create outcome', { description: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New learning outcome</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Analyze musical form" autoFocus />
          </div>
          <div>
            <Label className="text-xs">Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div>
            <Label className="text-xs">Ratings</Label>
            <ul className="space-y-1.5 mt-1">
              {ratings.map((r, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Input value={r.description} onChange={(e) => updateRating(i, { description: e.target.value })} className="flex-1" />
                  <Input value={r.points} onChange={(e) => updateRating(i, { points: Number(e.target.value) || 0 })} type="number" className="w-20" />
                  <Button size="sm" variant="ghost" onClick={() => removeRating(i)} disabled={ratings.length === 1}><Trash2 className="w-3 h-3" /></Button>
                </li>
              ))}
            </ul>
            <Button size="sm" variant="outline" onClick={addRating} className="mt-1.5"><Plus className="w-3 h-3 mr-1" /> Add rating</Button>
          </div>
          <div>
            <Label className="text-xs">Mastery threshold (points)</Label>
            <Input value={mastery} onChange={(e) => setMastery(Number(e.target.value) || 0)} type="number" className="w-24" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={create.isPending || !title.trim()}>
              {create.isPending ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Creating…</> : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
