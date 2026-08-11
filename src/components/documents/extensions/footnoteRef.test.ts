import { it, expect } from 'vitest';
import { orderedFootnoteIds } from './FootnoteRef';

const doc = { type: 'doc', content: [
  { type: 'paragraph', content: [
    { type: 'text', text: 'a' }, { type: 'footnoteRef', attrs: { noteId: 'n2' } },
    { type: 'text', text: 'b' }, { type: 'footnoteRef', attrs: { noteId: 'n1' } },
  ]},
]};
it('orders by document position, not id', () =>
  expect(orderedFootnoteIds(doc)).toEqual(['n2', 'n1']));
it('handles doc with none', () =>
  expect(orderedFootnoteIds({ type: 'doc', content: [] })).toEqual([]));
