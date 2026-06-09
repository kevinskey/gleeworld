
import { useCallback, useEffect, useRef, useState } from "react";
import { playChime } from "../lib/audio";

export type Tier = "elementary" | "middle" | "high" | "college";

export type RoundEvent = { isRight: boolean; ms: number };

const ROUND_SIZE: Record<Tier, number> = {
  elementary: 10,
  middle: 15,
  high: 20,
  college: 25,
};

type Opts = {
  tier: Tier;
  rounds?: number;
  onDone?: () => void;
};

export function useGameRound({ tier, rounds, onDone }: Opts) {
  const total = rounds ?? ROUND_SIZE[tier];
  const [count, setCount] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState<"right" | "wrong" | null>(null);
  const [done, setDone] = useState(false);
  const [history, setHistory] = useState<RoundEvent[]>([]);
  const tStartRef = useRef<number>(performance.now());

  const beginQuestion = useCallback(() => {
    tStartRef.current = performance.now();
  }, []);

  useEffect(() => { beginQuestion(); }, [count, beginQuestion]);

  const record = useCallback(
    (isRight: boolean) => {
      if (feedback !== null || done) return;
      const ms = Math.round(performance.now() - tStartRef.current);
      setHistory((h) => [...h, { isRight, ms }]);
      setFeedback(isRight ? "right" : "wrong");
      if (isRight) {
        setCorrect((c) => c + 1);
        setStreak((s) => {
          const next = s + 1;
          setBestStreak((b) => (next > b ? next : b));
          return next;
        });
        playChime("right");
      } else {
        setStreak(0);
        playChime("wrong");
      }

      setTimeout(() => {
        setFeedback(null);
        const next = count + 1;
        if (next >= total) {
          setTimeout(() => {
            playChime("win");
            setDone(true);
            onDone?.();
          }, 250);
        } else {
          setCount(next);
        }
      }, 650);
    },
    [count, total, feedback, done, onDone]
  );

  const reset = useCallback(() => {
    setCount(0);
    setCorrect(0);
    setStreak(0);
    setBestStreak(0);
    setFeedback(null);
    setDone(false);
    setHistory([]);
  }, []);

  return {
    tier,
    total,
    qNum: count + 1,
    correct,
    wrong: count + (feedback === "wrong" ? 0 : 0) - correct + (history.length - correct),
    streak,
    bestStreak,
    feedback,
    done,
    history,
    record,
    reset,
  };
}
