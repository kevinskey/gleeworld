import { describe, it, expect } from 'vitest';
import { MUSIC_FACTS } from '../corpus';
import { buildIndex, searchAcademy } from '../../academy/search';

/**
 * These facts are PARSED out of reference documents, so the risk is not
 * invention — it is a silent parsing error putting a wrong number in front of
 * a composer. A wrong range is worse than no range, so the structural checks
 * below are the real gate.
 */

const PITCH = /^[A-G][♭♯]?-?\d$/;
/** Semitone value, for asserting low < high. */
const STEP: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(p: string): number {
  const m = /^([A-G])([♭♯]?)(-?\d)$/.exec(p)!;
  return (Number(m[3]) + 1) * 12 + STEP[m[1]] + (m[2] === '♭' ? -1 : m[2] === '♯' ? 1 : 0);
}

describe('MUSIC_FACTS corpus', () => {
  it('has both domains and a plausible size', () => {
    expect(MUSIC_FACTS.length).toBeGreaterThanOrEqual(28);
    expect(MUSIC_FACTS.some((c) => c.domain === 'instrument')).toBe(true);
    expect(MUSIC_FACTS.some((c) => c.domain === 'voice')).toBe(true);
  });

  it('has a unique id and non-empty text on every chunk', () => {
    const ids = new Set(MUSIC_FACTS.map((c) => c.id));
    expect(ids.size).toBe(MUSIC_FACTS.length);
    for (const c of MUSIC_FACTS) {
      expect(c.text.trim(), c.id).not.toBe('');
      expect(c.title.trim(), c.id).not.toBe('');
      expect(c.subject.trim(), c.id).not.toBe('');
    }
  });

  it('every pitch it states is well-formed', () => {
    for (const c of MUSIC_FACTS) {
      for (const tok of c.text.match(/\b[A-G][♭♯]?-?\d\b/g) ?? []) {
        expect(PITCH.test(tok), `${c.id}: ${tok}`).toBe(true);
      }
    }
  });

  it('every range reads low to high', () => {
    // Catches a transposed or mis-split table cell, which is the failure mode
    // a human reviewer would never spot across 30 chunks.
    for (const c of MUSIC_FACTS) {
      for (const m of c.text.matchAll(/\b([A-G][♭♯]?-?\d)–([A-G][♭♯]?-?\d)\b/g)) {
        expect(midi(m[1]), `${c.id}: ${m[0]}`).toBeLessThan(midi(m[2]));
      }
    }
  });

  it('carries no prose lifted from the source documents', () => {
    // The corpus is generated from structured data; these are phrases that
    // only appear in the source's editorial voice. Their presence would mean
    // a parser started passing sentences through again.
    const TELLS = [
      /shrill member/i, /do not score/i, /historically important/i,
      /utterly distinctive/i, /problem zone/i, /the great solo register/i,
      /rare today/i, /soft-spoken/i,
    ];
    for (const c of MUSIC_FACTS) {
      for (const re of TELLS) expect(re.test(c.text), `${c.id} :: ${re}`).toBe(false);
    }
  });
});

describe('retrieval', () => {
  const index = buildIndex(MUSIC_FACTS);
  const top = (q: string) => searchAcademy(q, index)[0]?.chunk;

  it('finds the instrument asked about', () => {
    expect(top('viola range')?.id).toBe('strings/viola');
    expect(top('clarinet transposition')?.id).toBe('woodwinds/clarinet');
    expect(top('contrabass double bass range')?.subject).toMatch(/Contrabass/i);
  });

  it('finds choral voice parts', () => {
    expect(top('alto range SATB')?.domain).toBe('voice');
    expect(top('TTBB baritone range')?.subject).toMatch(/Baritone/);
  });

  it('returns nothing for a subject it does not cover', () => {
    expect(searchAcademy('sitar tuning gamelan', index)).toHaveLength(0);
  });
});
