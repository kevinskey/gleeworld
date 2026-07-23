// Web MIDI subscription for the NotationEditor. Requests access lazily
// (users pay the permission-prompt cost only when they enable MIDI), then
// fans out `noteon` messages from every connected input to the caller.
//
// MIDI parsing crib sheet:
//   status = data[0]
//     0x90-0x9F → note-on channel c (c = status & 0x0F)
//     0x80-0x8F → note-off channel c
//   data[1] = note number 0..127 (60 = middle C)
//   data[2] = velocity 0..127 (a "note-on" with velocity 0 is really a note-off,
//             which many older devices send — treat it as one)
//
// The hook is idempotent: enable→disable→enable cleanly detaches and
// re-attaches listeners without leaking handlers, and re-runs when a new
// device is plugged in mid-session (via the `statechange` event).

import { useEffect, useRef, useState } from 'react';

type MIDIAccess = any; // Web MIDI types aren't in default lib.dom
type MIDIInput = any;
type MIDIMessageEvent = any;

export interface MidiInputState {
  /** True when the browser reports a Web MIDI implementation. Safari on iOS
   *  and old Firefox versions return false. */
  supported: boolean;
  /** True after the user granted permission and we have an active MIDIAccess. */
  connected: boolean;
  /** Human names of the inputs we're listening to (for a status pill). */
  inputNames: string[];
  /** Populated when the last enable() attempt failed (permission denied,
   *  no devices, etc.) so the UI can surface a real reason. */
  error: string | null;
}

/** Subscribe to Web MIDI note-on events. `onNoteOn(midi, velocity)` fires
 *  for every note-on (velocity > 0) from any connected input. Enable/disable
 *  via the returned `enable`/`disable` functions so the permission prompt
 *  only happens when the user opts in. */
export function useMidiInput(onNoteOn: (midi: number, velocity: number) => void): {
  state: MidiInputState;
  enable: () => Promise<void>;
  disable: () => void;
} {
  const supported = typeof navigator !== 'undefined' && typeof (navigator as any).requestMIDIAccess === 'function';
  const [state, setState] = useState<MidiInputState>({
    supported, connected: false, inputNames: [], error: null,
  });
  // Latest handler in a ref so subscribers don't need to re-bind every render.
  const handlerRef = useRef(onNoteOn);
  useEffect(() => { handlerRef.current = onNoteOn; }, [onNoteOn]);
  const accessRef = useRef<MIDIAccess | null>(null);

  const bindInputs = (access: MIDIAccess) => {
    const inputs: MIDIInput[] = Array.from(access.inputs.values());
    const names: string[] = [];
    inputs.forEach((input) => {
      names.push(input.name ?? 'MIDI input');
      // Overwrite rather than addEventListener so re-binding on device
      // hotplug replaces stale references without leaks.
      input.onmidimessage = (e: MIDIMessageEvent) => {
        const data = e.data;
        if (!data || data.length < 3) return;
        const status = data[0] & 0xf0;
        const note = data[1];
        const velocity = data[2];
        // Note-on with velocity 0 is a legitimate note-off spelling.
        if (status === 0x90 && velocity > 0) {
          handlerRef.current(note, velocity);
        }
      };
    });
    setState((s) => ({ ...s, connected: true, inputNames: names, error: null }));
  };

  const enable = async () => {
    if (!supported) {
      setState((s) => ({ ...s, error: 'This browser has no MIDI support.' }));
      return;
    }
    try {
      const access = await (navigator as any).requestMIDIAccess({ sysex: false });
      accessRef.current = access;
      bindInputs(access);
      // Re-bind whenever the device list changes so plugging in a keyboard
      // after enabling still works without a page reload.
      access.onstatechange = () => bindInputs(access);
    } catch (e) {
      setState((s) => ({ ...s, connected: false, error: e instanceof Error ? e.message : 'MIDI access denied' }));
    }
  };

  const disable = () => {
    const access = accessRef.current;
    if (access) {
      Array.from(access.inputs.values() as Iterable<MIDIInput>).forEach((input) => {
        input.onmidimessage = null;
      });
      access.onstatechange = null;
    }
    accessRef.current = null;
    setState({ supported, connected: false, inputNames: [], error: null });
  };

  // Detach on unmount so a nav-away doesn't leave dangling listeners on
  // the shared MIDIAccess (permission stays granted; only listeners go).
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
