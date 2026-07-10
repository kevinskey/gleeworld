import { BaseDur, dottedTicks } from './duration';

export interface Pitch { step: 'A'|'B'|'C'|'D'|'E'|'F'|'G'; octave: number; alter: number }
export interface EditorNote { kind: 'note'; pitch: Pitch; base: BaseDur; dots: number; tie: 'start'|'stop'|'none'; lyric?: string }
export interface EditorRest { kind: 'rest'; base: BaseDur; dots: number }
export type EditorElement = EditorNote | EditorRest;

export interface EditorScore {
  title: string;
  keyFifths: number;
  mode: 'major' | 'minor';
  timeSig: { beats: number; beatType: number };
  clef: 'treble' | 'bass' | 'alto';
  tempo: number;
  elements: EditorElement[];
}

export function emptyScore(): EditorScore {
  return {
    title: 'Untitled exercise',
    keyFifths: 0,
    mode: 'major',
    timeSig: { beats: 4, beatType: 4 },
    clef: 'treble',
    tempo: 120,
    elements: [],
  };
}

export function noteOf(pitch: Pitch, base: BaseDur, dots = 0): EditorNote {
  return { kind: 'note', pitch, base, dots, tie: 'none' };
}

export function restOf(base: BaseDur, dots = 0): EditorRest {
  return { kind: 'rest', base, dots };
}

export function elementTicks(el: EditorElement): number {
  return dottedTicks(el.base, el.dots);
}
