// /academy/c/:code/test/:testId/questions — instructor question builder.
// Adds, edits, reorders, deletes questions for a test. Supports MC, T/F,
// multi-select, and short-answer; correct answer is part of the row so
// the auto-grader can score on submission.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save, Loader2, ListChecks,
  Check, X,
} from 'lucide-react';
import { ConfirmDeleteButton } from '@/components/shared/ConfirmDeleteButton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

type QType = 'multiple_choice' | 'multi_select' | 'true_false' | 'short_answer';

interface Question {
  id: string;
  test_id: string;
  position: number;
  question_type: QType;
  prompt: string;
  options: { id: string; text: string }[] | null;
  correct_answer: any;
  explanation: string | null;
  points: number;
}

export default function QuizQuestionsPage() {
  const { code, testId } = useParams<{ code: string; testId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: test } = useQuery({
    queryKey: ['test', testId],
    enabled: !!testId,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_course_tests')
        .select('id, title, total_points, course_id')
        .eq('id', testId!)
        .maybeSingle();
      return data;
    },
  });

  const { data: questions = [], isLoading } = useQuery<Question[]>({
    queryKey: ['test-questions', testId],
    enabled: !!testId,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_course_test_questions')
        .select('*')
        .eq('test_id', testId!)
        .order('position');
      return (data ?? []) as Question[];
    },
  });

  const add = useMutation({
    mutationFn: async (type: QType) => {
      const { data: existing } = await supabase
        .from('gw_course_test_questions')
        .select('position')
        .eq('test_id', testId!)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextPos = (existing?.position ?? -1) + 1;

      let options: any = null;
      let correct: any = null;
      if (type === 'multiple_choice' || type === 'multi_select') {
        options = [
          { id: 'a', text: '' },
          { id: 'b', text: '' },
          { id: 'c', text: '' },
          { id: 'd', text: '' },
        ];
        correct = type === 'multiple_choice' ? null : [];
      } else if (type === 'true_false') {
        correct = true;
      } else if (type === 'short_answer') {
        correct = [''];
      }

      const { error } = await supabase
        .from('gw_course_test_questions')
        .insert({
          test_id: testId,
          position: nextPos,
          question_type: type,
          prompt: '',
          options,
          correct_answer: correct,
          points: 1,
        });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['test-questions', testId] }),
    onError: (e: any) => toast.error(e?.message || 'Add failed.'),
  });

  const totalPoints = questions.reduce((s, q) => s + (q.points || 0), 0);

  return (
    <DashboardPageShell
      maxWidth="4xl"
      title={test?.title ?? 'Quiz'}
      subtitle={`${questions.length} question${questions.length === 1 ? '' : 's'} · ${totalPoints} pts total`}
    >
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/academy/c/${code}?tab=quizzes`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="text-xs text-muted-foreground">Question builder</div>
      </div>

      {isLoading ? (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}><CardContent className="p-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></CardContent></Card>
      ) : (
        <>
          {questions.map((q, idx) => (
            <QuestionEditor
              key={q.id}
              question={q}
              index={idx}
              isFirst={idx === 0}
              isLast={idx === questions.length - 1}
              onChanged={() => qc.invalidateQueries({ queryKey: ['test-questions', testId] })}
            />
          ))}

          <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
            <CardContent className="p-4">
              <Label className="text-xs mb-2 block">Add a question</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  ['multiple_choice', 'Multiple choice'],
                  ['multi_select',    'Multi-select'],
                  ['true_false',      'True / False'],
                  ['short_answer',    'Short answer'],
                ].map(([type, label]) => (
                  <Button
                    key={type}
                    variant="outline"
                    size="sm"
                    onClick={() => add.mutate(type as QType)}
                    disabled={add.isPending}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />{label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </DashboardPageShell>
  );
}

function QuestionEditor({
  question, index, isFirst, isLast, onChanged,
}: {
  question: Question;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onChanged: () => void;
}) {
  const [form, setForm] = useState<Question>(question);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setForm(question); setDirty(false); }, [question]);

  function update(patch: Partial<Question>) {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  }

  async function save() {
    const { error } = await supabase
      .from('gw_course_test_questions')
      .update({
        prompt: form.prompt,
        options: form.options,
        correct_answer: form.correct_answer,
        explanation: form.explanation,
        points: form.points,
        updated_at: new Date().toISOString(),
      })
      .eq('id', form.id);
    if (error) { toast.error(error.message); return; }
    setDirty(false);
    toast.success('Saved.');
    onChanged();
  }
  async function del() {
    const { error } = await supabase.from('gw_course_test_questions').delete().eq('id', form.id);
    if (error) { toast.error(error.message); return; }
    onChanged();
  }
  async function move(direction: 'up' | 'down') {
    const neighbor_pos = direction === 'up' ? form.position - 1 : form.position + 1;
    // Swap positions with neighbor.
    const { data: neighbor } = await supabase
      .from('gw_course_test_questions')
      .select('id, position')
      .eq('test_id', form.test_id)
      .eq('position', neighbor_pos)
      .maybeSingle();
    if (!neighbor) return;
    await supabase.from('gw_course_test_questions').update({ position: form.position }).eq('id', neighbor.id);
    await supabase.from('gw_course_test_questions').update({ position: neighbor_pos }).eq('id', form.id);
    onChanged();
  }

  return (
    <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">Q{index + 1}</Badge>
          <Badge variant="outline" className="text-xs capitalize">{form.question_type.replace('_', ' ')}</Badge>
          <div className="flex-1" />
          <Button size="icon" variant="ghost" disabled={isFirst} onClick={() => move('up')}><ChevronUp className="w-4 h-4" /></Button>
          <Button size="icon" variant="ghost" disabled={isLast} onClick={() => move('down')}><ChevronDown className="w-4 h-4" /></Button>
          <ConfirmDeleteButton
            confirmKey="delete-quiz-question"
            title="Delete this question?"
            description="The question and any saved answers will be removed."
            onConfirm={del}
            ariaLabel="Delete question"
            className="inline-flex items-center justify-center rounded-md h-9 w-9 text-rose-600 hover:text-rose-700 hover:bg-muted"
          >
            <Trash2 className="w-4 h-4" />
          </ConfirmDeleteButton>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Question</Label>
          <Textarea
            value={form.prompt}
            onChange={(e) => update({ prompt: e.target.value })}
            rows={2}
            placeholder="What's the dominant chord in C major?"
          />
        </div>

        {/* Type-specific answer editor */}
        {(form.question_type === 'multiple_choice' || form.question_type === 'multi_select') && (
          <div className="space-y-2">
            <Label className="text-xs">Options · {form.question_type === 'multi_select' ? 'pick any number that are correct' : 'pick exactly one correct'}</Label>
            {(form.options ?? []).map((opt, i) => {
              const isCorrect = form.question_type === 'multiple_choice'
                ? form.correct_answer === opt.id
                : Array.isArray(form.correct_answer) && form.correct_answer.includes(opt.id);
              return (
                <div key={opt.id} className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (form.question_type === 'multiple_choice') {
                        update({ correct_answer: opt.id });
                      } else {
                        const cur = (form.correct_answer ?? []) as string[];
                        const next = cur.includes(opt.id) ? cur.filter((x) => x !== opt.id) : [...cur, opt.id];
                        update({ correct_answer: next });
                      }
                    }}
                    className={cn(
                      'w-7 h-7 rounded-md border inline-flex items-center justify-center shrink-0',
                      isCorrect ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border hover:bg-muted',
                    )}
                    title={isCorrect ? 'Marked correct' : 'Mark correct'}
                  >
                    {isCorrect && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <Input
                    value={opt.text}
                    onChange={(e) => {
                      const next = [...(form.options ?? [])];
                      next[i] = { ...opt, text: e.target.value };
                      update({ options: next });
                    }}
                    placeholder={`Option ${opt.id.toUpperCase()}`}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-rose-600 hover:text-rose-700"
                    onClick={() => {
                      const next = (form.options ?? []).filter((o) => o.id !== opt.id);
                      // also remove from correct_answer if needed
                      const newCorrect = form.question_type === 'multiple_choice'
                        ? (form.correct_answer === opt.id ? null : form.correct_answer)
                        : ((form.correct_answer ?? []) as string[]).filter((x) => x !== opt.id);
                      update({ options: next, correct_answer: newCorrect });
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const next = [...(form.options ?? [])];
                const nextId = String.fromCharCode(97 + next.length); // 'a','b',...
                next.push({ id: nextId, text: '' });
                update({ options: next });
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add option
            </Button>
          </div>
        )}

        {form.question_type === 'true_false' && (
          <div className="space-y-1.5">
            <Label className="text-xs">Correct answer</Label>
            <div className="inline-flex gap-2">
              <Button
                size="sm"
                variant={form.correct_answer === true ? 'default' : 'outline'}
                onClick={() => update({ correct_answer: true })}
              >
                <Check className="w-4 h-4 mr-1.5" /> True
              </Button>
              <Button
                size="sm"
                variant={form.correct_answer === false ? 'default' : 'outline'}
                onClick={() => update({ correct_answer: false })}
              >
                <X className="w-4 h-4 mr-1.5" /> False
              </Button>
            </div>
          </div>
        )}

        {form.question_type === 'short_answer' && (
          <div className="space-y-2">
            <Label className="text-xs">Accepted answers (case-insensitive)</Label>
            {((form.correct_answer ?? []) as string[]).map((ans, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={ans}
                  onChange={(e) => {
                    const next = [...((form.correct_answer ?? []) as string[])];
                    next[i] = e.target.value;
                    update({ correct_answer: next });
                  }}
                  placeholder="Acceptable response…"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-rose-600 hover:text-rose-700"
                  onClick={() => {
                    const next = ((form.correct_answer ?? []) as string[]).filter((_, idx) => idx !== i);
                    update({ correct_answer: next });
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const next = [...((form.correct_answer ?? []) as string[]), ''];
                update({ correct_answer: next });
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add variation
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div className="space-y-1.5">
            <Label className="text-xs">Points</Label>
            <Input
              type="number"
              value={form.points}
              onChange={(e) => update({ points: parseInt(e.target.value) || 0 })}
              className="w-24"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Explanation (optional)</Label>
            <Input
              value={form.explanation || ''}
              onChange={(e) => update({ explanation: e.target.value })}
              placeholder="Shown after grading"
            />
          </div>
        </div>

        {dirty && (
          <div className="flex justify-end pt-2 border-t">
            <Button size="sm" onClick={save}>
              <Save className="w-3.5 h-3.5 mr-1.5" /> Save question
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
