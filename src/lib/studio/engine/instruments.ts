// MIDI track instruments. Two built-ins for Phase 2:
//
//   • synth_basic  — Tone.PolySynth with simple oscillator presets.
//   • sampler      — Tone.Sampler. Built-in 'kit_basic' maps GM drum
//     notes (36 kick, 38 snare, 42 hat) to short synthesized hits;
//     custom presets can pull AudioAsset URLs uploaded by the user.
//
// Returns an EngineInstrument exposing `triggerAttackRelease(midiPitch,
// duration, time, velocity)` matching the schema units (seconds + 0..127
// velocity normalized to 0..1).

import * as Tone from 'tone';
import type { Instrument } from '../session';

export interface EngineInstrument {
  output: Tone.ToneAudioNode;
  triggerAttackRelease: (pitch: number, durationSeconds: number, time: number, velocity01: number) => void;
  dispose: () => void;
}

// Tone wants note names; we get MIDI pitches (0..127).
const NOTE = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function midiToNote(p: number): string {
  const octave = Math.floor(p / 12) - 1;
  return `${NOTE[p % 12]}${octave}`;
}

export function buildInstrument(spec: Instrument): EngineInstrument {
  if (spec.type === 'sampler') {
    return buildSampler(spec);
  }
  return buildSynth(spec);
}

function buildSynth(spec: Instrument): EngineInstrument {
  // preset_id → oscillator type. Cheap, expressive enough for sketching.
  const preset = (spec.preset_id ?? 'sine') as 'sine' | 'triangle' | 'square' | 'sawtooth';
  const attack = ((spec.params.attack_ms as number) ?? 5) / 1000;
  const release = ((spec.params.release_ms as number) ?? 200) / 1000;
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: preset },
    envelope: { attack, decay: 0.1, sustain: 0.6, release },
  });
  return {
    output: synth,
    triggerAttackRelease: (pitch, dur, time, vel) => {
      synth.triggerAttackRelease(midiToNote(pitch), dur, time, vel);
    },
    dispose: () => synth.dispose(),
  };
}

function buildSampler(spec: Instrument): EngineInstrument {
  // Built-in basic kit — synthesize short percussive hits and feed them
  // to a Sampler. Avoids shipping audio files in the bundle. Replace
  // with real samples in a future polish pass.
  if (spec.preset_id === 'kit_basic' || !spec.preset_id) {
    return buildBasicKit();
  }
  // Future: 'piano_basic', 'guitar_basic' loaded from /public/samples/...
  return buildBasicKit();
}

function buildBasicKit(): EngineInstrument {
  // We map pitches by short members synth hits. PolySynth handles
  // overlapping triggers. Drums respond on any pitch within their range.
  const out = new Tone.Gain(1);
  const kick = new Tone.MembraneSynth({
    pitchDecay: 0.04, octaves: 6, envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.2 },
  }).connect(out);
  const snare = new Tone.NoiseSynth({
    noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.15, sustain: 0 },
  }).connect(out);
  const hat = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.05, release: 0.01 },
    harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
  }).connect(out);

  return {
    output: out,
    triggerAttackRelease: (pitch, dur, time, vel) => {
      // GM drum mapping (close enough): 35-36 kick, 38/40 snare, 42/44/46 hat
      const v = Math.max(0.05, Math.min(1, vel));
      if (pitch <= 37) {
        kick.triggerAttackRelease('C2', dur, time, v);
      } else if (pitch <= 41) {
        snare.triggerAttackRelease(dur, time, v);
      } else {
        hat.triggerAttackRelease('C5', dur, time, v);
      }
    },
    dispose: () => {
      kick.dispose(); snare.dispose(); hat.dispose(); out.dispose();
    },
  };
}
