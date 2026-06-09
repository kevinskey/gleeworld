
import { useMemo } from "react";
import Score from "../components/Score";
import { ChoiceGrid, DrillScaffold, StimulusCard, TierEndScreen } from "../components/DrillScaffold";
import { useGameRound, type Tier } from "../hooks/useGameRound";
import { KEYS_BASIC, KEYS_FULL, RELATIVE_MINOR, type MajorKey, pick } from "../lib/theory";

export default function KeySignatures({ tier, scope }: { tier: Tier; scope: "basic" | "full" }) {
  const game = useGameRound({ tier });
  const pool = scope === "basic" ? KEYS_BASIC : KEYS_FULL;

  const current = useMemo<MajorKey>(() => pick(pool), [game.qNum, pool]); // eslint-disable-line react-hooks/exhaustive-deps

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
      helperText="Identify the major key (relative minor shown below)."
    >
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--brand-purple))]">
        What major key?
      </div>

      <StimulusCard feedback={game.feedback}>
        <Score clef="treble" keySig={current} notes={[{ keys: ["b/4"], duration: "w" }]} />
      </StimulusCard>

      <ChoiceGrid
        cols={scope === "basic" ? 5 : 4}
        variant="neutral"
        choices={pool.map((k) => ({ value: k, label: `${k} major`, sublabel: `${RELATIVE_MINOR[k].toUpperCase()} minor` }))}
        disabled={game.feedback !== null}
        onPick={(v) => game.record(v === current)}
      />
    </DrillScaffold>
  );
}
