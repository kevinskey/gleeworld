
import { useMemo } from "react";
import Score from "../components/Score";
import { ChoiceGrid, DrillScaffold, StimulusCard, TierEndScreen } from "../components/DrillScaffold";
import { useGameRound, type Tier } from "../hooks/useGameRound";
import { MODES, transposeUp } from "../lib/theory";
import { playNote } from "../lib/audio";

const TONICS = ["c/4", "d/4", "e/4", "f/4", "g/4", "a/4"];

export default function Modes({ tier }: { tier: Tier }) {
  const game = useGameRound({ tier });

  const current = useMemo(() => {
    const tonic = TONICS[Math.floor(Math.random() * TONICS.length)];
    const mode = MODES[Math.floor(Math.random() * MODES.length)];
    const keys = [tonic];
    let acc = 0;
    for (const step of mode.pattern) {
      acc += step;
      keys.push(transposeUp(tonic, acc));
    }
    return { tonic, mode, keys };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.qNum]);

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

  const playScale = () => {
    current.keys.forEach((k, i) => setTimeout(() => playNote(k, 350), i * 220));
  };

  return (
    <DrillScaffold
      tier={tier}
      qNum={game.qNum}
      total={game.total}
      correct={game.correct}
      streak={game.streak}
      feedback={game.feedback}
      helperText="A diatonic scale starting on the tonic shown."
    >
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--brand-cyan))]">
        Identify the mode
      </div>

      <StimulusCard feedback={game.feedback} isDark>
        <Score notes={current.keys.map((k) => ({ keys: [k], duration: "q" }))} height={140} />
      </StimulusCard>

      <button onClick={playScale} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 min-h-[40px] text-sm text-[hsl(var(--brand-cyan))] hover:bg-white/10">
        🔊 Play scale
      </button>

      <ChoiceGrid
        cols={4}
        variant="dark"
        choices={MODES.map((m) => ({ value: m.value, label: m.label }))}
        disabled={game.feedback !== null}
        onPick={(v) => game.record(v === current.mode.value)}
      />
    </DrillScaffold>
  );
}
