// Sampled piano backed by Salamander Grand Piano via Tone.js Sampler.
//
// The samples live on Tone.js's CDN (tonejs.github.io/audio/salamander).
// We lazy-load on first request, share one Sampler across the whole app
// (Piano, Pitch Pipe, anywhere else that wants a real piano voice), and
// fall back to a polysynth while samples are still streaming so the first
// key press feels instant instead of silent.
//
// Samples are big (~70MB across the 24 anchor notes), but the browser HTTP
// cache makes the second load instant; on iOS Capacitor it caches via the
// WKWebView NSURLCache. No IndexedDB bookkeeping needed.

import * as Tone from 'tone';

const SAMPLER_BASE = 'https://tonejs.github.io/audio/salamander/';

// Anchor pitches sampled in Salamander. Tone.js interpolates the rest.
const SAMPLE_MAP: Record<string, string> = {
  A0: 'A0.mp3', C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3', A1: 'A1.mp3',
  C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3', A2: 'A2.mp3',
  C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3', A3: 'A3.mp3',
  C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3', A4: 'A4.mp3',
  C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3', A5: 'A5.mp3',
  C6: 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3', A6: 'A6.mp3',
  C7: 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3', A7: 'A7.mp3',
  C8: 'C8.mp3',
};

let samplerPromise: Promise<Tone.Sampler> | null = null;
let fallback: Tone.PolySynth | null = null;
let samplerInstance: Tone.Sampler | null = null;
let samplerLoaded = false;

/** Lazily start the audio context (browsers require a user gesture). */
async function ensureContextStarted() {
  if (Tone.getContext().state !== 'running') {
    try { await Tone.start(); } catch { /* will retry on next user gesture */ }
  }
}

/** Synthesizer fallback used until samples finish loading. */
function getFallback(): Tone.PolySynth {
  if (!fallback) {
    fallback = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.6, release: 1 },
    }).toDestination();
    fallback.volume.value = -8;
  }
  return fallback;
}

/** Lazy-load the Salamander Grand Piano sampler. Idempotent. */
export function preloadPianoSampler(): Promise<Tone.Sampler> {
  if (samplerPromise) return samplerPromise;
  samplerPromise = new Promise<Tone.Sampler>((resolve, reject) => {
    const s = new Tone.Sampler({
      urls: SAMPLE_MAP,
      baseUrl: SAMPLER_BASE,
      release: 1,
      onload: () => { samplerLoaded = true; resolve(s); },
      onerror: (err) => reject(err),
    }).toDestination();
    samplerInstance = s;
  }).catch((err) => {
    samplerPromise = null;
    throw err;
  });
  return samplerPromise;
}

export function isPianoSamplerLoaded(): boolean {
  return samplerLoaded;
}

/** Trigger a piano note with the sampler if loaded, polysynth otherwise. */
export async function playPianoNote(note: string, durationSec = 1, velocity = 0.85): Promise<void> {
  await ensureContextStarted();
  if (samplerLoaded && samplerInstance) {
    samplerInstance.triggerAttackRelease(note, durationSec, undefined, velocity);
  } else {
    // Kick off the lazy load so subsequent presses get samples.
    preloadPianoSampler().catch(() => { /* stay on fallback */ });
    getFallback().triggerAttackRelease(note, durationSec, undefined, velocity);
  }
}

/** Hold a piano note until release. Returns a release function. */
export async function holdPianoNote(note: string, velocity = 0.85): Promise<() => void> {
  await ensureContextStarted();
  const target: any = samplerLoaded && samplerInstance ? samplerInstance : (preloadPianoSampler().catch(() => {}), getFallback());
  target.triggerAttack(note, undefined, velocity);
  return () => {
    try { target.triggerRelease(note); } catch { /* poly fallback ignores unknown */ }
  };
}
