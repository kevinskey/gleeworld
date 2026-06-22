// /academy/c/:code/test/:testId/attempts/:attemptId — instructor review of
// one student's attempt. Shows each question + the student's response +
// the auto-grader verdict; instructor can override correctness and points
// per question, then recompute the attempt total.

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Check, X, Loader2, Award, Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

export default function QuizAttemptDetailPage() {
  const { code, testId, attemptId } = useParams<{ code: string; testId: string; attemptId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: attempt } = useQuery({
    queryKey: ['attempt', attemptId],
    enabled: !!attemptId,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_course_test_attempts')
        .select('id, test_id, user_id, started_at, submitted_at, score, max_score, is_graded, attempt_number')
        .eq('id', attemptId!)
        .maybeSingle();
      return data;
    },
  });

  const { data: student } = useQuery({
    queryKey: ['attempt-student', attempt?.user_id],
    enabled: !!attempt?.user_id,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_profiles_directory')
        .select('user_id, full_name, email')
        .eq('user_id', attempt!.user_id)
        .maybeSingle();
      return data;
    },
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['attempt-questions', testId],
    enabled: !!testId,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_course_test_questions')
        .select('id, position, question_type, prompt, options, correct_answer, points, explanation')
        .eq('test_id', testId!)
        .order('position');
      return data ?? [];
    },
  });

  const { data: answers = [] } = useQuery({
    queryKey: ['attempt-answers', attemptId],
    enabled: !!attemptId,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_course_test_answers')
        .select('id, question_id, answer, is_correct, points_earned')
        .eq('attempt_id', attemptId!);
      return data ?? [];
    },
  });

  const answerByQ = new Map(answers.map((a: any) => [a.question_id, a]));

  // Override correctness + points for a single answer.
  const grade = useMutation({
    mutationFn: async ({ answerId, questionId, isCorrect, points, attemptIdLocal }: {
      answerId?: string;
      questionId: string;
      isCorrect: boolean;
      points: number;
      attemptIdLocal: string;
    }) => {
      if (answerId) {
        const { error } = await supabase
          .from('gw_course_test_answers')
          .update({
            is_correct: isCorrect,
            points_earned: points,
            graded_at: new Date().toISOString(),
            graded_by: user?.id,
          })
          .eq('id', answerId);
        if (error) throw error;
      } else {
        // No answer row exists (student didn't respond). Create a zero-credit row.
        const { error } = await supabase
          .from('gw_course_test_answers')
          .insert({
            attempt_id: attemptIdLocal,
            question_id: questionId,
            answer: null,
            is_correct: isCorrect,
            points_earned: points,
            graded_at: new Date().toISOString(),
            graded_by: user?.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attempt-answers', attemptId] }),
    onError: (e: any) => toast.error(e?.message || 'Save failed.'),
  });

  // Recompute the attempt total based on current per-answer points_earned.
  const recompute = useMutation({
    mutationFn: async () => {
      if (!attempt || !attemptId) return;
      const total = answers.reduce((s: number, a: any) => s + (a.points_earned || 0), 0);
      const max = questions.reduce((s: number, q: any) => s + (q.points || 0), 0);
      const { error } = await supabase
        .from('gw_course_test_attempts')
        .update({
          score: total,
          max_score: max,
          is_graded: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', attemptId);
      if (error) throw error;
      return { total, max };
    },
    onSuccess: () => {
      toast.success('Score updated.');
      qc.invalidateQueries({ queryKey: ['attempt', attemptId] });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed.'),
  });

  if (!attempt) {
    return <div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div>;
  }

  const pct = attempt.is_graded && attempt.max_score > 0
    ? Math.round((attempt.score / attempt.max_score) * 100) : null;

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/academy/c/${code}/test/${testId}/attempts`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground">Reviewing attempt</div>
          <h1 className="text-2xl font-bold tracking-tight">
            {student?.full_name || student?.email || 'Student'}
          </h1>
          {attempt.attempt_number > 1 && <div className="text-xs text-muted-foreground">Attempt #{attempt.attempt_number}</div>}
        </div>
        {pct !== null && (
          <div className={cn(
            'text-right',
            pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-rose-600',
          )}>
            <div className="text-2xl font-bold">{pct}%</div>
            <div className="text-xs text-muted-foreground">{attempt.score}/{attempt.max_score}</div>
          </div>
        )}
      </div>

      {questions.map((q: any, idx: number) => {
        const a: any = answerByQ.get(q.id);
        return (
          <AnswerCard
            key={q.id}
            index={idx}
            question={q}
            answer={a}
            attemptId={attempt.id}
            onSave={(isCorrect, points) =>
              grade.mutate({
                answerId: a?.id,
                questionId: q.id,
                isCorrect,
                points,
                attemptIdLocal: attempt.id,
              })
            }
          />
        );
      })}

      <div className="sticky bottom-4 flex justify-end">
        <Button size="lg" onClick={() => recompute.mutate()} disabled={recompute.isPending} className="font-semibold shadow-lg">
          {recompute.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save final score
        </Button>
      </div>
    </div>
  );
}

function AnswerCard({
  index, question, answer, attemptId, onSave,
}: {
  index: number;
  question: any;
  answer: any | undefined;
  attemptId: string;
  onSave: (isCorrect: boolean, points: number) => void;
}) {
  const [points, setPoints] = useState<string>(
    answer?.points_earned?.toString() ?? '0',
  );
  const studentSaid = answer?.answer;
  const isCorrect = answer?.is_correct;

  const displayStudent = useMemo(() => formatAnswer(studentSaid, question), [studentSaid, question]);
  const displayCorrect = useMemo(() => formatAnswer(question.correct_answer, question), [question]);

  return (
    <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">Q{index + 1}</Badge>
          <Badge variant="outline" className="text-xs capitalize">{question.question_type.replace('_', ' ')}</Badge>
          <Badge variant="outline" className="text-xs">{question.points} pt{question.points === 1 ? '' : 's'}</Badge>
          <div className="flex-1" />
          {isCorrect === true && <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Correct</Badge>}
          {isCorrect === false && <Badge variant="outline" className="text-xs bg-rose-50 text-rose-700 border-rose-200">Wrong</Badge>}
          {isCorrect === null && answer && <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">Needs review</Badge>}
          {!answer && <Badge variant="outline" className="text-xs text-muted-foreground">No response</Badge>}
        </div>
        <div className="text-sm whitespace-pre-wrap">{question.prompt}</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">Student's answer</div>
            <div className="text-sm">{displayStudent || <span className="italic text-muted-foreground">—</span>}</div>
          </div>
          <div className="rounded-lg border bg-emerald-50/30 p-3">
            <div className="text-xs uppercase tracking-wide text-emerald-700 font-semibold mb-1">Correct answer</div>
            <div className="text-sm">{displayCorrect || <span className="italic text-muted-foreground">—</span>}</div>
          </div>
        </div>

        {question.explanation && (
          <div className="text-xs text-muted-foreground italic">{question.explanation}</div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <span className="text-xs text-muted-foreground">Override:</span>
          <Input
            type="number"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="w-20 h-8"
            placeholder="0"
          />
          <span className="text-xs text-muted-foreground">/ {question.points}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSave(false, 0)}
          >
            <X className="w-3.5 h-3.5 mr-1" /> Mark wrong
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSave(true, question.points)}
          >
            <Check className="w-3.5 h-3.5 mr-1" /> Mark correct
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const n = parseFloat(points);
              const final = Number.isFinite(n) ? Math.max(0, Math.min(question.points, n)) : 0;
              onSave(final > 0, final);
            }}
          >
            <Save className="w-3.5 h-3.5 mr-1" /> Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function formatAnswer(value: any, question: any): string {
  if (value === null || value === undefined) return '';
  if (question.question_type === 'multiple_choice') {
    const opt = (question.options || []).find((o: any) => o.id === value);
    return opt ? `${value.toUpperCase()}. ${opt.text}` : String(value);
  }
  if (question.question_type === 'multi_select') {
    const ids = Array.isArray(value) ? value : [];
    return ids
      .map((id) => {
        const opt = (question.options || []).find((o: any) => o.id === id);
        return opt ? `${id.toUpperCase()}. ${opt.text}` : id;
      })
      .join(', ');
  }
  if (question.question_type === 'true_false') {
    return value === true ? 'True' : value === false ? 'False' : '';
  }
  if (question.question_type === 'short_answer') {
    if (Array.isArray(value)) return value.join(' / ');
    return String(value);
  }
  return JSON.stringify(value);
}
