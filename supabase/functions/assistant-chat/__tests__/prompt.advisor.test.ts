import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../prompt.ts';

const ctx = { firstName: 'Maya', role: 'member' as const, tenantName: 'Test Choir',
  activeModules: ['academy'], nowIso: '2026-08-03T12:00:00Z', timezone: 'America/New_York' };

describe('advising prompt', () => {
  it('tells her to distinguish no-data from all-clear', () => {
    const p = buildSystemPrompt(ctx);
    expect(p).toContain('has_data');
    expect(p).toContain('do not congratulate');
  });

  it('warns against reciting balances aloud', () => {
    expect(buildSystemPrompt(ctx)).toContain('read aloud');
  });
});
