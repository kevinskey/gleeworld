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
  /** `timeStampMs` = hardware event time (performance.now() domain) where
   *  the backend provides one (Web MIDI); undefined on the native plugin.
   *  Recording maps it onto the transport for jitter-free note placement. */
  onNoteOn: (pitch: number, velocity: number, timeStampMs?: number) => void;
  onNoteOff: (pitch: number, timeStampMs?: number) => void;
  onSustain?: (down: boolean, timeStampMs?: number) => void;
  onCc?: (controller: number, value: number, timeStampMs?: number) => void;
}) {
  const [inputs, setInputs] = useState<{ id: string; name: string }[]>([]);
  const [status, setStatus] = useState<'idle' | 'connected' | 'denied'>('idle');
  // Latest callbacks via refs so re-subscription isn't triggered every render.
  const onOnRef = useRef(onNoteOn); onOnRef.current = onNoteOn;
  const onOffRef = useRef(onNoteOff); onOffRef.current = onNoteOff;
  const onSustainRef = useRef(onSustain); onSustainRef.current = onSustain;
  const onCcRef = useRef(onCc); onCcRef.current = onCc;
  // Latest deviceId via ref: the managed subscription is only opened once
  // per `enabled` toggle (below), so a switch effect applies device changes
  // to it live. This ref also lets a late-resolving subscribe() (subscribe
  // is async) pick up whatever device is CURRENT by the time it lands,
  // rather than the deviceId the effect closed over when it started.
  const deviceIdRef = useRef(deviceId); deviceIdRef.current = deviceId;

  const source = getMidiInputSource();
  const subRef = useRef<{ close(): void; setDevice(id: string): void } | null>(null);

  useEffect(() => {
    if (!enabled || !source.supported) { setStatus('idle'); return; }
    let cancelled = false;

    const refreshInputs = () => {
      void source.listInputs()
        .then((list) => { if (!cancelled) setInputs(list); })
        .catch(() => { /* device list unavailable — keep last known */ });
    };
    const offState = source.onStateChange(refreshInputs);

    source
      .subscribeManaged(deviceIdRef.current, (data, timeStampMs) => {
        const ev = parseMidiMessage(data);
        if (ev.type === 'noteon') onOnRef.current(ev.pitch, ev.velocity, timeStampMs);
        else if (ev.type === 'noteoff') onOffRef.current(ev.pitch, timeStampMs);
        else if (ev.type === 'sustain') onSustainRef.current?.(ev.down, timeStampMs);
        else if (ev.type === 'cc') onCcRef.current?.(ev.controller, ev.value, timeStampMs);
      })
      .then((sub) => {
        if (cancelled) { sub.close(); return; }
        // Apply whatever device is current now — deviceId may have changed
        // while this (async) subscribe was in flight.
        sub.setDevice(deviceIdRef.current);
        subRef.current = sub;
        setStatus('connected');
        refreshInputs();
      })
      .catch(() => { if (!cancelled) setStatus('denied'); });

    return () => {
      cancelled = true;
      offState();
      subRef.current?.close();
      subRef.current = null;
    };
    // `source` is a module singleton — stable for the app lifetime.
    // deviceId is intentionally excluded: switching devices must not tear
    // down and re-request the MIDI session (see the effect below).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Device switches apply live to the already-open managed subscription —
  // no re-subscribe, no re-prompt for permission, no port re-attach.
  useEffect(() => {
    subRef.current?.setDevice(deviceId);
  }, [deviceId]);

  return { supported: source.supported, inputs, status };
}
