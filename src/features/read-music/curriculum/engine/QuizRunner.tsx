import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, XCircle, RotateCcw, ArrowRight, Volume2, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Question } from './types';
import { PASS_PCT } from './quiz';
import { explainMistake } from './ai';
import { playSequence, playChord } from '../../lib/audio';
import Notation from './Notation';
import KeyboardId from './KeyboardId';
import StaffPlacement from './StaffPlacement';
import RhythmTap from './RhythmTap';

type ResultCtx = {
  scorePct: number;
  correctCount: number;
  total: number;
  answers: boolean[];
  retake: () => void;
};

type Props = {
  title: string;
  build: () => Question[];
  onFinish?: (scorePct: number, answers: boolean[]) => void;
  onExit: () => void;
  /** Custom results screen; default is the 80% pass/fail unit-quiz screen */
  renderResult?: (ctx: ResultCtx) => ReactNode;
  /** Curriculum level (1–4) — enables the AI "Explain my mistake" button */
  aiLevel?: number;
};

function playAudio(q: Extract<Question, { kind: 'audio' }>) {
  if (q.playMode === 'harmonic') playChord(q.playKeys);
  else playSequence(q.playKeys, q.playMode === 'scale' ? 320 : 600, q.playMode === 'scale' ? 40 : 60);
}

export default function QuizRunner({ title, build, onFinish, onExit, renderResult, aiLevel }: Props) {
  const [seed, setSeed] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const questions = useMemo(() => build(), [seed]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [choice, setChoice] = useState<number | null>(null);
  const [chosenPc, setChosenPc] = useState<number | null>(null);
  const [chosenKey, setChosenKey] = useState<string | null>(null);
  const [rhythmResult, setRhythmResult] = useState<boolean | null>(null);
  const [reported, setReported] = useState(false);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const q = questions[idx] as Question | undefined;
  const answered = choice !== null || chosenPc !== null || chosenKey !== null || rhythmResult !== null;
  const done = idx >= questions.length;
  const correctCount = answers.filter(Boolean).length;
  const scorePct = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;

  useEffect(() => {
    if (done && !reported) {
      setReported(true);
      onFinish?.(scorePct, answers);
    }
  }, [done, reported, scorePct, answers, onFinish]);

  const record = (correct: boolean) => setAnswers((a) => [...a, correct]);

  const clearChoice = () => {
    setChoice(null);
    setChosenPc(null);
    setChosenKey(null);
    setRhythmResult(null);
    setAiText(null);
    setAiLoading(false);
  };

  const askAi = async (q: Extract<Question, { kind: 'mc' | 'audio' }>) => {
    if (choice === null) return;
    setAiLoading(true);
    try {
      const text = await explainMistake({
        prompt: q.prompt,
        choices: q.choices,
        correct: q.choices[q.answerIndex],
        chosen: q.choices[choice],
        level: aiLevel,
      });
      setAiText(text);
    } catch {
      setAiText('Sorry — the tutor is unavailable right now.');
    } finally {
      setAiLoading(false);
    }
  };

  const next = () => {
    setIdx((i) => i + 1);
    clearChoice();
  };

  const retake = () => {
    setSeed((s) => s + 1);
    setIdx(0);
    setAnswers([]);
    clearChoice();
    setReported(false);
  };

  if (done) {
    if (renderResult) {
      return <>{renderResult({ scorePct, correctCount, total: questions.length, answers, retake })}</>;
    }
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
    q.kind === 'mc' || q.kind === 'audio' ? choice === q.answerIndex :
    q.kind === 'keyboard' ? chosenPc === q.targetPc :
    q.kind === 'staff' ? chosenKey === q.targetKey :
    rhythmResult === true;

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{title}</span>
        <span>{idx + 1} / {questions.length}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted">
        <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${(idx / questions.length) * 100}%` }} />
      </div>

      <p className="font-medium">{q.prompt}</p>

      {q.kind === 'mc' && q.notation && <Notation spec={q.notation} />}

      {q.kind === 'audio' && (
        <div>
          <Button variant="outline" onClick={() => playAudio(q)}>
            <Volume2 className="mr-2 h-4 w-4" /> Play {choice !== null ? 'again' : ''}
          </Button>
        </div>
      )}

      {(q.kind === 'mc' || q.kind === 'audio') && (
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

      {q.kind === 'rhythm' && (
        <RhythmTap
          durations={q.durations}
          bpm={q.bpm}
          graded={rhythmResult !== null}
          onResult={(correct) => { setRhythmResult(correct); record(correct); }}
        />
      )}

      {answered && (
        <div className={`rounded-md px-3 py-2 text-sm ${isCorrect ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
          {isCorrect ? 'Correct!' : q.kind === 'rhythm' ? 'Not quite in time.' : 'Not quite.'}
          {q.explain ? ` ${q.explain}` : ''}
          {!isCorrect && aiLevel != null && (q.kind === 'mc' || q.kind === 'audio') && !aiText && (
            <button
              onClick={() => askAi(q)}
              disabled={aiLoading}
              className="mt-2 flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-60"
            >
              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {aiLoading ? 'Thinking…' : 'Explain my mistake'}
            </button>
          )}
          {aiText && <p className="mt-2 border-t border-red-200 pt-2 text-red-900">{aiText}</p>}
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
