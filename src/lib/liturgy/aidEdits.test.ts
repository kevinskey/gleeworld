import { describe, it, expect } from 'vitest';
import { applyPanelEdits, entryKey, reorderKeys, restoreInsertAt, type InsertedBlock, type PanelEdits } from './aidEdits';
import type { AidEntry } from './worshipAid';

/**
 * The merge between generated content and a user's edits.
 *
 * The risk this guards is silent wrongness: an edit landing on the wrong
 * entry, or a plan change quietly dropping something out of a printed
 * program. Both look fine on screen and are only discovered in the pews.
 */

const e = (label: string, over: Partial<AidEntry> = {}): AidEntry => ({ label, ...over });

const base: AidEntry[] = [
  e('FIRST READING', { citation: 'Isaiah 7:10-14' }),
  e('RESPONSORIAL PSALM'),
  e('COMMUNION', { title: 'Taste and See' }),
  e('COMMUNION', { title: 'Ave Verum' }),
];

const keys = (blocks: { key: string }[]) => blocks.map((b) => b.key);
const labels = (blocks: { entry: AidEntry }[]) => blocks.map((b) => b.entry.label);

describe('entryKey', () => {
  // Index-based keys would re-point every edit below an entry the moment the
  // plan gained or lost one. Occurrence survives that.
  it('distinguishes repeated labels by occurrence', () => {
    const seen = new Map<string, number>();
    expect(entryKey(e('COMMUNION'), seen)).toBe('COMMUNION');
    expect(entryKey(e('COMMUNION'), seen)).toBe('COMMUNION#2');
  });

  it('gives unlabelled blocks a key of their own kind', () => {
    const seen = new Map<string, number>();
    expect(entryKey({ label: '', notice: 'Welcome' }, seen)).toBe('NOTICE');
    expect(entryKey({ label: '', imageUrl: 'x.jpg' }, seen)).toBe('IMAGE');
  });
});

describe('applyPanelEdits', () => {
  it('returns the generated panel unchanged when nothing is edited', () => {
    expect(labels(applyPanelEdits(base, undefined))).toEqual([
      'FIRST READING', 'RESPONSORIAL PSALM', 'COMMUNION', 'COMMUNION',
    ]);
  });

  it('hides what the user removed, and only that', () => {
    const out = applyPanelEdits(base, { hidden: ['COMMUNION#2'] });
    expect(labels(out)).toEqual(['FIRST READING', 'RESPONSORIAL PSALM', 'COMMUNION']);
    expect(out.find((b) => b.key === 'COMMUNION')?.entry.title).toBe('Taste and See');
  });

  it('applies a text override to the right occurrence', () => {
    const edits: PanelEdits = { text: { 'COMMUNION#2': { title: 'Ave Verum Corpus' } } };
    const out = applyPanelEdits(base, edits);
    expect(out.find((b) => b.key === 'COMMUNION')?.entry.title).toBe('Taste and See');
    expect(out.find((b) => b.key === 'COMMUNION#2')?.entry.title).toBe('Ave Verum Corpus');
  });

  it('leaves the plan showing through where the user has not typed', () => {
    const out = applyPanelEdits(base, { text: { 'FIRST READING': { label: 'READING I' } } });
    const first = out[0];
    expect(first.entry.label).toBe('READING I');
    expect(first.entry.citation).toBe('Isaiah 7:10-14');   // still from the plan
  });

  it('inserts free text and scores as blocks of their own', () => {
    const out = applyPanelEdits(base, {
      inserts: [
        { id: 'i1', kind: 'text', text: 'The collection supports the food pantry.' },
        { id: 'i2', kind: 'score', imageUrl: 'https://example.org/psalm.jpg' },
      ],
    });
    expect(out.find((b) => b.key === 'i1')?.entry.summary).toMatch(/food pantry/);
    expect(out.find((b) => b.key === 'i2')?.entry.imageUrl).toBe('https://example.org/psalm.jpg');
    expect(out.filter((b) => b.inserted)).toHaveLength(2);
  });

  it('treats a spacer as pure height', () => {
    const out = applyPanelEdits(base, { inserts: [{ id: 's1', kind: 'spacer', height: 0.5 }] });
    expect(out.find((b) => b.key === 's1')?.gapAfter).toBe(0.5);
  });

  it('honours the order the user chose, inserts included', () => {
    const out = applyPanelEdits(base, {
      inserts: [{ id: 'i1', kind: 'text', text: 'Note' }],
      order: ['i1', 'RESPONSORIAL PSALM', 'FIRST READING'],
    });
    expect(keys(out).slice(0, 3)).toEqual(['i1', 'RESPONSORIAL PSALM', 'FIRST READING']);
  });

  // The failure that would be discovered in the pews: the planner gains a
  // second reading after the user reordered, and it silently never prints.
  it('still shows an entry the plan gained after a reorder', () => {
    const grown = [...base, e('SECOND READING', { citation: 'Romans 1:1-7' })];
    const out = applyPanelEdits(grown, { order: ['RESPONSORIAL PSALM', 'FIRST READING'] });
    expect(labels(out)).toContain('SECOND READING');
  });

  // An edit whose target the plan removed must not slide onto its neighbour.
  it('drops an edit whose entry no longer exists rather than misapplying it', () => {
    const shrunk = [e('FIRST READING'), e('RESPONSORIAL PSALM')];
    const out = applyPanelEdits(shrunk, { text: { 'COMMUNION#2': { title: 'Ghost' } } });
    expect(out.map((b) => b.entry.title)).not.toContain('Ghost');
  });

  it('clamps a gap that would overlap or blank the panel', () => {
    expect(applyPanelEdits(base, { gaps: { 'FIRST READING': -5 } })[0].gapAfter).toBe(0);
    expect(applyPanelEdits(base, { gaps: { 'FIRST READING': 99 } })[0].gapAfter).toBe(3);
    expect(applyPanelEdits(base, { gaps: { 'FIRST READING': Number.NaN } })[0].gapAfter).toBe(0);
  });
});

describe('reorderKeys', () => {
  const order = ['a', 'b', 'c'];

  it('moves a key up and down', () => {
    expect(reorderKeys(order, 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(reorderKeys(order, 'b', 1)).toEqual(['a', 'c', 'b']);
  });

  it('does nothing at the ends, or for a key it does not hold', () => {
    expect(reorderKeys(order, 'a', -1)).toEqual(order);
    expect(reorderKeys(order, 'c', 1)).toEqual(order);
    expect(reorderKeys(order, 'zz', 1)).toEqual(order);
  });
});

/**
 * Undoing a delete.
 *
 * Kevin deleted the Responsorial Psalm and asked how to type it back in
 * (2026-08-09). For a generated entry the answer is `hidden`, which never
 * loses the text. An INSERTED block has no generated source to fall back on,
 * so its undo has to carry the block itself — and put it back where it was,
 * not at the end.
 */
describe('restoreInsertAt', () => {
  const b = (id: string): InsertedBlock => ({ id, kind: 'text', text: id });

  it('puts the block back at its original index, not on the end', () => {
    const edits: PanelEdits = { inserts: [b('a'), b('c')] };
    const next = restoreInsertAt(edits, b('b'), 1, -1);
    expect(next.inserts?.map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('restores the order entry at its original position when the block had one', () => {
    const edits: PanelEdits = { inserts: [b('a')], order: ['GOSPEL', 'a'] };
    const next = restoreInsertAt(edits, b('z'), 1, 1);
    expect(next.order).toEqual(['GOSPEL', 'z', 'a']);
  });

  it('does not invent an order entry for a block that never had one', () => {
    // A block that was never moved has no order entry; adding one would pin
    // it in place and change how later plan edits flow around it.
    const edits: PanelEdits = { inserts: [b('a')] };
    const next = restoreInsertAt(edits, b('z'), 0, -1);
    expect(next.order).toBeUndefined();
  });

  it('is idempotent — a double undo does not duplicate the block', () => {
    const edits: PanelEdits = { inserts: [b('a')] };
    const once = restoreInsertAt(edits, b('z'), 0, -1);
    const twice = restoreInsertAt(once, b('z'), 0, -1);
    expect(twice.inserts?.filter((x) => x.id === 'z')).toHaveLength(1);
  });

  it('clamps an index that no longer exists rather than dropping the block', () => {
    // The panel can change between the delete and the undo click.
    const edits: PanelEdits = { inserts: [b('a')] };
    const next = restoreInsertAt(edits, b('z'), 99, 99);
    expect(next.inserts?.map((x) => x.id)).toEqual(['a', 'z']);
  });

  it('works from no prior edits at all', () => {
    const next = restoreInsertAt(undefined, b('z'), 0, -1);
    expect(next.inserts?.map((x) => x.id)).toEqual(['z']);
  });
});
