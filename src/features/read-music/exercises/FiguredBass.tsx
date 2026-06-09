
import { useMemo } from "react";
import Score from "../components/Score";
import { ChoiceGrid, DrillScaffold, StimulusCard, TierEndScreen } from "../components/DrillScaffold";
import { useGameRound, type Tier } from "../hooks/useGameRound";
import { FIGURED_BASS_INVERSIONS, transposeUp } from "../lib/theory";

const ROOTS = ["c/3", "d/3", "e/3", "f/3", "g/3", "a/3"];
const QUALITIES = [
  { intervals: [0, 4, 7] }, // Major
  { intervals: [0, 3, 7] }, // Minor
];

export default function FiguredBass({ tier }: { tier: Tier }) {
  const game = useGameRound({ tier });

  const current = useMemo(() => {
    const root = ROOTS[Math.floor(Math.random() * ROOTS.length)];
    const q = QUALITIES[Math.floor(Math.random() * QUALITIES.length)];
    const inv = FIGURED_BASS_INVERSIONS[Math.floor(Math.random() * FIGURED_BASS_INVERSIONS.length)];
    let triad = q.intervals.map((s) => transposeUp(root, s));
    let bass = triad[0];
    if (inv.value === "1st") {
      bass = triad[1];
      triad = [triad[1], triad[2], transposeUp(triad[0], 12)];
    } else if (inv.value === "2nd") {
      bass = triad[2];
      triad = [triad[2], transposeUp(triad[0], 12), transposeUp(triad[1], 12)];
    }
    return { bass, triad, inv };
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

  return (
    <DrillScaffold
      tier={tier}
      qNum={game.qNum}
      total={game.total}
      correct={game.correct}
      streak={game.streak}
      feedback={game.feedback}
      helperText="Figured bass. Identify inversion from the stacked voicing."
    >
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--brand-cyan))]">
        Which inversion?
      </div>

      <StimulusCard feedback={game.feedback} isDark>
        <Score clef="bass" notes={[{ keys: current.triad, duration: "w" }]} />
      </StimulusCard>

      <div className="text-xs text-white/60">Bass note: <span className="font-mono">{current.bass}</span></div>

      <ChoiceGrid
        cols={3}
        variant="dark"
        choices={FIGURED_BASS_INVERSIONS.map((i) => ({ value: i.value, label: i.label, sublabel: i.figure || "—" }))}
        disabled={game.feedback !== null}
        onPick={(v) => game.record(v === current.inv.value)}
      />
    </DrillScaffold>
  );
}
