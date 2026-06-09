
import { useMemo } from "react";
import Score, { type Clef } from "../components/Score";
import { ChoiceGrid, DrillScaffold, StimulusCard, TierEndScreen } from "../components/DrillScaffold";
import { useGameRound, type Tier } from "../hooks/useGameRound";
import { TRIAD_QUALITIES, noteToMidi, transposeUp } from "../lib/theory";
import { playNote } from "../lib/audio";

const ROOTS_TREBLE = ["c/4", "d/4", "e/4", "f/4", "g/4", "a/4", "b/4"];
const ROOTS_BASS = ["c/3", "d/3", "e/3", "f/3", "g/3", "a/3"];

export default function ChordId({ tier }: { tier: Tier }) {
  const game = useGameRound({ tier });

  const current = useMemo(() => {
    const clef: Clef = Math.random() < 0.5 ? "treble" : "bass";
    const roots = clef === "treble" ? ROOTS_TREBLE : ROOTS_BASS;
    const root = roots[Math.floor(Math.random() * roots.length)];
    const quality = TRIAD_QUALITIES[Math.floor(Math.random() * TRIAD_QUALITIES.length)];
    const keys = quality.intervals.map((s) => transposeUp(root, s));
    return { clef, root, quality, keys };
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

  const playChord = () => {
    current.keys.forEach((k, i) => setTimeout(() => playNote(k, 700), i * 70));
  };

  return (
    <DrillScaffold
      tier={tier}
      qNum={game.qNum}
      total={game.total}
      correct={game.correct}
      streak={game.streak}
      feedback={game.feedback}
      helperText="Stacked thirds. Identify the triad quality."
    >
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--brand-purple))]">
        Triad quality
      </div>

      <StimulusCard feedback={game.feedback}>
        <Score clef={current.clef} notes={[{ keys: current.keys, duration: "w" }]} />
      </StimulusCard>

      <button onClick={playChord} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 min-h-[40px] text-sm text-[hsl(var(--brand-purple))] hover:border-brand">
        🔊 Arpeggiate
      </button>

      <ChoiceGrid
        cols={4}
        variant="neutral"
        choices={TRIAD_QUALITIES.map((q) => ({ value: q.value, label: q.label }))}
        disabled={game.feedback !== null}
        onPick={(v) => { void noteToMidi; game.record(v === current.quality.value); }}
      />
    </DrillScaffold>
  );
}
