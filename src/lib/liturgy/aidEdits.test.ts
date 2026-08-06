import { describe, it, expect } from 'vitest';
import { applyPanelEdits, entryKey, reorderKeys, type PanelEdits } from './aidEdits';
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
