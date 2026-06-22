// AI Grading add-on (per-course). Surfaces AI-drafted grades from the
// workspace-level Assessment Hub so the instructor can Accept / Override
// inside the course context. Drafts are stored in gw_ai_draft_grades.
//
// Workflow inside this panel:
//   1. Pick an assignment → see all draft grades with AI score + feedback
//   2. Accept → copy ai_total_score + ai_overall_feedback to the actual
//      gw_assignment_submissions row, mark as graded
//   3. Override → open the submission in the regular grading dialog
//      (we just navigate to /academy/grading?submission=<id>)
//
// AI generation itself happens through the existing Assessment Hub. This
// add-on focuses on the human review/approve step which is what teachers
// actually spend time on.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Brain, ChevronRight, ChevronDown, Loader2, Check, X, AlertCircle,
  Sparkles, ExternalLink, FileText,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SimpleMarkdown } from '@/components/markdown/SimpleMarkdown';

interface Props { courseId: string; canEdit: boolean; }

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

export default function AiGradingAddon({ courseId, canEdit }: Props) {
  const navigate = useNavigate();

  const { data: assignments = [] } = useQuery({
    queryKey: ['ai-grading-assignments', courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_assignments')
        .select('id, title, points, due_at, is_active')
        .eq('course_id', courseId)
        .order('due_at', { ascending: false, nullsFirst: false });
      return data ?? [];
    },
  });

  const { data: drafts = [] } = useQuery({
    queryKey: ['ai-grading-drafts', courseId],
    enabled: assignments.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_ai_draft_grades')
        .select('id, assignment_id, status, ai_total_score, ai_max_score, ai_percentage, instructor_reviewed_at')
        .eq('course_id', courseId);
      return data ?? [];
    },
  });

  const counts = useMemo(() => {
    const map = new Map<string, { pending: number; accepted: number; total: number }>();
    drafts.forEach((d: any) => {
      const cur = map.get(d.assignment_id) || { pending: 0, accepted: 0, total: 0 };
      cur.total++;
      if (d.instructor_reviewed_at || d.status === 'accepted' || d.status === 'overridden') cur.accepted++;
      else cur.pending++;
      map.set(d.assignment_id, cur);
    });
    return map;
  }, [drafts]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 inline-flex items-center justify-center">
          <Brain className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold">AI Grading Assist</h2>
          <p className="text-xs text-muted-foreground">
            AI-drafted scores for review. Accept to apply, override to grade manually.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => window.open('/admin/assessment-hub', '_blank')}>
          <Sparkles className="w-4 h-4 mr-1.5" /> Run AI grading <ExternalLink className="w-3 h-3 ml-1" />
        </Button>
      </div>

      {!canEdit && (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Only the instructor reviews AI grades.
          </CardContent>
        </Card>
      )}

      {canEdit && (assignments.length === 0 ? (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No assignments in this course yet.
          </CardContent>
        </Card>
      ) : (
        assignments.map((a: any) => {
          const c = counts.get(a.id) || { pending: 0, accepted: 0, total: 0 };
          return (
            <AssignmentBlock
              key={a.id}
              assignment={a}
              counts={c}
              courseId={courseId}
              onNavigateToManual={(submissionId) => navigate(`/academy/grading?submission=${submissionId}`)}
            />
          );
        })
      ))}
    </div>
  );
}

function AssignmentBlock({
  assignment, counts, courseId, onNavigateToManual,
}: {
  assignment: any;
  counts: { pending: number; accepted: number; total: number };
  courseId: string;
  onNavigateToManual: (submissionId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const due = assignment.due_at ? parseISO(assignment.due_at) : null;
  const hasPending = counts.pending > 0;
  const hasAny = counts.total > 0;

  return (
    <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
      <CardContent className="p-0">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full text-left p-4 flex items-center gap-3 hover:bg-muted/30 transition rounded-2xl"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 inline-flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate flex items-center gap-2 flex-wrap">
              {assignment.title}
              {!assignment.is_active && <Badge variant="outline" className="text-xs">Draft</Badge>}
            </div>
            <div className="text-sm text-muted-foreground">
              {due ? `Due ${format(due, 'MMM d')}` : 'No due date'}
              {assignment.points ? ` · ${assignment.points} pts` : ''}
            </div>
          </div>
          {hasAny ? (
            <div className="inline-flex items-center gap-1.5">
              {counts.pending > 0 && (
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                  {counts.pending} pending
                </Badge>
              )}
              {counts.accepted > 0 && (
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                  {counts.accepted} done
                </Badge>
              )}
            </div>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">No drafts</Badge>
          )}
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>

        {expanded && (
          <div className="border-t border-border p-4 bg-background/40">
            <DraftsList
              assignmentId={assignment.id}
              maxPoints={assignment.points}
              courseId={courseId}
              onNavigateToManual={onNavigateToManual}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DraftsList({
  assignmentId, maxPoints, courseId, onNavigateToManual,
}: {
  assignmentId: string;
  maxPoints: number | null;
  courseId: string;
  onNavigateToManual: (submissionId: string) => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ['ai-drafts-detail', assignmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_ai_draft_grades')
        .select('id, submission_id, student_id, ai_total_score, ai_max_score, ai_percentage, ai_letter_grade, ai_overall_feedback, ai_strengths, ai_improvements, ai_detection_flagged, status, instructor_reviewed_at')
        .eq('assignment_id', assignmentId)
        .order('created_at', { ascending: true });
      return data ?? [];
    },
  });

  const studentIds = Array.from(new Set(drafts.map((d: any) => d.student_id).filter(Boolean)));
  const { data: profiles = [] } = useQuery({
    queryKey: ['ai-drafts-profiles', studentIds.join(',')],
    enabled: studentIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_profiles_directory')
        .select('user_id, full_name, email')
        .in('user_id', studentIds);
      return data ?? [];
    },
  });
  const profMap = new Map(profiles.map((p: any) => [p.user_id, p]));

  const accept = useMutation({
    mutationFn: async (draft: any) => {
      // Copy AI's verdict into the actual gradebook row.
      const { error: subErr } = await supabase
        .from('gw_assignment_submissions')
        .update({
          score_value: draft.ai_total_score,
          feedback: draft.ai_overall_feedback,
          graded_at: new Date().toISOString(),
          status: 'graded',
          ai_feedback: draft.ai_overall_feedback,
        })
        .eq('id', draft.submission_id);
      if (subErr) throw subErr;

      // Mark the AI draft as accepted.
      const { error: draftErr } = await supabase
        .from('gw_ai_draft_grades')
        .update({
          status: 'accepted',
          instructor_reviewed_at: new Date().toISOString(),
          instructor_id: user?.id,
        })
        .eq('id', draft.id);
      if (draftErr) throw draftErr;
    },
    onSuccess: () => {
      toast.success('AI grade accepted.');
      qc.invalidateQueries({ queryKey: ['ai-drafts-detail', assignmentId] });
      qc.invalidateQueries({ queryKey: ['ai-grading-drafts', courseId] });
      qc.invalidateQueries({ queryKey: ['grading-queue'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Accept failed.'),
  });

  const reject = useMutation({
    mutationFn: async (draft: any) => {
      const { error } = await supabase
        .from('gw_ai_draft_grades')
        .update({
          status: 'rejected',
          instructor_reviewed_at: new Date().toISOString(),
          instructor_id: user?.id,
        })
        .eq('id', draft.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-drafts-detail', assignmentId] }),
  });

  if (isLoading) return <div className="py-6 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div>;
  if (drafts.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        No AI drafts for this assignment yet. Run AI grading from the Assessment Hub.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {drafts.map((d: any) => {
        const prof: any = profMap.get(d.student_id) || {};
        const reviewed = !!d.instructor_reviewed_at || d.status === 'accepted' || d.status === 'rejected';
        const pct = d.ai_max_score > 0 ? Math.round((d.ai_total_score / d.ai_max_score) * 100) : null;
        return (
          <div key={d.id} className="rounded-xl border p-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">
                  {prof.full_name || prof.email || 'Student'}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                  AI: <span className="font-medium">{d.ai_total_score}/{d.ai_max_score || maxPoints || '?'}</span>
                  {pct !== null && (
                    <span className={cn(
                      'inline-flex items-center px-1.5 rounded-full text-xs border',
                      pct >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : pct >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200',
                    )}>
                      {pct}%
                    </span>
                  )}
                  {d.ai_letter_grade && <Badge variant="outline" className="text-xs">{d.ai_letter_grade}</Badge>}
                  {d.ai_detection_flagged && (
                    <Badge variant="outline" className="text-xs bg-rose-50 text-rose-700 border-rose-200 inline-flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> AI-generated detected
                    </Badge>
                  )}
                  {reviewed && (
                    <Badge variant="outline" className={cn(
                      'text-xs',
                      d.status === 'accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'text-muted-foreground',
                    )}>
                      {d.status === 'accepted' ? 'Accepted' : d.status === 'rejected' ? 'Rejected' : 'Reviewed'}
                    </Badge>
                  )}
                </div>
              </div>
              {!reviewed && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => onNavigateToManual(d.submission_id)}>
                    Override
                  </Button>
                  <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => reject.mutate(d)} disabled={reject.isPending}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" onClick={() => accept.mutate(d)} disabled={accept.isPending}>
                    {accept.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
                    Accept
                  </Button>
                </div>
              )}
            </div>
            {d.ai_overall_feedback && (
              <div className="mt-3 rounded-lg bg-muted/30 p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">AI feedback</div>
                <SimpleMarkdown source={d.ai_overall_feedback} className="text-xs" />
              </div>
            )}
            {(d.ai_strengths || d.ai_improvements) && (
              <div className="mt-2 grid sm:grid-cols-2 gap-2 text-xs">
                {d.ai_strengths && (
                  <div className="rounded-md border bg-emerald-50/30 p-2">
                    <div className="text-xs uppercase font-semibold text-emerald-700 mb-1">Strengths</div>
                    <div>{d.ai_strengths}</div>
                  </div>
                )}
                {d.ai_improvements && (
                  <div className="rounded-md border bg-amber-50/30 p-2">
                    <div className="text-xs uppercase font-semibold text-amber-700 mb-1">Improvements</div>
                    <div>{d.ai_improvements}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
