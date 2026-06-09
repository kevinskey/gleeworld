
import { useMemo, useState } from "react";
import Score from "../components/Score";
import { DrillScaffold, StimulusCard, TierEndScreen } from "../components/DrillScaffold";
import { useGameRound, type Tier } from "../hooks/useGameRound";
import { transposeUp } from "../lib/theory";
import { playNote } from "../lib/audio";

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11, 12];
const TONICS = ["c/4", "d/4", "f/4", "g/4"];

function randomMelody(tonic: string, length = 6): string[] {
  const out: string[] = [tonic];
  for (let i = 1; i < length; i++) {
    const step = MAJOR_SCALE[Math.floor(Math.random() * 6)];
    out.push(transposeUp(tonic, step));
  }
  return out;
}

export default function SightSinging({ tier }: { tier: Tier }) {
  const game = useGameRound({ tier, rounds: 8 });
  const [reveal, setReveal] = useState(false);

  const current = useMemo(() => {
    const tonic = TONICS[Math.floor(Math.random() * TONICS.length)];
    const melody = randomMelody(tonic);
    return { tonic, melody };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.qNum]);

  if (game.done) {
    return (
      <TierEndScreen
        tier={tier}
        correct={game.correct}
        total={game.total}
        bestStreak={game.bestStreak}
        onPlayAgain={() => { setReveal(false); game.reset(); }}
      />
    );
  }

  const playTonic = () => playNote(current.tonic, 700);
  const playMelody = () => {
    current.melody.forEach((k, i) => setTimeout(() => playNote(k, 400), i * 450));
  };

  const rate = (stars: number) => {
    setReveal(false);
    game.record(stars >= 3);
  };

  return (
    <DrillScaffold
      tier={tier}
      qNum={game.qNum}
      total={game.total}
      correct={game.correct}
      streak={game.streak}
      feedback={game.feedback}
      helperText="Hear the tonic. Sing the phrase. Reveal the audio to compare. Rate yourself honestly."
    >
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--brand-cyan))]">
        Sight-sing this phrase
      </div>

      <StimulusCard feedback={game.feedback} isDark>
        <Score notes={current.melody.map((k) => ({ keys: [k], duration: "q" }))} height={140} />
      </StimulusCard>

      <div className="flex flex-wrap justify-center gap-2">
        <button onClick={playTonic} className="rounded-md border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/5">
          🔊 Hear tonic
        </button>
        <button
          onClick={() => { playMelody(); setReveal(true); }}
          className="rounded-md border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/5"
        >
          🔊 Reveal & compare
        </button>
      </div>

      {reveal && (
        <div className="flex flex-col items-center gap-3 pt-2">
          <div className="text-xs uppercase tracking-wide text-white/60">Rate your attempt</div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => rate(n)}
                disabled={game.feedback !== null}
                className="text-3xl hover:scale-110 disabled:opacity-50"
                aria-label={`${n} stars`}
              >
                ⭐
              </button>
            ))}
          </div>
          <div className="text-[10px] text-white/40">3+ counts as correct</div>
        </div>
      )}
    </DrillScaffold>
  );
}
