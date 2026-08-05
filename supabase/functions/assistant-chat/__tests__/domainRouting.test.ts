import { describe, it, expect } from 'vitest';
import { TOOL_CATALOG, toolsForRole } from '../toolCatalog.ts';

/**
 * Domain routing in this assistant is not a classifier — it is the model
 * choosing a tool, steered by tool DESCRIPTIONS and prompt rules. So what can
 * be tested deterministically is the contract those depend on: that each
 * domain has a distinct retrieval tool, that the descriptions actually name
 * the subjects that should reach them, and that liturgy is available to every
 * member rather than gated behind an admin role.
 *
 * The judgement calls — "does this question sound liturgical" — are the
 * model's, and no unit test can stand in for them.
 */

const tool = (name: string) => TOOL_CATALOG.find((t) => t.name === name);

describe('knowledge domains have their own retrieval tools', () => {
  it('keeps choral reference and Catholic liturgy separate', () => {
    expect(tool('search_academy')).toBeDefined();
    expect(tool('search_liturgy')).toBeDefined();
  });

  // Adding liturgy must not have quietly narrowed the existing domain.
  it('leaves the choral library covering what it always did', () => {
    const d = tool('search_academy')!.description.toLowerCase();
    for (const subject of ['conducting', 'spirituals', 'repertoire', 'terminology', 'choral education']) {
      expect(d).toContain(subject);
    }
  });

  it('points liturgical-law questions at the Church documents', () => {
    const d = tool('search_liturgy')!.description.toLowerCase();
    for (const cue of ['allowed', 'required', 'forbidden', 'mass', 'sacred music']) {
      expect(d).toContain(cue);
    }
    // The instruction that stops it answering canon law from memory.
    expect(d).toMatch(/never answer .*from your own knowledge/i);
  });

  it('lets liturgy answer for the user\'s own country or diocese', () => {
    expect(Object.keys(tool('search_liturgy')!.parameters.properties)).toContain('jurisdiction');
  });

  // A cantor asking whether the choir may sing the entrance chant is not an
  // administrator.
  it('offers liturgy to ordinary members, not just admins', () => {
    const member = toolsForRole('member').map((t) => t.name);
    expect(member).toContain('search_liturgy');
    expect(member).toContain('search_academy');
  });

  it('reads without side effects, like the other knowledge tools', () => {
    const t = tool('search_liturgy')!;
    expect(t.execution).toBe('server');
    expect(t.confirm).toBe(false);
  });
});
