import { GWSpeech, isNativeSpeechAvailable, type GWSpeechPluginShape } from '@/plugins/gwSpeech';
import type { PluginListenerHandle } from '@capacitor/core';

export interface SpeechInputSource {
  available: boolean;
  start(onResult: (transcript: string, isFinal: boolean) => void, onEnd: () => void): void;
  stop(): void;
}

const MUTE_KEY = 'gw-assistant-muted';

interface NativeSpeechBackend { available: boolean; plugin: GWSpeechPluginShape }

/** SpeechInputSource over the GWSpeech Capacitor plugin (iOS app only —
 *  WKWebView has no SpeechRecognition). Same contract as the web source:
 *  results stream to onResult, and onEnd always fires exactly once per
 *  session, whether it ends by silence, explicit stop(), or start failure. */
export function createNativeSpeechInput(plugin: GWSpeechPluginShape): SpeechInputSource {
  // Sessions are numbered so a listener that resolves late (or an event
  // from a session that already ended) can never leak into the next one.
  let session = 0;
  return {
    available: true,
    start(onResult, onEnd) {
      const mySession = ++session;
      let ended = false;
      const added: PluginListenerHandle[] = [];
      const finish = () => {
        if (ended) return;
        ended = true;
        for (const h of added) void h.remove().catch(() => { /* best effort */ });
        onEnd();
      };
      void (async () => {
        try {
          added.push(await plugin.addListener('speechResult', (e) => {
            if (session === mySession && !ended) onResult(e.transcript, e.isFinal);
          }));
          added.push(await plugin.addListener('speechEnd', () => {
            if (session === mySession) finish();
          }));
          if (session !== mySession) {
            // A newer start() superseded us while listeners registered.
            for (const h of added) void h.remove().catch(() => { /* best effort */ });
            return;
          }
          await plugin.start();
        } catch {
          // Permission denied or native failure — mirror the web source,
          // where onerror routes to onEnd.
          if (session === mySession) finish();
        }
      })();
    },
    stop() {
      // The native side always emits speechEnd after stop (delivering the
      // final transcript first), which runs finish() above — same shape as
      // web rec.stop() triggering onend.
      void plugin.stop().catch(() => { /* best effort */ });
    },
  };
}

export function getSpeechInput(
  win?: Window & typeof globalThis,
  native?: NativeSpeechBackend,
): SpeechInputSource {
  const w = (win ?? (typeof window !== 'undefined' ? window : undefined)) as any;
  const Ctor = w?.SpeechRecognition ?? w?.webkitSpeechRecognition;
  if (!Ctor) {
    const nat = native ?? { available: isNativeSpeechAvailable(), plugin: GWSpeech };
    if (nat.available) return createNativeSpeechInput(nat.plugin);
    return { available: false, start: () => {}, stop: () => {} };
  }
  let rec: any = null;
  return {
    available: true,
    start(onResult, onEnd) {
      rec = new Ctor();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (e: any) => {
        let transcript = '';
        let isFinal = false;
        for (let i = 0; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript;
          if (e.results[i].isFinal) isFinal = true;
        }
        onResult(transcript, isFinal);
      };
      rec.onend = onEnd;
      rec.onerror = onEnd;
      rec.start();
    },
    stop() {
      try { rec?.stop(); } catch { /* already stopped */ }
      rec = null;
    },
  };
}

export function isMuted(storage?: Storage): boolean {
  const s = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
  return s?.getItem(MUTE_KEY) === '1';
}

export function setMuted(muted: boolean, storage?: Storage): void {
  const s = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
  if (muted) s?.setItem(MUTE_KEY, '1');
  else s?.removeItem(MUTE_KEY);
}

export function speak(
  text: string,
  opts?: { muted?: boolean; synth?: SpeechSynthesis; onStart?: () => void; onEnd?: () => void },
): void {
  const muted = opts?.muted ?? isMuted();
  if (muted || !text.trim()) return;
  const synth = opts?.synth ?? (typeof speechSynthesis !== 'undefined' ? speechSynthesis : undefined);
  if (!synth) return;
  synth.cancel();
  const UtterCtor = (globalThis as any).SpeechSynthesisUtterance;
  const utterance = UtterCtor ? new UtterCtor(text) : ({ text } as any);
  // onStart/onEnd let callers track whether the assistant is currently
  // speaking so they can show (and drive) a Stop control. onerror also
  // ends — a cancelled utterance fires onerror/onend, so `speaking` never
  // gets stuck true.
  if (opts?.onStart) utterance.onstart = opts.onStart;
  if (opts?.onEnd) { utterance.onend = opts.onEnd; utterance.onerror = opts.onEnd; }
  synth.speak(utterance);
}

// Immediately silence any in-flight reply (barge-in / explicit Stop).
export function stopSpeaking(synth?: SpeechSynthesis): void {
  const s = synth ?? (typeof speechSynthesis !== 'undefined' ? speechSynthesis : undefined);
  try { s?.cancel(); } catch { /* nothing playing */ }
}
