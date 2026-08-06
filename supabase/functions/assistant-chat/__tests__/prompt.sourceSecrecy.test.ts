import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../prompt';

/**
 * Whether the model actually keeps quiet about its sources is a judgement call
 * no unit test can make. What IS testable is the contract the judgement rests
 * on: that the prompt states the rule where the model will weigh it, and that
 * no OTHER instruction quietly demonstrates the opposite.
 *
 * That second half is the whole point. The rule existed before and still lost,
 * because one buried prohibition competed with three worked examples of naming
 * a corpus and announcing its gaps. Five replies leaked in production
 * (2026-08-06), including "The academy library doesn't have a dedicated
 * article on modal mixture" and "Here's what the reference library has on it".
 */

const ctx = {
  tenantName: 'Test Choir',
  role: 'member' as const,
  firstName: 'Test',
  nowIso: '2026-08-06T12:00:00Z',
  timezone: 'America/New_York',
  activeModules: ['core'],
};

const prompt = () => buildSystemPrompt(ctx as never);

describe('the assistant does not narrate where it looked', () => {
  it('states the rule in the top-level Rules block, not only inside a domain note', () => {
    const p = prompt();
    const rulesIndex = p.indexOf('Rules:');
    expect(rulesIndex).toBeGreaterThan(-1);
    // The prohibition must live in the global block so it is weighed against
    // every domain note, not just the choral one.
    expect(p.slice(rulesIndex)).toMatch(/NEVER NAME YOUR SOURCES/i);
  });

  it('bans the exact phrasings that leaked, so the model has concrete negatives', () => {
    const p = prompt();
    for (const leaked of [
      "Here's what the reference library has",
      "The academy library doesn't have an article on",
      'Nothing came back for that',
      'not in the reference library',
    ]) {
      expect(p).toContain(leaked);
    }
  });

  it('prescribes an exact sentence for an ordinary miss, not just a ban list', () => {
    // A ban list alone did not hold in live testing: the model invented a new
    // phrasing ("Neither the choral reference library nor a web search turned
    // up anything"). It reproduces PRESCRIBED sentences reliably — that is how
    // the liturgy miss-message behaves — so the ordinary miss needs one too.
    const p = prompt();
    expect(p).toMatch(/the sentence is: "I could not verify that\."/i);
    expect(p).toMatch(/Do NOT append what you consulted/i);
  });

  it('tells the model to open with the answer, not with its search', () => {
    const p = prompt();
    expect(p).toMatch(/OPEN WITH THE ANSWER/);
    expect(p).toContain("Here's what I could find");
  });

  it('carves out liturgical law explicitly, and scopes it to liturgy alone', () => {
    const p = prompt();
    expect(p).toMatch(/ONE exception is Catholic liturgical law/i);
    expect(p).toMatch(/never extends to choral, historical or theory questions/i);
  });

  it('never instructs the model to reference "the library" when something is missing', () => {
    // The old failure mode: the miss-handling instruction itself said
    // "cannot be verified from the library", putting the phrase in the
    // model's mouth in the very sentence meant to handle a gap.
    const p = prompt();
    expect(p).not.toMatch(/cannot be verified from the library/i);
    expect(p).not.toMatch(/verified from the library/i);
  });

  it('keeps the liturgy corpus as the only named source in a miss message', () => {
    // Liturgy may name official Church documents on a miss — that citation is
    // what the user needs. Nothing else may.
    const p = prompt();
    const namedSourceMisses = p
      .split('\n')
      .filter((l) => /could not verify/i.test(l))
      .filter((l) => /library|documents|sources/i.test(l));
    for (const line of namedSourceMisses) {
      expect(line).toMatch(/official Church documents/i);
    }
  });
});
