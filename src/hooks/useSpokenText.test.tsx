// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const spoken: string[] = [];
const speakOpts: Array<Record<string, unknown>> = [];
vi.mock('@/lib/assistant/speech', () => ({
  speak: vi.fn((text: string, opts?: { onEnd?: () => void; voiceId?: string | null }) => {
    spoken.push(text);
    speakOpts.push({ ...opts });
    opts?.onEnd?.();
  }),
  stopSpeaking: vi.fn(),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) }, functions: { invoke: vi.fn() } },
  SUPABASE_URL: 'https://supabase.test',
}));
vi.mock('@/lib/assistant/voices', () => ({
  useAssistantVoice: () => ({ voiceId: 'voice-123', loading: false }),
}));

import { useSpokenText } from './useChapterAudio';

beforeEach(() => { spoken.length = 0; speakOpts.length = 0; vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

const CHUNKS = [
  { text: 'First reading. Cit.' },
  { text: 'Body one.' },
  { text: 'Responsorial Psalm. Cit.', pauseBeforeMs: 5000 },
  { text: 'Psalm body.' },
];

describe('useSpokenText — pauses between readings', () => {
  it('holds the full pause before a pauseBeforeMs chunk, then continues', async () => {
    const { result } = renderHook(() => useSpokenText(CHUNKS));
    await act(async () => { void result.current.play(); await vi.advanceTimersByTimeAsync(0); });
    // First reading + its body spoke back-to-back, then the gap begins.
    expect(spoken).toEqual(['First reading. Cit.', 'Body one.']);
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
    expect(spoken).toHaveLength(2); // still in the quiet gap
    await act(async () => { await vi.advanceTimersByTimeAsync(1100); });
    expect(spoken).toEqual(['First reading. Cit.', 'Body one.', 'Responsorial Psalm. Cit.', 'Psalm body.']);
    expect(result.current.playing).toBe(false); // finished cleanly
  });

  it('keeps playing=true through the gap and Stop during the gap cancels the rest', async () => {
    const { result } = renderHook(() => useSpokenText(CHUNKS));
    await act(async () => { void result.current.play(); await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.playing).toBe(true); // mid-gap, still "playing"
    act(() => { result.current.stop(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(spoken).toHaveLength(2); // nothing after the stop
    expect(result.current.playing).toBe(false);
  });

  it('speaks in the chosen assistant voice and accepts plain-string chunks', async () => {
    const { result } = renderHook(() => useSpokenText(['Just one line.']));
    await act(async () => { void result.current.play(); await vi.advanceTimersByTimeAsync(0); });
    expect(spoken).toEqual(['Just one line.']);
    expect(speakOpts[0].voiceId).toBe('voice-123');
  });
});
