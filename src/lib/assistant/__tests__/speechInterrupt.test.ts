// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { speak, stopSpeaking, takeInterruptedSpeech } from '../speech';

/**
 * "Next" needs to know how far a spoken reply got before the user cut it
 * off. speak() plays one MP3 blob; the capture reads currentTime/duration
 * at the moment of interruption, before teardown destroys them.
 */

const TOKEN = 'jwt';
const URL_BASE = 'https://supabase.example.org';

// Controllable stand-in for the `new Audio()` speak() creates when no
// gesture-primed element exists (always the case in tests).
class FakeAudio {
  static last: FakeAudio | null = null;
  src = '';
  volume = 1;
  currentTime = 0;
  duration = NaN;
  onplay: (() => void) | null = null;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn(async () => { this.onplay?.(); });
  pause = vi.fn();
  load = vi.fn();
  removeAttribute = vi.fn();
  constructor() { FakeAudio.last = this; }
}

const mp3 = () => ({ ok: true, status: 200, blob: async () => new Blob(['x'], { type: 'audio/mpeg' }) }) as unknown as Response;
const settle = () => new Promise((r) => setTimeout(r, 50));
const synth = { speak: vi.fn(), cancel: vi.fn(), speaking: false } as unknown as SpeechSynthesis;

beforeEach(() => {
  FakeAudio.last = null;
  vi.stubGlobal('Audio', FakeAudio);
  vi.stubGlobal('fetch', vi.fn(async () => mp3()));
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:x');
  globalThis.URL.revokeObjectURL = vi.fn();
  takeInterruptedSpeech(); // drain state left by earlier tests
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('takeInterruptedSpeech', () => {
  it('captures text + fraction when playback is stopped mid-way, consume-once', async () => {
    const text = 'First headline here. Second headline follows. Third headline closes.';
    speak(text, { accessToken: TOKEN, supabaseUrl: URL_BASE, synth, muted: false });
    await settle();
    const audio = FakeAudio.last!;
    audio.duration = 100;
    audio.currentTime = 40;
    stopSpeaking(synth);
    const got = takeInterruptedSpeech();
    expect(got).not.toBeNull();
    expect(got!.fraction).toBeCloseTo(0.4);
    expect(got!.text).toContain('First headline');
    // consume-once: a later turn must not see stale data
    expect(takeInterruptedSpeech()).toBeNull();
  });

  it('records nothing when playback finished naturally', async () => {
    speak('Short reply.', { accessToken: TOKEN, supabaseUrl: URL_BASE, synth, muted: false });
    await settle();
    const audio = FakeAudio.last!;
    audio.duration = 10;
    audio.currentTime = 10;
    audio.onended?.();
    stopSpeaking(synth);
    expect(takeInterruptedSpeech()).toBeNull();
  });

  it('records nothing when stopped before any audio played', async () => {
    speak('Reply.', { accessToken: TOKEN, supabaseUrl: URL_BASE, synth, muted: false });
    await settle();
    const audio = FakeAudio.last!;
    audio.duration = 10;
    audio.currentTime = 0;
    stopSpeaking(synth);
    expect(takeInterruptedSpeech()).toBeNull();
  });
});
