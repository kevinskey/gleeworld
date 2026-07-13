import { describe, it, expect, vi } from 'vitest';
import { getSpeechInput, isMuted, setMuted, speak } from '../speech';

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(), key: () => null, length: 0,
  } as Storage;
}

describe('speech facade', () => {
  it('reports unavailable without SpeechRecognition', () => {
    expect(getSpeechInput({} as any).available).toBe(false);
  });

  it('reports available with webkitSpeechRecognition', () => {
    const fake = function () { return { start: vi.fn(), stop: vi.fn() }; };
    expect(getSpeechInput({ webkitSpeechRecognition: fake } as any).available).toBe(true);
  });

  it('mute persists through storage', () => {
    const s = memoryStorage();
    expect(isMuted(s)).toBe(false);
    setMuted(true, s);
    expect(isMuted(s)).toBe(true);
  });

  it('speak is a no-op when muted and calls synth otherwise', () => {
    const synth = { speak: vi.fn(), cancel: vi.fn() } as unknown as SpeechSynthesis;
    speak('hello', { muted: true, synth });
    expect((synth.speak as any)).not.toHaveBeenCalled();
    speak('hello', { muted: false, synth });
    expect((synth.speak as any)).toHaveBeenCalledTimes(1);
  });
});
