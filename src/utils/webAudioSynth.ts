// Web Audio API Synthesizer - Built-in instrument sounds using oscillator synthesis
// No external CDN required - works offline and has no CORS issues

export type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface InstrumentConfig {
  id: number;
  name: string;
  category: string;
  // Oscillator configuration
  oscillatorType: OscillatorType;
  // Optional second oscillator for richer sounds
  oscillator2Type?: OscillatorType;
  oscillator2Detune?: number; // cents
  oscillator2Volume?: number; // 0-1
  // Envelope (ADSR)
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  // Filter
  filterType?: BiquadFilterType;
  filterFrequency?: number;
  filterQ?: number;
  // Effects
  tremoloRate?: number;
  vibratoRate?: number;
  vibratoDepth?: number;
}

// Built-in synthesizer presets for different instrument categories
export const SYNTH_INSTRUMENTS: InstrumentConfig[] = [
  // Piano sounds
  {
    id: 0,
    name: 'Acoustic Piano',
    category: 'Piano',
    oscillatorType: 'triangle',
    oscillator2Type: 'sine',
    oscillator2Detune: 2,
    oscillator2Volume: 0.3,
    attack: 0.005,
    decay: 0.3,
    sustain: 0.4,
    release: 0.5,
    filterType: 'lowpass',
    filterFrequency: 4000,
    filterQ: 1,
  },
  {
    id: 1,
    name: 'Bright Piano',
    category: 'Piano',
    oscillatorType: 'triangle',
    oscillator2Type: 'sawtooth',
    oscillator2Detune: 1,
    oscillator2Volume: 0.15,
    attack: 0.002,
    decay: 0.2,
    sustain: 0.5,
    release: 0.4,
    filterType: 'highpass',
    filterFrequency: 200,
    filterQ: 0.5,
  },
  {
    id: 2,
    name: 'Electric Piano',
    category: 'Piano',
    oscillatorType: 'sine',
    oscillator2Type: 'triangle',
    oscillator2Detune: 5,
    oscillator2Volume: 0.4,
    attack: 0.01,
    decay: 0.5,
    sustain: 0.3,
    release: 0.8,
    tremoloRate: 5,
  },
  {
    id: 3,
    name: 'Honky-tonk',
    category: 'Piano',
    oscillatorType: 'triangle',
    oscillator2Type: 'triangle',
    oscillator2Detune: 15,
    oscillator2Volume: 0.5,
    attack: 0.005,
    decay: 0.25,
    sustain: 0.35,
    release: 0.4,
  },
  // Organ sounds
  {
    id: 4,
    name: 'Organ',
    category: 'Organ',
    oscillatorType: 'sine',
    oscillator2Type: 'sine',
    oscillator2Detune: 1200, // +1 octave
    oscillator2Volume: 0.5,
    attack: 0.05,
    decay: 0.1,
    sustain: 0.9,
    release: 0.1,
    tremoloRate: 6,
  },
  {
    id: 5,
    name: 'Church Organ',
    category: 'Organ',
    oscillatorType: 'sine',
    oscillator2Type: 'triangle',
    oscillator2Detune: 1200,
    oscillator2Volume: 0.6,
    attack: 0.1,
    decay: 0.2,
    sustain: 0.85,
    release: 0.3,
  },
  // Strings
  {
    id: 6,
    name: 'Strings',
    category: 'Strings',
    oscillatorType: 'sawtooth',
    oscillator2Type: 'sawtooth',
    oscillator2Detune: 7,
    oscillator2Volume: 0.5,
    attack: 0.2,
    decay: 0.3,
    sustain: 0.7,
    release: 0.5,
    filterType: 'lowpass',
    filterFrequency: 3000,
    filterQ: 1,
    vibratoRate: 5,
    vibratoDepth: 5,
  },
  {
    id: 7,
    name: 'Violin',
    category: 'Strings',
    oscillatorType: 'sawtooth',
    attack: 0.1,
    decay: 0.2,
    sustain: 0.8,
    release: 0.3,
    filterType: 'lowpass',
    filterFrequency: 4000,
    filterQ: 2,
    vibratoRate: 6,
    vibratoDepth: 8,
  },
  // Brass
  {
    id: 8,
    name: 'Brass',
    category: 'Brass',
    oscillatorType: 'sawtooth',
    oscillator2Type: 'square',
    oscillator2Detune: 3,
    oscillator2Volume: 0.3,
    attack: 0.05,
    decay: 0.2,
    sustain: 0.7,
    release: 0.2,
    filterType: 'lowpass',
    filterFrequency: 2500,
    filterQ: 2,
  },
  {
    id: 9,
    name: 'Trumpet',
    category: 'Brass',
    oscillatorType: 'sawtooth',
    attack: 0.02,
    decay: 0.1,
    sustain: 0.8,
    release: 0.15,
    filterType: 'lowpass',
    filterFrequency: 3500,
    filterQ: 3,
    vibratoRate: 5,
    vibratoDepth: 4,
  },
  // Woodwinds
  {
    id: 10,
    name: 'Flute',
    category: 'Woodwind',
    oscillatorType: 'sine',
    oscillator2Type: 'triangle',
    oscillator2Detune: 0,
    oscillator2Volume: 0.2,
    attack: 0.1,
    decay: 0.1,
    sustain: 0.8,
    release: 0.2,
    vibratoRate: 5,
    vibratoDepth: 6,
  },
  {
    id: 11,
    name: 'Clarinet',
    category: 'Woodwind',
    oscillatorType: 'square',
    attack: 0.05,
    decay: 0.15,
    sustain: 0.7,
    release: 0.2,
    filterType: 'lowpass',
    filterFrequency: 2000,
    filterQ: 1.5,
    vibratoRate: 4,
    vibratoDepth: 3,
  },
  // Synth leads
  {
    id: 12,
    name: 'Synth Lead',
    category: 'Synth',
    oscillatorType: 'sawtooth',
    oscillator2Type: 'square',
    oscillator2Detune: 5,
    oscillator2Volume: 0.5,
    attack: 0.01,
    decay: 0.3,
    sustain: 0.6,
    release: 0.4,
    filterType: 'lowpass',
    filterFrequency: 5000,
    filterQ: 3,
  },
  {
    id: 13,
    name: 'Square Lead',
    category: 'Synth',
    oscillatorType: 'square',
    attack: 0.01,
    decay: 0.1,
    sustain: 0.7,
    release: 0.2,
  },
  // Pads
  {
    id: 14,
    name: 'Synth Pad',
    category: 'Pad',
    oscillatorType: 'sine',
    oscillator2Type: 'triangle',
    oscillator2Detune: 10,
    oscillator2Volume: 0.6,
    attack: 0.5,
    decay: 0.3,
    sustain: 0.8,
    release: 1.0,
    filterType: 'lowpass',
    filterFrequency: 2000,
    filterQ: 0.5,
    tremoloRate: 3,
  },
  {
    id: 15,
    name: 'Warm Pad',
    category: 'Pad',
    oscillatorType: 'triangle',
    oscillator2Type: 'sine',
    oscillator2Detune: 7,
    oscillator2Volume: 0.5,
    attack: 0.8,
    decay: 0.4,
    sustain: 0.7,
    release: 1.2,
    filterType: 'lowpass',
    filterFrequency: 1500,
    filterQ: 1,
  },
  // Bells/Mallet
  {
    id: 16,
    name: 'Bells',
    category: 'Bells',
    oscillatorType: 'sine',
    oscillator2Type: 'sine',
    oscillator2Detune: 1900, // Minor 7th above
    oscillator2Volume: 0.3,
    attack: 0.001,
    decay: 0.8,
    sustain: 0.1,
    release: 1.5,
  },
  {
    id: 17,
    name: 'Vibraphone',
    category: 'Bells',
    oscillatorType: 'sine',
    attack: 0.005,
    decay: 0.6,
    sustain: 0.2,
    release: 1.0,
    tremoloRate: 6,
  },
  // Bass
  {
    id: 18,
    name: 'Synth Bass',
    category: 'Bass',
    oscillatorType: 'sawtooth',
    oscillator2Type: 'square',
    oscillator2Detune: -1200, // -1 octave
    oscillator2Volume: 0.4,
    attack: 0.01,
    decay: 0.2,
    sustain: 0.5,
    release: 0.2,
    filterType: 'lowpass',
    filterFrequency: 1500,
    filterQ: 4,
  },
  {
    id: 19,
    name: 'Electric Bass',
    category: 'Bass',
    oscillatorType: 'triangle',
    attack: 0.02,
    decay: 0.15,
    sustain: 0.6,
    release: 0.25,
    filterType: 'lowpass',
    filterFrequency: 1200,
    filterQ: 2,
  },
];

interface ActiveNote {
  oscillators: OscillatorNode[];
  gainNode: GainNode;
  filterNode?: BiquadFilterNode;
  lfo?: OscillatorNode;
}

export class WebAudioSynth {
  private audioContext: AudioContext;
  private currentInstrument: InstrumentConfig;
  private activeNotes: Map<string, ActiveNote> = new Map();
  private masterVolume: number = 0.5;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.currentInstrument = SYNTH_INSTRUMENTS[0]; // Default to acoustic piano
  }

  setInstrument(instrumentId: number): void {
    const instrument = SYNTH_INSTRUMENTS.find(i => i.id === instrumentId);
    if (instrument) {
      this.currentInstrument = instrument;
      console.log(`🎹 Switched to: ${instrument.name}`);
    } else {
      // If not found in our list, default to acoustic piano
      this.currentInstrument = SYNTH_INSTRUMENTS[0];
      console.log(`🎹 Instrument ${instrumentId} not found, using Acoustic Piano`);
    }
  }

  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  async playNote(noteName: string, frequency: number): Promise<void> {
    if (this.activeNotes.has(noteName)) return; // Already playing

    // Ensure audio context is running
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const instrument = this.currentInstrument;
    const now = this.audioContext.currentTime;
    const oscillators: OscillatorNode[] = [];

    // Create master gain for this note
    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);

    // Create filter if configured
    let filterNode: BiquadFilterNode | undefined;
    let lastNode: AudioNode = gainNode;

    if (instrument.filterType) {
      filterNode = this.audioContext.createBiquadFilter();
      filterNode.type = instrument.filterType;
      filterNode.frequency.value = instrument.filterFrequency || 2000;
      filterNode.Q.value = instrument.filterQ || 1;
      lastNode = filterNode;
      gainNode.connect(filterNode);
      filterNode.connect(this.audioContext.destination);
    } else {
      gainNode.connect(this.audioContext.destination);
    }

    // Create primary oscillator
    const osc1 = this.audioContext.createOscillator();
    osc1.type = instrument.oscillatorType;
    osc1.frequency.setValueAtTime(frequency, now);
    osc1.connect(gainNode);
    oscillators.push(osc1);

    // Create secondary oscillator if configured
    if (instrument.oscillator2Type) {
      const osc2 = this.audioContext.createOscillator();
      osc2.type = instrument.oscillator2Type;
      osc2.frequency.setValueAtTime(frequency, now);
      osc2.detune.setValueAtTime(instrument.oscillator2Detune || 0, now);
      
      const osc2Gain = this.audioContext.createGain();
      osc2Gain.gain.value = instrument.oscillator2Volume || 0.5;
      osc2.connect(osc2Gain);
      osc2Gain.connect(gainNode);
      oscillators.push(osc2);
    }

    // Add vibrato if configured
    let lfo: OscillatorNode | undefined;
    if (instrument.vibratoRate && instrument.vibratoDepth) {
      lfo = this.audioContext.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = instrument.vibratoRate;
      
      const lfoGain = this.audioContext.createGain();
      lfoGain.gain.value = instrument.vibratoDepth;
      
      lfo.connect(lfoGain);
      oscillators.forEach(osc => lfoGain.connect(osc.frequency));
      lfo.start(now);
    }

    // Add tremolo if configured
    if (instrument.tremoloRate) {
      const tremoloLfo = this.audioContext.createOscillator();
      tremoloLfo.type = 'sine';
      tremoloLfo.frequency.value = instrument.tremoloRate;
      
      const tremoloGain = this.audioContext.createGain();
      tremoloGain.gain.value = 0.1; // Subtle tremolo
      
      tremoloLfo.connect(tremoloGain);
      tremoloGain.connect(gainNode.gain);
      tremoloLfo.start(now);
    }

    // Apply ADSR envelope
    const attackTime = instrument.attack;
    const decayTime = instrument.decay;
    const sustainLevel = instrument.sustain * this.masterVolume;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.masterVolume, now + attackTime);
    gainNode.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);

    // Start oscillators
    oscillators.forEach(osc => osc.start(now));

    this.activeNotes.set(noteName, {
      oscillators,
      gainNode,
      filterNode,
      lfo,
    });

    console.log(`🎵 Synth: ${noteName} @ ${frequency.toFixed(1)}Hz (${instrument.name})`);
  }

  stopNote(noteName: string): void {
    const note = this.activeNotes.get(noteName);
    if (!note) return;

    const now = this.audioContext.currentTime;
    const releaseTime = this.currentInstrument.release;

    // Apply release envelope
    note.gainNode.gain.cancelScheduledValues(now);
    note.gainNode.gain.setValueAtTime(note.gainNode.gain.value, now);
    note.gainNode.gain.exponentialRampToValueAtTime(0.001, now + releaseTime);

    // Stop and cleanup after release
    setTimeout(() => {
      note.oscillators.forEach(osc => {
        try { osc.stop(); } catch (e) {}
      });
      if (note.lfo) {
        try { note.lfo.stop(); } catch (e) {}
      }
      this.activeNotes.delete(noteName);
    }, releaseTime * 1000 + 50);
  }

  stopAllNotes(): void {
    this.activeNotes.forEach((_, noteName) => {
      this.stopNote(noteName);
    });
  }

  getCurrentInstrumentName(): string {
    return this.currentInstrument.name;
  }

  getInstrumentList(): InstrumentConfig[] {
    return SYNTH_INSTRUMENTS;
  }
}
