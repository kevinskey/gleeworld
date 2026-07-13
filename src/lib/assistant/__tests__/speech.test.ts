import { describe, it, expect, vi } from 'vitest';
import { getSpeechInput, createNativeSpeechInput, isMuted, setMuted, speak } from '../speech';
import type { GWSpeechPluginShape, GWSpeechResultEvent } from '@/plugins/gwSpeech';

// Minimal fake of the GWSpeech Capacitor plugin: captures listeners so
// tests can drive speechResult / speechEnd events by hand.
function fakeSpeechPlugin() {
  const listeners = new Map<string, (e?: unknown) => void>();
  const plugin: GWSpeechPluginShape = {
    start: vi.fn(async () => {}),
    stop: vi.fn(async () => {}),
    addListener: vi.fn(async (event: string, cb: (e?: never) => void) => {
      listeners.set(event, cb as (e?: unknown) => void);
      return { remove: vi.fn(async () => { listeners.delete(event); }) };
    }) as unknown as GWSpeechPluginShape['addListener'],
  };
  return {
    plugin,
    emitResult(e: GWSpeechResultEvent) { listeners.get('speechResult')?.(e); },
    emitEnd() { listeners.get('speechEnd')?.(); },
    has(event: string) { return listeners.has(event); },
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

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

  it('uses the native backend when Web Speech is absent but native is available', () => {
    const { plugin } = fakeSpeechPlugin();
    const src = getSpeechInput({} as any, { available: true, plugin });
    expect(src.available).toBe(true);
  });

  it('prefers Web Speech over native when both exist', () => {
    const { plugin } = fakeSpeechPlugin();
    const fake = function () { return { start: vi.fn(), stop: vi.fn() }; };
    const src = getSpeechInput({ webkitSpeechRecognition: fake } as any, { available: true, plugin });
    src.start(vi.fn(), vi.fn());
    expect(plugin.start).not.toHaveBeenCalled();
  });

  it('mute persists through storage', () => {
    const s = memoryStorage();
    expect(isMuted(s)).toBe(false);
    setMuted(true, s);
    expect(isMuted(s)).toBe(true);
  });

  it('native source streams results and fires onEnd on speechEnd', async () => {
    const fake = fakeSpeechPlugin();
    const src = createNativeSpeechInput(fake.plugin);
    const onResult = vi.fn();
    const onEnd = vi.fn();
    src.start(onResult, onEnd);
    await flush();
    expect(fake.plugin.start).toHaveBeenCalledTimes(1);
    fake.emitResult({ transcript: 'hello', isFinal: false });
    fake.emitResult({ transcript: 'hello world', isFinal: true });
    expect(onResult).toHaveBeenNthCalledWith(1, 'hello', false);
    expect(onResult).toHaveBeenNthCalledWith(2, 'hello world', true);
    expect(onEnd).not.toHaveBeenCalled();
    fake.emitEnd();
    await flush();
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(fake.has('speechResult')).toBe(false); // listeners cleaned up
  });

  it('native stop() asks the plugin to stop; end still arrives via speechEnd', async () => {
    const fake = fakeSpeechPlugin();
    const src = createNativeSpeechInput(fake.plugin);
    const onEnd = vi.fn();
    src.start(vi.fn(), onEnd);
    await flush();
    src.stop();
    expect(fake.plugin.stop).toHaveBeenCalledTimes(1);
    fake.emitEnd(); // native side always emits speechEnd after stop
    await flush();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('native source ignores events from a previous session', async () => {
    const fake = fakeSpeechPlugin();
    const src = createNativeSpeechInput(fake.plugin);
    const first = vi.fn();
    const firstEnd = vi.fn();
    src.start(first, firstEnd);
    await flush();
    fake.emitEnd(); // session 1 over
    await flush();
    const second = vi.fn();
    src.start(second, vi.fn());
    await flush();
    fake.emitResult({ transcript: 'again', isFinal: false });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('again', false);
    expect(firstEnd).toHaveBeenCalledTimes(1);
  });

  it('native source calls onEnd when plugin.start rejects', async () => {
    const fake = fakeSpeechPlugin();
    (fake.plugin.start as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('denied'));
    const src = createNativeSpeechInput(fake.plugin);
    const onEnd = vi.fn();
    src.start(vi.fn(), onEnd);
    await flush();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('speak is a no-op when muted and calls synth otherwise', () => {
    const synth = { speak: vi.fn(), cancel: vi.fn() } as unknown as SpeechSynthesis;
    speak('hello', { muted: true, synth });
    expect((synth.speak as any)).not.toHaveBeenCalled();
    speak('hello', { muted: false, synth });
    expect((synth.speak as any)).toHaveBeenCalledTimes(1);
  });
});
