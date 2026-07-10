import { EditorScore, EditorElement, EditorNote, Pitch } from './model';

export interface Command {
  readonly label: string;
  apply(s: EditorScore): EditorScore;
  invert(s: EditorScore): EditorScore;
}

const replaceElements = (s: EditorScore, elements: EditorElement[]): EditorScore => ({ ...s, elements });

export function insertElement(at: number, el: EditorElement): Command {
  return {
    label: 'insert',
    apply: (s) => replaceElements(s, [...s.elements.slice(0, at), el, ...s.elements.slice(at)]),
    invert: (s) => replaceElements(s, [...s.elements.slice(0, at), ...s.elements.slice(at + 1)]),
  };
}

export function deleteElement(at: number): Command {
  let removed: EditorElement;
  return {
    label: 'delete',
    apply: (s) => { removed = s.elements[at]; return replaceElements(s, [...s.elements.slice(0, at), ...s.elements.slice(at + 1)]); },
    invert: (s) => replaceElements(s, [...s.elements.slice(0, at), removed, ...s.elements.slice(at)]),
  };
}

export function changeDuration(at: number, base: EditorElement['base'], dots: number): Command {
  let prev: { base: EditorElement['base']; dots: number };
  return {
    label: 'duration',
    apply: (s) => {
      const el = s.elements[at]; prev = { base: el.base, dots: el.dots };
      const next = { ...el, base, dots };
      return replaceElements(s, s.elements.map((e, i) => (i === at ? next : e)));
    },
    invert: (s) => replaceElements(s, s.elements.map((e, i) => (i === at ? { ...e, base: prev.base, dots: prev.dots } : e))),
  };
}

// Diatonic-agnostic chromatic transpose by semitones, expressed on the letter+alter model.
// A caller wanting "up one scale step" passes the right semitone count; Phase 1's arrow keys
// use ±1 semitone (chromatic nudge), which is the honest primitive.
const SEMISTEPS: Pitch['step'][] = ['C','C','D','D','E','F','F','G','G','A','A','B'];
const CHROMA: Record<Pitch['step'], number> = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
function pitchToMidi(p: Pitch): number { return (p.octave + 1) * 12 + CHROMA[p.step] + p.alter; }
function midiToPitch(m: number): Pitch {
  const octave = Math.floor(m / 12) - 1;
  const pc = ((m % 12) + 12) % 12;
  const step = SEMISTEPS[pc];
  const alter = pc - CHROMA[step];
  return { step, octave, alter };
}

export function transpose(at: number, semitones: number): Command {
  return {
    label: 'transpose',
    apply: (s) => replaceElements(s, s.elements.map((e, i) => {
      if (i !== at || e.kind !== 'note') return e;
      return { ...e, pitch: midiToPitch(pitchToMidi(e.pitch) + semitones) };
    })),
    invert: (s) => replaceElements(s, s.elements.map((e, i) => {
      if (i !== at || e.kind !== 'note') return e;
      return { ...e, pitch: midiToPitch(pitchToMidi(e.pitch) - semitones) };
    })),
  };
}

export function toggleTie(at: number): Command {
  const flip = (s: EditorScore): EditorScore => replaceElements(s, s.elements.map((e, i) => {
    if (i !== at || e.kind !== 'note') return e;
    return { ...e, tie: e.tie === 'start' ? 'none' : 'start' };
  }));
  return { label: 'tie', apply: flip, invert: flip };   // flip is its own inverse
}

export class CommandStack {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  do(cmd: Command, s: EditorScore): EditorScore { this.undoStack.push(cmd); this.redoStack = []; return cmd.apply(s); }
  undo(s: EditorScore): EditorScore { const c = this.undoStack.pop(); if (!c) return s; this.redoStack.push(c); return c.invert(s); }
  redo(s: EditorScore): EditorScore { const c = this.redoStack.pop(); if (!c) return s; this.undoStack.push(c); return c.apply(s); }
  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }
}
