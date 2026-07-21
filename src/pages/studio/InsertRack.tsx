// InsertRack — Phase 5.
//
// Reusable insert-slot rack for track, bus, and master strips. Each
// slot hosts one FxNode from the session; the rack manages the
// add / remove / reorder / enable / param-edit lifecycle and hands
// the caller a fresh fx array to persist via onChange.
//
// The rack renders one row per configured slot plus a compact "Add"
// dropdown at the bottom. Rows are horizontal:
//   [type badge] [name] [enable switch] [params] [↑] [↓] [X]
//
// Params UI is per-type — a minimal set of the most-used knobs
// (gain_db for gain, threshold/ratio for compressor, etc.). The
// full param editor is deferred to a Phase 5b / Phase 8 automation
// PR that will host a proper knob panel per FX type.

import { useState, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { X, ChevronUp, ChevronDown, Plus, Waves, Zap, Sliders, Music, Radio, Filter } from 'lucide-react';
import { MAX_INSERTS_PER_STRIP, type FxNode, type FxType } from '@/lib/studio/session';
import { newFxNode } from '@/lib/studio/defaults';

const FX_TYPE_LABEL: Record<FxType, string> = {
  gain: 'Gain',
  eq3: '3-band EQ',
  compressor: 'Compressor',
  reverb: 'Reverb',
  delay: 'Delay',
  filter: 'Filter',
};

const FX_TYPE_ICON: Record<FxType, typeof Waves> = {
  gain: Sliders,
  eq3: Music,
  compressor: Zap,
  reverb: Waves,
  delay: Radio,
  filter: Filter,
};

const ALL_FX_TYPES: FxType[] = ['gain', 'eq3', 'compressor', 'reverb', 'delay', 'filter'];

export function InsertRack({
  fx, onChange, ownerLabel, onClose,
}: {
  fx: FxNode[];
  onChange: (fx: FxNode[]) => void;
  /** Label shown in the header — e.g. the track/bus name. */
  ownerLabel: string;
  onClose?: () => void;
}) {
  const atCap = fx.length >= MAX_INSERTS_PER_STRIP;

  const update = useCallback((fxId: string, patch: Partial<FxNode>) => {
    onChange(fx.map((f) => f.id === fxId ? { ...f, ...patch } : f));
  }, [fx, onChange]);

  const updateParam = useCallback((fxId: string, key: string, value: number | string | boolean) => {
    onChange(fx.map((f) => f.id === fxId
      ? { ...f, params: { ...f.params, [key]: value } }
      : f));
  }, [fx, onChange]);

  const remove = useCallback((fxId: string) => {
    onChange(fx.filter((f) => f.id !== fxId));
  }, [fx, onChange]);

  const move = useCallback((fxId: string, delta: -1 | 1) => {
    const idx = fx.findIndex((f) => f.id === fxId);
    const next = idx + delta;
    if (idx < 0 || next < 0 || next >= fx.length) return;
    const clone = [...fx];
    [clone[idx], clone[next]] = [clone[next], clone[idx]];
    onChange(clone);
  }, [fx, onChange]);

  return (
    <div className="bg-card border border-border rounded-md p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">
          <span className="text-muted-foreground">Inserts —</span> {ownerLabel}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded hover:bg-muted inline-flex items-center justify-center text-muted-foreground"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {fx.length === 0 && (
        <div className="text-xs text-muted-foreground">
          No inserts yet. Add one from the dropdown below.
        </div>
      )}
      {fx.map((slot, i) => (
        <InsertSlot
          key={slot.id}
          slot={slot}
          isFirst={i === 0}
          isLast={i === fx.length - 1}
          onToggleEnabled={(v) => update(slot.id, { enabled: v })}
          onParamChange={(k, v) => updateParam(slot.id, k, v)}
          onMoveUp={() => move(slot.id, -1)}
          onMoveDown={() => move(slot.id, 1)}
          onRemove={() => remove(slot.id)}
        />
      ))}
      <AddInsertControl
        disabled={atCap}
        onAdd={(type) => onChange([...fx, newFxNode(type)])}
      />
    </div>
  );
}

function InsertSlot({
  slot, isFirst, isLast, onToggleEnabled, onParamChange, onMoveUp, onMoveDown, onRemove,
}: {
  slot: FxNode;
  isFirst: boolean;
  isLast: boolean;
  onToggleEnabled: (v: boolean) => void;
  onParamChange: (key: string, value: number | string | boolean) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const Icon = FX_TYPE_ICON[slot.type];
  const label = FX_TYPE_LABEL[slot.type];
  return (
    <div className="border border-border rounded p-2 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        <span className={`text-xs font-semibold flex-1 min-w-0 truncate ${slot.enabled ? '' : 'text-muted-foreground'}`}>
          {label}
        </span>
        <Switch
          checked={slot.enabled}
          onCheckedChange={onToggleEnabled}
          aria-label={slot.enabled ? 'Bypass' : 'Enable'}
        />
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          className="h-6 w-6 rounded hover:bg-muted disabled:opacity-30 inline-flex items-center justify-center text-muted-foreground"
          title="Move up"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          className="h-6 w-6 rounded hover:bg-muted disabled:opacity-30 inline-flex items-center justify-center text-muted-foreground"
          title="Move down"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="h-6 w-6 rounded hover:bg-destructive/20 hover:text-destructive text-muted-foreground inline-flex items-center justify-center"
          title="Remove insert"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <SlotParams slot={slot} onChange={onParamChange} disabled={!slot.enabled} />
    </div>
  );
}

/** Per-type minimal param editor. Renders the 1–3 most-used knobs
 *  for each FX type as labeled sliders. The full param sheet is a
 *  Phase 5b follow-up. */
function SlotParams({
  slot, onChange, disabled,
}: {
  slot: FxNode;
  onChange: (key: string, value: number | string | boolean) => void;
  disabled: boolean;
}) {
  const p = slot.params;
  switch (slot.type) {
    case 'gain':
      return (
        <ParamSlider label="Gain" unit="dB" min={-24} max={24} step={0.1} disabled={disabled}
          value={numParam(p.gain_db, 0)} onChange={(v) => onChange('gain_db', v)} />
      );
    case 'eq3':
      return (
        <div className="flex flex-col gap-1.5">
          <ParamSlider label="Low" unit="dB" min={-12} max={12} step={0.1} disabled={disabled}
            value={numParam(p.low_db, 0)} onChange={(v) => onChange('low_db', v)} />
          <ParamSlider label="Mid" unit="dB" min={-12} max={12} step={0.1} disabled={disabled}
            value={numParam(p.mid_db, 0)} onChange={(v) => onChange('mid_db', v)} />
          <ParamSlider label="High" unit="dB" min={-12} max={12} step={0.1} disabled={disabled}
            value={numParam(p.high_db, 0)} onChange={(v) => onChange('high_db', v)} />
        </div>
      );
    case 'compressor':
      return (
        <div className="flex flex-col gap-1.5">
          <ParamSlider label="Threshold" unit="dB" min={-60} max={0} step={0.1} disabled={disabled}
            value={numParam(p.threshold_db, -18)} onChange={(v) => onChange('threshold_db', v)} />
          <ParamSlider label="Ratio" unit=":1" min={1} max={20} step={0.1} disabled={disabled}
            value={numParam(p.ratio, 3)} onChange={(v) => onChange('ratio', v)} />
          <ParamSlider label="Makeup" unit="dB" min={0} max={24} step={0.1} disabled={disabled}
            value={numParam(p.makeup_db, 0)} onChange={(v) => onChange('makeup_db', v)} />
        </div>
      );
    case 'reverb':
      return (
        <div className="flex flex-col gap-1.5">
          <ParamSlider label="Wet" unit="" min={0} max={1} step={0.01} disabled={disabled}
            value={numParam(p.wet, 0.25)} onChange={(v) => onChange('wet', v)} />
          <ParamSlider label="Room" unit="" min={0} max={1} step={0.01} disabled={disabled}
            value={numParam(p.room_size, 0.6)} onChange={(v) => onChange('room_size', v)} />
        </div>
      );
    case 'delay':
      return (
        <div className="flex flex-col gap-1.5">
          <ParamSlider label="Time" unit="ms" min={1} max={2000} step={1} disabled={disabled}
            value={numParam(p.time_ms, 350)} onChange={(v) => onChange('time_ms', v)} />
          <ParamSlider label="Feedback" unit="" min={0} max={0.95} step={0.01} disabled={disabled}
            value={numParam(p.feedback, 0.35)} onChange={(v) => onChange('feedback', v)} />
          <ParamSlider label="Wet" unit="" min={0} max={1} step={0.01} disabled={disabled}
            value={numParam(p.wet, 0.25)} onChange={(v) => onChange('wet', v)} />
        </div>
      );
    case 'filter':
      return (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs w-14 text-muted-foreground shrink-0">Type</span>
            <Select
              value={String(p.kind ?? 'low')}
              onValueChange={(v) => onChange('kind', v)}
              disabled={disabled}
            >
              <SelectTrigger className="h-7 flex-1 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low-pass</SelectItem>
                <SelectItem value="high">High-pass</SelectItem>
                <SelectItem value="band">Band-pass</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ParamSlider label="Cutoff" unit="Hz" min={20} max={20000} step={10} disabled={disabled}
            value={numParam(p.cutoff_hz, 1000)} onChange={(v) => onChange('cutoff_hz', v)} />
        </div>
      );
  }
}

function ParamSlider({
  label, unit, value, min, max, step, disabled, onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs w-14 shrink-0 ${disabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>{label}</span>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
        disabled={disabled}
        className="flex-1"
      />
      <span className={`text-xs tabular-nums w-16 text-right shrink-0 ${disabled ? 'text-muted-foreground/50' : ''}`}>
        {value.toFixed(step >= 1 ? 0 : 2)}{unit && ` ${unit}`}
      </span>
    </div>
  );
}

/** Coerce a Record-typed param to a number with a safe default. */
function numParam(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function AddInsertControl({
  disabled, onAdd,
}: {
  disabled: boolean;
  onAdd: (type: FxType) => void;
}) {
  const [pending, setPending] = useState<FxType | ''>('');
  return (
    <div className="flex items-center gap-2 pt-1 border-t border-border">
      <Select value={pending} onValueChange={(v) => setPending(v as FxType)} disabled={disabled}>
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue placeholder={disabled ? `Insert cap reached (${MAX_INSERTS_PER_STRIP})` : 'Add insert…'} />
        </SelectTrigger>
        <SelectContent>
          {ALL_FX_TYPES.map((t) => (
            <SelectItem key={t} value={t}>{FX_TYPE_LABEL[t]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button
        type="button"
        disabled={!pending || disabled}
        onClick={() => { if (pending) { onAdd(pending); setPending(''); } }}
        className={`h-8 px-3 rounded border text-xs font-semibold inline-flex items-center gap-1 ${
          !pending || disabled
            ? 'border-border/50 bg-muted/30 text-muted-foreground/40 cursor-not-allowed'
            : 'border-border bg-muted hover:bg-muted/70'
        }`}
      >
        <Plus className="w-3.5 h-3.5" /> Add
      </button>
    </div>
  );
}
