import { useEffect, useRef, useState } from 'react';
import { parseMidiMessage } from '@/lib/studio/midiMessage';
import { getMidiInputSource } from '@/lib/midi/midiInputSource';

/**
 * Subscribe to hardware MIDI note input (Web MIDI on desktop browsers,
 * the CoreMIDI GWMidi plugin inside the iOS app). When `enabled`,
 * lists input devices and routes note on/off from the chosen device
 * (or all devices when deviceId is '') to the callbacks. Hot-plug aware.
 */
export function useStudioMidiInput({
  enabled,
  deviceId,
  onNoteOn,
  onNoteOff,
  onSustain,
  onCc,
}: {
  enabled: boolean;
  deviceId: string;
  onNoteOn: (pitch: number, velocity: number) => void;
  onNoteOff: (pitch: number) => void;
  onSustain?: (down: boolean) => void;
  onCc?: (controller: number, value: number) => void;
}) {
  const [inputs, setInputs] = useState<{ id: string; name: string }[]>([]);
  const [status, setStatus] = useState<'idle' | 'connected' | 'denied'>('idle');
  // Latest callbacks via refs so re-subscription isn't triggered every render.
  const onOnRef = useRef(onNoteOn); onOnRef.current = onNoteOn;
  const onOffRef = useRef(onNoteOff); onOffRef.current = onNoteOff;
  const onSustainRef = useRef(onSustain); onSustainRef.current = onSustain;
  const onCcRef = useRef(onCc); onCcRef.current = onCc;

  const source = getMidiInputSource();

  useEffect(() => {
    if (!enabled || !source.supported) { setStatus('idle'); return; }
    let cancelled = false;
    let unsub: (() => void) | null = null;

    const refreshInputs = () => {
      void source.listInputs().then((list) => { if (!cancelled) setInputs(list); });
    };
    const offState = source.onStateChange(refreshInputs);

    source
      .subscribe(deviceId, (data) => {
        const ev = parseMidiMessage(data);
        if (ev.type === 'noteon') onOnRef.current(ev.pitch, ev.velocity);
        else if (ev.type === 'noteoff') onOffRef.current(ev.pitch);
        else if (ev.type === 'sustain') onSustainRef.current?.(ev.down);
        else if (ev.type === 'cc') onCcRef.current?.(ev.controller, ev.value);
      })
      .then((u) => {
        if (cancelled) { u(); return; }
        unsub = u;
        setStatus('connected');
        refreshInputs();
      })
      .catch(() => { if (!cancelled) setStatus('denied'); });

    return () => {
      cancelled = true;
      offState();
      unsub?.();
    };
    // `source` is a module singleton — stable for the app lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, deviceId]);

  return { supported: source.supported, inputs, status };
}
