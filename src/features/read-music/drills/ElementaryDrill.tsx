
import { useState } from "react";
import Staff from "../components/Staff";
import AnswerKeys from "../components/AnswerKeys";
import { useDrill } from "../hooks/useDrill";
import { playChime } from "../lib/audio";
import type { Clef } from "../components/Staff";

const ROUND_SIZE = 10;

function Medal({ correct }: { correct: number }) {
  if (correct === 10) return <div className="text-7xl animate-pop">🥇</div>;
  if (correct >= 8) return <div className="text-7xl animate-pop">🥈</div>;
  if (correct >= 6) return <div className="text-7xl animate-pop">🥉</div>;
  return <div className="text-7xl animate-pop">🌱</div>;
}

function cheer(correct: number): string {
  if (correct === 10) return "Perfect round!";
  if (correct >= 8) return "Beautifully done.";
  if (correct >= 6) return "Nice work — keep going.";
  return "Good try! Let's go again.";
}

export default function ElementaryDrill({ clefs }: { clefs: Clef[] }) {
  const [done, setDone] = useState(false);
  const [roundCorrect, setRoundCorrect] = useState(0);

  const { current, feedback, history, streak, bestStreak, answer, replayNote, reset } = useDrill({
    clefs,
    audio: true,
    onAnswer: (e) => {
      if (e.isRight) setRoundCorrect((c) => c + 1);
      const total = history.length + 1;
      if (total >= ROUND_SIZE) {
        setTimeout(() => {
          playChime("win");
          setDone(true);
        }, 700);
      }
    },
  });

  const playAgain = () => {
    reset();
    setRoundCorrect(0);
    setDone(false);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <Medal correct={roundCorrect} />
        <div className="text-3xl font-bold text-brand-gradient">{cheer(roundCorrect)}</div>
        <div className="text-xl text-foreground">
          You got <span className="font-bold text-[hsl(var(--brand-purple))]">{roundCorrect}</span> out of {ROUND_SIZE}
        </div>
        <div className="text-base text-muted-foreground">
          Best streak: <span className="font-semibold text-[hsl(var(--brand-gold))]">{bestStreak}</span> in a row 🔥
        </div>
        <button
          onClick={playAgain}
          className="mt-4 rounded-md bg-brand-gradient px-8 py-3 text-lg font-semibold text-white shadow-lg hover:opacity-90 active:scale-95"
        >
          Play Again
        </button>
      </div>
    );
  }

  const qNum = history.length + 1;
  const pct = (history.length / ROUND_SIZE) * 100;

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <div className="w-full max-w-md">
        <div className="flex items-baseline justify-between text-sm text-muted-foreground">
          <span>Question {qNum} of {ROUND_SIZE}</span>
          <span className="flex items-center gap-3">
            <span className="font-semibold text-[hsl(var(--brand-purple))]">⭐ {roundCorrect}</span>
            {streak >= 3 && (
              <span className="font-semibold text-[hsl(var(--brand-gold))]">🔥 {streak}</span>
            )}
          </span>
        </div>
        <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-brand-gradient transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--brand-purple))]">
        {current.clef} clef
      </div>

      <div
        className={`relative rounded-2xl border-2 p-4 transition-all ${
          feedback === "right"
            ? "border-[hsl(var(--brand-cyan))] bg-[hsl(var(--brand-cyan)/0.06)] scale-105"
            : feedback === "wrong"
            ? "border-red-400 bg-red-50 animate-shake"
            : "border-border bg-card"
        }`}
      >
        <Staff clef={current.clef} noteKey={current.key} />
        {feedback === "right" && (
          <div className="absolute -top-4 -right-4 text-5xl animate-bounce">✨</div>
        )}
        {feedback === "wrong" && (
          <div className="absolute -top-4 -right-4 text-5xl">🤔</div>
        )}
      </div>

      <button
        onClick={replayNote}
        className="rounded-full border border-border bg-card px-5 py-2 text-sm text-foreground hover:border-brand"
      >
        🔊 Hear it again
      </button>

      <AnswerKeys onPick={answer} disabled={feedback !== null} variant="playful" size="lg" />

      <div className="text-xs text-muted-foreground">
        Tip: press the letter keys on your keyboard too.
      </div>
    </div>
  );
}
