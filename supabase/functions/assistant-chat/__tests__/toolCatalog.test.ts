import { describe, it, expect } from 'vitest';
import { TOOL_CATALOG, toolsForRole, toOpenAiTools } from '../toolCatalog';

describe('toolCatalog', () => {
  it('members get only member tools', () => {
    const names = toolsForRole('member').map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining(['query_calendar', 'search_music', 'open_page', 'open_song',
        'create_note', 'create_task', 'start_video_session']),
    );
    expect(names).not.toContain('send_sms');
    expect(names).not.toContain('send_email');
    expect(names).not.toContain('create_event');
    expect(names).not.toContain('find_user');
    // add_video WRITES to the shared library, so it stays admin-only.
    // Searching and playing do not, and a singer asking to hear the piece
    // they are learning is the point — those are open to members.
    expect(names).not.toContain('add_video');
    expect(names).toContain('search_youtube');
    expect(names).toContain('play_video');
  });

  it('admins get every tool', () => {
    expect(toolsForRole('admin').length).toBe(TOOL_CATALOG.length);
  });

  it('confirm gating covers exactly the side-effectful/outward-facing tools', () => {
    const confirmed = TOOL_CATALOG.filter((t) => t.confirm).map((t) => t.name).sort();
    expect(confirmed).toEqual(['book_ride', 'create_course_draft', 'send_email', 'send_sms', 'set_date_card']);
  });

  // Server tools are read-only with ONE deliberate exception. remember_preference
  // writes, and it runs here anyway because current_tenant_id() prefers the
  // x-tenant-slug header that only the BROWSER sends: split across the two
  // sides, a preference was written where get_preference could never read it.
  // Keeping the pair together is what makes the assistant's memory work, so the
  // exception is named rather than quietly widening "read-only".
  it('server tools are the read-only set, plus remember_preference', () => {
    const server = TOOL_CATALOG.filter((t) => t.execution === 'server').map((t) => t.name).sort();
    expect(server).toEqual([
      'find_nearby_place',
      'find_user',
      'get_assignments',
      'get_attendance',
      'get_balance',
      'get_date_card',
      'get_grade_trend',
      'get_grades',
      'get_preference',
      'get_ride',
      'get_roster_flags',
      'liturgical_day',
      'lookup_bible',
      'order_food',
      'play_video',
      'query_calendar',
      'read_news_feeds',
      'remember_preference',
      'research_repertoire',
      'search_academy',
      'search_liturgy',
      'search_music',
      'search_music_facts',
      'search_youtube',
      'web_search',
    ]);
  });

  it('converts to OpenAI tool format', () => {
    const [first] = toOpenAiTools(toolsForRole('member'));
    expect(first).toMatchObject({ type: 'function', function: { name: expect.any(String) } });
    expect(first.function.parameters).toHaveProperty('type', 'object');
  });

  it('create_course_draft is admin-only, client-executed, confirm-gated', () => {
    const def = TOOL_CATALOG.find((t) => t.name === 'create_course_draft');
    expect(def).toBeDefined();
    expect(def!.minRole).toBe('admin');
    expect(def!.execution).toBe('client');
    expect(def!.confirm).toBe(true);
    expect(toolsForRole('member').map((t) => t.name)).not.toContain('create_course_draft');
  });
});

describe('search_academy', () => {
  it('is available to members', () => {
    const tool = TOOL_CATALOG.find((t) => t.name === 'search_academy');
    expect(tool).toBeDefined();
    expect(tool!.minRole).toBe('member');
    expect(tool!.execution).toBe('server');
    expect(tool!.confirm).toBe(false);
  });

  it('is included in the member tool list', () => {
    expect(toolsForRole('member').map((t) => t.name)).toContain('search_academy');
  });

  it('requires a query parameter', () => {
    const tool = TOOL_CATALOG.find((t) => t.name === 'search_academy')!;
    expect((tool.parameters as any).required).toEqual(['query']);
  });
});
