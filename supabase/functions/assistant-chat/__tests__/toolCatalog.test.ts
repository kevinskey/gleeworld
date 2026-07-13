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

  it('only send_sms and send_email require confirmation', () => {
    const confirmed = TOOL_CATALOG.filter((t) => t.confirm).map((t) => t.name).sort();
    expect(confirmed).toEqual(['send_email', 'send_sms']);
  });

  it('server tools are exactly the read-only set', () => {
    const server = TOOL_CATALOG.filter((t) => t.execution === 'server').map((t) => t.name).sort();
    expect(server).toEqual(['find_user', 'query_calendar', 'search_music', 'search_youtube']);
  });

  it('converts to OpenAI tool format', () => {
    const [first] = toOpenAiTools(toolsForRole('member'));
    expect(first).toMatchObject({ type: 'function', function: { name: expect.any(String) } });
    expect(first.function.parameters).toHaveProperty('type', 'object');
  });
});
