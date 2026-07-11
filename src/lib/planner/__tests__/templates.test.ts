import { describe, expect, it } from 'vitest';
import { defaultTemplateContext, substituteDoc, substituteText } from '../templates';
import type { DocNode } from '../types';

describe('substituteText', () => {
  it('replaces allowlisted vars', () => {
    expect(substituteText('Rehearsal — {{date}} with {{ensemble_name}}', {
      date: 'Friday, October 17, 2026',
      ensemble_name: 'Harmony Hall Choir',
    })).toBe('Rehearsal — Friday, October 17, 2026 with Harmony Hall Choir');
  });

  it('leaves unknown or unprovided placeholders visible', () => {
    expect(substituteText('{{concert_title}} / {{evil_code}}', {}))
      .toBe('{{concert_title}} / {{evil_code}}');
  });

  it('tolerates spacing inside braces', () => {
    expect(substituteText('{{ date }}', { date: 'X' })).toBe('X');
  });
});

describe('substituteDoc', () => {
  it('substitutes in nested text nodes without mutating the original', () => {
    const doc: DocNode = {
      type: 'doc',
      content: [{
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Sectional — {{date}}' }],
      }],
    };
    const out = substituteDoc(doc, { date: 'Oct 17' });
    expect(out.content![0].content![0].text).toBe('Sectional — Oct 17');
    expect(doc.content![0].content![0].text).toBe('Sectional — {{date}}');
  });
});

describe('defaultTemplateContext', () => {
  it('provides date and time', () => {
    const ctx = defaultTemplateContext(new Date(2026, 9, 17, 19, 30));
    expect(ctx.date).toBe('Saturday, October 17, 2026');
    expect(ctx.time).toBe('7:30 PM');
  });
});
