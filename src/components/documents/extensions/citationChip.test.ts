import { describe, it, expect } from 'vitest';
import { collectCitedSourceIds } from './CitationChip';

const doc = { type: 'doc', content: [
  { type: 'paragraph', content: [
    { type: 'text', text: 'Spirituals carried coded meaning ' },
    { type: 'citationChip', attrs: { sourceId: 's1', locator: '132' } },
  ]},
  { type: 'paragraph', content: [
    { type: 'citationChip', attrs: { sourceId: 's2', locator: null } },
  ]},
]};

it('collects cited source ids recursively', () =>
  expect([...collectCitedSourceIds(doc)].sort()).toEqual(['s1', 's2']));
it('empty doc yields empty set', () =>
  expect(collectCitedSourceIds({ type: 'doc', content: [] }).size).toBe(0));
