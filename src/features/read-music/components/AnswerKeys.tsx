
import { NOTE_LETTERS, type Letter } from "../lib/notes";

type Props = {
  onPick: (l: Letter) => void;
  disabled?: boolean;
  size?: "lg" | "md";
  variant?: "playful" | "neutral" | "dark";
};

const SIZE = {
  lg: "h-16 w-16 text-2xl",
  md: "h-12 w-12 text-lg",
} as const;

const VARIANT: Record<NonNullable<Props["variant"]>, string> = {
  playful:
    "bg-white border-2 border-[hsl(var(--brand-purple)/0.35)] text-[hsl(var(--brand-purple))] hover:bg-[hsl(var(--brand-purple)/0.08)] hover:border-[hsl(var(--brand-purple))] active:scale-95 shadow-sm",
  neutral:
    "bg-white border border-border text-foreground hover:border-[hsl(var(--brand-purple)/0.5)] hover:bg-[hsl(var(--brand-purple)/0.04)] active:scale-95",
  dark:
    "bg-[hsl(var(--brand-navy))]/60 border border-white/15 text-white hover:bg-[hsl(var(--brand-purple)/0.3)] hover:border-[hsl(var(--brand-cyan)/0.6)] active:scale-95",
};

export default function AnswerKeys({ onPick, disabled, size = "lg", variant = "neutral" }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {NOTE_LETTERS.map((l) => (
        <button
          key={l}
          onClick={() => onPick(l)}
          disabled={disabled}
          aria-label={`Answer ${l}`}
          className={`rounded-lg font-semibold transition-all disabled:opacity-50 ${SIZE[size]} ${VARIANT[variant]}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
