// AutomationPanel — breakpoint envelope editor.
//
// Two views over the same data:
//   - Canvas view: a drawable SVG lane showing the envelope curve,
//     playhead, and draggable points; click empty area to add.
//   - Tabular view: one row per point (time, value, curve, delete).
//     Kept as a fallback + fine numeric editor.
//
// Users can:
//   - Pick which param to automate on this strip (volume_db / pan).
//   - Choose mode: Off / Read / Touch / Latch / Write.
//   - Drag points on the canvas or edit them in the table.
//   - Click a segment's curve chip to cycle Linear → Hold → Exp → Linear.
//
// The engine's applyAutomation() re-schedules on every play() and on
// every touch/release, so any edit here takes effect at the next tick.
// Write / touch / latch capture happens in the mixer (setStrip /
// setBusStrip); the panel just visualizes the current envelope + a
// pulse indicator when the mode is capturing.

import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { X, Plus, Clock, Circle } from 'lucide-react';
import {
  type Automation, type AutomationPoint, type AutomationParam,
  type AutomationCurve, type AutomationMode,
} from '@/lib/studio/session';

const CURVE_OPTIONS: Array<{ value: AutomationCurve; label: string }> = [
  { value: 'linear', label: 'Linear' },
  { value: 'hold', label: 'Hold (step)' },
  { value: 'exponential', label: 'Exponential' },
];

/** Range and units per param. Keep the sliders sensible per param
 *  (volume in dB, pan -1..1). */
const PARAM_UI: Record<AutomationParam, { min: number; max: number; step: number; unit: string }> = {
  volume_db: { min: -60, max: 6, step: 0.1, unit: 'dB' },
  pan:       { min: -1, max: 1, step: 0.01, unit: '' },
};

// ── SVG envelope canvas ─────────────────────────────────────────────
//
// A ~110px-tall lane spanning the panel width. Renders the envelope
// as a stroked path, points as draggable handles, and the playhead as
// a vertical rule. Interactions:
//   - Drag a handle → moves its (time, value) — commits on release.
//   - Click empty area → adds a point at that (time, value).
//   - Click the small curve chip on a segment → cycles the curve type
//     of the RIGHT-hand point (which is what determines the ramp INTO
//     it — matches the tabular editor's "Curve in" column).
//   - Shift-click a point → deletes it.
//
// Coordinate axes: X = transport time (0 → sessionLengthSeconds), Y =
// param value (top = max). Padding leaves room for the point circles.

const CANVAS_HEIGHT = 110;
const CANVAS_PADDING = 10;

function EnvelopeCanvas({
  envelope, playheadSeconds, sessionLengthSeconds, valueRange, onChange,
}: {
  envelope: Automation;
  playheadSeconds: number;
  sessionLengthSeconds: number;
  valueRange: { min: number; max: number };
  onChange: (next: AutomationPoint[]) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [width, setWidth] = useState(600);
  const [dragging, setDragging] = useState<{ index: number; pointerId: number } | null>(null);

  // Measure the SVG's own width via ResizeObserver so the coordinate
  // map matches whatever grid the panel is sized to (mobile vs. desktop).
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const set = () => setWidth(Math.max(320, el.clientWidth));
    set();
    if (typeof ResizeObserver === 'undefined') return; // JSDOM lacks it
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const totalT = Math.max(1, sessionLengthSeconds);
  const { min, max } = valueRange;
  const xForTime = (t: number) =>
    CANVAS_PADDING + (Math.max(0, Math.min(totalT, t)) / totalT) * (width - 2 * CANVAS_PADDING);
  const yForValue = (v: number) => {
    const clamped = Math.max(min, Math.min(max, v));
    return CANVAS_HEIGHT - CANVAS_PADDING -
      ((clamped - min) / (max - min)) * (CANVAS_HEIGHT - 2 * CANVAS_PADDING);
  };
  const timeForX = (x: number) => {
    const t = ((x - CANVAS_PADDING) / (width - 2 * CANVAS_PADDING)) * totalT;
    return Math.max(0, Math.min(totalT, t));
  };
  const valueForY = (y: number) => {
    const v = min + ((CANVAS_HEIGHT - CANVAS_PADDING - y) / (CANVAS_HEIGHT - 2 * CANVAS_PADDING)) * (max - min);
    return Math.max(min, Math.min(max, v));
  };

  // Sort points once for both rendering AND indexing during drag —
  // the drag handler uses this sorted order so up/down moves don't
  // reorder unexpectedly during a single grab.
  const points = useMemo(() => {
    return [...envelope.points]
      .map((p, originalIndex) => ({ p, originalIndex }))
      .sort((a, b) => a.p.time_seconds - b.p.time_seconds);
  }, [envelope.points]);

  // Envelope path: piecewise per segment based on the right point's curve.
  const path = useMemo(() => {
    if (points.length === 0) return '';
    const first = points[0].p;
    const last = points[points.length - 1].p;
    const segs: string[] = [`M ${xForTime(0)} ${yForValue(first.value)}`];
    segs.push(`L ${xForTime(first.time_seconds)} ${yForValue(first.value)}`);
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1].p;
      const next = points[i].p;
      const x2 = xForTime(next.time_seconds);
      const y2 = yForValue(next.value);
      switch (next.curve) {
        case 'linear':
          segs.push(`L ${x2} ${y2}`);
          break;
        case 'hold': {
          const yPrev = yForValue(prev.value);
          segs.push(`L ${x2} ${yPrev}`, `L ${x2} ${y2}`);
          break;
        }
        case 'exponential': {
          // Sample 6 intermediate points along the exponential ramp
          // and stitch as a polyline.
          const steps = 6;
          for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            const va = (prev.value > 0 && next.value > 0)
              ? prev.value * Math.pow(next.value / prev.value, t)
              : prev.value + (next.value - prev.value) * t;
            const ta = prev.time_seconds + (next.time_seconds - prev.time_seconds) * t;
            segs.push(`L ${xForTime(ta)} ${yForValue(va)}`);
          }
          break;
        }
      }
    }
    segs.push(`L ${xForTime(totalT)} ${yForValue(last.value)}`);
    return segs.join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, width, min, max, totalT]);

  const commit = useCallback((nextSorted: AutomationPoint[]) => {
    onChange(nextSorted);
  }, [onChange]);

  const handleCanvasPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    // Ignore clicks that hit a handle (they set stopPropagation).
    if (dragging) return;
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const t = timeForX(x);
    const v = valueForY(y);
    const nextPoints: AutomationPoint[] = [
      ...envelope.points,
      // `as const` because .sort() breaks the contextual typing from the
      // AutomationPoint[] annotation, which would widen 'linear' to string.
      { time_seconds: t, value: v, curve: 'linear' as const },
    ].sort((a, b) => a.time_seconds - b.time_seconds);
    commit(nextPoints);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envelope.points, dragging, commit]);

  const handlePointPointerDown = useCallback((e: React.PointerEvent, sortedIndex: number) => {
    e.stopPropagation();
    if (e.shiftKey) {
      // Shift-click deletes.
      const original = points[sortedIndex].originalIndex;
      commit(envelope.points.filter((_, i) => i !== original));
      return;
    }
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDragging({ index: sortedIndex, pointerId: e.pointerId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envelope.points, points, commit]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const t = timeForX(x);
    const v = valueForY(y);
    const draggedOriginal = points[dragging.index].originalIndex;
    const nextPoints = envelope.points.map((p, i) =>
      i === draggedOriginal ? { ...p, time_seconds: t, value: v } : p,
    ).sort((a, b) => a.time_seconds - b.time_seconds);
    onChange(nextPoints);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, envelope.points, points, onChange]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  const zeroY = yForValue(0);
  const playheadX = xForTime(playheadSeconds);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height={CANVAS_HEIGHT}
      className="bg-background border border-border rounded touch-none select-none cursor-crosshair"
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="figure"
      aria-label={`${envelope.param} envelope — ${envelope.points.length} point${envelope.points.length === 1 ? '' : 's'}`}
    >
      {/* Zero-reference line (0 dB for volume, center for pan). */}
      <line
        x1={CANVAS_PADDING} x2={width - CANVAS_PADDING}
        y1={zeroY} y2={zeroY}
        stroke="currentColor"
        strokeOpacity={0.15}
        strokeDasharray="3 3"
      />
      {/* Envelope curve. */}
      {points.length > 0 && (
        <path d={path} stroke="var(--tint, currentColor)" strokeWidth={1.5} fill="none" />
      )}
      {/* Points. */}
      {points.map(({ p }, i) => (
        <circle
          key={i}
          cx={xForTime(p.time_seconds)}
          cy={yForValue(p.value)}
          r={5}
          fill="var(--tint, currentColor)"
          stroke="var(--background, #fff)"
          strokeWidth={1.5}
          onPointerDown={(e) => handlePointPointerDown(e, i)}
          style={{ cursor: 'grab' }}
        >
          <title>
            {`t=${p.time_seconds.toFixed(2)}s, v=${p.value.toFixed(2)}\n` +
              `Curve in: ${p.curve} — Shift-click to delete`}
          </title>
        </circle>
      ))}
      {/* Playhead — subtle so it never overwhelms envelope handles. */}
      <line
        x1={playheadX} x2={playheadX}
        y1={0} y2={CANVAS_HEIGHT}
        stroke="rgb(239 68 68 / 0.7)"
        strokeWidth={1}
      />
    </svg>
  );
}

export function AutomationPanel({
  ownerId, ownerKind, ownerLabel, automation, playheadSeconds, sessionLengthSeconds, currentStripValue, onChange, onClose,
}: {
  /** Track or bus id this panel edits automation for. */
  ownerId: string;
  ownerKind: 'track' | 'bus';
  ownerLabel: string;
  /** The full session.automation array — we filter to entries matching
   *  ownerId here so different targets stay independent. */
  automation: Automation[];
  /** Current transport position — used by "Add at playhead" so the
   *  new point lands under the current time. */
  playheadSeconds: number;
  /** Session length in seconds — spans the canvas horizontal axis. */
  sessionLengthSeconds: number;
  /** Current strip value (volume_db or pan depending on selected
   *  param). Used to seed a new point's Y. */
  currentStripValue: (param: AutomationParam) => number;
  onChange: (nextAutomation: Automation[]) => void;
  onClose: () => void;
}) {
  const forOwner = useMemo(
    () => automation.filter((a) => a.target_id === ownerId && a.target_kind === ownerKind),
    [automation, ownerId, ownerKind],
  );

  // Which param this panel is showing right now. Default: first
  // existing envelope for this owner, or volume_db when there are
  // none yet.
  const shownParam: AutomationParam = forOwner[0]?.param ?? 'volume_db';
  const shown = forOwner.find((a) => a.param === shownParam);

  const upsertEnvelope = useCallback((param: AutomationParam, patch: Partial<Automation>) => {
    const others = automation.filter(
      (a) => !(a.target_id === ownerId && a.target_kind === ownerKind && a.param === param),
    );
    const existing = automation.find(
      (a) => a.target_id === ownerId && a.target_kind === ownerKind && a.param === param,
    );
    const merged: Automation = {
      target_id: ownerId,
      target_kind: ownerKind,
      param,
      mode: 'off',
      points: [],
      ...existing,
      ...patch,
    };
    onChange([...others, merged]);
  }, [automation, onChange, ownerId, ownerKind]);

  const setPointField = useCallback((pointIdx: number, patch: Partial<AutomationPoint>) => {
    if (!shown) return;
    const points = shown.points.map((p, i) => i === pointIdx ? { ...p, ...patch } : p);
    upsertEnvelope(shownParam, { points });
  }, [shown, shownParam, upsertEnvelope]);

  const removePoint = useCallback((pointIdx: number) => {
    if (!shown) return;
    const points = shown.points.filter((_, i) => i !== pointIdx);
    upsertEnvelope(shownParam, { points });
  }, [shown, shownParam, upsertEnvelope]);

  const addPointAtTime = useCallback((atSeconds: number) => {
    const seed: AutomationPoint = {
      time_seconds: Math.max(0, atSeconds),
      value: currentStripValue(shownParam),
      curve: 'linear',
    };
    const points = [...(shown?.points ?? []), seed]
      .sort((a, b) => a.time_seconds - b.time_seconds);
    upsertEnvelope(shownParam, { points });
  }, [shown, shownParam, currentStripValue, upsertEnvelope]);

  const setMode = useCallback((mode: AutomationMode) => {
    upsertEnvelope(shownParam, { mode });
  }, [shownParam, upsertEnvelope]);

  const setParam = useCallback((param: AutomationParam) => {
    // If there's no envelope yet for this param, seed an empty one so
    // the table header + Add button have something to bind to.
    if (!automation.some((a) => a.target_id === ownerId && a.target_kind === ownerKind && a.param === param)) {
      upsertEnvelope(param, {});
    }
    // Re-render with a fresh shown= is driven by the derivation above.
  }, [automation, ownerId, ownerKind, upsertEnvelope]);

  const removeEnvelope = useCallback(() => {
    if (!shown) return;
    const others = automation.filter(
      (a) => !(a.target_id === ownerId && a.target_kind === ownerKind && a.param === shownParam),
    );
    onChange(others);
  }, [automation, onChange, ownerId, ownerKind, shown, shownParam]);

  const ui = PARAM_UI[shownParam];
  const modeValue: AutomationMode = shown?.mode ?? 'off';

  return (
    <div className="bg-card border border-border rounded-md p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">
          <span className="text-muted-foreground">Automation —</span> {ownerLabel}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 rounded hover:bg-muted inline-flex items-center justify-center text-muted-foreground"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Param + mode header. */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground w-14 shrink-0">Param</span>
        <Select value={shownParam} onValueChange={(v) => setParam(v as AutomationParam)}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="volume_db">Volume (dB)</SelectItem>
            <SelectItem value="pan">Pan</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        {(modeValue === 'write' || modeValue === 'touch' || modeValue === 'latch') && (
          <span
            className="text-xs font-semibold uppercase tracking-wide text-red-500 inline-flex items-center gap-1 animate-pulse"
            aria-live="polite"
            title={
              modeValue === 'write'
                ? 'Every fader/pan move captures a point at the playhead'
                : modeValue === 'touch'
                  ? 'Captures only while you hold the fader/knob'
                  : 'Captures once touched, keeps writing until Stop'
            }
          >
            <Circle className="w-2.5 h-2.5 fill-current" />
            {modeValue === 'write' ? 'Writing' : modeValue === 'touch' ? 'Touch' : 'Latch'}
          </span>
        )}
        <div
          role="group"
          aria-label="Automation mode"
          className="inline-flex rounded border border-border overflow-hidden text-xs font-semibold"
        >
          {(['off', 'read', 'touch', 'latch', 'write'] as AutomationMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={
                'h-8 px-2.5 uppercase tracking-wide transition-colors ' +
                (m === modeValue
                  ? m === 'write' || m === 'latch'
                    ? 'bg-red-500/15 text-red-600'
                    : m === 'touch'
                      ? 'bg-amber-500/20 text-amber-600'
                      : m === 'read'
                        ? 'bg-primary/15 text-foreground'
                        : 'bg-muted text-foreground'
                  : 'bg-transparent text-muted-foreground hover:bg-muted')
              }
              aria-pressed={m === modeValue}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas view — always rendered so users see the shape, even
       *  with zero points (just the zero line + playhead). Point
       *  handles appear as soon as the envelope has points. */}
      {shown && (
        <EnvelopeCanvas
          envelope={shown}
          playheadSeconds={playheadSeconds}
          sessionLengthSeconds={sessionLengthSeconds}
          valueRange={{ min: ui.min, max: ui.max }}
          onChange={(nextPoints) => upsertEnvelope(shownParam, { points: nextPoints })}
        />
      )}

      {shown && shown.points.length === 0 && (
        <div className="text-xs text-muted-foreground">
          No points yet. Click on the canvas to add one, or use
          <span className="mx-1 font-mono">Add at playhead</span> below.
        </div>
      )}

      {shown && shown.points.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-[6rem_1fr_3.5rem_7rem_2rem] items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <span>Time (s)</span>
            <span>Value</span>
            <span className="text-right">Readout</span>
            <span>Curve in</span>
            <span></span>
          </div>
          {shown.points.map((p, i) => (
            <div key={i} className="grid grid-cols-[6rem_1fr_3.5rem_7rem_2rem] items-center gap-2">
              <input
                type="number"
                min={0}
                step={0.01}
                value={p.time_seconds}
                onChange={(e) => setPointField(i, { time_seconds: Math.max(0, Number(e.target.value) || 0) })}
                className="h-8 px-2 text-xs bg-background border border-border rounded tabular-nums"
              />
              <Slider
                value={[p.value]}
                min={ui.min} max={ui.max} step={ui.step}
                onValueChange={(v) => setPointField(i, { value: v[0] })}
                className="flex-1"
              />
              <span className="text-xs tabular-nums text-right">
                {p.value.toFixed(ui.step >= 1 ? 0 : 2)}{ui.unit && ` ${ui.unit}`}
              </span>
              <Select
                value={p.curve}
                onValueChange={(v) => setPointField(i, { curve: v as AutomationCurve })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURVE_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => removePoint(i)}
                className="h-8 w-8 rounded hover:bg-destructive/20 hover:text-destructive text-muted-foreground inline-flex items-center justify-center"
                title="Remove point"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <button
          type="button"
          onClick={() => addPointAtTime(playheadSeconds)}
          className="h-8 px-3 rounded border border-border bg-muted hover:bg-muted/70 text-xs font-semibold inline-flex items-center gap-1"
          title="Add a point at the playhead time with the current strip value"
        >
          <Clock className="w-3.5 h-3.5" />
          Add at playhead
          <span className="text-muted-foreground tabular-nums">({playheadSeconds.toFixed(2)} s)</span>
        </button>
        <button
          type="button"
          onClick={() => addPointAtTime(0)}
          className="h-8 px-3 rounded border border-border bg-muted hover:bg-muted/70 text-xs font-semibold inline-flex items-center gap-1"
          title="Add a point at time 0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add at start
        </button>
        <div className="flex-1" />
        {shown && shown.points.length > 0 && (
          <button
            type="button"
            onClick={removeEnvelope}
            className="h-8 px-3 rounded border border-border bg-muted hover:bg-destructive/20 hover:text-destructive text-xs font-semibold"
            title="Remove this envelope entirely"
          >
            Clear envelope
          </button>
        )}
      </div>
    </div>
  );
}
