// Pitch pipe — sustained flute-like tone for the 12 chromatic pitches.
//
// Previously this reused the Salamander Grand piano sampler, which had
// the wrong attack (piano = sharp percussive strike) for a reference
// pitch the singer wants to lock to. A flute tone — soft attack, steady
// sustain, light vibrato — is what an actual chromatic pitch pipe
// (Master-Key, Kratt) sounds like, and it's far easier to match by ear.
//
// Built from raw Tone.js so we don't depend on any external samples and
// the voice is identical on every device. Two oscillators (sine + a
// quiet square octave below for body) routed through a low-pass filter,
// a slow Vibrato LFO, and a soft AmplitudeEnvelope.

import * as Tone from 'tone';

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export type PitchClass = typeof CHROMATIC[number];

export const PITCH_PIPE_NOTES: PitchClass[] = [...CHROMATIC];

interface Voice {
  fundamental: Tone.Oscillator;
  filter: Tone.Filter;
  env: Tone.AmplitudeEnvelope;
  vibrato: Tone.Vibrato;
  master: Tone.Gain;
}

let voice: Voice | null = null;
let sounding = false;

// ── Level ────────────────────────────────────────────────────────────────
// The oscillator sits at 0 dB and used to run straight to the destination,
// so the pipe played at full scale with nothing to turn it down (Kevin,
// 2026-08-19: "pitch pipe plays too loud"). Lowering the constant alone
// would just re-litigate the earlier swing — it was raised FROM -6 dB
// because that was too quiet to hear over a room of voices. So the level is
// a user setting instead: quieter by default, and turn it back up for
// rehearsal. Stored 0..100 (linear gain ×100) to match every other volume
// control in the app.

const VOLUME_KEY = 'gw:pitchpipe:volume';

/** Comfortable at a desk; raise it for a live room. */
export const DEFAULT_PITCH_PIPE_VOLUME = 55;

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PITCH_PIPE_VOLUME;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function readVolume(): number {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    return raw === null ? DEFAULT_PITCH_PIPE_VOLUME : clampVolume(Number(raw));
  } catch {
    return DEFAULT_PITCH_PIPE_VOLUME;
  }
}

let volume = readVolume();
const volumeListeners = new Set<() => void>();

export function getPitchPipeVolume(): number {
  return volume;
}

export function setPitchPipeVolume(next: number): void {
  const v = clampVolume(next);
  if (v === volume) return;
  volume = v;
  try { localStorage.setItem(VOLUME_KEY, String(v)); } catch { /* not persisted */ }
  // Ramp rather than jump: a step change on a sounding tone clicks.
  if (voice) voice.master.gain.rampTo(v / 100, 0.05);
  volumeListeners.forEach((l) => l());
}

export function subscribePitchPipeVolume(listener: () => void): () => void {
  volumeListeners.add(listener);
  return () => { volumeListeners.delete(listener); };
}

function getVoice(): Voice {
  if (voice) return voice;
  // Master gain between the envelope and the speakers — the one place the
  // user's level applies, so it scales the whole voice rather than fighting
  // the envelope.
  const master = new Tone.Gain(volume / 100).toDestination();
  const env = new Tone.AmplitudeEnvelope({
    attack: 0.12,      // soft breath
    decay: 0.18,
    sustain: 0.85,
    release: 0.35,    // tail off cleanly so swaps feel responsive
  }).connect(master);
  const vibrato = new Tone.Vibrato({ frequency: 4.8, depth: 0.022 }).connect(env);
  const filter = new Tone.Filter({ frequency: 2400, type: 'lowpass', Q: 0.7 }).connect(vibrato);
  // Single sine oscillator — no octave doubling. The pitch the user
  // taps is the only frequency they hear, so a C4 is exactly C4.
  // 0 dB — pure sine through the env (sustain 0.85) won't clip, and the
  // earlier -6 dB was too quiet to use as a reference pitch over voices.
  const fundamental = new Tone.Oscillator({ frequency: 440, type: 'sine', volume: 0 }).connect(filter);
  fundamental.start();
  voice = { fundamental, filter, env, vibrato, master };
  return voice;
}

export async function playPitchPipe(pitch: PitchClass, octave = 4): Promise<void> {
  if (Tone.getContext().state !== 'running') {
    try { await Tone.start(); } catch { /* gesture-bound — caller already unlocked */ }
  }
  const v = getVoice();
  const hz = Tone.Frequency(`${pitch}${octave}`).toFrequency();
  v.fundamental.frequency.value = hz;
  if (sounding) {
    // Mid-flight pitch change — release/re-attack so the envelope retriggers
    // and the singer hears a clean swap rather than a glide.
    v.env.triggerRelease();
    // Small offset so the release tail doesn't fight the new attack.
    Tone.getContext().setTimeout(() => v.env.triggerAttack(), 0.04);
  } else {
    v.env.triggerAttack();
  }
  sounding = true;
}

export function stopPitchPipe(): void {
  if (!voice || !sounding) return;
  voice.env.triggerRelease();
  sounding = false;
}
