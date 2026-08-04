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
    expect(names).not.toContain('search_youtube');
    expect(names).not.toContain('add_video');
  });

  it('admins get every tool', () => {
    expect(toolsForRole('admin').length).toBe(TOOL_CATALOG.length);
  });

  it('confirm gating covers exactly the side-effectful/outward-facing tools', () => {
    const confirmed = TOOL_CATALOG.filter((t) => t.confirm).map((t) => t.name).sort();
    expect(confirmed).toEqual([
      'book_ride', 'create_course_draft', 'order_food',
      'send_email', 'send_sms', 'set_date_card',
    ]);
  });

  it('book_ride and order_food are member-available, client-executed, confirm-gated', () => {
    for (const name of ['book_ride', 'order_food']) {
      const def = TOOL_CATALOG.find((t) => t.name === name);
      expect(def, name).toBeDefined();
      expect(def!.minRole).toBe('member');
      expect(def!.execution).toBe('client');
      expect(def!.confirm).toBe(true);
      expect(toolsForRole('member').map((t) => t.name)).toContain(name);
    }
  });

  it('server tools are exactly the read-only set', () => {
    const server = TOOL_CATALOG.filter((t) => t.execution === 'server').map((t) => t.name).sort();
    expect(server).toEqual([
      'find_nearby_place', 'find_note', 'find_user',
      'get_date_card', 'get_preference',
      'query_calendar', 'read_news_feeds', 'search_music', 'search_youtube',
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
