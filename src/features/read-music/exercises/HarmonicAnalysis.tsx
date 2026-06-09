
import { useMemo } from "react";
import Score from "../components/Score";
import { ChoiceGrid, DrillScaffold, StimulusCard, TierEndScreen } from "../components/DrillScaffold";
import { useGameRound, type Tier } from "../hooks/useGameRound";
import { KEYS_BASIC, ROMAN_MAJOR, TRIAD_QUALITIES, transposeUp, noteToMidi } from "../lib/theory";

const KEY_TONIC: Record<string, string> = {
  C: "c/4", G: "g/4", D: "d/4", F: "f/4", Bb: "b/3",
};

export default function HarmonicAnalysis({ tier }: { tier: Tier }) {
  const game = useGameRound({ tier });

  const current = useMemo(() => {
    const key = KEYS_BASIC[Math.floor(Math.random() * KEYS_BASIC.length)];
    const tonicKey = KEY_TONIC[key] ?? "c/4";
    const numeral = ROMAN_MAJOR[Math.floor(Math.random() * ROMAN_MAJOR.length)];
    const root = transposeUp(tonicKey, numeral.degree);
    const quality = TRIAD_QUALITIES.find((q) => q.value === numeral.quality)!;
    const keys = quality.intervals.map((s) => transposeUp(root, s));
    return { key, numeral, keys };
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
      helperText={`Key of ${current.key} major. Diatonic triads only.`}
    >
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--brand-cyan))]">
        Roman numeral analysis · {current.key} major
      </div>

      <StimulusCard feedback={game.feedback} isDark>
        <Score clef="treble" keySig={current.key} notes={[{ keys: current.keys, duration: "w" }]} />
      </StimulusCard>

      <ChoiceGrid
        cols={4}
        variant="dark"
        choices={ROMAN_MAJOR.map((r) => ({ value: r.value, label: r.label }))}
        disabled={game.feedback !== null}
        onPick={(v) => { void noteToMidi; game.record(v === current.numeral.value); }}
      />
    </DrillScaffold>
  );
}
