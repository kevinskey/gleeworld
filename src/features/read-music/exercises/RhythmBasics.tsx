
import { useMemo } from "react";
import Score from "../components/Score";
import { ChoiceGrid, DrillScaffold, StimulusCard, TierEndScreen } from "../components/DrillScaffold";
import { useGameRound, type Tier } from "../hooks/useGameRound";

type Duration = "w" | "h" | "q";
const DURATIONS: { value: Duration; label: string; beats: number }[] = [
  { value: "w", label: "Whole",   beats: 4 },
  { value: "h", label: "Half",    beats: 2 },
  { value: "q", label: "Quarter", beats: 1 },
];

const NOTE_KEYS = ["b/4", "g/4", "d/5"];

export default function RhythmBasics({ tier = "elementary" }: { tier?: Tier }) {
  const game = useGameRound({ tier });

  const current = useMemo(() => {
    const dur = DURATIONS[Math.floor(Math.random() * DURATIONS.length)];
    const key = NOTE_KEYS[Math.floor(Math.random() * NOTE_KEYS.length)];
    return { dur, key };
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
      helperText="Whole = 4 beats · Half = 2 · Quarter = 1"
    >
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--brand-purple))]">
        What kind of note is this?
      </div>

      <StimulusCard feedback={game.feedback}>
        <Score notes={[{ keys: [current.key], duration: current.dur.value }]} />
      </StimulusCard>

      <ChoiceGrid
        cols={3}
        variant="playful"
        choices={DURATIONS.map((d) => ({ value: d.value, label: d.label, sublabel: `${d.beats} beat${d.beats === 1 ? "" : "s"}` }))}
        disabled={game.feedback !== null}
        onPick={(v) => game.record(v === current.dur.value)}
      />
    </DrillScaffold>
  );
}
