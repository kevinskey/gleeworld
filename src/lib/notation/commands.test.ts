import { describe, it, expect } from 'vitest';
import { insertElement, deleteElement, changeDuration, transpose, toggleTie, tieToNext, setAccidental, CommandStack } from './commands';
import { emptyScore, noteOf, restOf } from './model';

const C4 = { step: 'C' as const, octave: 4, alter: 0 };
const base = { ...emptyScore(), elements: [noteOf(C4, 'quarter'), noteOf(C4, 'half')] };

describe('commands are invertible', () => {
  const cases = [
    insertElement(1, noteOf(C4, 'eighth')),
    deleteElement(0),
    changeDuration(1, 'quarter', 0),
    transpose(0, 2),
    toggleTie(0),
    setAccidental(0, 1),
  ];
  for (const cmd of cases) {
    it(`invert(apply) is identity for "${cmd.label}"`, () => {
      const after = cmd.apply(base);
      expect(after).not.toEqual(base);           // it actually did something
      expect(cmd.invert(after)).toEqual(base);   // and undoes cleanly
    });
  }
});

describe('invertibility holds for enharmonic spellings and all tie states', () => {
  it('transpose restores a flat (Bb4) spelling exactly, not an enharmonic sharp', () => {
    const Bb4 = { step: 'B' as const, octave: 4, alter: -1 };
    const flatBase = { ...emptyScore(), elements: [noteOf(Bb4, 'quarter')] };
    const cmd = transpose(0, 2);
    const after = cmd.apply(flatBase);
    expect(after).not.toEqual(flatBase);            // it actually moved the note
    expect(cmd.invert(after)).toEqual(flatBase);     // and restores Bb4, not A#4
  });

  it('setAccidental flats a natural and invert restores it; no-ops on a rest', () => {
    const F4 = { step: 'F' as const, octave: 4, alter: 0 };
    const noteBase = { ...emptyScore(), elements: [noteOf(F4, 'quarter')] };
    const cmd = setAccidental(0, -1);
    const after = cmd.apply(noteBase);
    expect((after.elements[0] as any).pitch.alter).toBe(-1);
    expect(cmd.invert(after)).toEqual(noteBase);
    const restBase = { ...emptyScore(), elements: [restOf('quarter')] };
    expect(setAccidental(0, 1).apply(restBase)).toEqual(restBase);
  });

  it('toggleTie restores a "stop" tie exactly, not "start" or "none"', () => {
    const stoppedNote = { ...noteOf(C4, 'quarter'), tie: 'stop' as const };
    const tieBase = { ...emptyScore(), elements: [stoppedNote] };
    const cmd = toggleTie(0);
    const after = cmd.apply(tieBase);
    expect(cmd.invert(after)).toEqual(tieBase);
  });
});

describe('tieToNext pairs a note with its follower (proper ties, not a lone toggle)', () => {
  it('sets a start/stop pair on two adjacent notes and inverts cleanly', () => {
    const twoNotes = { ...emptyScore(), elements: [noteOf(C4, 'quarter'), noteOf(C4, 'quarter')] };
    const cmd = tieToNext(0);
    const after = cmd.apply(twoNotes);
    expect((after.elements[0] as any).tie).toBe('start');
    expect((after.elements[1] as any).tie).toBe('stop');
    expect(cmd.invert(after)).toEqual(twoNotes);
  });

  it('untying an already-tied pair restores both to none', () => {
    const twoNotes = { ...emptyScore(), elements: [noteOf(C4, 'quarter'), noteOf(C4, 'quarter')] };
    const cmd = tieToNext(0);
    const tied = cmd.apply(twoNotes);
    const untied = tieToNext(0).apply(tied);
    expect((untied.elements[0] as any).tie).toBe('none');
    expect((untied.elements[1] as any).tie).toBe('none');
  });

  it('no-ops when at+1 is out of range (single note)', () => {
    const single = { ...emptyScore(), elements: [noteOf(C4, 'quarter')] };
    const cmd = tieToNext(0);
    const after = cmd.apply(single);
    expect(after).toEqual(single);
    expect(cmd.invert(after)).toEqual(single);
  });
});

describe('CommandStack', () => {
  it('do → undo → redo round-trips the document', () => {
    const stack = new CommandStack();
    const s1 = stack.do(insertElement(2, noteOf(C4, 'quarter')), base);
    expect(s1.elements).toHaveLength(3);
    const s2 = stack.undo(s1);
    expect(s2).toEqual(base);
    const s3 = stack.redo(s2);
    expect(s3).toEqual(s1);
  });
  it('a new do() clears the redo stack', () => {
    const stack = new CommandStack();
    const s1 = stack.do(deleteElement(0), base);
    stack.undo(s1);
    stack.do(deleteElement(1), base);
    expect(stack.canRedo).toBe(false);
  });
});
