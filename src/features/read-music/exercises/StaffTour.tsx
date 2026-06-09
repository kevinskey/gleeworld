
import { useMemo } from "react";
import Score from "../components/Score";
import { ChoiceGrid, DrillScaffold, StimulusCard, TierEndScreen } from "../components/DrillScaffold";
import { useGameRound, type Tier } from "../hooks/useGameRound";
import { POOLS } from "../lib/notes";

const LINE_NOTES = new Set(["e/4", "g/4", "b/4", "d/5", "f/5"]);

export default function StaffTour({ tier = "elementary" }: { tier?: Tier }) {
  const game = useGameRound({ tier });

  const current = useMemo(() => {
    const pool = POOLS.treble;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return pick;
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

  const correctAnswer = LINE_NOTES.has(current.key) ? "line" : "space";

  return (
    <DrillScaffold
      tier={tier}
      qNum={game.qNum}
      total={game.total}
      correct={game.correct}
      streak={game.streak}
      feedback={game.feedback}
      helperText="Lines and spaces on the treble staff."
    >
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--brand-purple))]">
        Is this note on a line or a space?
      </div>

      <StimulusCard feedback={game.feedback}>
        <Score notes={[{ keys: [current.key] }]} />
      </StimulusCard>

      <ChoiceGrid
        cols={2}
        variant="playful"
        choices={[
          { value: "line", label: "Line" },
          { value: "space", label: "Space" },
        ]}
        disabled={game.feedback !== null}
        onPick={(v) => game.record(v === correctAnswer)}
      />
    </DrillScaffold>
  );
}
