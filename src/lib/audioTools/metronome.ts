// Drift-free metronome using the raw Web Audio API.
//
// Previously this used Tone.Transport + MembraneSynth, but Tone's
// scheduler quietly stalls on iOS WKWebView in some build configurations
// (the AudioWorklet that drives Transport doesn't always start). Raw
// Web Audio with a look-ahead scheduler is far more reliable: we look
// ~150ms into the future every 25ms via setInterval, queue any clicks
// that fall in that window with `osc.start(when)`, and let the audio
// hardware fire them on time. No worker required.

import * as Tone from 'tone';

export type Subdivision = 1 | 2 | 3 | 4 | 8;

export interface MetronomeOptions {
  bpm: number;
  beatsPerBar: number;
  accentFirstBeat: boolean;
  /** Pulses per beat. 1 = just the beat, 2 = eighths, 3 = triplets,
   *  4 = sixteenths, 6 = compound 6/8 feel. Subdivisions sound at a
   *  quieter, higher pitch so they sit underneath the downbeat. */
  subdivision?: Subdivision;
  onTick?: (beat: number) => void;
}

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SEC = 0.15;

let ctx: AudioContext | null = null;
let opts: MetronomeOptions | null = null;
let nextBeatTime = 0;
let beatIndex = 0;
let intervalHandle: number | null = null;
let running = false;
// Optional secondary destination — set by the practice recorder so each
// click is mixed into a MediaStreamDestination alongside the speakers.
// `null` means clicks only go to the audible AudioContext destination.
let tapNode: AudioNode | null = null;
// Shared gain node sitting between every click and the speakers. Lets the
// recorder ride the speaker volume DOWN while recording so the mic
// doesn't pick up two clicks per beat (tap + speaker bleed).
let speakerGain: GainNode | null = null;
let speakerGainValue = 1;
// Shared gain node for the tap branch (recording). The tap'd click is
// the clean, frame-aligned reference — boost it relative to the speaker
// path so it stays audible after the mic is gained up.
let tapGain: GainNode | null = null;
let tapGainValue = 1;

function ensureSpeakerGain(c: AudioContext): GainNode {
  if (!speakerGain) {
    speakerGain = c.createGain();
    speakerGain.gain.value = speakerGainValue;
    speakerGain.connect(c.destination);
  }
  return speakerGain;
}

function ensureTapGain(c: AudioContext): GainNode {
  if (!tapGain) {
    tapGain = c.createGain();
    tapGain.gain.value = tapGainValue;
  }
  return tapGain;
}

function getCtx(): AudioContext {
  if (ctx) return ctx;
  // Reuse Tone's context if Tone has been initialized so other audio
  // (piano, pitch pipe) shares the same destination + gain graph.
  try {
    const toneCtx = Tone.getContext().rawContext as AudioContext;
    if (toneCtx) { ctx = toneCtx; return ctx; }
  } catch { /* fall through */ }
  ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

type ClickKind = 'accent' | 'beat';

function scheduleClick(when: number, kind: ClickKind, fireTick: boolean, onTick?: (b: number) => void, beat = 0) {
  const c = getCtx();
  // Only two sound profiles now — the accent (downbeat) and the beat.
  // Subdivisions reuse the beat profile so every pulse in a bar sounds
  // the same except beat 1, which the conductor wants to hear lift out.
  const profile = kind === 'accent'
    ? { freq: 1500, peak: 0.5,  decay: 0.06 }
    : { freq: 1000, peak: 0.35, decay: 0.06 };
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(profile.freq, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(profile.peak, when + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + profile.decay);
  osc.connect(gain);
  // Speakers go through a shared adjustable gain so the recorder can
  // duck the audible click to almost zero (eliminating mic bleed) while
  // the tap branch keeps the precise click in the recording.
  gain.connect(ensureSpeakerGain(c));
  // Mirror into the tap (recording) through its own gain knob.
  if (tapNode) {
    const tg = ensureTapGain(c);
    gain.connect(tg);
    // Re-wire the tap gain → tapNode each click in case the recorder
    // swapped destinations (gain.connect is idempotent for the same target).
    try { tg.connect(tapNode); } catch { /* already connected */ }
  }
  osc.start(when);
  osc.stop(when + profile.decay + 0.02);
  // UI tick lamps only flash on real downbeats — subdivisions share the
  // sound but not the lamp, so the visual count stays clear.
  if (onTick && fireTick) {
    const delayMs = Math.max(0, (when - c.currentTime) * 1000);
    window.setTimeout(() => onTick(beat), delayMs);
  }
}

function scheduler() {
  if (!opts || !running) return;
  const c = getCtx();
  const secondsPerBeat = 60 / opts.bpm;
  const subdivision = Math.max(1, opts.subdivision ?? 1) as Subdivision;
  const secondsPerPulse = secondsPerBeat / subdivision;
  while (nextBeatTime < c.currentTime + SCHEDULE_AHEAD_SEC) {
    const beatInBar = beatIndex % opts.beatsPerBar;
    const isDownbeat = opts.accentFirstBeat && beatInBar === 0;
    // Fire the main beat — accent only on bar 1, regular beat tone otherwise.
    scheduleClick(nextBeatTime, isDownbeat ? 'accent' : 'beat', true, opts.onTick, beatInBar);
    // Subdivision pulses use the SAME beat tone (no accent, no
    // pitch/gain difference), so the user just hears a steady stream of
    // identical clicks with beat 1 lifted out.
    for (let p = 1; p < subdivision; p++) {
      scheduleClick(nextBeatTime + p * secondsPerPulse, 'beat', false);
    }
    nextBeatTime += secondsPerBeat;
    beatIndex += 1;
  }
}

export async function startMetronome(input: MetronomeOptions): Promise<void> {
  stopMetronome();
  opts = input;
  const c = getCtx();
  if (c.state === 'suspended') {
    try { await c.resume(); } catch { /* user gesture required — bail */ }
  }
  beatIndex = 0;
  // Tiny lookahead so the first click doesn't fight with the gesture frame.
  nextBeatTime = c.currentTime + 0.05;
  running = true;
  intervalHandle = window.setInterval(scheduler, LOOKAHEAD_MS);
  scheduler();
}

export function stopMetronome(): void {
  running = false;
  if (intervalHandle !== null) {
    window.clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

export function isMetronomeRunning(): boolean {
  return running;
}

export function setMetronomeBpm(bpm: number): void {
  if (opts) opts.bpm = bpm;
}

/** Returns the shared AudioContext so other features (e.g. the practice
 *  recorder) can wire MediaStreamDestination nodes into the same graph. */
export function getMetronomeContext(): AudioContext {
  return getCtx();
}

/** Register a secondary output for every click. Pass `null` to unregister.
 *  Used by PracticeRecorder to mix clicks into a recorded MediaStream. */
export function setMetronomeTap(node: AudioNode | null): void {
  // Disconnect previous tap so the gain node doesn't keep accumulating
  // destinations across recordings.
  if (tapGain && tapNode) { try { tapGain.disconnect(tapNode); } catch { /* ignore */ } }
  tapNode = node;
}

/** Set the audible speaker volume (0–1). The recorder drops this near
 *  zero while recording so the mic doesn't pick up the click. */
export function setMetronomeSpeakerVolume(v: number): void {
  speakerGainValue = Math.max(0, Math.min(1, v));
  if (speakerGain) speakerGain.gain.value = speakerGainValue;
}

/** Set the metronome's level in the recording tap (0–4). Default 1. */
export function setMetronomeTapVolume(v: number): void {
  tapGainValue = Math.max(0, Math.min(4, v));
  if (tapGain) tapGain.gain.value = tapGainValue;
}
