import { describe, expect, it } from 'vitest';
import { docToMarkdown, docToText, isDocEmpty, EMPTY_DOC } from '../markdown';
import type { DocNode } from '../types';

const doc: DocNode = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Rehearsal plan' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Focus on ' },
        { type: 'text', text: 'Ride On, King Jesus', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' mm. 24–36. See ' },
        { type: 'text', text: 'docs', marks: [{ type: 'link', attrs: { href: 'https://example.com' } }] },
        { type: 'text', text: '.' },
      ],
    },
    {
      type: 'taskList',
      content: [
        {
          type: 'taskItem',
          attrs: { checked: false, blockId: 'a' },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Mark breath marks' }] }],
        },
        {
          type: 'taskItem',
          attrs: { checked: true, blockId: 'b' },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Order scores' }] }],
        },
      ],
    },
    {
      type: 'bulletList',
      content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Sopranos early' }] }] },
      ],
    },
    { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Sing the vowel.' }] }] },
    { type: 'horizontalRule' },
  ],
};

describe('docToMarkdown', () => {
  it('renders GFM with task states, marks, and links', () => {
    const md = docToMarkdown(doc);
    expect(md).toContain('## Rehearsal plan');
    expect(md).toContain('**Ride On, King Jesus**');
    expect(md).toContain('[docs](https://example.com)');
    expect(md).toContain('- [ ] Mark breath marks');
    expect(md).toContain('- [x] Order scores');
    expect(md).toContain('- Sopranos early');
    expect(md).toContain('> Sing the vowel.');
    expect(md).toContain('---');
  });

  it('numbers ordered lists', () => {
    const ol: DocNode = {
      type: 'doc',
      content: [{
        type: 'orderedList',
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'two' }] }] },
        ],
      }],
    };
    const md = docToMarkdown(ol);
    expect(md).toContain('1. one');
    expect(md).toContain('2. two');
  });
});

describe('docToText', () => {
  it('flattens to searchable plain text without markup', () => {
    const text = docToText(doc);
    expect(text).toContain('Rehearsal plan');
    expect(text).toContain('Focus on Ride On, King Jesus mm. 24–36. See docs.');
    expect(text).toContain('Mark breath marks');
    expect(text).not.toContain('**');
  });
});

describe('isDocEmpty', () => {
  it('detects empty and non-empty docs', () => {
    expect(isDocEmpty(EMPTY_DOC)).toBe(true);
    expect(isDocEmpty(doc)).toBe(false);
  });
});
