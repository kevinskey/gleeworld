
import { useMemo } from "react";
import Score, { type Clef } from "../components/Score";
import { ChoiceGrid, DrillScaffold, StimulusCard, TierEndScreen } from "../components/DrillScaffold";
import { useGameRound, type Tier } from "../hooks/useGameRound";
import { INTERVAL_BASIC, INTERVAL_FULL, transposeUp } from "../lib/theory";
import { playNote } from "../lib/audio";
import { POOLS } from "../lib/notes";

const STARTS: Record<Clef, string[]> = {
  treble: POOLS.treble.map((p) => p.key),
  bass: POOLS.bass.map((p) => p.key),
  alto: POOLS.alto.map((p) => p.key),
  tenor: POOLS.tenor.map((p) => p.key),
};

export default function Intervals({ tier, scope }: { tier: Tier; scope: "basic" | "full" }) {
  const game = useGameRound({ tier });
  const pool = scope === "basic" ? INTERVAL_BASIC : INTERVAL_FULL;
  const clefs: Clef[] = scope === "basic" ? ["treble", "bass"] : ["treble", "bass", "alto", "tenor"];

  const current = useMemo(() => {
    const clef = clefs[Math.floor(Math.random() * clefs.length)];
    const choice = pool[Math.floor(Math.random() * pool.length)];
    const semis = scope === "basic"
      ? (choice as typeof INTERVAL_BASIC[number]).semitones[
          Math.floor(Math.random() * (choice as typeof INTERVAL_BASIC[number]).semitones.length)
        ]
      : (choice as typeof INTERVAL_FULL[number]).semitones;
    const startPool = STARTS[clef].filter((k) => {
      const oct = parseInt(k.split("/")[1], 10);
      return oct >= 2 && oct <= 5;
    });
    const start = startPool[Math.floor(Math.random() * startPool.length)];
    const top = transposeUp(start, semis);
    return { clef, choice: choice.value, label: choice.label, start, top };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.qNum, scope]);

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

  const playInterval = () => {
    playNote(current.start, 500);
    setTimeout(() => playNote(current.top, 500), 350);
  };

  const cols = scope === "basic" ? 4 : 3;

  return (
    <DrillScaffold
      tier={tier}
      qNum={game.qNum}
      total={game.total}
      correct={game.correct}
      streak={game.streak}
      feedback={game.feedback}
      helperText="Press space to hear the interval."
    >
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--brand-purple))]">
        {current.clef} clef — name the interval
      </div>

      <StimulusCard feedback={game.feedback}>
        <Score clef={current.clef} notes={[{ keys: [current.start] }, { keys: [current.top] }]} />
      </StimulusCard>

      <button
        onClick={playInterval}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 min-h-[40px] text-sm text-[hsl(var(--brand-purple))] hover:border-brand"
      >
        🔊 Hear the interval
      </button>

      <ChoiceGrid
        cols={cols}
        variant="neutral"
        choices={pool.map((p) => ({ value: p.value, label: p.label }))}
        disabled={game.feedback !== null}
        onPick={(v) => game.record(v === current.choice)}
      />
    </DrillScaffold>
  );
}
