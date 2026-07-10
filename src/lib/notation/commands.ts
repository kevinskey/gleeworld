import { EditorScore, EditorElement, Pitch } from './model';

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
  // midiToPitch canonicalizes every black key to a sharp, so going pitch -> MIDI -> pitch
  // loses enharmonic spelling (e.g. Bb4 -> A#4) even when the net semitone shift is 0.
  // That's fine for computing the *moved* pitch on apply, but invert must restore the
  // exact original pitch object (captured here) rather than recompute via MIDI math,
  // or undo would silently corrupt spelling for any flat (or otherwise non-canonical) note.
  let prevPitch: Pitch | undefined;
  return {
    label: 'transpose',
    apply: (s) => replaceElements(s, s.elements.map((e, i) => {
      if (i !== at || e.kind !== 'note') return e;
      prevPitch = e.pitch;
      return { ...e, pitch: midiToPitch(pitchToMidi(e.pitch) + semitones) };
    })),
    invert: (s) => replaceElements(s, s.elements.map((e, i) => {
      if (i !== at || e.kind !== 'note' || !prevPitch) return e;
      return { ...e, pitch: prevPitch };
    })),
  };
}

export function toggleTie(at: number): Command {
  // 'tie' is a 3-state field ('start'|'stop'|'none'); a plain flip between 'start' and 'none'
  // destroys 'stop' (stop -> start -> none, never back to stop). Capture the original tie on
  // apply and restore it on invert, same pattern as deleteElement/changeDuration.
  let prevTie: 'start' | 'stop' | 'none' | undefined;
  return {
    label: 'tie',
    apply: (s) => replaceElements(s, s.elements.map((e, i) => {
      if (i !== at || e.kind !== 'note') return e;
      prevTie = e.tie;
      return { ...e, tie: e.tie === 'start' ? 'none' : 'start' };
    })),
    invert: (s) => replaceElements(s, s.elements.map((e, i) => {
      if (i !== at || e.kind !== 'note' || prevTie === undefined) return e;
      return { ...e, tie: prevTie };
    })),
  };
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
