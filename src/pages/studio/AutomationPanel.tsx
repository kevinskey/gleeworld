// AutomationPanel — minimal breakpoint envelope editor.
//
// Deliberately tabular for v1: one row per point (time, value, curve,
// delete). SVG canvas + drag interaction is a Phase 8c polish.
//
// Users can:
//   - Pick which param to automate on this strip (volume_db / pan).
//   - Choose mode: Off (envelope ignored) / Read (engine applies during
//     playback) / Write (fader moves capture points at the playhead).
//   - Add a point at the current playhead position.
//   - Edit any point's time, value, curve.
//   - Delete a point.
//
// The engine's applyAutomation() re-schedules on every play(), so
// any edit here takes effect at the next Play. Write-mode captures
// happen in the mixer (setStrip / setBusStrip); the panel just shows
// the current envelope + a "recording" pulse while write mode is armed.

import { useMemo, useCallback } from 'react';
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

function newId(): string {
  return (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `auto-${Math.random().toString(36).slice(2)}`;
}

export function AutomationPanel({
  ownerId, ownerKind, ownerLabel, automation, playheadSeconds, currentStripValue, onChange, onClose,
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
        {modeValue === 'write' && (
          <span
            className="text-[10px] font-semibold uppercase tracking-wide text-red-500 inline-flex items-center gap-1 animate-pulse"
            aria-live="polite"
          >
            <Circle className="w-2.5 h-2.5 fill-current" />
            Writing
          </span>
        )}
        <div
          role="group"
          aria-label="Automation mode"
          className="inline-flex rounded border border-border overflow-hidden text-[11px] font-semibold"
        >
          {(['off', 'read', 'write'] as AutomationMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={
                'h-8 px-2.5 uppercase tracking-wide transition-colors ' +
                (m === modeValue
                  ? m === 'write'
                    ? 'bg-red-500/15 text-red-600'
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

      {shown && shown.points.length === 0 && (
        <div className="text-xs text-muted-foreground">
          No points yet. Add one at the current playhead — the engine
          will interpolate between it and any later points on Play.
        </div>
      )}

      {shown && shown.points.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-[6rem_1fr_3.5rem_7rem_2rem] items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
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
