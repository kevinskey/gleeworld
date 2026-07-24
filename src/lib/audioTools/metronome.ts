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

/** Click voice.
 *  - beep      → the historical square-wave pitch (1000/1500 Hz)
 *  - click     → mechanical-metronome high-pass noise burst, non-pitched
 *  - woodblock → bandpass-filtered noise ~800 Hz, wooden knock feel
 *  - cowbell   → two-oscillator ratio (dampened cowbell) */
export type ClickSound = 'beep' | 'click' | 'woodblock' | 'cowbell';

export interface MetronomeOptions {
  bpm: number;
  beatsPerBar: number;
  accentFirstBeat: boolean;
  /** Pulses per beat. 1 = just the beat, 2 = eighths, 3 = triplets,
   *  4 = sixteenths, 6 = compound 6/8 feel. Subdivisions sound at a
   *  quieter, higher pitch so they sit underneath the downbeat. */
  subdivision?: Subdivision;
  /** Which voice to synthesize. Defaults to 'beep' for backward compat. */
  sound?: ClickSound;
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

// Short one-channel noise buffer, ~200ms of white noise. Reused across
// clicks (BufferSource can only start once, but the AudioBuffer itself is
// cheap and safe to share between BufferSourceNodes).
let sharedNoiseBuffer: AudioBuffer | null = null;
function getNoiseBuffer(c: AudioContext): AudioBuffer {
  if (sharedNoiseBuffer && sharedNoiseBuffer.sampleRate === c.sampleRate) return sharedNoiseBuffer;
  const len = Math.floor(c.sampleRate * 0.2);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  sharedNoiseBuffer = buf;
  return buf;
}

function connectClick(node: AudioNode, c: AudioContext) {
  // Speakers go through a shared adjustable gain so the recorder can duck
  // the audible click to almost zero (eliminating mic bleed) while the tap
  // branch keeps the precise click in the recording.
  node.connect(ensureSpeakerGain(c));
  if (tapNode) {
    const tg = ensureTapGain(c);
    node.connect(tg);
    try { tg.connect(tapNode); } catch { /* already connected */ }
  }
}

function scheduleClick(
  when: number, kind: ClickKind, fireTick: boolean,
  sound: ClickSound = 'beep',
  onTick?: (b: number) => void, beat = 0,
) {
  const c = getCtx();
  const isAccent = kind === 'accent';
  const peak = isAccent ? 0.5 : 0.35;
  const decay = 0.06;
  const stopAt = when + decay + 0.05;

  if (sound === 'beep') {
    // Square wave at 1000/1500 Hz — the historical default.
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(isAccent ? 1500 : 1000, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(peak, when + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + decay);
    osc.connect(gain);
    connectClick(gain, c);
    osc.start(when); osc.stop(stopAt);
  } else if (sound === 'click' || sound === 'woodblock') {
    // Non-pitched percussive click: short noise burst, bandpass-filtered
    // to a sweet spot (click = high crack, woodblock = mid knock). Accent
    // moves the center up so the downbeat still lifts out.
    const src = c.createBufferSource();
    src.buffer = getNoiseBuffer(c);
    const filter = c.createBiquadFilter();
    filter.type = sound === 'click' ? 'highpass' : 'bandpass';
    filter.frequency.value = sound === 'click'
      ? (isAccent ? 4000 : 3200)
      : (isAccent ? 1100 : 800);
    filter.Q.value = sound === 'woodblock' ? 8 : 0.7;
    const gain = c.createGain();
    const shortDecay = sound === 'click' ? 0.02 : 0.05;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(peak * (sound === 'click' ? 0.9 : 1), when + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + shortDecay);
    src.connect(filter).connect(gain);
    connectClick(gain, c);
    src.start(when); src.stop(stopAt);
  } else if (sound === 'cowbell') {
    // Two square oscillators at cowbell frequency ratio (~800 Hz + 540 Hz)
    // with a sharp exponential decay — the classic 808 cowbell voice.
    const gain = c.createGain();
    const highOsc = c.createOscillator();
    const lowOsc = c.createOscillator();
    highOsc.type = 'square';
    lowOsc.type = 'square';
    highOsc.frequency.setValueAtTime(isAccent ? 960 : 800, when);
    lowOsc.frequency.setValueAtTime(isAccent ? 645 : 540, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(peak * 0.6, when + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.08);
    highOsc.connect(gain);
    lowOsc.connect(gain);
    connectClick(gain, c);
    highOsc.start(when); lowOsc.start(when);
    highOsc.stop(stopAt); lowOsc.stop(stopAt);
  }

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
    scheduleClick(nextBeatTime, isDownbeat ? 'accent' : 'beat', true, opts.sound, opts.onTick, beatInBar);
    // Subdivision pulses use the SAME beat tone (no accent, no
    // pitch/gain difference), so the user just hears a steady stream of
    // identical clicks with beat 1 lifted out.
    for (let p = 1; p < subdivision; p++) {
      scheduleClick(nextBeatTime + p * secondsPerPulse, 'beat', false, opts.sound);
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

/** AudioContext time of the next scheduled click. Used by the recorder
 *  to align the offline click-mixdown to the live click the performer
 *  actually heard during the take. Returns null when the scheduler is
 *  idle (no clicks queued). */
export function getMetronomeNextClickTime(): number | null {
  if (!running) return null;
  return nextBeatTime;
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
