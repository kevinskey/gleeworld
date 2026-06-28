// Canvas-backed rubric authoring. List + create + edit + delete.
// Single page handles all three states based on ?id=:rubricId.

import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, ArrowLeft, AlertCircle, Plus, Trash2, ListChecks } from 'lucide-react';
import {
  useCanvasCourse, useCanvasRubrics, useCanvasRubric, useSaveRubric, useDeleteRubric,
} from '@/hooks/useCanvasAcademy';
import { toast } from 'sonner';

interface RatingDraft { description: string; points: number }
interface CriterionDraft { description: string; long_description: string; points: number; ratings: RatingDraft[] }

const DEFAULT_RATINGS: RatingDraft[] = [
  { description: 'Excellent', points: 5 },
  { description: 'Adequate', points: 3 },
  { description: 'Needs work', points: 1 },
  { description: 'No credit', points: 0 },
];

export default function CanvasRubricsPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId ? Number(params.courseId) : null;
  const [search] = useSearchParams();
  const rubricIdParam = search.get('id');
  const isNew = search.get('new') === '1';
  const rubricId = rubricIdParam ? Number(rubricIdParam) : null;
  const editing = isNew || rubricId !== null;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto space-y-5">
      <div>
        <Link to={`/academy/canvas/courses/${courseId}`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Back to course
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-1">Rubrics</h1>
      </div>

      {editing
        ? <RubricEditor courseId={courseId!} rubricId={rubricId} />
        : <RubricList courseId={courseId!} />}
    </div>
  );
}

function RubricList({ courseId }: { courseId: number }) {
  const { data, isLoading } = useCanvasRubrics(courseId);
  const del = useDeleteRubric(courseId);

  if (isLoading) return <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>;
  if (!data || 'error' in data) return <div className="text-sm text-destructive">Could not load rubrics.</div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link to={`?new=1`}>
          <Button size="sm"><Plus className="w-3.5 h-3.5 mr-1" /> New rubric</Button>
        </Link>
      </div>
      {data.rubrics.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-10 text-center text-sm text-muted-foreground space-y-2">
          <ListChecks className="w-6 h-6 mx-auto opacity-40" />
          <p>No rubrics yet. Create one to attach to assignments for consistent grading.</p>
        </CardContent></Card>
      ) : (
        <ul className="space-y-2">
          {data.rubrics.map((r) => (
            <li key={r.id} className="flex items-center gap-2">
              <Link to={`?id=${r.id}`} className="flex-1">
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3 flex items-center gap-3">
                    <ListChecks className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{r.title}</div>
                      <div className="text-xs text-muted-foreground">{r.points_possible} pts</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Button size="sm" variant="ghost" onClick={async () => {
                if (!confirm(`Delete "${r.title}"?`)) return;
                try { await del.mutateAsync(r.id); toast.success('Deleted'); }
                catch (e) { toast.error('Could not delete', { description: e instanceof Error ? e.message : String(e) }); }
              }}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RubricEditor({ courseId, rubricId }: { courseId: number; rubricId: number | null }) {
  const existing = useCanvasRubric(courseId, rubricId);
  const courseQ = useCanvasCourse(courseId);
  const save = useSaveRubric(courseId);

  const [title, setTitle] = useState('');
  const [freeForm, setFreeForm] = useState(false);
  const [criteria, setCriteria] = useState<CriterionDraft[]>([
    { description: 'Criterion 1', long_description: '', points: 5, ratings: [...DEFAULT_RATINGS] },
  ]);
  const [attachTo, setAttachTo] = useState<string>('');

  useEffect(() => {
    if (existing.data && 'ok' in existing.data) {
      const r = existing.data.rubric;
      setTitle(r.title);
      setFreeForm(r.free_form_criterion_comments);
      setCriteria(r.data.map((c) => ({
        description: c.description,
        long_description: c.long_description ?? '',
        points: c.points,
        ratings: c.ratings.map((rt) => ({ description: rt.description, points: rt.points })),
      })));
    }
  }, [existing.data]);

  const addCriterion = () => setCriteria([
    ...criteria,
    { description: `Criterion ${criteria.length + 1}`, long_description: '', points: 5, ratings: [...DEFAULT_RATINGS] },
  ]);
  const removeCriterion = (i: number) => setCriteria(criteria.filter((_, j) => j !== i));
  const updateCriterion = (i: number, patch: Partial<CriterionDraft>) =>
    setCriteria(criteria.map((c, j) => j === i ? { ...c, ...patch } : c));
  const updateRating = (i: number, j: number, patch: Partial<RatingDraft>) => {
    setCriteria(criteria.map((c, ci) => ci !== i ? c : {
      ...c, ratings: c.ratings.map((r, rj) => rj === j ? { ...r, ...patch } : r),
    }));
  };
  const addRating = (i: number) => setCriteria(criteria.map((c, j) => j !== i ? c : {
    ...c, ratings: [...c.ratings, { description: 'New rating', points: 0 }],
  }));
  const removeRating = (i: number, j: number) => setCriteria(criteria.map((c, ci) => ci !== i ? c : {
    ...c, ratings: c.ratings.filter((_, rj) => rj !== j),
  }));

  const totalPoints = criteria.reduce((s, c) => s + c.points, 0);

  const onSave = async () => {
    if (!title.trim() || criteria.length === 0) return;
    try {
      await save.mutateAsync({
        ...(rubricId ? { rubric_id: rubricId } : {}),
        title: title.trim(),
        free_form_criterion_comments: freeForm,
        criteria: criteria.map((c) => ({
          description: c.description, long_description: c.long_description,
          points: c.points,
          ratings: c.ratings.map((r) => ({ description: r.description, points: r.points })),
        })),
        ...(attachTo ? { assignment_id: Number(attachTo) } : {}),
      });
      toast.success(rubricId ? 'Rubric updated' : 'Rubric created');
    } catch (e) {
      toast.error('Could not save', { description: e instanceof Error ? e.message : String(e) });
    }
  };

  if (rubricId && existing.isLoading) {
    return <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading rubric…</div>;
  }

  const assignments = courseQ.data && 'ok' in courseQ.data ? courseQ.data.assignments : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Essay rubric" autoFocus />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Allow free-form comments instead of fixed ratings</Label>
            <Switch checked={freeForm} onCheckedChange={setFreeForm} />
          </div>
          {!rubricId && (
            <div>
              <Label className="text-xs">Attach to assignment (optional)</Label>
              <Select value={attachTo} onValueChange={setAttachTo}>
                <SelectTrigger><SelectValue placeholder="Don't attach" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Don't attach</SelectItem>
                  {assignments.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Criteria</h3>
        <div className="text-xs text-muted-foreground">Total: {totalPoints} pts</div>
      </div>

      <ul className="space-y-3">
        {criteria.map((c, i) => (
          <li key={i}>
            <Card><CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={c.description}
                  onChange={(e) => updateCriterion(i, { description: e.target.value })}
                  placeholder="Criterion description"
                  className="flex-1"
                />
                <Input
                  value={c.points}
                  onChange={(e) => updateCriterion(i, { points: Number(e.target.value) || 0 })}
                  type="number" min="0" className="w-20"
                />
                <span className="text-xs text-muted-foreground">pts</span>
                <Button size="sm" variant="ghost" onClick={() => removeCriterion(i)} disabled={criteria.length === 1}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <Textarea
                value={c.long_description}
                onChange={(e) => updateCriterion(i, { long_description: e.target.value })}
                placeholder="Long description (optional)" rows={2}
              />
              <div className="space-y-1.5">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ratings</div>
                {c.ratings.map((r, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <Input
                      value={r.description}
                      onChange={(e) => updateRating(i, j, { description: e.target.value })}
                      placeholder="Rating description"
                      className="flex-1"
                    />
                    <Input
                      value={r.points}
                      onChange={(e) => updateRating(i, j, { points: Number(e.target.value) || 0 })}
                      type="number" className="w-20"
                    />
                    <Button size="sm" variant="ghost" onClick={() => removeRating(i, j)} disabled={c.ratings.length === 1}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => addRating(i)}>
                  <Plus className="w-3 h-3 mr-1" /> Add rating
                </Button>
              </div>
            </CardContent></Card>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={addCriterion}>
          <Plus className="w-4 h-4 mr-1" /> Add criterion
        </Button>
        <div className="flex gap-2">
          <Link to="?"><Button variant="ghost">Cancel</Button></Link>
          <Button onClick={onSave} disabled={save.isPending || !title.trim() || criteria.length === 0}>
            {save.isPending ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving…</> : 'Save rubric'}
          </Button>
        </div>
      </div>
    </div>
  );
}
