// /academy/grading — aggregated grading queue across every course the
// teacher owns. Each row opens a side dialog with a simple grader UI
// (score, feedback, mark graded). Filters: pending only / all / by course.

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  ClipboardCheck, ChevronRight, Loader2, Check, FileText, Music, Link as LinkIcon, ExternalLink, Filter, Zap, X,
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

type Submission = {
  id: string;
  status: string | null;
  submitted_at: string | null;
  graded_at: string | null;
  score_value: number | null;
  feedback: string | null;
  notes: string | null;
  recording_url: string | null;
  user_id: string;
  assignment_id: string;
  gw_assignments?: { id: string; title: string; points: number | null; course_id: string };
};

export default function GradingQueuePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialSubmissionId = searchParams.get('submission');
  const [filter, setFilter] = useState<'pending' | 'graded' | 'all'>('pending');
  const [openSubmission, setOpenSubmission] = useState<Submission | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function clearSelection() { setSelected(new Set()); }

  const { data: submissions = [], isLoading } = useQuery<Submission[]>({
    queryKey: ['grading-queue', filter],
    queryFn: async () => {
      let q = supabase
        .from('gw_assignment_submissions')
        .select('id, status, submitted_at, graded_at, score_value, feedback, notes, recording_url, user_id, assignment_id, gw_assignments!inner(id, title, points, course_id)')
        .order('submitted_at', { ascending: true })
        .limit(50);
      if (filter === 'pending') q = q.is('graded_at', null);
      if (filter === 'graded')  q = q.not('graded_at', 'is', null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Submission[];
    },
  });

  // Open submission from URL deep-link.
  useMemo(() => {
    if (initialSubmissionId && submissions.length > 0 && !openSubmission) {
      const found = submissions.find((s) => s.id === initialSubmissionId);
      if (found) setOpenSubmission(found);
    }
  }, [initialSubmissionId, submissions, openSubmission]);

  return (
    <UniversalLayout>
    <DashboardPageShell
      title="Grading Queue"
      subtitle="Submissions waiting on you, oldest first. Click a row to grade."
    >
      {/* Filter pills */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {(['pending', 'graded', 'all'] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? 'default' : 'outline'}
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f}
          </Button>
        ))}
      </div>

      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-5">
          {isLoading ? (
            <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div>
          ) : submissions.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {filter === 'pending' ? "You're caught up." : 'Nothing here.'}
            </div>
          ) : (
            <div className="space-y-2">
              {filter === 'pending' && submissions.length > 0 && (
                <div className="flex items-center gap-2 pb-2 border-b">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={selected.size > 0 && selected.size === submissions.length}
                    onChange={(e) => {
                      setSelected(e.target.checked ? new Set(submissions.map((s) => s.id)) : new Set());
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
                  </span>
                </div>
              )}
              {submissions.map((s) => (
                <SubmissionRow
                  key={s.id}
                  s={s}
                  selectable={filter === 'pending'}
                  isSelected={selected.has(s.id)}
                  onToggleSelect={() => toggleSelected(s.id)}
                  onOpen={() => setOpenSubmission(s)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating bulk-action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border shadow-2xl">
          <span className="text-sm font-semibold">{selected.size} selected</span>
          <Button size="sm" onClick={() => setBulkOpen(true)}>
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            Bulk grade
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      <GradingDialog
        open={!!openSubmission}
        onClose={() => setOpenSubmission(null)}
        submission={openSubmission}
        onGraded={() => {
          qc.invalidateQueries({ queryKey: ['grading-queue'] });
          qc.invalidateQueries({ queryKey: ['teacher-grading-queue'] });
          setOpenSubmission(null);
        }}
      />

      <BulkGradeDialog
        open={bulkOpen}
        submissions={submissions.filter((s) => selected.has(s.id))}
        onClose={() => setBulkOpen(false)}
        onApplied={() => {
          setBulkOpen(false);
          clearSelection();
          qc.invalidateQueries({ queryKey: ['grading-queue'] });
          qc.invalidateQueries({ queryKey: ['teacher-grading-queue'] });
        }}
      />
    </DashboardPageShell>
    </UniversalLayout>
  );
}

function BulkGradeDialog({
  open, submissions, onClose, onApplied,
}: {
  open: boolean;
  submissions: Submission[];
  onClose: () => void;
  onApplied: () => void;
}) {
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [mode, setMode] = useState<'fixed' | 'percent' | 'fullCredit'>('fixed');
  const [applying, setApplying] = useState(false);

  async function apply() {
    setApplying(true);
    let ok = 0;
    const failures: string[] = [];
    for (const s of submissions) {
      const max = s.gw_assignments?.points || 0;
      let finalScore: number | null = null;
      if (mode === 'fullCredit') {
        finalScore = max;
      } else if (mode === 'percent') {
        const pct = parseFloat(score);
        finalScore = Number.isFinite(pct) ? Math.round((pct / 100) * max) : 0;
      } else {
        const n = parseFloat(score);
        finalScore = Number.isFinite(n) ? n : 0;
      }
      const { error } = await supabase
        .from('gw_assignment_submissions')
        .update({
          score_value: finalScore,
          feedback: feedback.trim() || null,
          graded_at: new Date().toISOString(),
          status: 'graded',
        })
        .eq('id', s.id);
      if (error) failures.push(error.message);
      else ok++;
    }
    setApplying(false);
    if (ok > 0) {
      toast.success(`Graded ${ok}${failures.length ? ` · ${failures.length} failed` : ''}`);
      onApplied();
    }
    if (failures.length > 0) toast.error(failures[0]);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk grade · {submissions.length} submission{submissions.length === 1 ? '' : 's'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg border p-3 max-h-32 overflow-y-auto">
            <div className="text-xs font-semibold mb-1.5">Applying to:</div>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {submissions.slice(0, 8).map((s) => (
                <li key={s.id} className="truncate">• {s.gw_assignments?.title}</li>
              ))}
              {submissions.length > 8 && <li className="italic">… and {submissions.length - 8} more</li>}
            </ul>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Score mode</Label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={mode === 'fixed' ? 'default' : 'outline'}
                onClick={() => setMode('fixed')}
              >
                Same number
              </Button>
              <Button
                size="sm"
                variant={mode === 'percent' ? 'default' : 'outline'}
                onClick={() => setMode('percent')}
              >
                Percent
              </Button>
              <Button
                size="sm"
                variant={mode === 'fullCredit' ? 'default' : 'outline'}
                onClick={() => setMode('fullCredit')}
              >
                Full credit
              </Button>
            </div>
          </div>

          {mode !== 'fullCredit' && (
            <div className="space-y-1.5">
              <Label className="text-xs">{mode === 'percent' ? 'Percent (0–100)' : 'Score (raw number)'}</Label>
              <Input
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder={mode === 'percent' ? '90' : '10'}
              />
              <p className="text-sm text-muted-foreground">
                {mode === 'fixed' ? 'Each submission gets this score regardless of its max.'
                  : 'Each submission gets this percent of its own point value.'}
              </p>
            </div>
          )}
          {mode === 'fullCredit' && (
            <p className="text-xs text-muted-foreground">Each submission gets its full point value.</p>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Feedback (applied to all)</Label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              placeholder="Same comment for everyone in this batch (optional)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={apply} disabled={applying || (mode !== 'fullCredit' && !score)}>
            {applying ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Zap className="w-4 h-4 mr-1.5" />}
            Apply to {submissions.length}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubmissionRow({
  s, onOpen, selectable, isSelected, onToggleSelect,
}: {
  s: Submission;
  onOpen: () => void;
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}) {
  const isGraded = !!s.graded_at;
  const submitted = s.submitted_at ? parseISO(s.submitted_at) : null;
  return (
    <div className="flex items-center gap-2">
      {selectable && (
        <input
          type="checkbox"
          checked={!!isSelected}
          onChange={onToggleSelect}
          className="w-4 h-4 ml-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        />
      )}
    <button
      onClick={onOpen}
      className="w-full text-left flex items-center gap-3 p-3 rounded-xl border hover:bg-muted/40 transition"
    >
      <div className={cn(
        'w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0',
        isGraded ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
      )}>
        {isGraded ? <Check className="w-4 h-4" /> : <ClipboardCheck className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{s.gw_assignments?.title || 'Assignment'}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
          <span>{submitted ? `Submitted ${formatDistanceToNow(submitted, { addSuffix: true })}` : 'Submitted'}</span>
          {s.recording_url && <><span>•</span><span className="inline-flex items-center gap-1"><Music className="w-3 h-3" />Recording</span></>}
        </div>
      </div>
      {isGraded && (
        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
          {s.score_value ?? '?'} / {s.gw_assignments?.points ?? '?'}
        </Badge>
      )}
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
    </div>
  );
}

function GradingDialog({
  open, onClose, submission, onGraded,
}: {
  open: boolean; onClose: () => void; submission: Submission | null; onGraded: () => void;
}) {
  const [score, setScore] = useState<string>('');
  const [feedback, setFeedback] = useState('');

  useMemo(() => {
    if (submission) {
      setScore(submission.score_value?.toString() ?? '');
      setFeedback(submission.feedback ?? '');
    }
  }, [submission]);

  const save = useMutation({
    mutationFn: async () => {
      if (!submission) return;
      const numeric = parseFloat(score);
      const { error } = await supabase
        .from('gw_assignment_submissions')
        .update({
          score_value: Number.isFinite(numeric) ? numeric : null,
          feedback: feedback || null,
          graded_at: new Date().toISOString(),
          status: 'graded',
        })
        .eq('id', submission.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Graded.');
      onGraded();
    },
    onError: (e: any) => toast.error(e?.message || 'Save failed.'),
  });

  if (!submission) return null;
  const points = submission.gw_assignments?.points ?? null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Grade submission</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border p-3 space-y-1">
            <div className="text-xs text-muted-foreground">Assignment</div>
            <div className="font-semibold">{submission.gw_assignments?.title}</div>
            {points && <div className="text-xs text-muted-foreground">Out of {points} points</div>}
          </div>

          {submission.recording_url && (
            <div>
              <Label className="text-xs">Submitted recording</Label>
              <audio src={submission.recording_url} controls className="w-full mt-1.5" />
            </div>
          )}
          {submission.notes && (
            <div>
              <Label className="text-xs">Student notes</Label>
              <p className="text-sm bg-muted/40 rounded-md p-3 mt-1">{submission.notes}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Score</Label>
              <Input
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder={points ? `0 – ${points}` : 'Numeric score'}
              />
            </div>
            <div className="space-y-1.5 flex items-end">
              <p className="text-xs text-muted-foreground">
                {submission.submitted_at && format(parseISO(submission.submitted_at), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Feedback</Label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              placeholder="What did they do well? What should they work on?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Check className="w-4 h-4 mr-1.5" />}
            Save & mark graded
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
