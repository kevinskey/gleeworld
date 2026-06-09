
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Clef } from "../components/Staff";
import { NOTE_LETTERS, POOLS, type Letter, type NoteEntry } from "../lib/notes";
import { playChime, playNote } from "../lib/audio";

export type DrillEvent = {
  clef: Clef;
  noteKey: string;
  correct: Letter;
  picked: Letter;
  ms: number;
  isRight: boolean;
};

type Options = {
  clefs: Clef[];
  audio?: boolean;
  onAnswer?: (e: DrillEvent) => void;
};

export function useDrill({ clefs, audio = true, onAnswer }: Options) {
  const [seed, setSeed] = useState(0);
  const [feedback, setFeedback] = useState<"right" | "wrong" | null>(null);
  const [history, setHistory] = useState<DrillEvent[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const shownAtRef = useRef<number>(performance.now());

  const current = useMemo<{ clef: Clef } & NoteEntry>(() => {
    const clef = clefs[Math.floor(Math.random() * clefs.length)];
    const pool = POOLS[clef];
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return { clef, ...pick };
    // seed re-rolls the question
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, clefs]);

  useEffect(() => {
    shownAtRef.current = performance.now();
    if (audio) playNote(current.key);
  }, [current.key, current.clef, audio]);

  const answer = useCallback(
    (picked: Letter) => {
      if (feedback !== null) return;
      const ms = Math.round(performance.now() - shownAtRef.current);
      const isRight = picked === current.letter;
      const event: DrillEvent = {
        clef: current.clef,
        noteKey: current.key,
        correct: current.letter,
        picked,
        ms,
        isRight,
      };
      setHistory((h) => [...h, event]);
      setFeedback(isRight ? "right" : "wrong");
      if (isRight) {
        setStreak((s) => {
          const next = s + 1;
          setBestStreak((b) => (next > b ? next : b));
          return next;
        });
        if (audio) playChime("right");
      } else {
        setStreak(0);
        if (audio) playChime("wrong");
      }
      onAnswer?.(event);
      setTimeout(() => {
        setFeedback(null);
        setSeed((n) => n + 1);
      }, 650);
    },
    [feedback, current, audio, onAnswer]
  );

  const replayNote = useCallback(() => {
    if (audio) playNote(current.key);
  }, [audio, current.key]);

  const reset = useCallback(() => {
    setHistory([]);
    setStreak(0);
    setBestStreak(0);
    setFeedback(null);
    setSeed((n) => n + 1);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toUpperCase();
      if ((NOTE_LETTERS as readonly string[]).includes(k)) {
        e.preventDefault();
        answer(k as Letter);
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        replayNote();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [answer, replayNote]);

  return { current, feedback, history, streak, bestStreak, answer, replayNote, reset };
}
