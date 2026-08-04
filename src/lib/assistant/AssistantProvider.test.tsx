// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AssistantProvider, useAssistant } from './AssistantProvider';
import { saveThread } from './threadStorage';
import { setMuted } from './speech';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ profile: { user_id: 'u1', full_name: 'Test User', email: 't@example.com', role: 'member' } }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));
// AssistantProvider → useAssistantVoice → useBrandingSettings, which needs
// getTenantSlug + a queryable supabase client; stub the hook instead.
const brandingVoice = { current: null as string | null };
vi.mock('@/hooks/useBrandingSettings', () => ({
  useBrandingSettings: () => ({
    settings: { assistant_voice_id: brandingVoice.current },
    isLoading: false,
  }),
}));
// Live voice mode dynamically imports the ElevenLabs SDK; capture the
// startSession options so we can assert what the tenant's voice does to them.
const startSession = vi.fn(async () => ({ endSession: vi.fn(async () => {}) }));
vi.mock('@elevenlabs/client', () => ({ Conversation: { startSession } }));

const Probe = () => {
  const a = useAssistant();
  return (
    <div>
      <span data-testid="count">{a.state.messages.length}</span>
      <span data-testid="sheet">{String(a.sheetOpen)}</span>
      <span data-testid="caption">{a.captionReply?.text ?? ''}</span>
      <button onClick={() => a.send('hello')}>go</button>
      <button onClick={() => a.startLive()}>live</button>
    </div>
  );
};

const renderProbe = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient()}>
        <AssistantProvider><Probe /></AssistantProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );

beforeEach(() => { sessionStorage.clear(); brandingVoice.current = null; startSession.mockClear(); });
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

  it('a spoken reply with the sheet closed is NOT printed as a caption (voice-first)', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { reply: 'spoken answer', actions: [] }, error: null } as never);
    renderProbe();
    await act(async () => { screen.getByText('go').click(); });
    // Kevin 2026-08-03: only speak; the text lives in the sheet behind the
    // FAB caret. The caption is reserved for replies she can't speak.
    expect(screen.getByTestId('caption')).toHaveTextContent('');
  });

  it('a muted reply with the sheet closed still surfaces as a caption', async () => {
    setMuted(true);
    try {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { reply: 'silent answer', actions: [] }, error: null } as never);
      renderProbe();
      await act(async () => { screen.getByText('go').click(); });
      expect(screen.getByTestId('caption')).toHaveTextContent('silent answer');
    } finally {
      setMuted(false);
    }
  });

  it('send() proceeds even when geolocation never calls back (WKWebView hang)', async () => {
    // WKWebView with no location plist key invokes NEITHER geolocation
    // callback (its PositionOptions timeout never starts). One such stall
    // used to freeze the assistant for the whole session: send() awaited
    // the fix forever, busy stayed true, every later message was dropped.
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: vi.fn() }, // never calls back
    });
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { reply: 'made it', actions: [] }, error: null } as never);
    try {
      renderProbe();
      await act(async () => { screen.getByText('go').click(); });
      await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
      expect(screen.getByTestId('count')).toHaveTextContent('2');
    } finally {
      delete (navigator as { geolocation?: unknown }).geolocation;
      vi.useRealTimers();
    }
  });

  it('live mode starts the session on the TENANT voice, not the agent default', async () => {
    // The ElevenLabs agent's own TTS config is pinned to Jessica. Without an
    // explicit override every tenant hears Jessica in live mode no matter
    // what they picked on the Branding tab (Kevin, 2026-08-03).
    brandingVoice.current = '9BWtsMINqrJLrRacOk9x'; // Aria
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { token: 'tok' }, error: null } as never);
    renderProbe();
    await act(async () => { screen.getByText('live').click(); });
    expect(startSession).toHaveBeenCalledWith(
      expect.objectContaining({ overrides: { tts: { voiceId: '9BWtsMINqrJLrRacOk9x' } } }),
    );
  });

  it('live mode sends NO voice override when the tenant has not picked one', async () => {
    // null → the agent's configured default; 'browser' is meaningless to a
    // WebRTC agent (there is no browser-synth path in live mode).
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { token: 'tok' }, error: null } as never);
    renderProbe();
    await act(async () => { screen.getByText('live').click(); });
    expect(startSession).toHaveBeenCalledWith(expect.not.objectContaining({ overrides: expect.anything() }));
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
