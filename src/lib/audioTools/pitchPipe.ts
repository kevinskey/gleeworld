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
}

let voice: Voice | null = null;
let sounding = false;

function getVoice(): Voice {
  if (voice) return voice;
  const env = new Tone.AmplitudeEnvelope({
    attack: 0.12,      // soft breath
    decay: 0.18,
    sustain: 0.85,
    release: 0.35,    // tail off cleanly so swaps feel responsive
  }).toDestination();
  const vibrato = new Tone.Vibrato({ frequency: 4.8, depth: 0.022 }).connect(env);
  const filter = new Tone.Filter({ frequency: 2400, type: 'lowpass', Q: 0.7 }).connect(vibrato);
  // Single sine oscillator — no octave doubling. The pitch the user
  // taps is the only frequency they hear, so a C4 is exactly C4.
  // 0 dB — pure sine through the env (sustain 0.85) won't clip, and the
  // earlier -6 dB was too quiet to use as a reference pitch over voices.
  const fundamental = new Tone.Oscillator({ frequency: 440, type: 'sine', volume: 0 }).connect(filter);
  fundamental.start();
  voice = { fundamental, filter, env, vibrato };
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
