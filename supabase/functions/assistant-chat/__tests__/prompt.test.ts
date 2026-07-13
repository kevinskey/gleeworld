import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../prompt';

describe('buildSystemPrompt', () => {
  const ctx = {
    firstName: 'Kevin', role: 'admin' as const, tenantName: 'Harmony Hall Choir',
    activeModules: ['studio', 'planner'], nowIso: '2026-07-12T20:00:00-04:00',
    timezone: 'America/New_York',
  };
  it('includes user, tenant, date, and modules', () => {
    const p = buildSystemPrompt(ctx);
    expect(p).toContain('Kevin');
    expect(p).toContain('Harmony Hall Choir');
    expect(p).toContain('2026-07-12');
    expect(p).toContain('studio');
  });
  it('never hardcodes a tenant name in the template', () => {
    const p = buildSystemPrompt({ ...ctx, tenantName: 'X' });
    expect(p).not.toMatch(/spelman/i);
  });
  it('tells member-role assistants they cannot message people', () => {
    const p = buildSystemPrompt({ ...ctx, role: 'member' });
    expect(p.toLowerCase()).toContain('cannot send');
  });
});
