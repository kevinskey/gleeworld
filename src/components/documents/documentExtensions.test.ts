// @vitest-environment jsdom
// Regression guard for the Documents editor's extension list.
//
// StarterKit 3.26 bundles Link and Underline. `documentExtensions` also adds
// its own configured Link (openOnClick: false, rel/target/class attributes)
// and Underline. Registering both copies makes TipTap log "[tiptap warn]:
// Duplicate extension names found" and leaves it to resolution order which
// configuration — including Link's href protocol validation — actually wins.
// StarterKit's copies are therefore disabled (`link: false, underline: false`).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getSchema } from '@tiptap/core';
import { documentExtensions } from './DocumentEditor';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('documentExtensions', () => {
  it('registers no duplicate extension names', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    getSchema(documentExtensions());
    const duplicateWarnings = warn.mock.calls
      .map(args => String(args[0]))
      .filter(message => message.includes('Duplicate extension names'));
    expect(duplicateWarnings).toEqual([]);
  });

  it('still provides link and underline marks (StarterKit disabling them must not remove the feature)', () => {
    const schema = getSchema(documentExtensions());
    expect(Object.keys(schema.marks)).toEqual(expect.arrayContaining(['link', 'underline']));
  });

  it('keeps the explicitly configured Link, not StarterKit\'s default', () => {
    const link = documentExtensions().find(e => e.name === 'link');
    expect(link).toBeDefined();
    const options = link?.options as { openOnClick?: boolean; HTMLAttributes?: Record<string, string> };
    expect(options.openOnClick).toBe(false);
    expect(options.HTMLAttributes?.rel).toBe('noopener noreferrer');
  });
});
