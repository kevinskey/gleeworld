import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Question } from './types';
import { buildUnitQuiz, PASS_PCT } from './quiz';
import Notation from './Notation';
import KeyboardId from './KeyboardId';
import StaffPlacement from './StaffPlacement';

type Props = {
  levelId: number;
  unitSortOrder: number;
  unitTitle: string;
  onFinish: (scorePct: number) => void;
  onExit: () => void;
};

type Answer = { correct: boolean };

export default function QuizRunner({ levelId, unitSortOrder, unitTitle, onFinish, onExit }: Props) {
  const [seed, setSeed] = useState(0);
  const questions = useMemo(() => buildUnitQuiz(levelId, unitSortOrder), [levelId, unitSortOrder, seed]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [choice, setChoice] = useState<number | null>(null);
  const [chosenPc, setChosenPc] = useState<number | null>(null);
  const [chosenKey, setChosenKey] = useState<string | null>(null);
  const [reported, setReported] = useState(false);

  const q = questions[idx] as Question | undefined;
  const answered = choice !== null || chosenPc !== null || chosenKey !== null;
  const done = idx >= questions.length;
  const correctCount = answers.filter((a) => a.correct).length;
  const scorePct = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;

  useEffect(() => {
    if (done && !reported) {
      setReported(true);
      onFinish(scorePct);
    }
  }, [done, reported, scorePct, onFinish]);

  const record = (correct: boolean) => setAnswers((a) => [...a, { correct }]);

  const next = () => {
    setIdx((i) => i + 1);
    setChoice(null);
    setChosenPc(null);
    setChosenKey(null);
  };

  const retake = () => {
    setSeed((s) => s + 1);
    setIdx(0);
    setAnswers([]);
    setChoice(null);
    setChosenPc(null);
    setChosenKey(null);
    setReported(false);
  };

  if (done) {
    const passed = scorePct >= PASS_PCT;
    return (
      <div className="rounded-xl border bg-card p-6 text-center space-y-4">
        {passed ? (
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        ) : (
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
        )}
        <div>
          <p className="text-3xl font-bold">{scorePct}%</p>
          <p className="text-sm text-muted-foreground">
            {correctCount} of {questions.length} correct · need {PASS_PCT}% to pass
          </p>
        </div>
        <p className="font-medium">
          {passed ? `Unit passed — nice work! The next unit is unlocked.` : 'Not quite — review the lessons and try again.'}
        </p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={retake}>
            <RotateCcw className="mr-2 h-4 w-4" /> Retake quiz
          </Button>
          <Button onClick={onExit}>Back to unit</Button>
        </div>
      </div>
    );
  }

  if (!q) return null;

  const isCorrect =
    q.kind === 'mc' ? choice === q.answerIndex :
    q.kind === 'keyboard' ? chosenPc === q.targetPc :
    chosenKey === q.targetKey;

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{unitTitle} — Unit Quiz</span>
        <span>{idx + 1} / {questions.length}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted">
        <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${(idx / questions.length) * 100}%` }} />
      </div>

      <p className="font-medium">{q.prompt}</p>

      {q.kind === 'mc' && (
        <>
          {q.notation && <Notation spec={q.notation} />}
          <div className="grid gap-2 sm:grid-cols-2">
            {q.choices.map((c, i) => {
              let cls = 'justify-start';
              if (choice !== null) {
                if (i === q.answerIndex) cls += ' border-emerald-500 bg-emerald-50 text-emerald-900 hover:bg-emerald-50';
                else if (i === choice) cls += ' border-red-500 bg-red-50 text-red-900 hover:bg-red-50';
              }
              return (
                <Button
                  key={i}
                  variant="outline"
                  disabled={choice !== null}
                  className={cls}
                  onClick={() => { setChoice(i); record(i === q.answerIndex); }}
                >
                  {c}
                </Button>
              );
            })}
          </div>
        </>
      )}

      {q.kind === 'keyboard' && (
        <KeyboardId
          targetPc={q.targetPc}
          chosenPc={chosenPc}
          onSelect={(pc) => { setChosenPc(pc); record(pc === q.targetPc); }}
        />
      )}

      {q.kind === 'staff' && (
        <StaffPlacement
          clef={q.clef}
          targetKey={q.targetKey}
          chosenKey={chosenKey}
          onSelect={(key) => { setChosenKey(key); record(key === q.targetKey); }}
        />
      )}

      {answered && (
        <div className={`rounded-md px-3 py-2 text-sm ${isCorrect ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
          {isCorrect ? 'Correct!' : 'Not quite.'}
          {q.explain ? ` ${q.explain}` : ''}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onExit}>Exit</Button>
        <Button onClick={next} disabled={!answered}>
          {idx + 1 === questions.length ? 'See results' : 'Next'} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
