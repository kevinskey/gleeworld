import { describe, it, expect } from 'vitest';
import { reconcileSelection } from '../selectionSync';

describe('reconcileSelection', () => {
  it('clears on external notes change (undo)', () => {
    expect(reconcileSelection([2], 3, true)).toEqual([]);
  });
  it('clamps out-of-range indices, keeps valid ones', () => {
    expect(reconcileSelection([0, 5], 3, false)).toEqual([0]);
  });
  it('keeps a fully valid selection unchanged on internal edits', () => {
    expect(reconcileSelection([0, 1], 3, false)).toEqual([0, 1]);
  });
  it('clears an empty selection on external change without error', () => {
    expect(reconcileSelection([], 0, true)).toEqual([]);
  });
});
