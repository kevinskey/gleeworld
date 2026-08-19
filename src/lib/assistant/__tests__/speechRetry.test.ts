// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { speak } from '../speech';

/**
 * Why the retry exists.
 *
 * When ElevenLabs fails, speech falls back to the browser's own voice so the
 * assistant is never mute. But that voice is a completely different-sounding
 * person, so a single rate limit or network blip changed the assistant's
 * voice mid-conversation and then changed it back — which is what Kevin
 * heard. A blip deserves a retry, not a new voice.
 */

const TOKEN = 'jwt';
const URL_BASE = 'https://supabase.example.org';

function audioOk() {
  // The <audio> element never really plays in jsdom; resolve straight away.
  // load() is likewise unimplemented there and stopElevenLabs calls it, which
  // otherwise floods the run with "Not implemented" traces.
  vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(window.HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:x');
  globalThis.URL.revokeObjectURL = vi.fn();
}

const mp3 = () => ({ ok: true, status: 200, blob: async () => new Blob(['x'], { type: 'audio/mpeg' }) }) as unknown as Response;
const fail = (status: number) => ({ ok: false, status }) as unknown as Response;

let browserSpoke = false;
const synth = {
  speak: () => { browserSpoke = true; },
  cancel: () => {},
  speaking: false,
} as unknown as SpeechSynthesis;

beforeEach(() => {
  browserSpoke = false;
  audioOk();
});
afterEach(() => vi.restoreAllMocks());

/** speak() is fire-and-forget; wait for its internal chain to settle. */
const settle = () => new Promise((r) => setTimeout(r, 1200));

describe('speak — one retry before changing voice', () => {
  it('retries a 500 and still uses the real voice', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(fail(500))
      .mockResolvedValueOnce(mp3());
    vi.stubGlobal('fetch', fetchMock);

    speak('hello', { accessToken: TOKEN, supabaseUrl: URL_BASE, synth, muted: false });
    await settle();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(browserSpoke).toBe(false);   // never dropped to the OS voice
  });

  it('retries a rate limit', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(fail(429))
      .mockResolvedValueOnce(mp3());
    vi.stubGlobal('fetch', fetchMock);

    speak('hello', { accessToken: TOKEN, supabaseUrl: URL_BASE, synth, muted: false });
    await settle();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(browserSpoke).toBe(false);
  });

  it('retries a network failure with no response at all', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(mp3());
    vi.stubGlobal('fetch', fetchMock);

    speak('hello', { accessToken: TOKEN, supabaseUrl: URL_BASE, synth, muted: false });
    await settle();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(browserSpoke).toBe(false);
  });

  // A bad voice id or an expired token fails again identically, so retrying
  // only buys silence before the same outcome.
  it('does not retry a 4xx that will not change', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fail(400));
    vi.stubGlobal('fetch', fetchMock);

    speak('hello', { accessToken: TOKEN, supabaseUrl: URL_BASE, synth, muted: false });
    await settle();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(browserSpoke).toBe(true);    // falls back rather than going mute
  });

  it('still falls back when the retry also fails — never mute', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fail(500));
    vi.stubGlobal('fetch', fetchMock);

    speak('hello', { accessToken: TOKEN, supabaseUrl: URL_BASE, synth, muted: false });
    await settle();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(browserSpoke).toBe(true);
  });

  it('does not call ElevenLabs at all without a token', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    speak('hello', { supabaseUrl: URL_BASE, synth, muted: false });
    await settle();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(browserSpoke).toBe(true);
  });
});
