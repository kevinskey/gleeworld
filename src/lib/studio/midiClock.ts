// MIDI Clock output for the Studio transport. Sends the realtime
// 24-PPQ clock plus Start/Continue/Stop and Song Position Pointer to a
// Web MIDI output, so external hardware / DAWs can chase our timeline.
//
// Browser reality check: MIDI Clock over Web MIDI is the only external
// sync a web app can offer — Ableton Link needs UDP multicast and SMPTE
// / MTC chase needs an audio input pipeline, neither reachable from a
// browser sandbox. Sending clock is feature-detected on
// navigator.requestMIDIAccess and stays completely out of the audio path.

export const MIDI_CLOCK = 0xf8;
export const MIDI_START = 0xfa;
export const MIDI_CONTINUE = 0xfb;
export const MIDI_STOP = 0xfc;
export const MIDI_SPP = 0xf2;

/** Minimal shape of a Web MIDI output — lets tests pass a plain stub. */
export interface MidiOutputLike {
  send(data: number[] | Uint8Array): void;
}

/** Song Position Pointer: position in MIDI beats (16th notes) as a
 * 14-bit value split into 7-bit LSB/MSB. */
export function songPositionBytes(seconds: number, bpm: number): [number, number, number] {
  const sixteenths = Math.floor(Math.max(0, seconds) * (bpm / 60) * 4);
  const clamped = Math.min(sixteenths, 0x3fff);
  return [MIDI_SPP, clamped & 0x7f, (clamped >> 7) & 0x7f];
}

export class MidiClockSender {
  private output: MidiOutputLike;
  private bpm: number;
  // Drift-corrected setTimeout chain, NOT setInterval: browsers truncate
  // fractional timer delays (20.83ms → 20ms), which would run the clock
  // ~4% fast at 120 BPM. Each tick is scheduled against an absolute
  // baseline so truncation error never accumulates.
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private baseMs = 0;
  private tickN = 0;

  constructor(output: MidiOutputLike, bpm = 120) {
    this.output = output;
    this.bpm = bpm;
  }

  get running(): boolean {
    return this.timeoutId !== null;
  }

  /** Change tempo; if the clock is running the tick stream is retimed
   * in place (no Start/Stop is sent — receivers just follow the rate). */
  setBpm(bpm: number): void {
    if (bpm <= 0 || bpm === this.bpm) return;
    this.bpm = bpm;
    if (this.timeoutId !== null) {
      this.stopTicks();
      this.startTicks();
    }
  }

  /** Begin sending clock from `atSeconds` on the Studio timeline.
   * Sends SPP so receivers land on the right bar, then Start (from
   * zero) or Continue (mid-song), then the steady 24-PPQ stream. */
  start(atSeconds: number): void {
    if (this.timeoutId !== null) return;
    this.output.send(songPositionBytes(atSeconds, this.bpm));
    this.output.send([atSeconds > 0 ? MIDI_CONTINUE : MIDI_START]);
    this.startTicks();
  }

  stop(): void {
    if (this.timeoutId === null) return;
    this.stopTicks();
    this.output.send([MIDI_STOP]);
  }

  dispose(): void {
    this.stopTicks();
  }

  private startTicks(): void {
    this.baseMs = Date.now();
    this.tickN = 0;
    this.scheduleNextTick();
  }

  private scheduleNextTick(): void {
    this.tickN += 1;
    const due = this.baseMs + (this.tickN * 60_000) / (this.bpm * 24);
    const delay = Math.max(0, due - Date.now());
    this.timeoutId = setTimeout(() => {
      this.output.send([MIDI_CLOCK]);
      this.scheduleNextTick();
    }, delay);
  }

  private stopTicks(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
