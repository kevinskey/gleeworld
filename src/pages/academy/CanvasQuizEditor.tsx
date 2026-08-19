// Canvas-backed quiz editor. Teachers create and update classic
// quizzes — settings + questions. Supports the most-used question
// types: multiple choice, multiple answers, true/false, short answer,
// essay, numerical, text-only. (Calculated / matching / dropdowns are
// supported by the API but not yet exposed in this editor.)

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Loader2, ArrowLeft, AlertCircle, Plus, Trash2, GripVertical, Save,
} from 'lucide-react';
import {
  useCanvasQuizDetail, useUpdateQuiz, useAddQuizQuestion, useUpdateQuizQuestion,
  useDeleteQuizQuestion,
  type CanvasQuizQuestion,
} from '@/hooks/useCanvasAcademy';
import { toast } from 'sonner';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

const QUESTION_TYPES: Array<{ value: string; label: string }> = [
  { value: 'multiple_choice_question', label: 'Multiple choice' },
  { value: 'true_false_question', label: 'True / False' },
  { value: 'short_answer_question', label: 'Fill in the blank' },
  { value: 'multiple_answers_question', label: 'Multiple answers' },
  { value: 'essay_question', label: 'Essay' },
  { value: 'numerical_question', label: 'Numerical' },
  { value: 'text_only_question', label: 'Text only (no answer)' },
];

export default function CanvasQuizEditor() {
  const params = useParams<{ courseId: string; quizId: string }>();
  const courseId = params.courseId ? Number(params.courseId) : null;
  const quizId = params.quizId ? Number(params.quizId) : null;
  const { data, isLoading, error } = useCanvasQuizDetail(courseId, quizId);

  if (isLoading) return <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell><div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading quiz…</div></DashboardShell>
    </UniversalLayout>;
  if (error || !data || 'error' in data) {
    return <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell><div className="max-w-4xl mx-auto p-6"><div className="text-sm text-destructive p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-start gap-2">
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><div>Could not load quiz.</div>
    </div></div></DashboardShell>
    </UniversalLayout>;
  }

  return <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell><Editor courseId={courseId!} quizId={quizId!} quiz={data.quiz} questions={data.questions} /></DashboardShell>
    </UniversalLayout>;
}

function Editor({
  courseId, quizId, quiz, questions,
}: {
  courseId: number; quizId: number;
  quiz: import('@/hooks/useCanvasAcademy').CanvasQuizDetail;
  questions: CanvasQuizQuestion[];
}) {
  return (
    <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto space-y-5">
      <div>
        <Link to={`/academy/canvas/courses/${courseId}?tab=quizzes`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Back to quizzes
        </Link>
        <div className="flex items-end justify-between gap-3 flex-wrap mt-1">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{quiz.title}</h1>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              <Badge variant="outline">{quiz.question_count} {quiz.question_count === 1 ? 'question' : 'questions'}</Badge>
              {quiz.points_possible !== undefined && <Badge variant="outline">{quiz.points_possible} pts</Badge>}
              <Badge variant="outline" className={quiz.published ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}>
                {quiz.published ? 'Published' : 'Draft'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="mt-4 space-y-3">
          <QuestionList courseId={courseId} quizId={quizId} questions={questions} />
          <NewQuestionForm courseId={courseId} quizId={quizId} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <SettingsForm courseId={courseId} quizId={quizId} quiz={quiz} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QuestionList({
  courseId, quizId, questions,
}: { courseId: number; quizId: number; questions: CanvasQuizQuestion[] }) {
  if (questions.length === 0) return (
    <Card className="border-dashed"><CardContent className="py-8 text-center text-sm text-muted-foreground">No questions yet — add one below.</CardContent></Card>
  );
  return (
    <ol className="space-y-3">
      {questions.sort((a, b) => a.position - b.position).map((q, i) => (
        <li key={q.id}>
          <QuestionEditor courseId={courseId} quizId={quizId} question={q} index={i + 1} />
        </li>
      ))}
    </ol>
  );
}

interface AnswerDraft { text: string; weight: number }

function blankAnswersFor(type: string): AnswerDraft[] {
  switch (type) {
    case 'multiple_choice_question': return [
      { text: '', weight: 100 }, { text: '', weight: 0 },
      { text: '', weight: 0 }, { text: '', weight: 0 },
    ];
    case 'true_false_question': return [
      { text: 'True', weight: 100 }, { text: 'False', weight: 0 },
    ];
    case 'multiple_answers_question': return [
      { text: '', weight: 100 }, { text: '', weight: 100 },
      { text: '', weight: 0 }, { text: '', weight: 0 },
    ];
    case 'short_answer_question': return [{ text: '', weight: 100 }];
    case 'numerical_question': return [{ text: '0', weight: 100 }];
    default: return [];
  }
}

function NewQuestionForm({ courseId, quizId }: { courseId: number; quizId: number }) {
  const [type, setType] = useState('multiple_choice_question');
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [points, setPoints] = useState('1');
  const [answers, setAnswers] = useState<AnswerDraft[]>(blankAnswersFor('multiple_choice_question'));
  const add = useAddQuizQuestion(courseId, quizId);

  const changeType = (v: string) => { setType(v); setAnswers(blankAnswersFor(v)); };

  const submit = async () => {
    if (!text.trim()) return;
    const pts = Number(points) || 0;
    const question: Record<string, unknown> = {
      question_name: name.trim() || `Question`,
      question_text: text.trim(),
      question_type: type,
      points_possible: pts,
    };
    if (answers.length > 0) {
      question.answers = answers
        .filter((a) => a.text.trim() !== '' || type === 'numerical_question')
        .map((a) => ({
          answer_text: a.text,
          answer_weight: a.weight,
          ...(type === 'numerical_question' ? { numerical_answer_type: 'exact_answer', exact: Number(a.text), margin: 0 } : {}),
        }));
    }
    try {
      await add.mutateAsync(question);
      toast.success('Question added');
      setName(''); setText(''); setPoints('1');
      setAnswers(blankAnswersFor(type));
    } catch (e) {
      toast.error('Could not add question', { description: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Add question</h3>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_100px] gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Question name (optional)" />
          <Select value={type} onValueChange={changeType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {QUESTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input value={points} onChange={(e) => setPoints(e.target.value)} type="number" min="0" placeholder="Points" />
        </div>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Question text" rows={3} />

        {answers.length > 0 && (
          <AnswerEditor type={type} answers={answers} onChange={setAnswers} />
        )}

        <div className="flex justify-end">
          <Button onClick={submit} disabled={add.isPending || !text.trim()}>
            {add.isPending ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Adding…</> : <><Plus className="w-4 h-4 mr-1" /> Add question</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AnswerEditor({
  type, answers, onChange,
}: { type: string; answers: AnswerDraft[]; onChange: (a: AnswerDraft[]) => void }) {
  const isSingle = type === 'multiple_choice_question';
  const isMulti = type === 'multiple_answers_question';
  const isTF = type === 'true_false_question';
  const isShort = type === 'short_answer_question';
  const isNum = type === 'numerical_question';

  const setText = (i: number, v: string) => onChange(answers.map((a, j) => j === i ? { ...a, text: v } : a));
  const setCorrect = (i: number) => {
    if (isSingle) onChange(answers.map((a, j) => ({ ...a, weight: j === i ? 100 : 0 })));
    else if (isMulti) onChange(answers.map((a, j) => j === i ? { ...a, weight: a.weight === 100 ? 0 : 100 } : a));
  };
  const addOpt = () => onChange([...answers, { text: '', weight: 0 }]);
  const removeOpt = (i: number) => onChange(answers.filter((_, j) => j !== i));

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {isShort ? 'Acceptable answers' : isNum ? 'Acceptable values' : 'Answer choices'}
      </div>
      <ul className="space-y-1.5">
        {answers.map((a, i) => (
          <li key={i} className="flex items-center gap-2">
            {(isSingle || isMulti || isTF) && (
              <input
                type={isSingle || isTF ? 'radio' : 'checkbox'}
                name="correct"
                checked={a.weight === 100}
                onChange={() => setCorrect(i)}
                disabled={isTF}
              />
            )}
            <Input
              value={a.text}
              onChange={(e) => setText(i, e.target.value)}
              placeholder={isNum ? 'Numeric value' : 'Choice text'}
              disabled={isTF}
              className="flex-1"
              type={isNum ? 'number' : 'text'}
            />
            {!isTF && answers.length > 1 && (
              <Button size="sm" variant="ghost" onClick={() => removeOpt(i)}><Trash2 className="w-3 h-3" /></Button>
            )}
          </li>
        ))}
      </ul>
      {!isTF && (
        <Button size="sm" variant="outline" onClick={addOpt}>
          <Plus className="w-3 h-3 mr-1" /> Add {isShort ? 'answer' : 'choice'}
        </Button>
      )}
    </div>
  );
}

function QuestionEditor({
  courseId, quizId, question, index,
}: { courseId: number; quizId: number; question: CanvasQuizQuestion; index: number }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(question.question_text ?? '');
  const [points, setPoints] = useState(String(question.points_possible ?? 0));
  const [answers, setAnswers] = useState<AnswerDraft[]>(
    (question.answers ?? []).map((a) => ({ text: a.text, weight: a.weight })),
  );
  const update = useUpdateQuizQuestion(courseId, quizId);
  const del = useDeleteQuizQuestion(courseId, quizId);

  const save = async () => {
    try {
      const payload: Record<string, unknown> = {
        question_text: text,
        points_possible: Number(points) || 0,
      };
      if (answers.length > 0) {
        payload.answers = answers.map((a) => ({
          answer_text: a.text, answer_weight: a.weight,
          ...(question.question_type === 'numerical_question' ? { numerical_answer_type: 'exact_answer', exact: Number(a.text), margin: 0 } : {}),
        }));
      }
      await update.mutateAsync({ question_id: question.id, question: payload });
      toast.success('Question updated');
      setEditing(false);
    } catch (e) {
      toast.error('Could not save', { description: e instanceof Error ? e.message : String(e) });
    }
  };
  const remove = async () => {
    if (!confirm('Delete this question?')) return;
    try { await del.mutateAsync(question.id); toast.success('Deleted'); }
    catch (e) { toast.error('Could not delete', { description: e instanceof Error ? e.message : String(e) }); }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-2 mb-2">
          <GripVertical className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
          <div className="text-xs text-muted-foreground tabular-nums mt-1 shrink-0">{index}.</div>
          <div className="flex-1 min-w-0">
            {!editing ? (
              <>
                <div className="text-sm" dangerouslySetInnerHTML={{ __html: question.question_text ?? '' }} />
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{labelForType(question.question_type)}</Badge>
                  <span>{question.points_possible ?? 0} pts</span>
                </div>
                {question.answers && question.answers.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-sm">
                    {question.answers.map((a) => (
                      <li key={a.id} className={a.weight === 100 ? 'text-emerald-700 font-medium' : 'text-muted-foreground'}>
                        {a.weight === 100 ? '✓ ' : '  '}{a.text}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} />
                <Input value={points} onChange={(e) => setPoints(e.target.value)} type="number" min="0" className="w-32" />
                {answers.length > 0 && (
                  <AnswerEditor type={question.question_type} answers={answers} onChange={setAnswers} />
                )}
              </div>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            {!editing ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={remove} disabled={del.isPending}><Trash2 className="w-3.5 h-3.5" /></Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={save} disabled={update.isPending}>{update.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}</Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function labelForType(t: string) {
  return QUESTION_TYPES.find((x) => x.value === t)?.label ?? t.replace(/_question$/, '').replace(/_/g, ' ');
}

function SettingsForm({
  courseId, quizId, quiz,
}: { courseId: number; quizId: number; quiz: import('@/hooks/useCanvasAcademy').CanvasQuizDetail }) {
  const [title, setTitle] = useState(quiz.title);
  const [description, setDescription] = useState(quiz.description ?? '');
  const [timeLimit, setTimeLimit] = useState(quiz.time_limit?.toString() ?? '');
  const [attempts, setAttempts] = useState(quiz.allowed_attempts?.toString() ?? '1');
  const [published, setPublished] = useState(quiz.published ?? false);
  const navigate = useNavigate();
  const update = useUpdateQuiz(courseId, quizId);

  useEffect(() => {
    setTitle(quiz.title); setDescription(quiz.description ?? '');
    setTimeLimit(quiz.time_limit?.toString() ?? '');
    setAttempts(quiz.allowed_attempts?.toString() ?? '1');
    setPublished(quiz.published ?? false);
  }, [quiz]);

  const save = async () => {
    try {
      await update.mutateAsync({
        title,
        description,
        time_limit: timeLimit ? Number(timeLimit) : null,
        allowed_attempts: Number(attempts),
        published,
      });
      toast.success('Quiz saved');
    } catch (e) {
      toast.error('Could not save', { description: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <Card><CardContent className="p-5 space-y-3">
      <div>
        <Label className="text-xs">Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <Label className="text-xs">Description (HTML)</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Time limit (minutes)</Label>
          <Input value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} placeholder="No limit" type="number" min="0" />
        </div>
        <div>
          <Label className="text-xs">Allowed attempts</Label>
          <Input value={attempts} onChange={(e) => setAttempts(e.target.value)} type="number" min="-1" />
          <p className="text-xs text-muted-foreground mt-0.5">-1 = unlimited</p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label className="text-xs">Published</Label>
            <div className="mt-1"><Switch checked={published} onCheckedChange={setPublished} /></div>
          </div>
        </div>
      </div>
      <div className="flex justify-between pt-1">
        <Button variant="ghost" onClick={() => navigate(`/academy/canvas/courses/${courseId}?tab=quizzes`)}>Done</Button>
        <Button onClick={save} disabled={update.isPending}>
          {update.isPending ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving…</> : 'Save'}
        </Button>
      </div>
    </CardContent></Card>
  );
}
