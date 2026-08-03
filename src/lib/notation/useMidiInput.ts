// MIDI subscription for the NotationEditor, built on the shared MIDI input
// facade (getMidiInputSource) so it works identically over Web MIDI on
// desktop browsers and CoreMIDI (via the GWMidi Capacitor plugin) inside the
// iOS app — Safari on iOS has no Web MIDI at all, so before this rewrite the
// notation MIDI button never appeared on iPad.
//
// MIDI parsing crib sheet (now lives in parseMidiMessage, src/lib/studio/midiMessage.ts):
//   status = data[0]
//     0x90-0x9F → note-on channel c (c = status & 0x0F)
//     0x80-0x8F → note-off channel c
//   data[1] = note number 0..127 (60 = middle C)
//   data[2] = velocity 0..127 (a "note-on" with velocity 0 is really a note-off,
//             which many older devices send — parseMidiMessage already remaps
//             it to a 'noteoff' event, so this hook never sees a velocity-0
//             'noteon' and doesn't need to check velocity itself)
//
// The hook is idempotent: enable→disable→enable cleanly detaches and
// re-attaches listeners without leaking handlers, and refreshes the input
// list when a new device is plugged in mid-session (via onStateChange).

import { useEffect, useRef, useState } from 'react';
import { parseMidiMessage } from '@/lib/studio/midiMessage';
import { getMidiInputSource } from '@/lib/midi/midiInputSource';

export interface MidiInputState {
  /** True wherever the shared MIDI facade has a working backend — Web MIDI
   *  on desktop browsers, or the CoreMIDI plugin inside the iOS app. Safari
   *  on iOS *outside* the app and old Firefox versions still report false. */
  supported: boolean;
  /** True after the user granted permission and we have an active subscription. */
  connected: boolean;
  /** Human names of the inputs we're listening to (for a status pill). */
  inputNames: string[];
  /** Populated when the last enable() attempt failed (permission denied,
   *  no devices, etc.) so the UI can surface a real reason. */
  error: string | null;
}

/** Subscribe to MIDI note-on events via the shared facade. `onNoteOn(midi,
 *  velocity)` fires for every note-on (velocity > 0) from any connected
 *  input. Enable/disable via the returned `enable`/`disable` functions so
 *  the permission prompt only happens when the user opts in. */
export function useMidiInput(onNoteOn: (midi: number, velocity: number) => void): {
  state: MidiInputState;
  enable: () => Promise<void>;
  disable: () => void;
} {
  const source = getMidiInputSource();
  const [state, setState] = useState<MidiInputState>({
    supported: source.supported, connected: false, inputNames: [], error: null,
  });
  // Latest handler in a ref so subscribers don't need to re-bind every render.
  const handlerRef = useRef(onNoteOn);
  useEffect(() => { handlerRef.current = onNoteOn; }, [onNoteOn]);
  const unsubRef = useRef<(() => void) | null>(null);
  const offStateRef = useRef<(() => void) | null>(null);

  const refreshInputs = () => {
    void source.listInputs()
      .then((list) => setState((s) => ({ ...s, inputNames: list.map((i) => i.name) })))
      .catch(() => { /* device list unavailable — keep last known */ });
  };

  const enable = async () => {
    if (!source.supported) {
      setState((s) => ({ ...s, error: 'This browser has no MIDI support.' }));
      return;
    }
    try {
      const unsub = await source.subscribe('', (data) => {
        const ev = parseMidiMessage(data);
        // parseMidiMessage already remaps velocity-0 note-ons to 'noteoff',
        // so every 'noteon' here has velocity > 0 — no manual check needed.
        if (ev.type === 'noteon') handlerRef.current(ev.pitch, ev.velocity);
      });
      unsubRef.current = unsub;
      // Re-fetch the input list whenever a device plugs in / unplugs so
      // the status pill stays accurate without a page reload.
      offStateRef.current = source.onStateChange(refreshInputs);
      setState((s) => ({ ...s, connected: true, error: null }));
      refreshInputs();
    } catch (e) {
      setState((s) => ({ ...s, connected: false, error: e instanceof Error ? e.message : 'MIDI access denied' }));
    }
  };

  const disable = () => {
    unsubRef.current?.();
    unsubRef.current = null;
    offStateRef.current?.();
    offStateRef.current = null;
    setState({ supported: source.supported, connected: false, inputNames: [], error: null });
  };

  // Detach on unmount so a nav-away doesn't leave dangling listeners on
  // the shared MIDI source (permission stays granted; only listeners go).
  useEffect(() => () => disable(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return { state, enable, disable };
}

/** MIDI number → Pitch, defaulting black keys to sharp spelling. Callers
 *  that want flat spelling can post-process with the enharmonic-respell
 *  command; smart key-signature-aware spelling is a future upgrade. */
export function midiToPitch(midi: number, prefer: 'sharp' | 'flat' = 'sharp'): { step: 'A'|'B'|'C'|'D'|'E'|'F'|'G'; octave: number; alter: number } {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const sharpMap: Array<['A'|'B'|'C'|'D'|'E'|'F'|'G', number]> = [
    ['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0],
    ['F', 1], ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0],
  ];
  const flatMap: Array<['A'|'B'|'C'|'D'|'E'|'F'|'G', number]> = [
    ['C', 0], ['D', -1], ['D', 0], ['E', -1], ['E', 0], ['F', 0],
    ['G', -1], ['G', 0], ['A', -1], ['A', 0], ['B', -1], ['B', 0],
  ];
  const [step, alter] = (prefer === 'flat' ? flatMap : sharpMap)[pc];
  return { step, octave, alter };
}
