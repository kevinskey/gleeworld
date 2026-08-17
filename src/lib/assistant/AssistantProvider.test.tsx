// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AssistantProvider, useAssistant } from './AssistantProvider';
import { saveThread } from './threadStorage';
import { setMuted, speak } from './speech';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ profile: { user_id: 'u1', full_name: 'Test User', email: 't@example.com', role: 'member' } }),
}));
// `auth.getSession` matters: speakNow() awaits it before calling speak(), so
// without it every speech assertion below is vacuous — the call throws first
// and speak() is never reached. That is exactly how a silent-reply bug shipped
// (Kevin, 2026-08-06: "who wrote the german requiem" → nothing).
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: 'test-token' } } })) },
  },
  SUPABASE_URL: 'https://supabase.test',
}));

// Partial-mock speech so a test can choose whether audio actually STARTS.
// Real speak() signals this precisely: onStart fires only on real audio
// (utterance.onstart / audio.onplay), while every silent path — muted, dead
// WKWebView synth, ElevenLabs error, blocked autoplay — calls onEnd alone.
type SpeakOpts = { muted?: boolean; onStart?: () => void; onEnd?: () => void };
const speakBehavior = { current: 'audible' as 'audible' | 'silent' | 'never-reports' };
// Controllable fake mic: tests drive recognition results/end by hand, and
// count start() calls to observe conversation-mode re-arms.
const speechHandlers = {
  current: null as null | { onResult: (t: string, isFinal: boolean) => void; onEnd: () => void },
};
const speechStart = vi.fn();
const speechStop = vi.fn();
// What takeInterruptedSpeech() hands the provider on the next send().
const interruptedFixture = { current: null as null | { text: string; fraction: number; at: number } };
vi.mock('./speech', async (importActual) => {
  const actual = await importActual<typeof import('./speech')>();
  return {
    ...actual,
    speak: vi.fn((_text: string, opts?: SpeakOpts) => {
      // 'never-reports' models a pipeline that calls back neither way —
      // a hang, or a path that forgets to report.
      if (speakBehavior.current === 'never-reports') return;
      // Real speak() returns early when muted — onEnd, never onStart.
      if (!opts?.muted && speakBehavior.current === 'audible') opts?.onStart?.();
      opts?.onEnd?.();
    }),
    getSpeechInput: () => ({
      available: true,
      start: (onResult: (t: string, isFinal: boolean) => void, onEnd: () => void) => {
        speechStart();
        speechHandlers.current = { onResult, onEnd };
      },
      stop: () => {
        speechStop();
        const h = speechHandlers.current;
        speechHandlers.current = null;
        // Real backends fire their end callback after stop().
        h?.onEnd();
      },
    }),
    takeInterruptedSpeech: vi.fn(() => {
      const v = interruptedFixture.current;
      interruptedFixture.current = null;
      return v;
    }),
  };
});
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
      <span data-testid="listening">{String(a.listening)}</span>
      <button onClick={() => a.send('hello')}>go</button>
      <button onClick={() => a.startLive()}>live</button>
      <button onClick={() => a.toggleMic()}>mic</button>
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

beforeEach(() => {
  sessionStorage.clear(); brandingVoice.current = null; startSession.mockClear(); speakBehavior.current = 'audible';
  speechHandlers.current = null; speechStart.mockClear(); speechStop.mockClear(); interruptedFixture.current = null;
});

/**
 * Click send, then let the speech path finish. speakNow() waits up to
 * VOICE_RESOLVE_TIMEOUT_MS (2500) for the tenant voice to settle before it
 * calls speak(), so any assertion about speaking — or about the caption that
 * stands in for it — has to get past that wait first.
 */
const sendAndSettleSpeech = async () => {
  vi.useFakeTimers();
  try {
    await act(async () => { screen.getByText('go').click(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  } finally {
    vi.useRealTimers();
  }
};
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
    speakBehavior.current = 'audible';
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { reply: 'spoken answer', actions: [] }, error: null } as never);
    renderProbe();
    await sendAndSettleSpeech();
    // Kevin 2026-08-03: only speak; the text lives in the sheet behind the
    // FAB caret. The caption is reserved for replies she can't speak.
    expect(screen.getByTestId('caption')).toHaveTextContent('');
  });

  it('a reply that never becomes audible surfaces as a caption, even unmuted', async () => {
    // The regression: the caption used to be gated on isMuted(), which is only
    // ONE of the ways a reply goes unheard. A dead WKWebView synth, an
    // ElevenLabs failure, or a blocked autoplay all end via onEnd with no
    // onStart — leaving no audio AND no text, which reads as a broken
    // assistant. Kevin, 2026-08-06: asked who wrote the German Requiem and got
    // nothing, while the server had persisted a correct 382-character answer.
    speakBehavior.current = 'silent';
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { reply: 'Johannes Brahms wrote it.', actions: [] }, error: null } as never);
    renderProbe();
    await sendAndSettleSpeech();
    expect(screen.getByTestId('caption')).toHaveTextContent('Johannes Brahms wrote it.');
  });

  it('captions when the speech pipeline never reports back at all', async () => {
    // The hole in the FIRST fix: onSilent only fired from speak()'s onEnd, so
    // a hang, an early return on a Stop tap, or a throw before playback left
    // the turn invisible. Kevin lost a turn to this after that fix shipped.
    speakBehavior.current = 'never-reports';
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { reply: 'highest written note is C7', actions: [] }, error: null } as never);
    renderProbe();
    vi.useFakeTimers();
    try {
      await act(async () => { screen.getByText('go').click(); });
      await act(async () => { await vi.advanceTimersByTimeAsync(12000); });
      expect(screen.getByTestId('caption')).toHaveTextContent('highest written note is C7');
    } finally {
      vi.useRealTimers();
    }
  });

  it('captions when getSession throws before speech can start', async () => {
    vi.mocked(supabase.auth.getSession).mockRejectedValueOnce(new Error('token refresh failed'));
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { reply: 'answer despite auth failure', actions: [] }, error: null } as never);
    renderProbe();
    await sendAndSettleSpeech();
    expect(screen.getByTestId('caption')).toHaveTextContent('answer despite auth failure');
  });

  it('a muted reply with the sheet closed still surfaces as a caption', async () => {
    setMuted(true);
    try {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { reply: 'silent answer', actions: [] }, error: null } as never);
      renderProbe();
      await sendAndSettleSpeech();
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

  it('an article result auto-opens the sheet — the reader lives there, so a closed sheet was silent', async () => {
    // The live failure (Kevin, 2026-08-17): by voice with the sheet closed,
    // "read it to me" → open_link {read_aloud:true} → showResult set state,
    // but AssistantResultsPanel only renders INSIDE the open sheet — the
    // ArticleCard that extracts and speaks never mounted. She announced the
    // article and went silent.
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        reply: '',
        actions: [{ tool: 'open_link', args: { url: 'https://example.com/story', title: 'Story', read_aloud: true }, confirm: false }],
      },
      error: null,
    } as never);
    renderProbe();
    expect(screen.getByTestId('sheet')).toHaveTextContent('false');
    await act(async () => { screen.getByText('go').click(); });
    expect(screen.getByTestId('sheet')).toHaveTextContent('true');
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

// ---------------------------------------------------------------------------
// "Next" context + voice conversation mode
// ---------------------------------------------------------------------------

describe('send() situational context ("Next" support)', () => {
  it('carries the open article panel and the interrupted-speech tail on the next turn', async () => {
    vi.mocked(supabase.functions.invoke).mockClear();
    vi.mocked(supabase.functions.invoke)
      .mockResolvedValueOnce({
        data: {
          reply: 'Opening it.', actions: [],
          resultsPanel: { kind: 'article', url: 'https://example.com/story', title: 'Big Story', readAloud: true },
        },
        error: null,
      } as never)
      .mockResolvedValueOnce({ data: { reply: 'ok', actions: [] }, error: null } as never);
    renderProbe();
    await sendAndSettleSpeech(); // turn 1: article lands on the panel
    interruptedFixture.current = {
      text: 'x'.repeat(100) + ' HEARD-TAIL-MARKER ' + 'y'.repeat(100),
      fraction: 0.6,
      at: Date.now(),
    };
    await sendAndSettleSpeech(); // turn 2 carries the context
    const secondBody = vi.mocked(supabase.functions.invoke).mock.calls[1][1] as { body: { context: Record<string, unknown> } };
    expect(secondBody.body.context.panel).toMatchObject({
      kind: 'article', url: 'https://example.com/story', title: 'Big Story', readAloud: true,
    });
    expect(String(secondBody.body.context.heardUpTo)).toContain('HEARD-TAIL-MARKER');
    // Only the heard portion: the tail window must not reach the unheard end.
    expect(String(secondBody.body.context.heardUpTo)).not.toContain('y'.repeat(40));
  });

  it('ignores a stale interruption from minutes ago', async () => {
    vi.mocked(supabase.functions.invoke).mockClear();
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { reply: 'ok', actions: [] }, error: null } as never);
    renderProbe();
    interruptedFixture.current = { text: 'old rundown text', fraction: 0.5, at: Date.now() - 120_000 };
    await sendAndSettleSpeech();
    const body = vi.mocked(supabase.functions.invoke).mock.calls[0][1] as { body: { context: Record<string, unknown> } };
    expect(body.body.context.heardUpTo).toBeUndefined();
  });
});

describe('voice conversation mode', () => {
  const tapMic = async () => { await act(async () => { screen.getByText('mic').click(); }); };
  const speakUtterance = async (text: string) => {
    await act(async () => {
      speechHandlers.current!.onResult(text, true);
      speechHandlers.current!.onEnd();
    });
  };
  const advance = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };

  it('re-arms the mic after a voice turn completes; typed turns never do', async () => {
    vi.mocked(supabase.functions.invoke).mockClear();
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { reply: 'Done.', actions: [] }, error: null } as never);
    renderProbe();
    vi.useFakeTimers();
    try {
      await tapMic();
      expect(speechStart).toHaveBeenCalledTimes(1);
      await speakUtterance('open music library');
      await advance(3000); // voice settle + spoken reply (mock speech ends instantly)
      expect(speechStart).toHaveBeenCalledTimes(2); // conversation mode re-armed
      expect(screen.getByTestId('listening')).toHaveTextContent('true');
      // The re-arm marked the turn as voice for the server too.
      const body = vi.mocked(supabase.functions.invoke).mock.calls[0][1] as { body: { context: Record<string, unknown> } };
      expect(body.body.context.voice).toBe(true);
    } finally { vi.useRealTimers(); }

    // Typed turn: no re-arm.
    speechStart.mockClear();
    cleanup();
    renderProbe();
    await sendAndSettleSpeech();
    expect(speechStart).not.toHaveBeenCalled();
  });

  it('after 5s of silence asks "Are you still there…", after the final window stands down', async () => {
    vi.mocked(speak).mockClear();
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { reply: 'Done.', actions: [] }, error: null } as never);
    renderProbe();
    vi.useFakeTimers();
    try {
      await tapMic();
      await speakUtterance('open music library');
      await advance(3000); // reply spoken → re-armed (start #2)
      expect(speechStart).toHaveBeenCalledTimes(2);
      await advance(5000); // idle window elapses silently
      const spokenTexts = vi.mocked(speak).mock.calls.map((c) => String(c[0]));
      expect(spokenTexts.some((t) => /are you still there/i.test(t))).toBe(true);
      await advance(3000); // check-in spoken → final listening window (start #3)
      expect(speechStart).toHaveBeenCalledTimes(3);
      await advance(8000); // still silent → stand down for good
      expect(screen.getByTestId('listening')).toHaveTextContent('false');
      expect(speechStart).toHaveBeenCalledTimes(3);
      await advance(10000); // and it stays down
      expect(speechStart).toHaveBeenCalledTimes(3);
    } finally { vi.useRealTimers(); }
  });

  it('a read-aloud article ends conversation mode — no hot mic over her reading', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        reply: '',
        actions: [{ tool: 'open_link', args: { url: 'https://example.com/story', title: 'Story', read_aloud: true }, confirm: false }],
      },
      error: null,
    } as never);
    renderProbe();
    vi.useFakeTimers();
    try {
      await tapMic();
      expect(speechStart).toHaveBeenCalledTimes(1);
      await speakUtterance('read me the article about the story');
      await advance(8000);
      // No echo cancellation on this path: while the ArticleCard reads the
      // story aloud, a re-armed mic would hear her own voice and barge her in.
      expect(speechStart).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('listening')).toHaveTextContent('false');
    } finally { vi.useRealTimers(); }
  });

  it('tapping the mic off during conversation mode ends it', async () => {
    vi.mocked(speak).mockClear();
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { reply: 'Done.', actions: [] }, error: null } as never);
    renderProbe();
    vi.useFakeTimers();
    try {
      await tapMic();
      await speakUtterance('open music library');
      await advance(3000);
      expect(screen.getByTestId('listening')).toHaveTextContent('true');
      await tapMic(); // explicit off
      expect(screen.getByTestId('listening')).toHaveTextContent('false');
      await advance(20000); // no check-in, no re-arm
      const spokenTexts = vi.mocked(speak).mock.calls.map((c) => String(c[0]));
      expect(spokenTexts.some((t) => /are you still there/i.test(t))).toBe(false);
      expect(screen.getByTestId('listening')).toHaveTextContent('false');
    } finally { vi.useRealTimers(); }
  });
});
