// TypeScript bridge for the iOS GWMidiPlugin (CoreMIDI input).
//
// iOS WebKit has no Web MIDI API, so the native plugin forwards raw
// MIDI bytes from USB / Bluetooth keyboards over the Capacitor bridge.
// Input only — no output ports (MIDI Clock out stays web-only).
// Outside Capacitor iOS the wrapper is never selected (see
// getMidiInputSource), so no web no-op shims are needed here.

import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface GWMidiInput { id: string; name: string }
export interface GWMidiMessageEvent {
  portId: string;
  /** Raw MIDI 1.0 channel-voice bytes: [status, data1, data2]. */
  data: number[];
  /** Native CoreMIDI timestamp in ms (monotonic). Unused for now; kept
   *  for future record-alignment work. */
  tsMs: number;
}
export interface GWMidiStateChangeEvent { inputs: GWMidiInput[] }

export interface GWMidiPluginShape {
  start(): Promise<void>;
  stop(): Promise<void>;
  listInputs(): Promise<{ inputs: GWMidiInput[] }>;
  showBluetoothPairing(): Promise<void>;
  addListener(event: 'midiMessage', cb: (e: GWMidiMessageEvent) => void): Promise<PluginListenerHandle>;
  addListener(event: 'stateChange', cb: (e: GWMidiStateChangeEvent) => void): Promise<PluginListenerHandle>;
}

export const GWMidi = registerPlugin<GWMidiPluginShape>('GWMidi');

export function isNativeMidiAvailable(): boolean {
  return Capacitor.getPlatform() === 'ios';
}
