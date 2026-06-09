
import { useEffect, useRef, useState } from "react";
import Staff from "../components/Staff";
import AnswerKeys from "../components/AnswerKeys";
import { useDrill } from "../hooks/useDrill";
import { playChime } from "../lib/audio";
import type { Clef } from "../components/Staff";

const SPRINT_SEC = 60;
const BEST_KEY = "rmw:college:best-sprint";
const STREAK_KEY = "rmw:college:daily-streak";
const STREAK_DATE_KEY = "rmw:college:daily-streak-date";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function bumpDailyStreak(): number {
  if (typeof window === "undefined") return 0;
  const last = localStorage.getItem(STREAK_DATE_KEY);
  const today = todayKey();
  if (last === today) return Number(localStorage.getItem(STREAK_KEY) ?? 0);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const prev = Number(localStorage.getItem(STREAK_KEY) ?? 0);
  const next = last === yesterday ? prev + 1 : 1;
  localStorage.setItem(STREAK_KEY, String(next));
  localStorage.setItem(STREAK_DATE_KEY, today);
  return next;
}

export default function CollegeDrill({ clefs }: { clefs: Clef[] }) {
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [remaining, setRemaining] = useState(SPRINT_SEC);
  const [best, setBest] = useState(0);
  const [dailyStreak, setDailyStreak] = useState(0);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBest(Number(localStorage.getItem(BEST_KEY) ?? 0));
    setDailyStreak(Number(localStorage.getItem(STREAK_KEY) ?? 0));
  }, []);

  const { current, feedback, history, streak, bestStreak, answer, replayNote, reset } = useDrill({
    clefs,
    audio: true,
  });

  useEffect(() => {
    if (phase !== "running") return;
    const tick = setInterval(() => {
      const elapsed = (performance.now() - startedAtRef.current) / 1000;
      const left = Math.max(0, SPRINT_SEC - Math.floor(elapsed));
      setRemaining(left);
      if (left === 0) {
        clearInterval(tick);
        setPhase("done");
        playChime("win");
      }
    }, 200);
    return () => clearInterval(tick);
  }, [phase]);

  const correct = history.filter((h) => h.isRight).length;
  const wrong = history.length - correct;

  useEffect(() => {
    if (phase !== "done") return;
    if (correct > best) {
      setBest(correct);
      if (typeof window !== "undefined") localStorage.setItem(BEST_KEY, String(correct));
    }
    setDailyStreak(bumpDailyStreak());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const start = () => {
    reset();
    setRemaining(SPRINT_SEC);
    startedAtRef.current = performance.now();
    setPhase("running");
  };

  if (phase === "idle") {
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center text-white">
        <div className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">60-Second Sprint</div>
        <div className="max-w-md text-2xl font-light leading-snug">
          Identify as many notes as you can in <span className="font-semibold text-[hsl(var(--brand-cyan))]">{SPRINT_SEC}</span> seconds.
        </div>
        <div className="flex gap-8 text-sm">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-white/50">Personal Best</div>
            <div className="text-3xl font-bold">{best}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-white/50">Daily Streak</div>
            <div className="text-3xl font-bold text-[hsl(var(--brand-gold))]">🔥 {dailyStreak}</div>
          </div>
        </div>
        <button
          onClick={start}
          className="rounded-md bg-brand-gradient px-10 py-4 text-lg font-semibold text-white shadow-xl hover:opacity-90"
        >
          Begin Sprint
        </button>
        <div className="text-xs text-white/40">Keyboard: A–G to answer · Space to replay</div>
      </div>
    );
  }

  if (phase === "done") {
    const acc = history.length === 0 ? 0 : Math.round((correct / history.length) * 100);
    const avgMs = history.length === 0 ? 0 : Math.round(history.reduce((a, h) => a + h.ms, 0) / history.length);

    const wrongByNote: Record<string, { picked: string; correct: string; ms: number }[]> = {};
    history.filter((h) => !h.isRight).forEach((h) => {
      const k = `${h.clef}:${h.correct}`;
      wrongByNote[k] ??= [];
      wrongByNote[k].push({ picked: h.picked, correct: h.correct, ms: h.ms });
    });
    const weak = Object.entries(wrongByNote)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);

    return (
      <div className="flex flex-col items-center gap-6 py-10 text-white">
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Sprint Complete</div>
          <div className="mt-1 text-6xl font-bold text-brand-gradient">{correct}</div>
          <div className="text-sm text-white/60">correct in {SPRINT_SEC}s · {wrong} wrong · {acc}% · avg {avgMs}ms</div>
          {correct > 0 && correct >= best && (
            <div className="mt-2 text-sm font-semibold text-[hsl(var(--brand-cyan))]">⬆ Personal best</div>
          )}
        </div>

        <div className="w-full max-w-md rounded-lg border border-white/15 bg-white/[0.03] p-5 backdrop-blur">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/60">
            Weakest notes this session
          </div>
          {weak.length === 0 ? (
            <div className="text-sm text-[hsl(var(--brand-cyan))]">Zero misses. Clean run.</div>
          ) : (
            <ul className="space-y-1 text-sm">
              {weak.map(([k, misses]) => {
                const [clef, letter] = k.split(":");
                return (
                  <li key={k} className="flex justify-between">
                    <span>
                      <span className="capitalize text-white/60">{clef}</span>
                      <span className="mx-1 text-white/30">·</span>
                      <span className="font-semibold">{letter}</span>
                    </span>
                    <span className="text-white/50">
                      missed {misses.length}× (picked {[...new Set(misses.map((m) => m.picked))].join(", ")})
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex gap-6 text-sm text-white/60">
          <div>PB: <span className="font-semibold text-white">{Math.max(best, correct)}</span></div>
          <div>Streak: <span className="font-semibold text-[hsl(var(--brand-gold))]">🔥 {dailyStreak}</span></div>
          <div>Best run streak: <span className="font-semibold text-white">{bestStreak}</span></div>
        </div>

        <button
          onClick={start}
          className="rounded-md bg-brand-gradient px-8 py-3 font-semibold text-white shadow hover:opacity-90"
        >
          Another Sprint
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 py-6 text-white">
      <div className="grid w-full max-w-md grid-cols-4 gap-2 text-center">
        <Tile label="Time" value={`${remaining}s`} accent={remaining <= 10 ? "warn" : "neutral"} />
        <Tile label="Correct" value={correct} accent="brand" />
        <Tile label="Wrong" value={wrong} accent="neutral" />
        <Tile label="Streak" value={streak} accent="gold" />
      </div>

      <div className="h-1 w-full max-w-md overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full transition-all ${remaining <= 10 ? "bg-red-400" : "bg-brand-gradient"}`}
          style={{ width: `${(remaining / SPRINT_SEC) * 100}%` }}
        />
      </div>

      <div className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">
        {current.clef} clef
      </div>

      <div
        className={`rounded-xl border-2 p-4 transition-colors bg-white ${
          feedback === "right"
            ? "border-[hsl(var(--brand-cyan))]"
            : feedback === "wrong"
            ? "border-red-400 animate-shake"
            : "border-white/15"
        }`}
      >
        <Staff clef={current.clef} noteKey={current.key} />
      </div>

      <button onClick={replayNote} className="text-xs text-white/60 hover:text-white">
        Replay (space)
      </button>

      <AnswerKeys onPick={answer} disabled={feedback !== null} variant="dark" size="md" />
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string | number; accent: "brand" | "gold" | "warn" | "neutral" }) {
  const accentClass =
    accent === "brand" ? "text-[hsl(var(--brand-cyan))]" :
    accent === "gold"  ? "text-[hsl(var(--brand-gold))]" :
    accent === "warn"  ? "text-red-400" :
    "text-white";
  return (
    <div className="rounded-md border border-white/15 bg-white/[0.03] px-2 py-1 backdrop-blur">
      <div className="text-[10px] uppercase tracking-wide text-white/50">{label}</div>
      <div className={`text-base font-bold ${accentClass}`}>{value}</div>
    </div>
  );
}
