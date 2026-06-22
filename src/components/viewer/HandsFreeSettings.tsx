// Settings panel for the three hands-free page-turn input methods.
// Rendered inside the Viewer's Music Tools sheet.

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Footprints, Music as MidiIcon, Camera } from 'lucide-react';
import type { HandsFreeSettings, MidiBinding, MidiLearnTarget } from '@/hooks/useHandsFreeControls';

interface HandsFreeSettingsProps {
  settings: HandsFreeSettings;
  onChange: (next: HandsFreeSettings) => void;
  midiAvailable: boolean | null;
  midiInputs: string[];
  midiLearning: MidiLearnTarget;
  onStartLearn: (target: MidiLearnTarget) => void;
}

export function HandsFreeSettingsPanel({
  settings, onChange, midiAvailable, midiInputs, midiLearning, onStartLearn,
}: HandsFreeSettingsProps) {
  return (
    <div className="space-y-3">
      <PedalCard settings={settings} onChange={onChange} />
      <MidiCard
        settings={settings}
        onChange={onChange}
        available={midiAvailable}
        inputs={midiInputs}
        learning={midiLearning}
        onStartLearn={onStartLearn}
      />
      <GestureCard settings={settings} onChange={onChange} />
    </div>
  );
}

function PedalCard({ settings, onChange }: { settings: HandsFreeSettings; onChange: (s: HandsFreeSettings) => void }) {
  return (
    <div className="p-3 bg-card border rounded-lg space-y-2">
      <div className="flex items-start gap-2">
        <Footprints className="w-4 h-4 mt-0.5 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Bluetooth pedal</div>
          <p className="text-xs text-muted-foreground">
            Most AirTurn / PageFlip pedals send Page&nbsp;Down / Page&nbsp;Up in BT&nbsp;keyboard mode.
          </p>
        </div>
        <Toggle
          checked={settings.pedalEnabled}
          onChange={(v) => onChange({ ...settings, pedalEnabled: v })}
        />
      </div>
      {settings.pedalEnabled && (
        <p className="text-[11px] text-muted-foreground italic">
          Listening for Page&nbsp;Down · Space · arrow&nbsp;right to advance, Page&nbsp;Up · arrow&nbsp;left to go back.
        </p>
      )}
    </div>
  );
}

function MidiCard({
  settings, onChange, available, inputs, learning, onStartLearn,
}: {
  settings: HandsFreeSettings;
  onChange: (s: HandsFreeSettings) => void;
  available: boolean | null;
  inputs: string[];
  learning: MidiLearnTarget;
  onStartLearn: (target: MidiLearnTarget) => void;
}) {
  // Auto-cancel learn after 10s of no input so the panel doesn't get stuck.
  useEffect(() => {
    if (!learning) return;
    const t = window.setTimeout(() => onStartLearn(null), 10000);
    return () => window.clearTimeout(t);
  }, [learning, onStartLearn]);

  return (
    <div className="p-3 bg-card border rounded-lg space-y-2">
      <div className="flex items-start gap-2">
        <MidiIcon className="w-4 h-4 mt-0.5 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">MIDI controller</div>
          <p className="text-xs text-muted-foreground">
            Any USB / Bluetooth MIDI device. Bind one event for Next, one for Previous.
          </p>
        </div>
        <Toggle
          checked={settings.midiEnabled}
          disabled={available === false}
          onChange={(v) => onChange({ ...settings, midiEnabled: v })}
        />
      </div>
      {available === false && (
        <p className="text-[11px] text-destructive">Your browser doesn't expose Web MIDI (Safari has no support).</p>
      )}
      {settings.midiEnabled && (
        <>
          <p className="text-[11px] text-muted-foreground">
            Detected inputs: {inputs.length === 0 ? 'none' : inputs.join(', ')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <BindingButton
              label="Next"
              binding={settings.midiBindings.next}
              learning={learning === 'next'}
              onLearn={() => onStartLearn('next')}
              onClear={() => onChange({ ...settings, midiBindings: { ...settings.midiBindings, next: null } })}
            />
            <BindingButton
              label="Previous"
              binding={settings.midiBindings.prev}
              learning={learning === 'prev'}
              onLearn={() => onStartLearn('prev')}
              onClear={() => onChange({ ...settings, midiBindings: { ...settings.midiBindings, prev: null } })}
            />
          </div>
        </>
      )}
    </div>
  );
}

function BindingButton({
  label, binding, learning, onLearn, onClear,
}: {
  label: string;
  binding: MidiBinding | null;
  learning: boolean;
  onLearn: () => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded border bg-background p-2 space-y-1">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm tabular-nums">
        {learning ? <span className="italic text-primary">Press a key…</span>
          : binding ? <span>{binding.label}</span>
            : <span className="text-muted-foreground italic">Unassigned</span>}
      </div>
      <div className="flex gap-1 pt-1">
        <Button size="sm" variant={learning ? 'default' : 'outline'} onClick={onLearn} className="h-6 px-1.5 text-[11px] flex-1">
          {learning ? 'Cancel' : 'Learn'}
        </Button>
        {binding && (
          <Button size="sm" variant="ghost" onClick={onClear} className="h-6 px-1.5 text-[11px]">
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

function GestureCard({ settings, onChange }: { settings: HandsFreeSettings; onChange: (s: HandsFreeSettings) => void }) {
  return (
    <div className="p-3 bg-card border rounded-lg space-y-2">
      <div className="flex items-start gap-2">
        <Camera className="w-4 h-4 mt-0.5 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Face gestures</div>
          <p className="text-xs text-muted-foreground">
            Front camera tracks your head. Turn right → next, left → previous. Privacy: video never leaves the device.
          </p>
        </div>
        <Toggle
          checked={settings.gesturesEnabled}
          onChange={(v) => onChange({ ...settings, gesturesEnabled: v })}
        />
      </div>
      {settings.gesturesEnabled && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Sensitivity</span>
            <span className="tabular-nums">{Math.round(settings.gestureSensitivity * 100)}%</span>
          </div>
          <Slider
            value={[Math.round(settings.gestureSensitivity * 100)]}
            min={10}
            max={90}
            step={5}
            onValueChange={(v) => onChange({ ...settings, gestureSensitivity: v[0] / 100 })}
          />
          <p className="text-[10px] text-muted-foreground italic">
            Loads an ≈8MB face model the first time it's enabled.
          </p>
        </div>
      )}
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
        checked ? 'bg-primary' : 'bg-input',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  );
}
