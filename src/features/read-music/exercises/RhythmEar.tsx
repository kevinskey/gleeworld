
import { useEffect, useMemo, useState } from "react";
import Score from "../components/Score";
import { DrillScaffold, StimulusCard, TierEndScreen } from "../components/DrillScaffold";
import { useGameRound, type Tier } from "../hooks/useGameRound";
import { playNote } from "../lib/audio";

type Pattern = { id: string; notes: { duration: string }[]; label: string };

const PATTERNS_MIDDLE: Pattern[] = [
  { id: "qqhh", label: "♩ ♩ 𝅗𝅥", notes: [{ duration: "q" }, { duration: "q" }, { duration: "h" }] },
  { id: "hqq", label: "𝅗𝅥 ♩ ♩", notes: [{ duration: "h" }, { duration: "q" }, { duration: "q" }] },
  { id: "qqqq", label: "♩ ♩ ♩ ♩", notes: [{ duration: "q" }, { duration: "q" }, { duration: "q" }, { duration: "q" }] },
  { id: "8888qq", label: "♫ ♫ ♩ ♩", notes: [{ duration: "8" }, { duration: "8" }, { duration: "8" }, { duration: "8" }, { duration: "q" }, { duration: "q" }] },
  { id: "qq8888", label: "♩ ♩ ♫ ♫", notes: [{ duration: "q" }, { duration: "q" }, { duration: "8" }, { duration: "8" }, { duration: "8" }, { duration: "8" }] },
];

const PATTERNS_HIGH: Pattern[] = [
  ...PATTERNS_MIDDLE,
  { id: "q8888q", label: "♩ ♫ ♫ ♩", notes: [{ duration: "q" }, { duration: "8" }, { duration: "8" }, { duration: "8" }, { duration: "8" }, { duration: "q" }] },
  { id: "88qq88", label: "♫ ♩ ♩ ♫", notes: [{ duration: "8" }, { duration: "8" }, { duration: "q" }, { duration: "q" }, { duration: "8" }, { duration: "8" }] },
  { id: "hh", label: "𝅗𝅥 𝅗𝅥", notes: [{ duration: "h" }, { duration: "h" }] },
];

const BPM = 100;
const BEAT_MS = (60 / BPM) * 1000;

function playPattern(pat: Pattern) {
  let t = 0;
  pat.notes.forEach((n) => {
    const beats = n.duration === "h" ? 2 : n.duration === "q" ? 1 : n.duration === "8" ? 0.5 : 4;
    setTimeout(() => playNote("b/4", Math.max(80, beats * BEAT_MS * 0.6)), t);
    t += beats * BEAT_MS;
  });
}

export default function RhythmEar({ tier }: { tier: Tier }) {
  const game = useGameRound({ tier });
  const pool = tier === "high" ? PATTERNS_HIGH : PATTERNS_MIDDLE;

  const current = useMemo(() => {
    const correct = pool[Math.floor(Math.random() * pool.length)];
    const distractors = pool.filter((p) => p.id !== correct.id).sort(() => Math.random() - 0.5).slice(0, 3);
    const choices = [...distractors, correct].sort(() => Math.random() - 0.5);
    return { correct, choices };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.qNum, tier]);

  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
    const t = setTimeout(() => playPattern(current.correct), 200);
    return () => clearTimeout(t);
  }, [current]);

  if (game.done) {
    return (
      <TierEndScreen
        tier={tier}
        correct={game.correct}
        total={game.total}
        bestStreak={game.bestStreak}
        onPlayAgain={game.reset}
      />
    );
  }

  return (
    <DrillScaffold
      tier={tier}
      qNum={game.qNum}
      total={game.total}
      correct={game.correct}
      streak={game.streak}
      feedback={game.feedback}
      helperText="Listen and pick the matching rhythm."
    >
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--brand-purple))]">
        Which rhythm did you hear?
      </div>

      <button
        onClick={() => playPattern(current.correct)}
        className="rounded-full border border-border bg-card px-5 py-2 text-sm hover:border-brand"
      >
        🔊 Play again
      </button>

      <div className="grid w-full max-w-md gap-3">
        {current.choices.map((c, idx) => {
          const isCorrect = c.id === current.correct.id;
          const showResult = revealed && game.feedback;
          const ring = showResult
            ? isCorrect ? "ring-2 ring-[hsl(var(--brand-cyan))]" : ""
            : "";
          return (
            <button
              key={`${c.id}-${idx}`}
              onClick={() => { setRevealed(true); game.record(c.id === current.correct.id); }}
              disabled={game.feedback !== null}
              className={`w-full overflow-hidden rounded-lg border border-border bg-card p-3 text-left hover:border-brand disabled:opacity-70 ${ring}`}
            >
              <Score notes={c.notes.map((n) => ({ keys: ["b/4"], duration: n.duration }))} height={110} />
            </button>
          );
        })}
      </div>

      <StimulusCard feedback={game.feedback}>
        <div className="text-sm text-muted-foreground">Notation hidden — listen first.</div>
      </StimulusCard>
    </DrillScaffold>
  );
}
