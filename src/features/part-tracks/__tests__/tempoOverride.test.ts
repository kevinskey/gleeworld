import { describe, expect, it } from 'vitest';
import { parseTempoBpm } from '../tempoOverride';

describe('parseTempoBpm', () => {
  it('treats blank input as "use the score tempo"', () => {
    expect(parseTempoBpm('')).toEqual({ ok: true, value: null });
    expect(parseTempoBpm('   ')).toEqual({ ok: true, value: null });
  });

  it('accepts whole numbers in the 20-300 range', () => {
    expect(parseTempoBpm('20')).toEqual({ ok: true, value: 20 });
    expect(parseTempoBpm('96')).toEqual({ ok: true, value: 96 });
    expect(parseTempoBpm(' 300 ')).toEqual({ ok: true, value: 300 });
  });

  it('rejects out-of-range tempos', () => {
    expect(parseTempoBpm('19').ok).toBe(false);
    expect(parseTempoBpm('301').ok).toBe(false);
    expect(parseTempoBpm('0').ok).toBe(false);
  });

  it('rejects non-integers and junk', () => {
    expect(parseTempoBpm('96.5').ok).toBe(false);
    expect(parseTempoBpm('fast').ok).toBe(false);
    expect(parseTempoBpm('-60').ok).toBe(false);
  });
});
