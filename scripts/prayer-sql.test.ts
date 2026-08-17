import { describe, it, expect } from 'vitest';
import { jsonLit } from './prayer-sql';

describe('jsonLit', () => {
  it('serialises a value to a quoted, castable jsonb literal', () => {
    expect(jsonLit({ usfmCode: 'ISA', ranges: [], unparsed: [] })).toBe(
      `'{"usfmCode":"ISA","ranges":[],"unparsed":[]}'::jsonb`,
    );
  });

  it('escapes single quotes inside the JSON text', () => {
    expect(jsonLit({ unparsed: ["Job's speech"] })).toBe(
      `'{"unparsed":["Job''s speech"]}'::jsonb`,
    );
  });

  it('round-trips null and undefined-dropping object keys', () => {
    expect(jsonLit({ usfmCode: null, chapterLabel: undefined })).toBe(
      `'{"usfmCode":null}'::jsonb`,
    );
  });
});
