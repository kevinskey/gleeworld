import { describe, it, expect } from 'vitest';
import {
  AUTHORITY_RANK, appliesTo, authorityLabel, byAuthorityThenScore, formatCitation,
  type LiturgyChunk,
} from '../types.ts';

/**
 * Authority ranking is the part of the liturgy domain that cannot be got
 * wrong quietly. If a parish handbook outranks the Missal in the results, the
 * assistant will state a local preference as though it were Church law — an
 * answer that is confident, well-cited and wrong.
 */

const chunk = (over: Partial<LiturgyChunk> = {}): LiturgyChunk => ({
  id: 'x/1', document: 'X', documentTitle: 'Test Document', issuedBy: 'Someone',
  authority: 'universal_law', kind: 'law', jurisdiction: 'universal',
  section: '1', current: true, title: 'T', text: 'body',
  ...over,
});

const rank = (c: LiturgyChunk, score = 1) => ({ chunk: c, score });

describe('authority ordering', () => {
  it('ranks the hierarchy from universal law down to parish custom', () => {
    const order = (Object.keys(AUTHORITY_RANK) as Array<keyof typeof AUTHORITY_RANK>)
      .sort((a, b) => AUTHORITY_RANK[a] - AUTHORITY_RANK[b]);
    expect(order).toEqual([
      'universal_law', 'papal_or_dicastery', 'conference_adaptation',
      'conference_guidance', 'diocesan_policy', 'local_practice',
    ]);
  });

  // The failure this prevents: a handbook that happens to use the user's exact
  // words beating the document that actually governs.
  it('puts a higher authority first even when a lower one scores better', () => {
    const missal = rank(chunk({ authority: 'universal_law' }), 1);
    const handbook = rank(chunk({ authority: 'diocesan_policy', jurisdiction: 'US/Atlanta' }), 99);
    expect([handbook, missal].sort(byAuthorityThenScore)[0]).toBe(missal);
  });

  it('falls back to relevance within the same authority', () => {
    const weak = rank(chunk({ id: 'a' }), 2);
    const strong = rank(chunk({ id: 'b' }), 8);
    expect([weak, strong].sort(byAuthorityThenScore)[0]).toBe(strong);
  });

  // A superseded edition is worse than a lower-authority current one: it may
  // state a rule that no longer holds.
  it('sinks superseded passages below everything current', () => {
    const old = rank(chunk({ authority: 'universal_law', current: false }), 99);
    const now = rank(chunk({ authority: 'local_practice', current: true }), 1);
    expect([old, now].sort(byAuthorityThenScore)[0]).toBe(now);
  });
});

describe('jurisdiction', () => {
  it('applies universal texts to everyone, including a user with no location', () => {
    expect(appliesTo(chunk({ jurisdiction: 'universal' }), null)).toBe(true);
    expect(appliesTo(chunk({ jurisdiction: 'universal' }), 'GH')).toBe(true);
  });

  // A US adaptation quoted at someone in Ghana as though it were universal law
  // is a wrong answer, not a near-miss.
  it('does not apply a national adaptation outside its own country', () => {
    expect(appliesTo(chunk({ jurisdiction: 'US' }), 'GH')).toBe(false);
    expect(appliesTo(chunk({ jurisdiction: 'US' }), null)).toBe(false);
  });

  it('applies a national text within one of its dioceses, and vice versa', () => {
    expect(appliesTo(chunk({ jurisdiction: 'US' }), 'US/Atlanta')).toBe(true);
    expect(appliesTo(chunk({ jurisdiction: 'US/Atlanta' }), 'US')).toBe(true);
  });

  it('does not apply one diocese\'s policy in another', () => {
    expect(appliesTo(chunk({ jurisdiction: 'US/Atlanta' }), 'US/Chicago')).toBe(false);
  });
});

describe('how a source is described on screen', () => {
  it('names the authority in plain English, with the place where it matters', () => {
    expect(authorityLabel(chunk({ authority: 'universal_law' }))).toBe('Universal liturgical norm');
    expect(authorityLabel(chunk({ authority: 'conference_guidance', jurisdiction: 'US' })))
      .toBe("Bishops' conference guidance (US)");
    expect(authorityLabel(chunk({ authority: 'diocesan_policy', jurisdiction: 'US/Atlanta' })))
      .toBe('Diocesan policy (US/Atlanta)');
  });

  it('formats a citation with its section number', () => {
    expect(formatCitation(chunk({
      documentTitle: 'General Instruction of the Roman Missal', section: '48',
    }))).toBe('General Instruction of the Roman Missal, no. 48');
  });

  it('omits the number when a passage has none', () => {
    expect(formatCitation(chunk({ documentTitle: 'Some Directory', section: '' })))
      .toBe('Some Directory');
  });
});
