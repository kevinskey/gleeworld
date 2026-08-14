// Teleprompter mode (Kevin, 2026-08-13: "get the text to scroll up while
// I'm talking like a prompter"). Full-screen black, big serifless text,
// the reading line at a gold arrow near the top so read text leaves the
// screen at once.
//
// Deliberately dumb about content: it takes plain TEXT (the caller
// extracts it from whatever rich document it lives in) and owns nothing
// but scrolling. Speed and size persist in localStorage so the next
// reading starts where the voice is comfortable.
//
// Voice has two engines, best available wins:
//  - FOLLOW (speech recognition via getSpeechInput): matches the words
//    you actually say against the script and keeps YOUR word at the
//    arrow — the fixed px/s could not keep up with a natural reading
//    pace (Kevin, 2026-08-13: "its definately not keeping up").
//  - VAD fallback (no recognizer available): mic energy gates the
//    fixed-speed roll — talk = roll, silence = hold.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mic, MicOff, Minus, Pause, Play, Plus, X } from 'lucide-react';
import { getSpeechInput, type SpeechInputSource } from '@/lib/assistant/speech';

const SPEED_KEY = 'gw-prompter-speed';
const SIZE_KEY = 'gw-prompter-size';
const SPEED_MIN = 10;
const SPEED_MAX = 200;
const SPEED_STEP = 10;
/** rem — index into this list is what persists, so the steps can change. */
const SIZES = [1.5, 1.875, 2.25, 3, 3.75, 4.5];
/** The eye line: fraction of the scroll viewport where the current line sits. */
const EYE_LINE = 0.12;
/** How far ahead of the pointer a spoken word may land and still count —
 *  covers skipped lines, recognizer drops, and mid-paragraph jumps. */
const MATCH_LOOKAHEAD = 30;

function readStored(key: string, fallback: number): number {
  try {
    const n = Number(localStorage.getItem(key));
    return Number.isFinite(n) && n > 0 ? n : fallback;
  } catch {
    return fallback;
  }
}

/** Lowercased, stripped to letters/digits/apostrophes — what both the
 *  script and the recognizer's output reduce to before comparing. */
function normWord(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9']/g, '');
}

/** Loose equality for recognizer quirks: exact, or a long-word prefix
 *  ("singin" ≈ "singing", "hallelu" ≈ "hallelujah"). */
function wordsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 5 && b.length >= 5) return a.startsWith(b) || b.startsWith(a);
  return false;
}

export interface PrompterOverlayProps {
  open: boolean;
  onClose: () => void;
  text: string;
  title?: string;
}

interface FollowState {
  active: boolean;
  input: SpeechInputSource;
  /** words consumed from the CURRENT recognizer session's transcript */
  consumed: number;
  /** pointer into matchWords — the next script word we expect to hear */
  ptr: number;
  raf: number;
  /** scrollTop the smooth loop is easing toward; null = hold */
  target: number | null;
}

export function PrompterOverlay({ open, onClose, text, title }: PrompterOverlayProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [voiceKind, setVoiceKind] = useState<null | 'follow' | 'vad'>(null);
  const [micDenied, setMicDenied] = useState(false);
  const vadRef = useRef<{ stream: MediaStream; ctx: AudioContext; raf: number } | null>(null);
  const followRef = useRef<FollowState | null>(null);

  const [speed, setSpeed] = useState(() => Math.min(SPEED_MAX, Math.max(SPEED_MIN, readStored(SPEED_KEY, 40))));
  const [sizeIdx, setSizeIdx] = useState(() => {
    const idx = readStored(SIZE_KEY, 3);
    return Math.min(SIZES.length - 1, Math.max(0, Math.round(idx)));
  });

  // Paragraphs → words, each with a stable global index that the rendered
  // <span data-w> carries, so a matched word can be measured in the DOM.
  const paragraphs = useMemo(
    () => text.split(/\n+/).map((p) => p.trim()).filter(Boolean).map((p) => p.split(/\s+/)),
    [text],
  );
  const matchWords = useMemo(() => {
    const out: Array<{ norm: string; domIdx: number }> = [];
    let g = 0;
    for (const words of paragraphs) {
      for (const w of words) {
        const n = normWord(w);
        if (n) out.push({ norm: n, domIdx: g });
        g++;
      }
    }
    return out;
  }, [paragraphs]);

  const persist = (key: string, value: number) => {
    try { localStorage.setItem(key, String(value)); } catch { /* private mode */ }
  };

  const changeSpeed = useCallback((delta: number) => {
    setSpeed((s) => {
      const next = Math.min(SPEED_MAX, Math.max(SPEED_MIN, s + delta));
      persist(SPEED_KEY, next);
      return next;
    });
  }, []);

  const changeSize = useCallback((delta: number) => {
    setSizeIdx((i) => {
      const next = Math.min(SIZES.length - 1, Math.max(0, i + delta));
      persist(SIZE_KEY, next);
      return next;
    });
  }, []);

  const stopVoice = useCallback(() => {
    const v = vadRef.current;
    vadRef.current = null;
    if (v) {
      cancelAnimationFrame(v.raf);
      v.stream.getTracks().forEach((t) => t.stop());
      void v.ctx.close().catch(() => { /* already closed */ });
    }
    const f = followRef.current;
    followRef.current = null;
    if (f) {
      f.active = false;
      cancelAnimationFrame(f.raf);
      f.input.stop();
    }
    setVoiceKind(null);
    setPlaying(false);
  }, []);

  /** scrollTop that puts the word's line on the eye line. */
  const targetForWord = useCallback((domIdx: number): number | null => {
    const el = scrollRef.current;
    if (!el) return null;
    const span = el.querySelector<HTMLElement>(`[data-w="${domIdx}"]`);
    if (!span) return null;
    return Math.max(0, span.offsetTop - el.clientHeight * EYE_LINE);
  }, []);

  const startFollow = useCallback((input: SpeechInputSource) => {
    const el = scrollRef.current;
    // Resume where the eye line currently sits, not at word zero — the
    // reader may have scrolled or be re-entering after a manual pause.
    let startPtr = 0;
    if (el) {
      const eye = el.scrollTop + el.clientHeight * EYE_LINE;
      for (let i = 0; i < matchWords.length; i++) {
        const span = el.querySelector<HTMLElement>(`[data-w="${matchWords[i].domIdx}"]`);
        if (span && span.offsetTop >= eye - 8) { startPtr = i; break; }
      }
    }
    const state: FollowState = { active: true, input, consumed: 0, ptr: startPtr, raf: 0, target: null };
    followRef.current = state;

    const onTranscript = (transcript: string) => {
      if (!state.active) return;
      const words = transcript.split(/\s+/).map(normWord).filter(Boolean);
      const fresh = words.slice(state.consumed);
      state.consumed = words.length;
      let moved = false;
      for (const spoken of fresh) {
        const end = Math.min(matchWords.length, state.ptr + MATCH_LOOKAHEAD);
        for (let i = state.ptr; i < end; i++) {
          if (wordsMatch(matchWords[i].norm, spoken)) {
            state.ptr = i + 1;
            moved = true;
            break;
          }
        }
        // Off-script words match nothing and move nothing — the prompter
        // holds while the reader ad-libs, exactly as asked.
      }
      if (moved && state.ptr > 0) {
        const t = targetForWord(matchWords[state.ptr - 1].domIdx);
        if (t != null) state.target = t;
      }
    };

    // Recognizer sessions end on their own silence timers; while follow is
    // active each end just starts the next session. `consumed` resets
    // because every session's transcript starts from scratch.
    const session = () => {
      if (!state.active) return;
      state.consumed = 0;
      input.start(onTranscript, () => {
        if (state.active) setTimeout(session, 150);
      });
    };
    session();

    // Smooth pursuit: ease toward the target so a matched word glides to
    // the arrow instead of jumping — time-constant ~250ms, framerate-safe.
    let last = performance.now();
    const loop = (now: number) => {
      if (!state.active) return;
      const dt = now - last;
      last = now;
      const sc = scrollRef.current;
      if (sc && state.target != null) {
        const diff = state.target - sc.scrollTop;
        if (Math.abs(diff) < 1) {
          sc.scrollTop = state.target;
          state.target = null;
        } else {
          sc.scrollTop += diff * Math.min(1, dt / 250);
        }
      }
      state.raf = requestAnimationFrame(loop);
    };
    state.raf = requestAnimationFrame(loop);
    setMicDenied(false);
    setVoiceKind('follow');
  }, [matchWords, targetForWord]);

  const startVad = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      // Adaptive floor: quiet-room hum on a hot mic beats any fixed
      // threshold. Tracks slowly so speech itself doesn't raise it.
      let floor = 0.008;
      let lastVoice = 0; // never spoken yet → holds until the first word
      const HANGOVER_MS = 900; // inter-phrase breaths must not stutter the roll
      const loop = () => {
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);
        floor = Math.min(0.02, floor * 0.995 + rms * 0.005);
        const speaking = rms > Math.max(0.015, floor * 3.5);
        const now = performance.now();
        if (speaking) lastVoice = now;
        setPlaying(lastVoice > 0 && now - lastVoice < HANGOVER_MS);
        const v = vadRef.current;
        if (v) v.raf = requestAnimationFrame(loop);
      };
      vadRef.current = { stream, ctx, raf: requestAnimationFrame(loop) };
      setMicDenied(false);
      setVoiceKind('vad');
    } catch {
      setMicDenied(true);
      setVoiceKind(null);
    }
  }, []);

  const startVoice = useCallback(async () => {
    if (vadRef.current || followRef.current) return;
    const input = getSpeechInput();
    if (input.available) startFollow(input);
    else await startVad();
  }, [startFollow, startVad]);

  // Leaving the prompter releases the mic, always.
  useEffect(() => {
    if (!open) stopVoice();
    return stopVoice;
  }, [open, stopVoice]);

  // Fresh open starts at the top, paused — the reader hits play when ready.
  useEffect(() => {
    if (!open) return;
    setPlaying(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [open]);

  // The fixed-speed engine (manual play and the VAD gate). Follow mode
  // drives the scroll itself, so this stays out of its way.
  useEffect(() => {
    if (!open || !playing || voiceKind === 'follow') return;
    let raf = 0;
    let last = performance.now();
    let carry = 0;
    const tick = (now: number) => {
      const el = scrollRef.current;
      if (el) {
        carry += ((now - last) / 1000) * speed;
        const step = Math.trunc(carry);
        if (step > 0) {
          el.scrollTop += step;
          carry -= step;
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
            setPlaying(false);
            return;
          }
        }
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, playing, speed, voiceKind]);

  // In voice mode a manual play/pause is an exit: the reader grabbing for
  // control mid-service must win over the mic instantly.
  const togglePlay = useCallback(() => {
    if (vadRef.current || followRef.current) { stopVoice(); return; }
    setPlaying((p) => !p);
  }, [stopVoice]);

  // Space = play/pause, arrows = speed, Escape = leave. Capture-phase so
  // the page under the overlay never sees them.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); changeSpeed(SPEED_STEP); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); changeSpeed(-SPEED_STEP); }
      else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, changeSpeed, onClose, togglePlay]);

  // Keep the screen awake mid-reading (best-effort; Safari < 16.4 lacks it).
  useEffect(() => {
    if (!open) return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request('screen').then((l) => { lock = l; }).catch(() => { /* unsupported */ });
    return () => { void lock?.release().catch(() => { /* released with the screen */ }); };
  }, [open]);

  if (!open) return null;

  let globalIdx = -1;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black text-white"
      role="dialog"
      aria-modal="true"
      aria-label={title ? `Prompter: ${title}` : 'Prompter'}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close prompter"
        className="absolute right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <X className="h-5 w-5" />
      </button>

      {/* Tap anywhere on the text = play/pause, the one control a reader
          mid-sentence can find without looking. */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          data-testid="prompter-scroll"
          onClick={togglePlay}
          className="h-full cursor-pointer overflow-y-auto"
        >
          {/* Eye line lives at ~12vh: the line being read sits near the TOP
              and everything already read leaves the screen at once (Kevin,
              2026-08-13: "has to be sure that the read text is off the
              screen"). The big bottom padding lets the final line climb all
              the way up to the eye line. */}
          <div
            className="mx-auto max-w-4xl px-6 font-semibold"
            style={{ fontSize: `${SIZES[sizeIdx]}rem`, lineHeight: 1.5, paddingTop: '12vh', paddingBottom: '85vh' }}
          >
            {paragraphs.length === 0 ? (
              <p className="text-white/50">Nothing to read — this document is empty.</p>
            ) : (
              paragraphs.map((words, pi) => (
                <p key={pi} className="mb-[1em]">
                  {words.map((w, wi) => {
                    globalIdx++;
                    return (
                      <span key={wi} data-w={globalIdx}>
                        {w}{wi < words.length - 1 ? ' ' : ''}
                      </span>
                    );
                  })}
                </p>
              ))
            )}
          </div>
        </div>
        {/* Departing lines fade INTO the top edge instead of lingering. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{ height: '10vh', background: 'linear-gradient(to bottom, rgba(0,0,0,0.96), transparent)' }}
        />
        {/* The eye-line marker: read the line at the arrow. */}
        <div aria-hidden className="pointer-events-none absolute left-1" style={{ top: '12vh' }}>
          <div
            className="h-0 w-0"
            style={{
              borderTop: '10px solid transparent',
              borderBottom: '10px solid transparent',
              borderLeft: '14px solid rgba(212,169,55,0.9)',
              transform: 'translateY(0.35em)',
            }}
          />
        </div>
      </div>

      <div
        className="flex items-center justify-center gap-3 border-t border-white/10 bg-black/90 px-4 py-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? 'Pause' : 'Play'}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black hover:bg-white/90 transition-colors"
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={() => (voiceKind ? stopVoice() : void startVoice())}
          aria-label={voiceKind ? 'Turn off voice control' : 'Voice control — follows your reading'}
          aria-pressed={voiceKind != null}
          title={
            micDenied
              ? 'Microphone blocked — allow mic access and try again'
              : voiceKind === 'vad'
                ? 'Scrolls while you speak, holds when you stop'
                : 'Follows the words you read and keeps your line at the arrow'
          }
          className={`flex h-12 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${
            voiceKind ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-white/10 hover:bg-white/20'
          }`}
        >
          {micDenied ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          Voice
        </button>
        <div className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
          <button type="button" onClick={() => changeSpeed(-SPEED_STEP)} aria-label="Slower" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15">
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-14 text-center text-sm tabular-nums text-white/80">{speed} px/s</span>
          <button type="button" onClick={() => changeSpeed(SPEED_STEP)} aria-label="Faster" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
          <button type="button" onClick={() => changeSize(-1)} aria-label="Smaller text" className="flex h-9 w-9 items-center justify-center rounded-full text-sm hover:bg-white/15">
            A−
          </button>
          <button type="button" onClick={() => changeSize(1)} aria-label="Larger text" className="flex h-9 w-9 items-center justify-center rounded-full text-lg hover:bg-white/15">
            A+
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
