// Teleprompter mode (Kevin, 2026-08-13: "get the text to scroll up while
// I'm talking like a prompter"). Full-screen black, big serifless text,
// auto-scrolls at an adjustable speed while the reader speaks — sermons,
// announcements, scripts read straight off the screen.
//
// Deliberately dumb: it takes plain TEXT (the caller extracts it from
// whatever rich document it lives in) and owns nothing but scrolling.
// Speed and size persist in localStorage so the next reading starts where
// the voice is comfortable.
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mic, MicOff, Minus, Pause, Play, Plus, X } from 'lucide-react';

const SPEED_KEY = 'gw-prompter-speed';
const SIZE_KEY = 'gw-prompter-size';
const SPEED_MIN = 10;
const SPEED_MAX = 200;
const SPEED_STEP = 10;
/** rem — index into this list is what persists, so the steps can change. */
const SIZES = [1.5, 1.875, 2.25, 3, 3.75, 4.5];

function readStored(key: string, fallback: number): number {
  try {
    const n = Number(localStorage.getItem(key));
    return Number.isFinite(n) && n > 0 ? n : fallback;
  } catch {
    return fallback;
  }
}

export interface PrompterOverlayProps {
  open: boolean;
  onClose: () => void;
  text: string;
  title?: string;
}

export function PrompterOverlay({ open, onClose, text, title }: PrompterOverlayProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  // Voice mode (Kevin, 2026-08-13: "hear the voice read the text — start
  // off, stop on"): the mic gates the scroll. Speech = roll, silence =
  // hold. Voice ACTIVITY, deliberately not speech RECOGNITION — matching
  // spoken words to script position mis-tracks on names/ad-libs, while an
  // energy gate with a hangover feels identical at the lectern.
  const [voiceMode, setVoiceMode] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const voiceRef = useRef<{ stream: MediaStream; ctx: AudioContext; raf: number } | null>(null);

  const stopVoice = useCallback(() => {
    const v = voiceRef.current;
    voiceRef.current = null;
    if (v) {
      cancelAnimationFrame(v.raf);
      v.stream.getTracks().forEach((t) => t.stop());
      void v.ctx.close().catch(() => { /* already closed */ });
    }
    setVoiceMode(false);
    setPlaying(false);
  }, []);

  const startVoice = useCallback(async () => {
    if (voiceRef.current) return;
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
        const v = voiceRef.current;
        if (v) v.raf = requestAnimationFrame(loop);
      };
      voiceRef.current = { stream, ctx, raf: requestAnimationFrame(loop) };
      setMicDenied(false);
      setVoiceMode(true);
    } catch {
      setMicDenied(true);
      setVoiceMode(false);
    }
  }, []);

  // Leaving the prompter releases the mic, always.
  useEffect(() => {
    if (!open) stopVoice();
    return stopVoice;
  }, [open, stopVoice]);
  const [speed, setSpeed] = useState(() => Math.min(SPEED_MAX, Math.max(SPEED_MIN, readStored(SPEED_KEY, 40))));
  const [sizeIdx, setSizeIdx] = useState(() => {
    const idx = readStored(SIZE_KEY, 3);
    return Math.min(SIZES.length - 1, Math.max(0, Math.round(idx)));
  });

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

  // Fresh open starts at the top, paused — the reader hits play when ready.
  useEffect(() => {
    if (!open) return;
    setPlaying(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [open]);

  // The scroll engine. Speed is px/second against a rAF clock, so it reads
  // the same on 60Hz and 120Hz screens. Fractional remainders accumulate —
  // flooring each frame at slow speeds would round every step to 0 and the
  // prompter would sit still.
  useEffect(() => {
    if (!open || !playing) return;
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
  }, [open, playing, speed]);

  // In voice mode a manual play/pause is an exit: the reader grabbing for
  // control mid-service must win over the mic instantly.
  const togglePlay = useCallback(() => {
    if (voiceRef.current) { stopVoice(); return; }
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

  const paragraphs = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);

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
      <div
        ref={scrollRef}
        data-testid="prompter-scroll"
        onClick={togglePlay}
        className="min-h-0 flex-1 cursor-pointer overflow-y-auto"
      >
        <div
          className="mx-auto max-w-4xl px-6 font-semibold"
          style={{ fontSize: `${SIZES[sizeIdx]}rem`, lineHeight: 1.5, paddingTop: '45vh', paddingBottom: '55vh' }}
        >
          {paragraphs.length === 0 ? (
            <p className="text-white/50">Nothing to read — this document is empty.</p>
          ) : (
            paragraphs.map((p, i) => <p key={i} className="mb-[1em]">{p}</p>)
          )}
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
          onClick={() => (voiceMode ? stopVoice() : void startVoice())}
          aria-label={voiceMode ? 'Turn off voice control' : 'Voice control — scrolls while you speak'}
          aria-pressed={voiceMode}
          title={micDenied ? 'Microphone blocked — allow mic access and try again' : 'Scrolls while you speak, holds when you stop'}
          className={`flex h-12 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${
            voiceMode ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-white/10 hover:bg-white/20'
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
