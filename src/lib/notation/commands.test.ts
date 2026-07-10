import { describe, it, expect } from 'vitest';
import { insertElement, deleteElement, changeDuration, transpose, toggleTie, CommandStack } from './commands';
import { emptyScore, noteOf } from './model';

const C4 = { step: 'C' as const, octave: 4, alter: 0 };
const base = { ...emptyScore(), elements: [noteOf(C4, 'quarter'), noteOf(C4, 'half')] };

describe('commands are invertible', () => {
  const cases = [
    insertElement(1, noteOf(C4, 'eighth')),
    deleteElement(0),
    changeDuration(1, 'quarter', 0),
    transpose(0, 2),
    toggleTie(0),
  ];
  for (const cmd of cases) {
    it(`invert(apply) is identity for "${cmd.label}"`, () => {
      const after = cmd.apply(base);
      expect(after).not.toEqual(base);           // it actually did something
      expect(cmd.invert(after)).toEqual(base);   // and undoes cleanly
    });
  }
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
