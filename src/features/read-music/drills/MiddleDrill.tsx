
import { useEffect, useState } from "react";
import Staff from "../components/Staff";
import AnswerKeys from "../components/AnswerKeys";
import { useDrill } from "../hooks/useDrill";
import { playChime } from "../lib/audio";
import type { Clef } from "../components/Staff";

const ROUND_SIZE = 15;
const BASE_XP = 10;
const BEST_KEY = "rmw:middle:best";

function multiplier(streak: number): number {
  if (streak >= 10) return 3;
  if (streak >= 5) return 2;
  return 1;
}

export default function MiddleDrill({ clefs }: { clefs: Clef[] }) {
  const [xp, setXp] = useState(0);
  const [done, setDone] = useState(false);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [best, setBest] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? Number(localStorage.getItem(BEST_KEY) ?? 0) : 0;
    setBest(stored);
  }, []);

  const { current, feedback, history, streak, bestStreak, answer, replayNote, reset } = useDrill({
    clefs,
    audio: true,
    onAnswer: (e) => {
      if (e.isRight) {
        const mult = multiplier(streak);
        const gained = BASE_XP * mult;
        setXp((x) => x + gained);
        setRoundCorrect((c) => c + 1);
        if (streak + 1 === 5 || streak + 1 === 10) {
          setFlash(`COMBO ×${multiplier(streak + 1)}`);
          setTimeout(() => setFlash(null), 1000);
        }
      }
      const total = history.length + 1;
      if (total >= ROUND_SIZE) {
        setTimeout(() => {
          playChime("win");
          setDone(true);
        }, 700);
      }
    },
  });

  useEffect(() => {
    if (done && xp > best) {
      setBest(xp);
      if (typeof window !== "undefined") localStorage.setItem(BEST_KEY, String(xp));
    }
  }, [done, xp, best]);

  const playAgain = () => {
    reset();
    setXp(0);
    setRoundCorrect(0);
    setDone(false);
  };

  if (done) {
    const newBest = xp >= best;
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <div className="text-6xl animate-pop">{newBest ? "🏆" : "🎯"}</div>
        <div className="text-3xl font-bold text-brand-gradient">
          {newBest ? "NEW BEST" : "Round Complete"}
        </div>
        <div className="grid grid-cols-3 gap-6 rounded-xl border border-border bg-card px-8 py-6">
          <Stat label="XP" value={xp} />
          <Stat label="Correct" value={`${roundCorrect}/${ROUND_SIZE}`} />
          <Stat label="Best streak" value={bestStreak} />
        </div>
        <div className="text-sm text-muted-foreground">Today&apos;s best: {Math.max(best, xp)} XP</div>
        <button
          onClick={playAgain}
          className="mt-2 rounded-md bg-brand-gradient px-8 py-3 text-lg font-semibold text-white shadow-md hover:opacity-90"
        >
          Run It Back
        </button>
      </div>
    );
  }

  const qNum = history.length + 1;
  const pct = (history.length / ROUND_SIZE) * 100;
  const mult = multiplier(streak);

  return (
    <div className="flex flex-col items-center gap-5 py-6">
      <div className="grid w-full max-w-md grid-cols-3 gap-2 text-center">
        <Tile label="XP" value={xp} accent="purple" />
        <Tile label="Combo" value={`×${mult}`} accent={mult > 1 ? "gold" : "neutral"} />
        <Tile label="Streak" value={streak} accent="neutral" />
      </div>

      <div className="w-full max-w-md">
        <div className="flex items-baseline justify-between text-xs text-muted-foreground">
          <span>{qNum} / {ROUND_SIZE}</span>
          <span>Today&apos;s best: {best} XP</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-brand-gradient transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--brand-purple))]">
        {current.clef} clef
      </div>

      <div className="relative">
        <div
          className={`rounded-xl border-2 p-4 transition-all bg-card ${
            feedback === "right"
              ? "border-[hsl(var(--brand-cyan))]"
              : feedback === "wrong"
              ? "border-red-400 animate-shake"
              : "border-border"
          }`}
        >
          <Staff clef={current.clef} noteKey={current.key} />
        </div>
        {flash && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-md bg-brand-gradient px-6 py-3 text-2xl font-black text-white shadow-xl animate-pop">
              {flash}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={replayNote}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 min-h-[40px] text-sm text-[hsl(var(--brand-purple))] hover:border-brand"
      >
        🔊 Replay <span className="text-xs text-muted-foreground">(space)</span>
      </button>

      <AnswerKeys onPick={answer} disabled={feedback !== null} variant="neutral" size="lg" />

      <div className="text-xs text-muted-foreground">
        Keyboard: A–G to answer · Space to replay
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold text-[hsl(var(--brand-purple))]">{value}</div>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string | number; accent: "purple" | "gold" | "neutral" }) {
  const accentClass =
    accent === "purple" ? "text-[hsl(var(--brand-purple))]" :
    accent === "gold"   ? "text-[hsl(var(--brand-gold))]" :
    "text-foreground";
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold ${accentClass}`}>{value}</div>
    </div>
  );
}
