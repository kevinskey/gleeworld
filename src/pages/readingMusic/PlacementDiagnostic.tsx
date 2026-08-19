import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSubmitPlacement } from '@/lib/readingMusic/api';
import { LEVELS } from '@/lib/readingMusic/domains';

// 5-question diagnostic. Each question has one correct answer.
// Questions are deliberately conceptual (not sung) so the modal doesn't
// need the mic and can finish quickly.
interface QA {
  prompt: string;
  choices: string[];
  correctIndex: number;
}
const QUESTIONS: QA[] = [
  {
    prompt: 'Which pair sounds the SAME pitch?',
    choices: ['C4 and G4', 'C4 and C4 (same note)', 'C4 and D4', 'C4 and E4'],
    correctIndex: 1,
  },
  {
    prompt: 'How many semitones is a perfect fifth?',
    choices: ['5', '6', '7', '8'],
    correctIndex: 2,
  },
  {
    prompt: 'In 4/4 time, how many beats does a half note last?',
    choices: ['1', '2', '3', '4'],
    correctIndex: 1,
  },
  {
    prompt: 'How many sharps are in the key of D major?',
    choices: ['1', '2', '3', '4'],
    correctIndex: 1,
  },
  {
    prompt: 'Which chord quality is C-Eb-G?',
    choices: ['Major', 'Minor', 'Diminished', 'Augmented'],
    correctIndex: 1,
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (level: number) => void;
}

export function PlacementDiagnostic({ open, onOpenChange, onComplete }: Props) {
  const submit = useSubmitPlacement();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);

  const done = idx >= QUESTIONS.length;
  const q = done ? null : QUESTIONS[idx];
  const correct = answers.reduce((n, a, i) => n + (a === QUESTIONS[i].correctIndex ? 1 : 0), 0);

  const finish = () => {
    submit.mutate(
      { correct, total: QUESTIONS.length },
      {
        onSuccess: (row) => {
          const lvl = LEVELS.find((l) => l.id === row.level);
          toast.success(`Placed at Level ${row.level}${lvl ? ` — ${lvl.name}` : ''}`);
          onComplete(row.level);
          onOpenChange(false);
          setIdx(0);
          setAnswers([]);
        },
        onError: (e) => toast.error(`Couldn't save placement: ${e.message}`),
      },
    );
  };

  const answer = (i: number) => {
    const next = [...answers, i];
    setAnswers(next);
    setIdx(idx + 1);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setIdx(0); setAnswers([]); } onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Placement — 5 quick questions</DialogTitle>
        </DialogHeader>
        {!done && q && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Question {idx + 1} of {QUESTIONS.length}</p>
            <p className="text-sm text-slate-900 font-medium">{q.prompt}</p>
            <div className="grid grid-cols-1 gap-2">
              {q.choices.map((c, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="justify-start rounded-full"
                  onClick={() => answer(i)}
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>
        )}
        {done && (
          <div className="space-y-3">
            <p className="text-sm">You answered {correct} of {QUESTIONS.length} correctly.</p>
            <p className="text-xs text-slate-500">We'll set your starting level so you're not too easy or too hard.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIdx(0); setAnswers([]); }}>
                Redo
              </Button>
              <Button disabled={submit.isPending} onClick={finish}>
                {submit.isPending ? 'Saving…' : 'Save my level'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
