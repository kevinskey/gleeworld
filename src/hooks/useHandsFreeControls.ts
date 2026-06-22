// Aggregates all hands-free page-turn inputs into one hook so ViewerReader
// only needs to pass next/prev callbacks. Each input source has its own
// boolean toggle persisted in localStorage; multiple can be active at once.
//
// Inputs:
//   • Bluetooth foot pedal (HID keyboard mode — most pedals send Page
//     Down / Page Up / arrow keys natively). No special API; we listen
//     globally and route the keys to onNext / onPrev.
//   • Web MIDI — any controller that fires Note On or CC ≥ 1. "Learn"
//     mode binds the next event to either next or prev.
//   • Face gestures — head turn detected via MediaPipe Face Landmarker
//     (loaded lazily; ~8MB model on first use).

import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'gw-handsfree-settings-v1';

export interface HandsFreeSettings {
  pedalEnabled: boolean;
  midiEnabled: boolean;
  midiBindings: { next: MidiBinding | null; prev: MidiBinding | null };
  gesturesEnabled: boolean;
  gestureSensitivity: number; // 0..1
}

export interface MidiBinding {
  // type=note: key is the MIDI note number; type=cc: key is the controller number
  type: 'note' | 'cc';
  key: number;
  // Some controllers send Note Off on release; we only act on the press edge.
  label: string;
}

const DEFAULT_SETTINGS: HandsFreeSettings = {
  pedalEnabled: false,
  midiEnabled: false,
  midiBindings: { next: null, prev: null },
  gesturesEnabled: false,
  gestureSensitivity: 0.5,
};

export function loadHandsFreeSettings(): HandsFreeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { return DEFAULT_SETTINGS; }
}

export function saveHandsFreeSettings(s: HandsFreeSettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

export interface HandsFreeHandlers {
  onNext: () => void;
  onPrev: () => void;
}

export type MidiLearnTarget = 'next' | 'prev' | null;

export function useHandsFreeControls({ onNext, onPrev }: HandsFreeHandlers) {
  const [settings, setSettings] = useState<HandsFreeSettings>(loadHandsFreeSettings);
  const [midiAvailable, setMidiAvailable] = useState<boolean | null>(null);
  const [midiInputs, setMidiInputs] = useState<string[]>([]);
  const [midiLearning, setMidiLearning] = useState<MidiLearnTarget>(null);

  // Persist whenever settings change.
  useEffect(() => { saveHandsFreeSettings(settings); }, [settings]);

  // Refs so the global listeners always see the latest callbacks/settings
  // without re-binding the listener on every parent render.
  const handlersRef = useRef({ onNext, onPrev });
  const settingsRef = useRef(settings);
  const learningRef = useRef<MidiLearnTarget>(null);
  useEffect(() => { handlersRef.current = { onNext, onPrev }; }, [onNext, onPrev]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { learningRef.current = midiLearning; }, [midiLearning]);

  // --- Bluetooth pedal / keyboard listener -------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!settingsRef.current.pedalEnabled) return;
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      // Don't hijack typing in forms.
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return;
      if (['PageDown', 'ArrowRight', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
        handlersRef.current.onNext();
      } else if (['PageUp', 'ArrowLeft', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        handlersRef.current.onPrev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // --- Web MIDI -----------------------------------------------------------
  useEffect(() => {
    let access: any = null;
    let cancelled = false;
    (async () => {
      if (!('requestMIDIAccess' in navigator)) { setMidiAvailable(false); return; }
      try {
        access = await (navigator as any).requestMIDIAccess({ sysex: false });
      } catch { setMidiAvailable(false); return; }
      if (cancelled) return;
      setMidiAvailable(true);

      const updateInputs = () => {
        const names: string[] = [];
        access.inputs.forEach((inp: any) => names.push(inp.name ?? '(unnamed)'));
        setMidiInputs(names);
      };
      updateInputs();
      access.onstatechange = updateInputs;

      const onMessage = (msg: any) => {
        const s = settingsRef.current;
        if (!s.midiEnabled && learningRef.current === null) return;
        const [status, data1, data2] = msg.data;
        const cmd = status & 0xf0;
        let evt: MidiBinding | null = null;
        if (cmd === 0x90 && data2 > 0) {
          evt = { type: 'note', key: data1, label: `Note ${data1}` };
        } else if (cmd === 0xb0 && data2 > 0) {
          evt = { type: 'cc', key: data1, label: `CC ${data1}` };
        }
        if (!evt) return;

        if (learningRef.current) {
          // Learning mode: assign this event to the target slot.
          const target = learningRef.current;
          setSettings((prev) => ({
            ...prev,
            midiBindings: { ...prev.midiBindings, [target]: evt! },
          }));
          setMidiLearning(null);
          return;
        }

        if (s.midiEnabled) {
          const nextB = s.midiBindings.next;
          const prevB = s.midiBindings.prev;
          if (nextB && nextB.type === evt.type && nextB.key === evt.key) handlersRef.current.onNext();
          else if (prevB && prevB.type === evt.type && prevB.key === evt.key) handlersRef.current.onPrev();
        }
      };
      access.inputs.forEach((inp: any) => { inp.onmidimessage = onMessage; });
    })();
    return () => {
      cancelled = true;
      if (access) {
        try { access.inputs.forEach((inp: any) => { inp.onmidimessage = null; }); } catch {}
      }
    };
  }, []);

  return {
    settings,
    setSettings,
    midiAvailable,
    midiInputs,
    midiLearning,
    setMidiLearning,
  };
}
