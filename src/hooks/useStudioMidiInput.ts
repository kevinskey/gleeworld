import { useEffect, useRef, useState } from 'react';
import { parseMidiMessage } from '@/lib/studio/midiMessage';

// Web MIDI types aren't in the default TS DOM lib; keep these local + loose,
// matching the existing requestMIDIAccess usage elsewhere in the Studio.
interface MidiPort { id: string; name?: string; onmidimessage: ((e: { data: Uint8Array }) => void) | null }
interface MidiAccessLike {
  inputs: Map<string, MidiPort>;
  onstatechange: (() => void) | null;
}

const supported = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;

/**
 * Subscribe to USB/Web MIDI note input. When `enabled`, requests MIDI access,
 * lists input devices, and routes note on/off from the chosen device (or all
 * devices when deviceId is '') to the callbacks. Hot-plug aware.
 */
export function useStudioMidiInput({
  enabled,
  deviceId,
  onNoteOn,
  onNoteOff,
  onSustain,
}: {
  enabled: boolean;
  deviceId: string;
  onNoteOn: (pitch: number, velocity: number) => void;
  onNoteOff: (pitch: number) => void;
  onSustain?: (down: boolean) => void;
}) {
  const [inputs, setInputs] = useState<{ id: string; name: string }[]>([]);
  const [status, setStatus] = useState<'idle' | 'connected' | 'denied'>('idle');
  // Latest callbacks via refs so re-subscription isn't triggered every render.
  const onOnRef = useRef(onNoteOn); onOnRef.current = onNoteOn;
  const onOffRef = useRef(onNoteOff); onOffRef.current = onNoteOff;
  const onSustainRef = useRef(onSustain); onSustainRef.current = onSustain;

  useEffect(() => {
    if (!enabled || !supported) { setStatus('idle'); return; }
    let cancelled = false;
    let access: MidiAccessLike | null = null;

    const handle = (e: { data: Uint8Array }) => {
      const ev = parseMidiMessage(e.data);
      if (ev.type === 'noteon') onOnRef.current(ev.pitch, ev.velocity);
      else if (ev.type === 'noteoff') onOffRef.current(ev.pitch);
      else if (ev.type === 'sustain') onSustainRef.current?.(ev.down);
    };
    const attach = (acc: MidiAccessLike) => {
      const list = [...acc.inputs.values()];
      setInputs(list.map((i) => ({ id: i.id, name: i.name ?? i.id })));
      list.forEach((inp) => { inp.onmidimessage = deviceId === '' || inp.id === deviceId ? handle : null; });
    };

    (navigator as unknown as { requestMIDIAccess: (o: { sysex: boolean }) => Promise<MidiAccessLike> })
      .requestMIDIAccess({ sysex: false })
      .then((acc) => {
        if (cancelled) return;
        access = acc;
        setStatus('connected');
        attach(acc);
        acc.onstatechange = () => attach(acc); // re-attach on plug/unplug
      })
      .catch(() => { if (!cancelled) setStatus('denied'); });

    return () => {
      cancelled = true;
      if (access) {
        access.inputs.forEach((inp) => { inp.onmidimessage = null; });
        access.onstatechange = null;
      }
    };
  }, [enabled, deviceId]);

  return { supported, inputs, status };
}
