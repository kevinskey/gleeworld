
import { ReactNode } from "react";
import type { Tier } from "../hooks/useGameRound";

type Props = {
  tier: Tier;
  qNum: number;
  total: number;
  correct: number;
  streak: number;
  feedback: "right" | "wrong" | null;
  children: ReactNode;
  helperText?: string;
};

const TIER_LABEL: Record<Tier, string> = {
  elementary: "⭐",
  middle: "XP",
  high: "✓",
  college: "✓",
};

export function DrillScaffold({ tier, qNum, total, correct, streak, children, helperText }: Props) {
  const pct = ((qNum - 1) / total) * 100;
  const isDark = tier === "college";
  const muted = isDark ? "text-white/60" : "text-muted-foreground";
  const accent = isDark ? "text-[hsl(var(--brand-cyan))]" : "text-[hsl(var(--brand-purple))]";

  return (
    <div className="flex flex-col items-center gap-5 py-6">
      <div className="w-full max-w-md">
        <div className={`flex items-baseline justify-between text-xs ${muted}`}>
          <span>Question {qNum} of {total}</span>
          <span className="flex items-center gap-3">
            <span className={`font-semibold ${accent}`}>{TIER_LABEL[tier]} {tier === "middle" ? correct * 10 : correct}</span>
            {streak >= 3 && <span className="font-semibold text-[hsl(var(--brand-gold))]">🔥 {streak}</span>}
          </span>
        </div>
        <div className={`mt-1 h-2 w-full overflow-hidden rounded-full ${isDark ? "bg-white/10" : "bg-muted"}`}>
          <div className="h-full bg-brand-gradient transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {children}

      {helperText && <div className={`text-xs ${muted}`}>{helperText}</div>}
    </div>
  );
}

type EndProps = {
  tier: Tier;
  correct: number;
  total: number;
  bestStreak: number;
  onPlayAgain: () => void;
  extras?: ReactNode;
};

function medal(correct: number, total: number) {
  const pct = (correct / total) * 100;
  if (pct === 100) return "🥇";
  if (pct >= 80) return "🥈";
  if (pct >= 60) return "🥉";
  return "🌱";
}

function cheer(correct: number, total: number, tier: Tier): string {
  const pct = (correct / total) * 100;
  if (tier === "elementary") {
    if (pct === 100) return "Perfect round!";
    if (pct >= 80) return "Beautifully done.";
    if (pct >= 60) return "Nice work — keep going.";
    return "Good try! Let's go again.";
  }
  if (pct === 100) return "Perfect.";
  if (pct >= 80) return "Strong run.";
  if (pct >= 60) return "Solid.";
  return "Keep practicing.";
}

export function TierEndScreen({ tier, correct, total, bestStreak, onPlayAgain, extras }: EndProps) {
  const isDark = tier === "college";
  const pct = Math.round((correct / total) * 100);

  return (
    <div className={`flex flex-col items-center gap-6 py-12 text-center ${isDark ? "text-white" : ""}`}>
      <div className="text-7xl animate-pop">{medal(correct, total)}</div>
      <div className="text-3xl font-bold text-brand-gradient">{cheer(correct, total, tier)}</div>
      <div className={`text-xl ${isDark ? "text-white" : "text-foreground"}`}>
        <span className="font-bold text-[hsl(var(--brand-purple))]">{correct}</span> of {total} · {pct}%
      </div>
      <div className={`text-base ${isDark ? "text-white/70" : "text-muted-foreground"}`}>
        Best streak: <span className="font-semibold text-[hsl(var(--brand-gold))]">{bestStreak}</span> 🔥
      </div>
      {extras}
      <button
        onClick={onPlayAgain}
        className="mt-2 rounded-md bg-brand-gradient px-8 py-3 text-lg font-semibold text-white shadow-lg hover:opacity-90 active:scale-95"
      >
        Play Again
      </button>
    </div>
  );
}

export function StimulusCard({
  feedback,
  children,
  isDark = false,
}: {
  feedback: "right" | "wrong" | null;
  children: ReactNode;
  isDark?: boolean;
}) {
  return (
    <div
      className={`relative w-full max-w-md rounded-2xl border-2 p-5 transition-all ${
        feedback === "right"
          ? "border-[hsl(var(--brand-cyan))] " + (isDark ? "bg-white/5" : "bg-[hsl(var(--brand-cyan)/0.06)] scale-105")
          : feedback === "wrong"
          ? "border-red-400 " + (isDark ? "bg-red-950/30 animate-shake" : "bg-red-50 animate-shake")
          : isDark
          ? "border-white/15 bg-white"
          : "border-border bg-card"
      }`}
    >
      {children}
      {feedback === "right" && (
        <div className="absolute -top-4 -right-4 text-4xl animate-bounce">✨</div>
      )}
      {feedback === "wrong" && (
        <div className="absolute -top-4 -right-4 text-4xl">🤔</div>
      )}
    </div>
  );
}

export function ChoiceGrid<T extends string>({
  choices,
  onPick,
  disabled,
  cols,
  variant = "neutral",
}: {
  choices: { value: T; label: string; sublabel?: string }[];
  onPick: (v: T) => void;
  disabled?: boolean;
  cols?: number;
  variant?: "playful" | "neutral" | "dark";
}) {
  const colsCls =
    cols === 2 ? "grid-cols-2" :
    cols === 3 ? "grid-cols-3" :
    cols === 4 ? "grid-cols-4" :
    cols === 5 ? "grid-cols-5" :
    cols === 6 ? "grid-cols-6" :
    cols === 7 ? "grid-cols-7" :
    "grid-cols-2 sm:grid-cols-3";
  const styleByVariant: Record<NonNullable<typeof variant>, string> = {
    playful: "bg-white border-2 border-[hsl(var(--brand-purple)/0.35)] text-[hsl(var(--brand-purple))] hover:bg-[hsl(var(--brand-purple)/0.08)] hover:border-[hsl(var(--brand-purple))]",
    neutral: "bg-white border border-border text-foreground hover:border-[hsl(var(--brand-purple)/0.5)] hover:bg-[hsl(var(--brand-purple)/0.04)]",
    dark: "bg-[hsl(var(--brand-navy))]/60 border border-white/15 text-white hover:bg-[hsl(var(--brand-purple)/0.3)] hover:border-[hsl(var(--brand-cyan)/0.6)]",
  };

  return (
    <div className={`grid w-full max-w-md gap-2 ${colsCls}`}>
      {choices.map((c) => (
        <button
          key={c.value}
          onClick={() => onPick(c.value)}
          disabled={disabled}
          className={`rounded-lg px-4 py-3 text-base font-semibold transition-all active:scale-95 disabled:opacity-50 ${styleByVariant[variant]}`}
        >
          <div>{c.label}</div>
          {c.sublabel && <div className="text-xs font-normal opacity-70">{c.sublabel}</div>}
        </button>
      ))}
    </div>
  );
}
