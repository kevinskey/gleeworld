// Reusable, theater-style tour engine. Reads target rects from the DOM
// but never mutates the DOM itself, never calls element.click(), and never
// navigates. Activation is purely a callback into mock state via the
// TourActionContext provided by the caller. A step's optional
// `beforeMeasure` is the one place a script gets to act before the engine
// reads the DOM (e.g. clicking open a disclosure that unmounts its own
// contents when closed, so a target inside it can be found at all) — that
// DOM interaction is the script's, not the engine's; see productTourScript's
// ensureAllToolsOpen for the concrete case and why it's scoped that tightly.
//
// Architecture:
//   - A single fixed-position overlay covers the viewport at z-index 9000.
//   - An SVG mask creates a "spotlight" by punching a rounded rect hole
//     out of a black 55% overlay; the hole's geometry is animated each
//     frame.
//   - A separate SVG cursor is translated by transform; its position is
//     lerp-driven each frame.
//   - The bubble is positioned in screen coords next to the spotlight,
//     flipping to the opposite side when there's not enough room.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pause, Play, SkipForward, RotateCcw, X, ChevronRight } from 'lucide-react';
import type { TourStep } from './types';

interface TourEngineProps {
  steps: TourStep[];
  onComplete?: () => void;
  onDismiss?: () => void;
  /** Start at this step instead of 0 — used to resume across remounts. */
  initialStepIndex?: number;
  /** Fires whenever the active step changes; used by callers to persist progress. */
  onStepChange?: (index: number) => void;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Phase = 'idle' | 'moving' | 'pulsing' | 'reading' | 'done';

const CURSOR_TRAVEL_MS = 850;
const PULSE_MS = 450;
const ARRIVAL_THRESHOLD = 1.5; // px
const DEFAULT_DWELL_MS = 9500;

// Center-of-viewport defaults so the intro feels balanced.
const initialPos = () => ({
  x: typeof window === 'undefined' ? 0 : window.innerWidth / 2,
  y: typeof window === 'undefined' ? 0 : window.innerHeight / 2 + 60,
});

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function TourEngine({ steps, onComplete, onDismiss, initialStepIndex = 0, onStepChange }: TourEngineProps) {
  const [stepIndex, setStepIndex] = useState(() =>
    Math.min(Math.max(0, initialStepIndex), Math.max(0, steps.length - 1)),
  );

  // Bubble back step changes so the host can persist them across remounts.
  useEffect(() => {
    onStepChange?.(stepIndex);
  }, [stepIndex, onStepChange]);

  const [phase, setPhase] = useState<Phase>('idle');
  const [paused, setPaused] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>(() => initialPos());
  const [spotlight, setSpotlight] = useState<Rect | null>(null);
  const [bubbleAnchor, setBubbleAnchor] = useState<Rect | null>(null);

  // Animation refs — we keep mutable state out of React so RAF can run
  // smoothly without per-frame re-renders of parent components.
  const cursorPosRef = useRef(cursorPos);
  const cursorFromRef = useRef(cursorPos);
  const cursorTargetRef = useRef<{ x: number; y: number } | null>(null);
  const cursorStartMsRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const dwellTimerRef = useRef<number | null>(null);
  const pulseTimerRef = useRef<number | null>(null);
  const pausedRef = useRef(paused);
  const phaseRef = useRef<Phase>(phase);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const currentStep = steps[stepIndex];

  const measureTarget = useCallback((selector?: string): Rect | null => {
    if (!selector) return null;
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }, []);

  // RAF cursor loop — single ongoing loop, gated by pause state.
  useEffect(() => {
    const tick = (now: number) => {
      if (!pausedRef.current) {
        const target = cursorTargetRef.current;
        if (target) {
          const elapsed = now - cursorStartMsRef.current;
          const t = Math.min(1, elapsed / CURSOR_TRAVEL_MS);
          const eased = easeInOutCubic(t);
          const from = cursorFromRef.current;
          const nx = from.x + (target.x - from.x) * eased;
          const ny = from.y + (target.y - from.y) * eased;
          cursorPosRef.current = { x: nx, y: ny };
          setCursorPos({ x: nx, y: ny });
          if (t >= 1 && phaseRef.current === 'moving') {
            cursorTargetRef.current = null;
            setPhase('pulsing');
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Step transitions — sets up the cursor target and spotlight, then
  // hands off to the RAF loop until arrival.
  useEffect(() => {
    if (!currentStep) {
      setPhase('done');
      onComplete?.();
      return;
    }

    // Clear any pending timers from previous step.
    if (dwellTimerRef.current) window.clearTimeout(dwellTimerRef.current);
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);

    try {
      currentStep.beforeMeasure?.();
    } catch (e) {
      console.error('tour beforeMeasure failed:', e);
    }
    const rect = measureTarget(currentStep.targetSelector);
    setSpotlight(rect);
    setBubbleAnchor(rect);

    if (rect) {
      const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      cursorFromRef.current = cursorPosRef.current;
      cursorTargetRef.current = center;
      cursorStartMsRef.current = performance.now();
      setPhase('moving');
    } else {
      // Intro / outro — no target. Park the cursor off-screen and just read.
      cursorTargetRef.current = null;
      setPhase('reading');
    }
  }, [stepIndex, currentStep, measureTarget, onComplete]);

  // When cursor reaches the target, play the click pulse, then fire the
  // step's onActivate callback, then enter the reading phase.
  useEffect(() => {
    if (phase !== 'pulsing' || !currentStep) return;
    pulseTimerRef.current = window.setTimeout(() => {
      try {
        currentStep.onActivate?.();
      } catch (e) {
        console.error('tour onActivate failed:', e);
      }
      setPhase('reading');
    }, PULSE_MS);
    return () => {
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    };
  }, [phase, currentStep]);

  // Reading phase — bubble visible, dwell timer running. Re-measure the
  // target after a frame in case the panel swap moved it.
  useEffect(() => {
    if (phase !== 'reading' || !currentStep) return;
    const remeasure = window.setTimeout(() => {
      try {
        currentStep.beforeMeasure?.();
      } catch (e) {
        console.error('tour beforeMeasure failed:', e);
      }
      const r = measureTarget(currentStep.targetSelector);
      if (r) {
        setSpotlight(r);
        setBubbleAnchor(r);
      }
    }, 60);
    const dwell = currentStep.dwellMs ?? DEFAULT_DWELL_MS;
    dwellTimerRef.current = window.setTimeout(() => {
      if (!pausedRef.current) advance();
    }, dwell);
    return () => {
      window.clearTimeout(remeasure);
      if (dwellTimerRef.current) window.clearTimeout(dwellTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stepIndex]);

  const advance = useCallback(() => {
    setStepIndex((i) => {
      if (i + 1 >= steps.length) {
        onComplete?.();
        return i;
      }
      return i + 1;
    });
  }, [steps.length, onComplete]);

  const restart = useCallback(() => {
    setStepIndex(0);
    cursorPosRef.current = initialPos();
    cursorFromRef.current = initialPos();
    cursorTargetRef.current = null;
    setCursorPos(initialPos());
    setPaused(false);
  }, []);

  const skip = useCallback(() => {
    onDismiss?.();
  }, [onDismiss]);

  // Bubble placement: prefer right side of target, else left, else below.
  const bubblePos = useMemo(() => {
    const vw = typeof window === 'undefined' ? 1024 : window.innerWidth;
    const vh = typeof window === 'undefined' ? 768 : window.innerHeight;
    const BUBBLE_W = 360;
    const GAP = 18;

    if (!bubbleAnchor) {
      return {
        left: vw / 2 - BUBBLE_W / 2,
        top: vh / 2 - 90,
        placement: 'center' as const,
      };
    }

    const rightSpace = vw - (bubbleAnchor.x + bubbleAnchor.width) - GAP;
    const leftSpace = bubbleAnchor.x - GAP;

    if (rightSpace >= BUBBLE_W + 8) {
      return {
        left: bubbleAnchor.x + bubbleAnchor.width + GAP,
        top: Math.min(vh - 220, Math.max(16, bubbleAnchor.y - 8)),
        placement: 'right' as const,
      };
    }
    if (leftSpace >= BUBBLE_W + 8) {
      return {
        left: bubbleAnchor.x - BUBBLE_W - GAP,
        top: Math.min(vh - 220, Math.max(16, bubbleAnchor.y - 8)),
        placement: 'left' as const,
      };
    }
    return {
      left: Math.max(16, Math.min(vw - BUBBLE_W - 16, bubbleAnchor.x)),
      top: Math.min(vh - 220, bubbleAnchor.y + bubbleAnchor.height + GAP),
      placement: 'below' as const,
    };
  }, [bubbleAnchor]);

  if (phase === 'done') return null;

  const pulsing = phase === 'pulsing';
  const showCursor = !!currentStep?.targetSelector;

  const overlay = (
    <div className="fixed inset-0 z-[9000] pointer-events-none" aria-hidden="true">
      {/* Dimming overlay with SVG-masked spotlight cut-out */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlight && (
              <rect
                x={spotlight.x - 6}
                y={spotlight.y - 6}
                width={spotlight.width + 12}
                height={spotlight.height + 12}
                rx="12"
                fill="black"
                style={{ transition: 'all 0.6s cubic-bezier(0.4,0,0.2,1)' }}
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(7, 4, 24, 0.62)"
          mask="url(#tour-spotlight-mask)"
        />
        {spotlight && (
          <rect
            x={spotlight.x - 6}
            y={spotlight.y - 6}
            width={spotlight.width + 12}
            height={spotlight.height + 12}
            rx="12"
            fill="none"
            stroke="rgba(196, 132, 252, 0.95)"
            strokeWidth="2"
            style={{ transition: 'all 0.6s cubic-bezier(0.4,0,0.2,1)', filter: 'drop-shadow(0 0 14px rgba(139,92,246,0.55))' }}
          />
        )}
      </svg>

      {/* Animated cursor */}
      {showCursor && (
        <div
          className="absolute"
          style={{
            left: 0,
            top: 0,
            transform: `translate(${cursorPos.x - 8}px, ${cursorPos.y - 6}px)`,
            transition: 'none',
            pointerEvents: 'none',
            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.55))',
            zIndex: 2,
          }}
        >
          {/* Click pulse ring */}
          {pulsing && (
            <span
              className="absolute"
              style={{
                left: -10,
                top: -10,
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(196,132,252,0.6) 0%, rgba(139,92,246,0.15) 60%, transparent 80%)',
                animation: 'tour-pulse 450ms ease-out forwards',
              }}
            />
          )}
          <svg width="28" height="32" viewBox="0 0 28 32" fill="none">
            <path
              d="M3 2 L25 16 L15 18 L21 30 L17 31 L11 19 L3 24 Z"
              fill="white"
              stroke="#1a0f3a"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      <style>{`
        @keyframes tour-pulse {
          0%   { transform: scale(0.3); opacity: 0.9; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        @keyframes tour-bubble-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Description bubble */}
      {currentStep && (
        <div
          className="absolute pointer-events-auto"
          style={{
            left: bubblePos.left,
            top: bubblePos.top,
            width: 360,
            animation: 'tour-bubble-in 0.45s cubic-bezier(0.4,0,0.2,1) both',
            zIndex: 3,
          }}
        >
          <div
            className="rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #c084fc 100%)' }}
          >
            <div className="px-5 pt-4 pb-3 text-white">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-xs uppercase tracking-[0.18em] font-semibold opacity-80">
                  Step {stepIndex + 1} / {steps.length}
                </div>
                <button
                  type="button"
                  onClick={skip}
                  aria-label="Skip tour"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white/90 hover:bg-white/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {currentStep.title && (
                <div className="text-lg font-bold leading-tight" style={{ letterSpacing: '-0.01em' }}>
                  {currentStep.title}
                </div>
              )}
              <p className="mt-1.5 text-sm text-white/90 leading-relaxed">
                {currentStep.description}
              </p>
            </div>
            <div className="bg-white px-4 py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaused((p) => !p)}
                  aria-label={paused ? 'Resume' : 'Pause'}
                  className="h-8 w-8 rounded-md border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
                >
                  {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={restart}
                  aria-label="Restart"
                  className="h-8 w-8 rounded-md border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={skip}
                  aria-label="Skip"
                  className="h-8 w-8 rounded-md border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={advance}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
                style={{ background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #c084fc 100%)' }}
              >
                {stepIndex + 1 >= steps.length ? 'Finish' : 'Next'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(overlay, document.body);
}
