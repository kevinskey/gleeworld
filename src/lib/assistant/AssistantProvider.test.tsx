// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AssistantProvider, useAssistant } from './AssistantProvider';
import { saveThread } from './threadStorage';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ profile: { user_id: 'u1', full_name: 'Test User', email: 't@example.com', role: 'member' } }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

const Probe = () => {
  const a = useAssistant();
  return (
    <div>
      <span data-testid="count">{a.state.messages.length}</span>
      <span data-testid="sheet">{String(a.sheetOpen)}</span>
      <span data-testid="caption">{a.captionReply?.text ?? ''}</span>
      <button onClick={() => a.send('hello')}>go</button>
    </div>
  );
};

const renderProbe = () =>
  render(
    <MemoryRouter>
      <AssistantProvider><Probe /></AssistantProvider>
    </MemoryRouter>,
  );

beforeEach(() => { sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('AssistantProvider', () => {
  it('restores the thread from sessionStorage', () => {
    saveThread([{ id: 'a', role: 'user', content: 'earlier' }]);
    renderProbe();
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('send() appends both turns and mirrors to sessionStorage', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { reply: 'hi there', actions: [] }, error: null } as never);
    renderProbe();
    await act(async () => { screen.getByText('go').click(); });
    expect(screen.getByTestId('count')).toHaveTextContent('2');
    expect(JSON.parse(sessionStorage.getItem('gw_assistant_thread') ?? '[]')).toHaveLength(2);
  });

  it('a reply arriving while the sheet is closed becomes the caption', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { reply: 'spoken answer', actions: [] }, error: null } as never);
    renderProbe();
    await act(async () => { screen.getByText('go').click(); });
    expect(screen.getByTestId('caption')).toHaveTextContent('spoken answer');
  });

  it('a confirm-gated action auto-opens the sheet', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { reply: 'ready to send', actions: [{ tool: 'send_sms', args: {}, confirm: true }] },
      error: null,
    } as never);
    renderProbe();
    expect(screen.getByTestId('sheet')).toHaveTextContent('false');
    await act(async () => { screen.getByText('go').click(); });
    expect(screen.getByTestId('sheet')).toHaveTextContent('true');
  });
});
