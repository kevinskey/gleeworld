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
  // How long the user can pause mid-sentence before we decide they're done.
  // Chrome's built-in end-of-speech detection cuts off at ~500ms of silence
  // with continuous=false, which chops people off mid-thought. We run in
  // continuous mode and enforce our own more generous silence window.
  const SILENCE_MS = 2500;
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  const clearSilenceTimer = () => {
    if (silenceTimer !== null) { clearTimeout(silenceTimer); silenceTimer = null; }
  };
  return {
    available: true,
    start(onResult, onEnd) {
      rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (e: any) => {
        let transcript = '';
        let sawFinal = false;
        for (let i = 0; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript;
          if (e.results[i].isFinal) sawFinal = true;
        }
        // We hand back isFinal=false while the user is still talking (so the
        // provider only updates the visible transcript). The "you're done"
        // signal is our own silence timer, not the recognizer's — a single
        // isFinal from Chrome doesn't mean the user is done, just that a
        // phrase parsed. Wait for silence, then re-emit the accumulated
        // transcript with isFinal=true and let the caller submit it.
        onResult(transcript, false);
        clearSilenceTimer();
        silenceTimer = setTimeout(() => {
          silenceTimer = null;
          onResult(transcript, true);
          try { rec?.stop(); } catch { /* already stopped */ }
        }, SILENCE_MS);
        // If Chrome flipped isFinal, that's a hint the caller can log; not
        // required for control flow.
        void sawFinal;
      };
      rec.onend = () => { clearSilenceTimer(); onEnd(); };
      rec.onerror = () => { clearSilenceTimer(); onEnd(); };
      rec.start();
    },
    stop() {
      clearSilenceTimer();
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

// Tracks the currently-playing ElevenLabs audio so a new speak() (or
// stopSpeaking) can cut it off — same barge-in guarantee the browser
// SpeechSynthesis path has via synth.cancel().
let elevenAudio: HTMLAudioElement | null = null;
// Monotonic session token: a fetch that resolves late (network was slow,
// user already moved on to a different message) checks the token before
// playing so we never stack audio.
let speakSession = 0;

function stopElevenLabs(): void {
  speakSession += 1;
  const a = elevenAudio;
  elevenAudio = null;
  if (!a) return;
  try {
    a.pause();
    // Explicit src reset + load frees the AudioContext-adjacent decoder
    // on Safari; without it, rapid barge-in can leak decoders on iOS.
    a.removeAttribute('src');
    a.load();
  } catch { /* already torn down */ }
}

export function speak(
  text: string,
  opts?: {
    muted?: boolean;
    synth?: SpeechSynthesis;
    onStart?: () => void;
    onEnd?: () => void;
    /** ElevenLabs voice_id, or 'browser' to force browser TTS, or
     *  null/undefined to use the app default voice (Jessica). */
    voiceId?: string | null;
    /** Base URL for the elevenlabs-tts edge function — required for
     *  ElevenLabs playback. Defaults from VITE_SUPABASE_URL. */
    supabaseUrl?: string;
    /** JWT for the ElevenLabs call. If omitted, falls back to browser TTS. */
    accessToken?: string;
  },
): void {
  const muted = opts?.muted ?? isMuted();
  if (muted || !text.trim()) return;

  // Any prior speech (browser or ElevenLabs) is silenced BEFORE we start
  // the next one — the whole point of barge-in.
  const browserSynth = opts?.synth ?? (typeof speechSynthesis !== 'undefined' ? speechSynthesis : undefined);
  try { browserSynth?.cancel(); } catch { /* nothing playing */ }
  stopElevenLabs();

  // Decide provider. 'browser' sentinel forces the free path; a missing
  // access token or supabaseUrl also forces the free path (unauth'd
  // ElevenLabs calls would just 401 anyway).
  const supabaseUrl = opts?.supabaseUrl
    ?? (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_SUPABASE_URL : undefined);
  const useEleven =
    opts?.voiceId !== 'browser' && !!supabaseUrl && !!opts?.accessToken;

  if (!useEleven) {
    if (!browserSynth) { opts?.onEnd?.(); return; }
    const UtterCtor = (globalThis as any).SpeechSynthesisUtterance;
    const utterance = UtterCtor ? new UtterCtor(text) : ({ text } as any);
    if (opts?.onStart) utterance.onstart = opts.onStart;
    if (opts?.onEnd) { utterance.onend = opts.onEnd; utterance.onerror = opts.onEnd; }
    browserSynth.speak(utterance);
    return;
  }

  const mySession = ++speakSession;
  // App default is Jessica (matches the server default in
  // supabase/functions/elevenlabs-tts). Passing null/undefined here means
  // "the user hasn't picked yet" → use the app default.
  const voiceId = opts?.voiceId && opts.voiceId !== 'browser' ? opts.voiceId : 'cgSgspJ2msm6clMCkdW9';

  void (async () => {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/elevenlabs-tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${opts!.accessToken}`,
        },
        body: JSON.stringify({ text, voiceId }),
      });
      if (mySession !== speakSession) return; // superseded by a newer speak()
      if (!res.ok) throw new Error(`elevenlabs-tts ${res.status}`);
      const blob = await res.blob();
      if (mySession !== speakSession) return;
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      elevenAudio = audio;
      audio.onplay = () => { if (mySession === speakSession) opts?.onStart?.(); };
      const cleanup = () => {
        try { URL.revokeObjectURL(url); } catch { /* already revoked */ }
        if (elevenAudio === audio) elevenAudio = null;
        opts?.onEnd?.();
      };
      audio.onended = cleanup;
      audio.onerror = cleanup;
      await audio.play();
    } catch {
      // Fall back to browser TTS on ANY ElevenLabs failure — a rate limit,
      // network hiccup, or bad voice_id must never leave the assistant mute.
      if (mySession !== speakSession) return;
      if (!browserSynth) { opts?.onEnd?.(); return; }
      const UtterCtor = (globalThis as any).SpeechSynthesisUtterance;
      const utterance = UtterCtor ? new UtterCtor(text) : ({ text } as any);
      if (opts?.onStart) utterance.onstart = opts.onStart;
      if (opts?.onEnd) { utterance.onend = opts.onEnd; utterance.onerror = opts.onEnd; }
      browserSynth.speak(utterance);
    }
  })();
}

// Immediately silence any in-flight reply (barge-in / explicit Stop).
export function stopSpeaking(synth?: SpeechSynthesis): void {
  const s = synth ?? (typeof speechSynthesis !== 'undefined' ? speechSynthesis : undefined);
  try { s?.cancel(); } catch { /* nothing playing */ }
  stopElevenLabs();
}
