import { describe, it, expect } from 'vitest';
import { textToDoc, EMPTY_DOC, docToText } from '../markdown';

describe('textToDoc', () => {
  it('returns EMPTY_DOC for empty/whitespace input', () => {
    expect(textToDoc('')).toEqual(EMPTY_DOC);
    expect(textToDoc('   \n  ')).toEqual(EMPTY_DOC);
  });

  it('builds one paragraph per non-empty line', () => {
    const doc = textToDoc('Line one\n\nLine two');
    expect(doc).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Line one' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Line two' }] },
      ],
    });
  });

  it('round-trips through docToText', () => {
    expect(docToText(textToDoc('Rehearsal notes')).trim()).toContain('Rehearsal notes');
  });
});
