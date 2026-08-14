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
import { Minus, Pause, Play, Plus, X } from 'lucide-react';

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

  // Space = play/pause, arrows = speed, Escape = leave. Capture-phase so
  // the page under the overlay never sees them.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); changeSpeed(SPEED_STEP); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); changeSpeed(-SPEED_STEP); }
      else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, changeSpeed, onClose]);

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
        onClick={() => setPlaying((p) => !p)}
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
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? 'Pause' : 'Play'}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black hover:bg-white/90 transition-colors"
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
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
