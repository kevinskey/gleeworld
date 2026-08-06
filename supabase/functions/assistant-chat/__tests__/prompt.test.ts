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
  /**
   * "Open the video" is a playback request, not a navigation one.
   *
   * The nav rule ("open X" → open_page) matched it against the `video` page
   * key and silently navigated to the video library, while the user meant the
   * recording they had just been discussing. Both halves of the distinction
   * have to survive: the nav rule stays, but it must not swallow media.
   */
  it('tells her "open the video" means play it, not open the library', () => {
    const p = buildSystemPrompt(ctx);
    expect(p).toContain('open the video');
    expect(p).toContain('play_video');
    expect(p.toLowerCase()).toContain('video library');
  });

  it('still routes ordinary "open X" requests to a page', () => {
    const p = buildSystemPrompt(ctx);
    expect(p).toContain('"open X": pick the closest match from this list and call open_page');
  });

  it('never hardcodes a tenant name in the template', () => {
    const p = buildSystemPrompt({ ...ctx, tenantName: 'X' });
    expect(p).not.toMatch(/spelman/i);
  });
  it('tells member-role assistants they cannot message people', () => {
    const p = buildSystemPrompt({ ...ctx, role: 'member' });
    expect(p.toLowerCase()).toContain('cannot send');
  });

  it('admins get the course-builder interview section; members do not', () => {
    const base = {
      firstName: 'Kevin', tenantName: 'GleeWorld', activeModules: [],
      nowIso: '2026-07-13T12:00:00Z', timezone: 'America/New_York',
    };
    const admin = buildSystemPrompt({ ...base, role: 'admin' as const });
    const member = buildSystemPrompt({ ...base, role: 'member' as const });
    expect(admin).toContain('create_course_draft');
    expect(admin).toContain('draft course');
    expect(member).not.toContain('create_course_draft');
  });
});

describe('academy guidance', () => {
  const ctx = {
    firstName: 'Kevin', role: 'member' as const, tenantName: 'Test Choir',
    activeModules: [], nowIso: '2026-08-04T12:00:00Z', timezone: 'America/New_York',
  };

  it('tells the assistant to search before answering subject questions', () => {
    expect(buildSystemPrompt(ctx)).toContain('search_academy');
  });

  it('names the covered domains', () => {
    const prompt = buildSystemPrompt(ctx);
    expect(prompt).toMatch(/conducting history/i);
    expect(prompt).toMatch(/terminology/i);
    expect(prompt).toMatch(/repertoire/i);
  });

  it('forbids inventing an answer when nothing is found', () => {
    expect(buildSystemPrompt(ctx)).toMatch(/do not (guess|invent)/i);
  });

  it('forbids attributing the material to another source', () => {
    expect(buildSystemPrompt(ctx)).toMatch(/never attribute/i);
  });

  it('gives the guidance to admins too', () => {
    expect(buildSystemPrompt({ ...ctx, role: 'admin' as const })).toContain('search_academy');
  });
});
