import type { Clef } from '../../components/Staff';

export type NotationSpec = { clef: Clef; keys: string[]; duration?: string };

export type Question =
  | {
      kind: 'mc';
      prompt: string;
      notation?: NotationSpec;
      choices: string[];
      answerIndex: number;
      explain?: string;
    }
  | {
      kind: 'keyboard';
      prompt: string;
      /** pitch class 0–11 (C=0) the student must tap */
      targetPc: number;
      explain?: string;
    }
  | {
      kind: 'staff';
      prompt: string;
      clef: Clef;
      /** VexFlow key like "g/4" — must be one of the 9 stepwise pool positions */
      targetKey: string;
      explain?: string;
    }
  | {
      kind: 'audio';
      prompt: string;
      /** VexFlow keys to play */
      playKeys: string[];
      playMode: 'melodic' | 'harmonic' | 'scale';
      choices: string[];
      answerIndex: number;
      explain?: string;
    }
  | {
      kind: 'rhythm';
      prompt: string;
      /** note durations in 4/4: w, h, q, 8 */
      durations: RhythmDur[];
      bpm: number;
      explain?: string;
    };

export type RhythmDur = 'w' | 'h' | 'q' | '8';
export const RHYTHM_BEATS: Record<RhythmDur, number> = { w: 4, h: 2, q: 1, '8': 0.5 };

/** Authored bank entry: correct answer first, wrong answers after; shuffled at quiz build. */
export type BankQ = { p: string; c: string; w: string[]; e?: string; n?: NotationSpec };
