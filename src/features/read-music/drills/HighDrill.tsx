
import { useEffect, useState } from "react";
import Staff from "../components/Staff";
import AnswerKeys from "../components/AnswerKeys";
import { useDrill } from "../hooks/useDrill";
import { playChime } from "../lib/audio";
import type { Clef } from "../components/Staff";

const ROUND_SIZE = 20;
const BEST_KEY = "rmw:high:best-accuracy";

const ACHIEVEMENTS = [
  { id: "first-clear", label: "First clear", test: (s: Stats) => s.rounds >= 1 },
  { id: "speed-demon", label: "Avg < 1.5s", test: (s: Stats) => s.avgMs > 0 && s.avgMs < 1500 },
  { id: "perfect-round", label: "Perfect 20/20", test: (s: Stats) => s.lastAcc === 100 },
  { id: "all-clefs", label: "All 4 clefs ≥ 80%", test: (s: Stats) =>
    Object.values(s.clefAcc).filter((v) => v != null).length === 4 &&
    Object.values(s.clefAcc).every((v) => v == null || v >= 80) },
];

type Stats = {
  rounds: number;
  avgMs: number;
  lastAcc: number;
  clefAcc: Record<Clef, number | null>;
};

export default function HighDrill({ clefs }: { clefs: Clef[] }) {
  const [done, setDone] = useState(false);
  const [bestAcc, setBestAcc] = useState(0);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBestAcc(Number(localStorage.getItem(BEST_KEY) ?? 0));
    setUnlocked(new Set(JSON.parse(localStorage.getItem("rmw:high:ach") ?? "[]")));
  }, []);

  const { current, feedback, history, streak, bestStreak, answer, replayNote, reset } = useDrill({
    clefs,
    audio: true,
    onAnswer: () => {
      const total = history.length + 1;
      if (total >= ROUND_SIZE) {
        setTimeout(() => {
          playChime("win");
          setDone(true);
        }, 700);
      }
    },
  });

  const correct = history.filter((h) => h.isRight).length;
  const acc = history.length === 0 ? 0 : Math.round((correct / history.length) * 100);
  const avgMs = history.length === 0 ? 0 : Math.round(history.reduce((a, h) => a + h.ms, 0) / history.length);

  const clefStats: Record<string, { right: number; total: number }> = {};
  history.forEach((h) => {
    clefStats[h.clef] ??= { right: 0, total: 0 };
    clefStats[h.clef].total++;
    if (h.isRight) clefStats[h.clef].right++;
  });

  useEffect(() => {
    if (!done) return;
    const lastAcc = Math.round((correct / ROUND_SIZE) * 100);
    if (lastAcc > bestAcc) {
      setBestAcc(lastAcc);
      if (typeof window !== "undefined") localStorage.setItem(BEST_KEY, String(lastAcc));
    }
    const clefAcc: Record<Clef, number | null> = { treble: null, bass: null, alto: null, tenor: null };
    Object.entries(clefStats).forEach(([c, s]) => {
      clefAcc[c as Clef] = s.total === 0 ? null : Math.round((s.right / s.total) * 100);
    });
    const stats: Stats = { rounds: 1, avgMs, lastAcc, clefAcc };
    const newly = new Set(unlocked);
    ACHIEVEMENTS.forEach((a) => { if (a.test(stats)) newly.add(a.id); });
    if (newly.size !== unlocked.size) {
      setUnlocked(newly);
      if (typeof window !== "undefined") localStorage.setItem("rmw:high:ach", JSON.stringify([...newly]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const playAgain = () => {
    reset();
    setDone(false);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Round complete</div>
          <div className="mt-1 text-5xl font-bold text-brand-gradient">{Math.round((correct / ROUND_SIZE) * 100)}%</div>
          <div className="text-sm text-muted-foreground">{correct} / {ROUND_SIZE} correct · avg {avgMs}ms</div>
        </div>

        <div className="w-full max-w-md rounded-lg border border-border bg-card p-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Per-clef accuracy</div>
          <div className="space-y-2">
            {clefs.map((c) => {
              const s = clefStats[c];
              const pct = !s || s.total === 0 ? null : Math.round((s.right / s.total) * 100);
              return (
                <div key={c} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-foreground">{c}</span>
                  <span className="text-muted-foreground">
                    {s ? `${s.right}/${s.total} · ${pct}%` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-full max-w-md rounded-lg border border-border bg-card p-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Achievements</div>
          <div className="space-y-2">
            {ACHIEVEMENTS.map((a) => {
              const got = unlocked.has(a.id);
              return (
                <div key={a.id} className={`flex items-center gap-2 text-sm ${got ? "text-[hsl(var(--brand-purple))]" : "text-muted-foreground"}`}>
                  <span>{got ? "✓" : "○"}</span>
                  <span>{a.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-sm text-muted-foreground">Personal best accuracy: {bestAcc}%</div>

        <button
          onClick={playAgain}
          className="rounded-md bg-brand-gradient px-8 py-3 font-semibold text-white shadow hover:opacity-90"
        >
          Next Round
        </button>
      </div>
    );
  }

  const qNum = history.length + 1;
  const pct = (history.length / ROUND_SIZE) * 100;

  return (
    <div className="flex flex-col items-center gap-5 py-6">
      <div className="grid w-full max-w-md grid-cols-4 gap-2 text-center">
        <Stat label="Q" value={`${qNum}/${ROUND_SIZE}`} />
        <Stat label="Acc" value={`${acc}%`} accent />
        <Stat label="Avg" value={avgMs ? `${avgMs}ms` : "—"} />
        <Stat label="Streak" value={`${streak}/${bestStreak}`} />
      </div>

      <div className="h-1 w-full max-w-md overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-brand-gradient transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--brand-purple))]">
        {current.clef} clef
      </div>

      <div
        className={`rounded-xl border-2 p-4 transition-colors bg-card ${
          feedback === "right"
            ? "border-[hsl(var(--brand-cyan))]"
            : feedback === "wrong"
            ? "border-red-400 animate-shake"
            : "border-border"
        }`}
      >
        <Staff clef={current.clef} noteKey={current.key} />
      </div>

      <button onClick={replayNote} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 min-h-[40px] text-sm text-[hsl(var(--brand-purple))] hover:border-brand">
        🔊 Replay note <span className="text-xs text-muted-foreground">(space)</span>
      </button>

      <AnswerKeys onPick={answer} disabled={feedback !== null} variant="neutral" size="md" />

      <div className="text-xs text-muted-foreground">Keyboard: A–G · Space replays · Round of {ROUND_SIZE}</div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-card px-2 py-1">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm font-bold ${accent ? "text-[hsl(var(--brand-purple))]" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
