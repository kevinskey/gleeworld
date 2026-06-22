// /academy/c/:code/test/:testId/take — student test-taking surface.
// Loads questions (RLS hides correct_answer? no, but we just don't show
// it in the UI), opens/upserts an attempt row, lets the student answer
// each question, and calls grade_test_attempt on submit.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Send, Loader2, Check, X, Clock, Award, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

type QType = 'multiple_choice' | 'multi_select' | 'true_false' | 'short_answer';

interface Question {
  id: string;
  question_type: QType;
  prompt: string;
  options: { id: string; text: string }[] | null;
  points: number;
}

interface Test {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  duration_minutes: number | null;
  available_from: string | null;
  available_until: string | null;
  allow_retakes: boolean;
  max_attempts: number;
  show_results_immediately: boolean;
  randomize_questions: boolean;
  is_published: boolean;
  total_points: number | null;
}

export default function QuizTakingPage() {
  const { code, testId } = useParams<{ code: string; testId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; max_score: number } | null>(null);

  const { data: test, isLoading: testLoading } = useQuery<Test | null>({
    queryKey: ['test-take', testId],
    enabled: !!testId,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_course_tests')
        .select('*')
        .eq('id', testId!)
        .maybeSingle();
      return data as Test | null;
    },
  });

  const { data: questions = [], isLoading: qLoading } = useQuery<Question[]>({
    queryKey: ['test-take-questions', testId],
    enabled: !!testId,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_course_test_questions')
        .select('id, question_type, prompt, options, points')   // omit correct_answer
        .eq('test_id', testId!)
        .order('position');
      return ((data ?? []) as Question[]);
    },
  });

  const displayQuestions = test?.randomize_questions
    ? [...questions].sort(() => Math.random() - 0.5)
    : questions;

  // Open or reuse the latest non-submitted attempt for this user.
  useEffect(() => {
    if (!user || !testId) return;
    let cancelled = false;
    (async () => {
      const { data: existing } = await supabase
        .from('gw_course_test_attempts')
        .select('id, submitted_at, score, max_score')
        .eq('test_id', testId)
        .eq('user_id', user.id)
        .order('attempt_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;

      if (existing && !existing.submitted_at) {
        setAttemptId(existing.id);
      } else if (existing && existing.submitted_at && !test?.allow_retakes) {
        // Already submitted; show result.
        setResult({ score: existing.score ?? 0, max_score: existing.max_score ?? 0 });
        setAttemptId(existing.id);
      } else {
        const nextNumber = ((existing?.submitted_at ? 1 : 0) + 1);
        const { data: created } = await supabase
          .from('gw_course_test_attempts')
          .insert({
            test_id: testId,
            user_id: user.id,
            attempt_number: existing?.submitted_at ? nextNumber : 1,
          })
          .select('id')
          .single();
        if (created) setAttemptId(created.id);
      }
    })();
    return () => { cancelled = true; };
  }, [user, testId, test?.allow_retakes]);

  async function setAnswer(questionId: string, value: any) {
    setAnswers((a) => ({ ...a, [questionId]: value }));
    if (!attemptId) return;
    // Upsert the answer for live save.
    await supabase
      .from('gw_course_test_answers')
      .upsert({
        attempt_id: attemptId,
        question_id: questionId,
        answer: value,
      }, { onConflict: 'attempt_id,question_id' });
  }

  async function submit() {
    if (!attemptId) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('grade_test_attempt', { p_attempt_id: attemptId });
      if (error) throw error;
      const r = data as { score: number; max_score: number };
      setResult(r);
      toast.success('Submitted.');
      qc.invalidateQueries({ queryKey: ['test-take', testId] });
    } catch (e: any) {
      toast.error(e?.message || 'Submit failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (testLoading || qLoading) {
    return <div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div>;
  }
  if (!test) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Quiz not found.</div>;
  }
  if (!test.is_published) {
    return (
      <div className="px-6 py-10 max-w-2xl mx-auto">
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <h2 className="font-semibold">Not yet available</h2>
            <p className="text-sm text-muted-foreground">Your instructor hasn't published this quiz.</p>
            <Button variant="outline" onClick={() => navigate(`/academy/c/${code}`)}>Back to course</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (result) {
    const pct = result.max_score > 0 ? Math.round((result.score / result.max_score) * 100) : 0;
    return (
      <div className="px-6 py-10 max-w-2xl mx-auto">
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-8 text-center space-y-3">
            <div className={cn(
              'w-16 h-16 rounded-2xl inline-flex items-center justify-center',
              pct >= 80 ? 'bg-emerald-50 text-emerald-600' :
              pct >= 60 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600',
            )}>
              <Award className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold">{result.score} / {result.max_score}</h2>
            <p className="text-sm text-muted-foreground">{pct}% on "{test.title}"</p>
            {!test.show_results_immediately && (
              <p className="text-xs text-muted-foreground italic">Some questions may still need manual grading.</p>
            )}
            <Button onClick={() => navigate(`/academy/c/${code}`)}>Back to course</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/academy/c/${code}?tab=quizzes`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{test.title}</h1>
          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
            {test.duration_minutes && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{test.duration_minutes} min</span>}
            <span>•</span>
            <span>{test.total_points || displayQuestions.reduce((s, q) => s + (q.points || 0), 0)} pts</span>
            <span>•</span>
            <span>{displayQuestions.length} question{displayQuestions.length === 1 ? '' : 's'}</span>
          </div>
        </div>
      </div>

      {test.instructions && (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-4 text-sm whitespace-pre-wrap">{test.instructions}</CardContent>
        </Card>
      )}

      {displayQuestions.length === 0 ? (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            This quiz doesn't have any questions yet.
          </CardContent>
        </Card>
      ) : (
        displayQuestions.map((q, i) => (
          <Card key={q.id} className={SOFT_CARD} style={SOFT_CARD_STYLE}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="text-xs mt-0.5">Q{i + 1}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-sm whitespace-pre-wrap">{q.prompt}</div>
                  <div className="text-xs text-muted-foreground mt-1">{q.points} pt{q.points === 1 ? '' : 's'}</div>
                </div>
              </div>
              <QuestionInput
                question={q}
                value={answers[q.id]}
                onChange={(v) => setAnswer(q.id, v)}
              />
            </CardContent>
          </Card>
        ))
      )}

      {displayQuestions.length > 0 && (
        <div className="flex items-center justify-end pt-2 sticky bottom-4">
          <Button size="lg" onClick={submit} disabled={submitting} className="font-semibold shadow-lg">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Submit quiz
          </Button>
        </div>
      )}
    </div>
  );
}

function QuestionInput({
  question, value, onChange,
}: {
  question: Question;
  value: any;
  onChange: (v: any) => void;
}) {
  if (question.question_type === 'multiple_choice') {
    return (
      <div className="space-y-2">
        {(question.options ?? []).map((opt) => {
          const selected = value === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={cn(
                'w-full text-left p-3 rounded-lg border transition',
                selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40',
              )}
            >
              <div className="flex items-start gap-2">
                <div className={cn(
                  'w-5 h-5 rounded-full border inline-flex items-center justify-center shrink-0 mt-0.5',
                  selected ? 'border-primary' : 'border-muted-foreground',
                )}>
                  {selected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
                <div className="text-sm flex-1">{opt.text}</div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }
  if (question.question_type === 'multi_select') {
    const cur = Array.isArray(value) ? value as string[] : [];
    return (
      <div className="space-y-2">
        {(question.options ?? []).map((opt) => {
          const selected = cur.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => {
                const next = selected ? cur.filter((x) => x !== opt.id) : [...cur, opt.id];
                onChange(next);
              }}
              className={cn(
                'w-full text-left p-3 rounded-lg border transition',
                selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40',
              )}
            >
              <div className="flex items-start gap-2">
                <div className={cn(
                  'w-5 h-5 rounded border inline-flex items-center justify-center shrink-0 mt-0.5',
                  selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground',
                )}>
                  {selected && <Check className="w-3 h-3" />}
                </div>
                <div className="text-sm flex-1">{opt.text}</div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }
  if (question.question_type === 'true_false') {
    return (
      <div className="inline-flex gap-2">
        <Button
          variant={value === true ? 'default' : 'outline'}
          onClick={() => onChange(true)}
        >
          <Check className="w-4 h-4 mr-1.5" /> True
        </Button>
        <Button
          variant={value === false ? 'default' : 'outline'}
          onClick={() => onChange(false)}
        >
          <X className="w-4 h-4 mr-1.5" /> False
        </Button>
      </div>
    );
  }
  if (question.question_type === 'short_answer') {
    return (
      <Input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Your answer…"
      />
    );
  }
  return null;
}
