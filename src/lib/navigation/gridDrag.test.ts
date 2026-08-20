// Drop rules for the keycap grid's edit mode.
//
// A drag used to be a prisoner of its band (one DndContext each), so the only
// way to get an app to the top of the grid was a detour through the My World
// editor. These hold the rules that replaced that: drag anywhere, and
// crossing a heading re-files the tool so the heading it lands under stays
// honest.
import { describe, it, expect } from 'vitest';
import { planDrop, FAVORITES_DROP_ID } from './gridDrag';

describe('planDrop — dragging across bands', () => {
  const BAND_OF = new Map<string, string | null>([
    ['calendar', null], ['messages', null],
    ['liturgy', 'a'],
    ['academy', 'b'], ['grading', 'b'],
  ]);
  const ORDER = ['calendar', 'messages', 'liturgy', 'academy', 'grading'];

  it('puts a grouped app at the very top and un-files it', () => {
    const plan = planDrop('grading', 'calendar', BAND_OF);
    expect(plan.reorder(ORDER)).toEqual(['grading', 'calendar', 'messages', 'liturgy', 'academy']);
    expect(plan.refileTo).toBeNull();
  });

  it('re-files a tile dropped into another named band', () => {
    const plan = planDrop('calendar', 'grading', BAND_OF);
    expect(plan.refileTo).toBe('b');
    expect(plan.reorder(ORDER)).toEqual(['messages', 'liturgy', 'academy', 'grading', 'calendar']);
  });

  it('leaves membership alone for a reorder inside one band', () => {
    const plan = planDrop('grading', 'academy', BAND_OF);
    expect('refileTo' in plan).toBe(false);
    expect(plan.reorder(ORDER)).toEqual(['calendar', 'messages', 'liturgy', 'grading', 'academy']);
  });

  it('is a no-op for a key the draft no longer holds', () => {
    expect(planDrop('gone', 'calendar', BAND_OF).reorder(ORDER)).toEqual(ORDER);
  });
});

// The empty Favorites row: no tiles to collide with, so it gets its own
// droppable. Dropping there means "ungrouped, at the top".
describe('planDrop — the empty Favorites zone', () => {
  const BAND_OF = new Map<string, string | null>([['liturgy', 'a'], ['academy', 'b']]);

  it('un-files the dropped app and puts it first', () => {
    const plan = planDrop('academy', FAVORITES_DROP_ID, BAND_OF);
    expect(plan.refileTo).toBeNull();
    expect(plan.reorder(['liturgy', 'academy'])).toEqual(['academy', 'liturgy']);
  });

  it('leaves membership alone when the app was already ungrouped', () => {
    const plan = planDrop('calendar', FAVORITES_DROP_ID, new Map([['calendar', null]]));
    expect('refileTo' in plan).toBe(false);
  });

  it('is a no-op for a key the draft no longer holds', () => {
    expect(planDrop('gone', FAVORITES_DROP_ID, BAND_OF).reorder(['liturgy'])).toEqual(['liturgy']);
  });
});
