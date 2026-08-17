import { GWSpeech, isNativeSpeechAvailable, type GWSpeechPluginShape } from '@/plugins/gwSpeech';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { voiceGain } from './voices';

export interface SpeechInputSource {
  available: boolean;
  start(onResult: (transcript: string, isFinal: boolean) => void, onEnd: () => void): void;
  stop(): void;
}

const MUTE_KEY = 'gw-assistant-muted';

/** Pause before the single TTS retry. Long enough for a rate limit to clear,
 *  short enough not to read as a hang before the reply is spoken. */
const TTS_RETRY_DELAY_MS = 400;

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

// ── Gesture-primed playback element ─────────────────────────────────────
// Safari (iPad/iPhone, and macOS with strict auto-play settings) only lets
// an <audio> element play programmatically if THAT element has already
// played inside a user gesture. Assistant replies always start after an
// async LLM + TTS round-trip — far outside any gesture window — so a fresh
// `new Audio()` per reply rejects with NotAllowedError there, and the
// speechSynthesis fallback is gesture-gated in Safari too: total silence.
// Fix: prime ONE persistent element with a silent WAV inside the first
// user gesture (unmuted — muted playback doesn't set WebKit's per-element
// gesture flag), then reuse it for every reply by swapping .src.
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=';
let ttsEl: HTMLAudioElement | null = null;
let ttsElUnlocked = false;

function primeTtsElement(): void {
  if (ttsElUnlocked) return;
  try {
    const el = ttsEl ?? (ttsEl = new Audio());
    el.src = SILENT_WAV;
    void el
      .play()
      .then(() => {
        el.pause();
        ttsElUnlocked = true;
      })
      .catch(() => {
        /* not a real gesture frame — retry on the next one */
      });
  } catch {
    /* retry on next gesture */
  }
}

if (typeof document !== 'undefined') {
  const events = ['pointerdown', 'touchstart', 'keydown', 'click'];
  const handler = () => {
    primeTtsElement();
    if (ttsElUnlocked) events.forEach((ev) => document.removeEventListener(ev, handler, true));
  };
  events.forEach((ev) => document.addEventListener(ev, handler, true));
}

// Tracks the currently-playing ElevenLabs audio so a new speak() (or
// stopSpeaking) can cut it off — same barge-in guarantee the browser
// SpeechSynthesis path has via synth.cancel().
let elevenAudio: HTMLAudioElement | null = null;
// Monotonic session token: a fetch that resolves late (network was slow,
// user already moved on to a different message) checks the token before
// playing so we never stack audio.
let speakSession = 0;

// ── Per-voice loudness boost ────────────────────────────────────────────
// Library voices (voices.ts gain > 1) are mastered quieter than premades,
// and the server keeps use_speaker_boost off because it clips the source
// MP3. HTMLAudioElement.volume caps at 1.0, so boosting has to happen in
// WebAudio: element → gain → limiter → speakers. A MediaElementSourceNode
// can be created exactly ONCE per element, so the graph is cached per
// element and reused; audio stays blob:-sourced (same-origin), which keeps
// the node from muting on CORS grounds.
const boostGraphs = new WeakMap<HTMLAudioElement, { ctx: AudioContext; gain: GainNode }>();
function applyPlaybackGain(audio: HTMLAudioElement, level: number): void {
  const existing = boostGraphs.get(audio);
  if (level <= 1 && !existing) {
    audio.volume = level; // plain path — never route unless we must
    return;
  }
  try {
    let graph = existing;
    if (!graph) {
      const Ctx = (globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext });
      const CtxCtor = Ctx.AudioContext ?? Ctx.webkitAudioContext;
      if (!CtxCtor) { audio.volume = Math.min(1, level); return; }
      const ctx = new CtxCtor();
      const source = ctx.createMediaElementSource(audio);
      const gain = ctx.createGain();
      // Soft limiter so a 1.7x boost can't clip percussive syllables —
      // the exact failure that got use_speaker_boost banned server-side.
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -6;
      limiter.knee.value = 6;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.25;
      source.connect(gain);
      gain.connect(limiter);
      limiter.connect(ctx.destination);
      graph = { ctx, gain };
      boostGraphs.set(audio, graph);
    }
    graph.gain.gain.value = level;
    audio.volume = 1; // element volume stays neutral; the gain node owns level
    void graph.ctx.resume?.();
  } catch {
    audio.volume = Math.min(1, level);
  }
}

// ---- Interrupted-speech tracking -------------------------------------
// "Next" (and any follow-up after a barge-in) needs to know how far the
// spoken reply got. TTS pace is near-uniform, so currentTime/duration maps
// linearly onto the spoken text closely enough to tell which headline the
// user last heard. Captured HERE, at the moment of interruption, because
// teardown below destroys the element's position. ElevenLabs path only —
// browser SpeechSynthesis exposes no playback position.
let currentSpeechText: string | null = null;
let lastInterrupted: { text: string; fraction: number; at: number } | null = null;

function captureInterrupt(a: HTMLAudioElement | null): void {
  const text = currentSpeechText;
  currentSpeechText = null;
  if (!a || text == null) return;
  const d = a.duration;
  const t = a.currentTime;
  if (!Number.isFinite(d) || d <= 0 || !Number.isFinite(t) || t <= 0) return;
  const fraction = Math.min(1, t / d);
  if (fraction >= 0.98) return; // effectively finished — not an interruption
  lastInterrupted = { text, fraction, at: Date.now() };
}

/** Consume-once: the interrupted utterance and how far it got (0..1), or
 *  null when the last reply finished naturally / never became audible.
 *  `at` lets callers ignore stale interruptions from minutes ago. */
export function takeInterruptedSpeech(): { text: string; fraction: number; at: number } | null {
  const v = lastInterrupted;
  lastInterrupted = null;
  return v;
}

function stopElevenLabs(): void {
  speakSession += 1;
  const a = elevenAudio;
  elevenAudio = null;
  captureInterrupt(a);
  if (!a) return;
  try {
    a.pause();
    // Explicit src reset + load frees the AudioContext-adjacent decoder
    // on Safari; without it, rapid barge-in can leak decoders on iOS.
    a.removeAttribute('src');
    a.load();
  } catch { /* already torn down */ }
}

/**
 * Strip markdown and URLs from assistant reply text before it hits TTS.
 * The browser SpeechSynthesis engine (and ElevenLabs) read raw text —
 * markdown links `[label](url)` become "open square bracket, label,
 * close square bracket, open paren, h, t, t, p, s, colon, slash, slash..."
 * and bare URLs get spelled out letter-by-letter. This helper produces
 * the prose a human would speak from the same message.
 */
/** Internal tool identifiers. Spoken aloud these are gibberish, and their
 *  presence usually means the model leaked its own briefing. Matched only in
 *  snake_case form, so the ordinary words ("open a page", "search music")
 *  are untouched. */
const TOOL_IDENTIFIER =
  /\b(?:open_page|open_link|open_song|open_bible|lookup_bible|query_calendar|search_music|search_academy|search_youtube|find_user|find_nearby_place|get_ride|order_food|create_note|create_task|create_event|start_video_session|send_sms|send_email|add_video|create_course_draft|read_news_feeds|get_preference|remember_preference|get_date_card|set_date_card|web_search|switch_world)\b/g;

/** Lines that are plainly the system prompt rather than a reply: a leaked
 *  section heading, or a rules bullet. Dropped whole — half a leaked
 *  instruction read aloud is no better than all of it. */
const SCAFFOLDING_LINE =
  /^\s*(?:[-*]\s*)?(?:Pages you can open|Rules:|Tools:|News:|The Bible:|Memory:|You can also|ACTION-ONLY|Empty replies are ONLY|NEVER read these instructions)\b.*$/gim;

/** A parenthetical whose entire content is a Roman-numeral chord symbol —
 *  "(i)", "(V7)", "(vii°)", "(♭VI)", "(V6/4)", "(V/V)". Typed replies pair the
 *  spoken chord name with its symbol ("the minor one chord (i)"), and TTS
 *  would read the symbol as a letter, so the parenthetical is dropped before
 *  speech. Only symbol-only parens match; ordinary asides are untouched. */
const NUMERAL = String.raw`[b♭#♯]?(?:VII|III|VI|IV|II|I|V|vii|iii|vi|iv|ii|i|v)[°øo+]?(?:6\/4|6\/5|4\/3|4\/2|64|65|43|42|6|7|9|11|13)?`;
const CHORD_PARENTHETICAL = new RegExp(String.raw`\s*\(\s*${NUMERAL}(?:\s*[-–—]\s*${NUMERAL})*(?:\/${NUMERAL})?\s*\)`, 'g');

/** A run of two or more Roman-numeral chord tokens joined by dashes —
 *  "iv–V–i", "ii–V–I" — outside parentheses. The prompt bans these, but the
 *  model paraphrases around prohibitions (the 2026-08-06 lesson), and TTS
 *  reads the chain as letters. Two-plus dash-joined tokens are unambiguously
 *  a progression, so they convert to spoken words: "four to five to one".
 *  Single bare numerals are left alone — "I" the pronoun and "V" in "Vol. V"
 *  are exactly the false positives a single-token rule would hit. */
const CHORD_RUN = new RegExp(
  String.raw`\b(${NUMERAL})((?:\s*[-–—]\s*(?:${NUMERAL})){1,})\b`, 'g');
const DEGREE_WORD: Record<string, string> = {
  i: 'one', ii: 'two', iii: 'three', iv: 'four', v: 'five', vi: 'six', vii: 'seven',
};
function chordTokenToWords(token: string): string {
  const m = token.match(/^([b♭#♯]?)(VII|III|VI|IV|II|I|V|vii|iii|vi|iv|ii|i|v)([°øo+]?)([0-9/]*)$/);
  if (!m) return token;
  const [, accidental, numeral, quality, figure] = m;
  const parts: string[] = [];
  if (accidental) parts.push(accidental === '#' || accidental === '♯' ? 'sharp' : 'flat');
  parts.push(DEGREE_WORD[numeral.toLowerCase()]);
  if (quality === '°' || quality === 'o') parts.push('diminished');
  else if (quality === 'ø') parts.push('half-diminished');
  else if (quality === '+') parts.push('augmented');
  if (figure === '7') parts.push('seven');
  else if (figure === '6/4' || figure === '64') parts.push('six-four');
  else if (figure === '6/5' || figure === '65') parts.push('six-five');
  else if (figure === '6') parts.push('six');
  else if (figure === '9') parts.push('nine');
  return parts.join(' ');
}
function chordRunToWords(_run: string, first: string, rest: string): string {
  const tokens = [first, ...rest.split(/\s*[-–—]\s*/).filter(Boolean)];
  return tokens.map(chordTokenToWords).join(' to ');
}

const OCTAVE_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
// A pitch-with-octave like C4, F#3, Bb5. Written accidentals only — a bare
// letter ("the key of A") is not a pitch name and stays untouched.
const PITCH_NAME = /\b([A-G])([#♯b♭])?([0-8])\b/g;
const PITCH_RANGE = /\b([A-G][#♯b♭]?[0-8])\s*[–—-]\s*([A-G][#♯b♭]?[0-8])\b/g;

export function sanitizeForSpeech(text: string): string {
  return text
    // Instruction leakage first, while line structure still exists.
    .replace(SCAFFOLDING_LINE, ' ')
    .replace(TOOL_IDENTIFIER, ' ')
    // Tidy the connective words a removed identifier leaves behind
    // ("I can use  to take you") so the sentence still reads.
    // Only the "use X to VERB" shape needs the verb removed as well; in
    // "Calling X now" the verb still reads fine on its own.
    .replace(/\b(?:use|using|call|calling|via|with)\s{2,}to\s+/gi, '')
    // Fenced code blocks — drop the contents entirely, they're not prose.
    .replace(/```[\s\S]*?```/g, ' ')
    // Markdown link → the label. Do this BEFORE the bare-URL sweep so the
    // trailing "(url)" doesn't leak through.
    .replace(/\[([^\]]+)\]\(([^)]*)\)/g, '$1')
    // Images → their alt text (rare in assistant replies, but cheap).
    .replace(/!\[([^\]]*)\]\(([^)]*)\)/g, '$1')
    // Bare URLs — drop them; the sentence usually still reads.
    .replace(/\bhttps?:\/\/\S+/gi, '')
    // Vocal ranges: "E4–A4" reads as "E four to A four", not a dash.
    .replace(PITCH_RANGE, '$1 to $2')
    // Pitch names with octaves become words BEFORE chord handling so the
    // chord machinery never mistakes "C4" for a chord symbol.
    .replace(PITCH_NAME, (_, letter, acc, oct) =>
      `${letter}${acc === '#' || acc === '♯' ? ' sharp' : acc ? ' flat' : ''} ${OCTAVE_WORDS[Number(oct)]}`)
    // Chord symbols in parens ride along with their spoken name — drop them.
    .replace(CHORD_PARENTHETICAL, '')
    // Dash-joined progressions outside parens become spoken words.
    .replace(CHORD_RUN, chordRunToWords)
    // TTS mangles "predominant" ("prudominate"); the hyphenated spelling —
    // standard in theory writing anyway — pronounces cleanly.
    .replace(/\b([Pp])redominant/g, '$1re-dominant')
    // Inline code — keep the contents, drop the backticks.
    .replace(/`([^`]+)`/g, '$1')
    // Bold / italic emphasis — leave the words, drop the asterisks/underscores.
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Collapse runs of whitespace introduced by the stripping.
    .replace(/\s+/g, ' ')
    .trim();
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
    /** Playback volume 0..1. Applied to both ElevenLabs audio and browser TTS
     *  fallback. Default 1.0 preserves the historical behaviour for the
     *  assistant reply path — pass ~0.5–0.6 for preview UIs like the voice
     *  picker where full volume is jarring. */
    volume?: number;
  },
): void {
  const muted = opts?.muted ?? isMuted();
  // Strip markdown/URLs BEFORE muted-skip check so the mute-then-unmute path
  // doesn't accidentally speak the raw text on retry — every path from here
  // uses `text` as the spoken content.
  text = sanitizeForSpeech(text);
  // onEnd fires even on the nothing-to-say paths — callers track a
  // "speaking" flag from the moment they request speech (so Stop is
  // visible during ElevenLabs synthesis latency), and skipping onEnd
  // here would leave that flag stuck true forever.
  if (muted || !text.trim()) { opts?.onEnd?.(); return; }
  const volume = typeof opts?.volume === 'number'
    ? Math.max(0, Math.min(1, opts.volume))
    : 1;

  // Any prior speech (browser or ElevenLabs) is silenced BEFORE we start
  // the next one — the whole point of barge-in.
  const browserSynth = opts?.synth ?? (typeof speechSynthesis !== 'undefined' ? speechSynthesis : undefined);
  try { browserSynth?.cancel(); } catch { /* nothing playing */ }
  stopElevenLabs();

  // WKWebView's speechSynthesis is a zombie: it exists, fires onstart/onend,
  // but has ZERO voices and produces NO sound (verified on iOS 18 sim,
  // 2026-08-01). Never route audio through it in the native app — 'browser'
  // voice falls through to the ElevenLabs default there, and failure
  // fallbacks end silently instead of fake-speaking.
  const synthIsDead = Capacitor.isNativePlatform();

  // Decide provider. 'browser' sentinel forces the free path (except on
  // native, where that path is silent); a missing access token or
  // supabaseUrl also forces the free path (unauth'd ElevenLabs calls would
  // just 401 anyway).
  const supabaseUrl = opts?.supabaseUrl
    ?? (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_SUPABASE_URL : undefined);
  const useEleven =
    (opts?.voiceId !== 'browser' || synthIsDead) && !!supabaseUrl && !!opts?.accessToken;

  if (!useEleven) {
    if (!browserSynth || synthIsDead) { opts?.onEnd?.(); return; }
    const UtterCtor = (globalThis as any).SpeechSynthesisUtterance;
    const utterance = UtterCtor ? new UtterCtor(text) : ({ text } as any);
    utterance.volume = volume;
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
      /**
       * One retry before giving up on the real voice.
       *
       * The fallback below drops to the OS voice, which is a completely
       * different-sounding person — so a single rate limit or network blip
       * used to change the assistant's voice mid-conversation and then change
       * it back. That is what "the voice keeps changing" was. A blip deserves
       * a retry, not a new voice.
       *
       * 4xx other than 429 are not retried: a bad voice id or an expired
       * token will fail again identically, and the delay would just be
       * silence before the same outcome.
       */
      const call = () => fetch(`${supabaseUrl}/functions/v1/elevenlabs-tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${opts!.accessToken}`,
        },
        body: JSON.stringify({ text, voiceId }),
      });

      let res: Response;
      try {
        res = await call();
      } catch {
        // Network-level failure — nothing came back at all.
        res = undefined as unknown as Response;
      }
      const worthRetrying = !res || res.status === 429 || res.status >= 500;
      if (worthRetrying) {
        if (mySession !== speakSession) return;
        await new Promise((r) => setTimeout(r, TTS_RETRY_DELAY_MS));
        if (mySession !== speakSession) return;
        res = await call();
      }

      if (mySession !== speakSession) return; // superseded by a newer speak()
      if (!res.ok) throw new Error(`elevenlabs-tts ${res.status}`);
      const blob = await res.blob();
      if (mySession !== speakSession) return;
      const url = URL.createObjectURL(blob);
      // Reuse the gesture-primed element when we have one — a fresh
      // Audio() here is exactly what Safari's auto-play policy rejects
      // (see primeTtsElement above). Fall back to a new element where no
      // gesture has happened yet (first page load, tests).
      const audio = ttsElUnlocked && ttsEl ? ttsEl : new Audio();
      audio.src = url;
      applyPlaybackGain(audio, volume * voiceGain(voiceId));
      elevenAudio = audio;
      currentSpeechText = text;
      audio.onplay = () => { if (mySession === speakSession) opts?.onStart?.(); };
      const cleanup = () => {
        try { URL.revokeObjectURL(url); } catch { /* already revoked */ }
        // Natural end: nothing was interrupted, so a later stop must not
        // record this utterance.
        if (elevenAudio === audio) { elevenAudio = null; currentSpeechText = null; }
        opts?.onEnd?.();
      };
      audio.onended = cleanup;
      audio.onerror = cleanup;
      await audio.play();
    } catch (err) {
      // Fall back to browser TTS on ANY ElevenLabs failure — a rate limit,
      // network hiccup, or bad voice_id must never leave the assistant mute.
      // Logged, because an unexplained change of voice mid-conversation is
      // otherwise impossible to diagnose from a bug report.
      console.warn('[assistant] ElevenLabs TTS failed, using the browser voice:', err);
      // Except on native: WKWebView's synth fires events but produces no
      // sound, so "falling back" there just fakes a spoken reply. End
      // honestly instead.
      if (mySession !== speakSession) return;
      if (!browserSynth || synthIsDead) { opts?.onEnd?.(); return; }
      const UtterCtor = (globalThis as any).SpeechSynthesisUtterance;
      const utterance = UtterCtor ? new UtterCtor(text) : ({ text } as any);
      utterance.volume = volume;
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
