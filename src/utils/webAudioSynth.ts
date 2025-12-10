// Web Audio API Synthesizer - Enhanced with rich harmonics and reverb
// No external CDN required - works offline and has no CORS issues

export type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface InstrumentConfig {
  id: number;
  name: string;
  category: string;
  // Oscillator configuration
  oscillatorType: OscillatorType;
  // Harmonic content - adds richness
  harmonics?: number[]; // Relative amplitudes for harmonics 2, 3, 4, etc.
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
  filterEnvelope?: number; // How much filter opens during attack
  // Effects
  tremoloRate?: number;
  vibratoRate?: number;
  vibratoDepth?: number;
  reverbMix?: number; // 0-1, how much reverb to add
  chorusDepth?: number; // Chorus effect depth
}

// Built-in synthesizer presets - tight and punchy
export const SYNTH_INSTRUMENTS: InstrumentConfig[] = [
  // Piano sounds
  {
    id: 0,
    name: 'Acoustic Piano',
    category: 'Piano',
    oscillatorType: 'triangle',
    harmonics: [0.7, 0.4, 0.25, 0.15, 0.1],
    oscillator2Type: 'sine',
    oscillator2Detune: 3,
    oscillator2Volume: 0.4,
    attack: 0.002,
    decay: 0.15,
    sustain: 0.1,
    release: 0.2,
    filterType: 'lowpass',
    filterFrequency: 6000,
    filterQ: 0.7,
    filterEnvelope: 3000,
    reverbMix: 0.05,
  },
  {
    id: 1,
    name: 'Bright Piano',
    category: 'Piano',
    oscillatorType: 'triangle',
    harmonics: [0.8, 0.5, 0.3, 0.2],
    oscillator2Type: 'sawtooth',
    oscillator2Detune: 2,
    oscillator2Volume: 0.1,
    attack: 0.001,
    decay: 0.25,
    sustain: 0.2,
    release: 0.3,
    filterType: 'lowpass',
    filterFrequency: 8000,
    filterQ: 0.5,
    filterEnvelope: 2000,
    reverbMix: 0.05,
  },
  {
    id: 2,
    name: 'Electric Piano',
    category: 'Piano',
    oscillatorType: 'sine',
    harmonics: [0.6, 0.2, 0.1],
    oscillator2Type: 'triangle',
    oscillator2Detune: 5,
    oscillator2Volume: 0.35,
    attack: 0.005,
    decay: 0.4,
    sustain: 0.15,
    release: 0.5,
    tremoloRate: 4.5,
    reverbMix: 0.1,
  },
  {
    id: 3,
    name: 'Honky-tonk',
    category: 'Piano',
    oscillatorType: 'triangle',
    harmonics: [0.6, 0.35, 0.2],
    oscillator2Type: 'triangle',
    oscillator2Detune: 20,
    oscillator2Volume: 0.5,
    attack: 0.003,
    decay: 0.2,
    sustain: 0.25,
    release: 0.3,
    reverbMix: 0.05,
    chorusDepth: 8,
  },
  // Organ sounds
  {
    id: 4,
    name: 'Organ',
    category: 'Organ',
    oscillatorType: 'sine',
    harmonics: [1.0, 0.8, 0.6, 0.4, 0.3, 0.2],
    oscillator2Type: 'sine',
    oscillator2Detune: 1200,
    oscillator2Volume: 0.6,
    attack: 0.02,
    decay: 0.05,
    sustain: 0.9,
    release: 0.05,
    tremoloRate: 6.5,
    reverbMix: 0.1,
    chorusDepth: 3,
  },
  {
    id: 5,
    name: 'Church Organ',
    category: 'Organ',
    oscillatorType: 'sine',
    harmonics: [1.0, 0.9, 0.7, 0.5, 0.4, 0.3],
    oscillator2Type: 'triangle',
    oscillator2Detune: 1200,
    oscillator2Volume: 0.7,
    attack: 0.1,
    decay: 0.1,
    sustain: 0.85,
    release: 0.15,
    reverbMix: 0.15,
  },
  // Strings
  {
    id: 6,
    name: 'Strings',
    category: 'Strings',
    oscillatorType: 'sawtooth',
    harmonics: [0.5, 0.35, 0.25],
    oscillator2Type: 'sawtooth',
    oscillator2Detune: 8,
    oscillator2Volume: 0.5,
    attack: 0.15,
    decay: 0.15,
    sustain: 0.7,
    release: 0.25,
    filterType: 'lowpass',
    filterFrequency: 4000,
    filterQ: 0.8,
    filterEnvelope: 1500,
    vibratoRate: 5.5,
    vibratoDepth: 6,
    reverbMix: 0.12,
    chorusDepth: 6,
  },
  {
    id: 7,
    name: 'Violin',
    category: 'Strings',
    oscillatorType: 'sawtooth',
    harmonics: [0.6, 0.4, 0.3],
    attack: 0.06,
    decay: 0.1,
    sustain: 0.8,
    release: 0.15,
    filterType: 'lowpass',
    filterFrequency: 5000,
    filterQ: 1.5,
    vibratoRate: 6,
    vibratoDepth: 10,
    reverbMix: 0.08,
  },
  // Brass
  {
    id: 8,
    name: 'Brass',
    category: 'Brass',
    oscillatorType: 'sawtooth',
    harmonics: [0.7, 0.5, 0.35],
    oscillator2Type: 'square',
    oscillator2Detune: 4,
    oscillator2Volume: 0.25,
    attack: 0.03,
    decay: 0.1,
    sustain: 0.7,
    release: 0.1,
    filterType: 'lowpass',
    filterFrequency: 1500,
    filterQ: 2.5,
    filterEnvelope: 3000,
    reverbMix: 0.08,
  },
  {
    id: 9,
    name: 'Trumpet',
    category: 'Brass',
    oscillatorType: 'sawtooth',
    harmonics: [0.8, 0.6, 0.4],
    attack: 0.01,
    decay: 0.06,
    sustain: 0.8,
    release: 0.08,
    filterType: 'lowpass',
    filterFrequency: 2000,
    filterQ: 3,
    filterEnvelope: 4000,
    vibratoRate: 5,
    vibratoDepth: 5,
    reverbMix: 0.06,
  },
  // Woodwinds
  {
    id: 10,
    name: 'Flute',
    category: 'Woodwind',
    oscillatorType: 'sine',
    harmonics: [0.3, 0.1],
    oscillator2Type: 'triangle',
    oscillator2Detune: 1,
    oscillator2Volume: 0.15,
    attack: 0.06,
    decay: 0.06,
    sustain: 0.8,
    release: 0.1,
    vibratoRate: 5,
    vibratoDepth: 8,
    reverbMix: 0.1,
  },
  {
    id: 11,
    name: 'Clarinet',
    category: 'Woodwind',
    oscillatorType: 'square',
    harmonics: [0.0, 0.5, 0.0, 0.25],
    attack: 0.03,
    decay: 0.08,
    sustain: 0.7,
    release: 0.1,
    filterType: 'lowpass',
    filterFrequency: 2500,
    filterQ: 1.2,
    vibratoRate: 4.5,
    vibratoDepth: 4,
    reverbMix: 0.08,
  },
  // Synth leads
  {
    id: 12,
    name: 'Synth Lead',
    category: 'Synth',
    oscillatorType: 'sawtooth',
    harmonics: [0.6, 0.4, 0.3],
    oscillator2Type: 'square',
    oscillator2Detune: 7,
    oscillator2Volume: 0.45,
    attack: 0.005,
    decay: 0.15,
    sustain: 0.6,
    release: 0.15,
    filterType: 'lowpass',
    filterFrequency: 3000,
    filterQ: 4,
    filterEnvelope: 4000,
    reverbMix: 0.06,
    chorusDepth: 5,
  },
  {
    id: 13,
    name: 'Square Lead',
    category: 'Synth',
    oscillatorType: 'square',
    harmonics: [0.0, 0.4, 0.0, 0.2],
    attack: 0.005,
    decay: 0.06,
    sustain: 0.7,
    release: 0.1,
    filterType: 'lowpass',
    filterFrequency: 4000,
    filterQ: 2,
    reverbMix: 0.05,
  },
  // Pads - slightly longer but not excessive
  {
    id: 14,
    name: 'Synth Pad',
    category: 'Pad',
    oscillatorType: 'sine',
    harmonics: [0.5, 0.3, 0.2],
    oscillator2Type: 'triangle',
    oscillator2Detune: 12,
    oscillator2Volume: 0.55,
    attack: 0.3,
    decay: 0.2,
    sustain: 0.75,
    release: 0.5,
    filterType: 'lowpass',
    filterFrequency: 2500,
    filterQ: 0.5,
    filterEnvelope: 1000,
    tremoloRate: 2.5,
    reverbMix: 0.15,
    chorusDepth: 8,
  },
  {
    id: 15,
    name: 'Warm Pad',
    category: 'Pad',
    oscillatorType: 'triangle',
    harmonics: [0.4, 0.25],
    oscillator2Type: 'sine',
    oscillator2Detune: 10,
    oscillator2Volume: 0.5,
    attack: 0.4,
    decay: 0.2,
    sustain: 0.7,
    release: 0.6,
    filterType: 'lowpass',
    filterFrequency: 1800,
    filterQ: 0.8,
    reverbMix: 0.15,
    chorusDepth: 10,
  },
  // Bells/Mallet
  {
    id: 16,
    name: 'Bells',
    category: 'Bells',
    oscillatorType: 'sine',
    harmonics: [0.8, 0.0, 0.4, 0.0, 0.2],
    oscillator2Type: 'sine',
    oscillator2Detune: 1900,
    oscillator2Volume: 0.25,
    attack: 0.0005,
    decay: 0.5,
    sustain: 0.05,
    release: 0.8,
    reverbMix: 0.12,
  },
  {
    id: 17,
    name: 'Vibraphone',
    category: 'Bells',
    oscillatorType: 'sine',
    harmonics: [0.5, 0.2],
    attack: 0.003,
    decay: 0.4,
    sustain: 0.1,
    release: 0.5,
    tremoloRate: 5.5,
    reverbMix: 0.1,
  },
  // Bass
  {
    id: 18,
    name: 'Synth Bass',
    category: 'Bass',
    oscillatorType: 'sawtooth',
    harmonics: [0.8, 0.5, 0.3],
    oscillator2Type: 'square',
    oscillator2Detune: -1200,
    oscillator2Volume: 0.35,
    attack: 0.005,
    decay: 0.1,
    sustain: 0.5,
    release: 0.08,
    filterType: 'lowpass',
    filterFrequency: 800,
    filterQ: 5,
    filterEnvelope: 2500,
    reverbMix: 0.03,
  },
  {
    id: 19,
    name: 'Electric Bass',
    category: 'Bass',
    oscillatorType: 'triangle',
    harmonics: [0.6, 0.3],
    attack: 0.01,
    decay: 0.08,
    sustain: 0.6,
    release: 0.1,
    filterType: 'lowpass',
    filterFrequency: 1500,
    filterQ: 2,
    reverbMix: 0.03,
  },
];

interface ActiveNote {
  oscillators: OscillatorNode[];
  gainNode: GainNode;
  filterNode?: BiquadFilterNode;
  lfo?: OscillatorNode;
  harmonicOscillators?: OscillatorNode[];
  dryGain?: GainNode;
  wetGain?: GainNode;
}

export class WebAudioSynth {
  private audioContext: AudioContext;
  private currentInstrument: InstrumentConfig;
  private activeNotes: Map<string, ActiveNote> = new Map();
  private masterVolume: number = 0.5;
  private reverbNode: ConvolverNode | null = null;
  private reverbReady: boolean = false;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.currentInstrument = SYNTH_INSTRUMENTS[0];
    this.initReverb();
  }

  private async initReverb(): Promise<void> {
    try {
      // Create impulse response for reverb (simulated hall)
      const sampleRate = this.audioContext.sampleRate;
      const length = sampleRate * 2.5; // 2.5 second reverb
      const impulse = this.audioContext.createBuffer(2, length, sampleRate);
      
      for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          // Exponential decay with some randomness for natural sound
          const decay = Math.exp(-3 * i / length);
          const early = i < sampleRate * 0.05 ? Math.exp(-20 * i / (sampleRate * 0.05)) * 0.5 : 0;
          channelData[i] = ((Math.random() * 2 - 1) * decay + early) * 0.5;
        }
      }
      
      this.reverbNode = this.audioContext.createConvolver();
      this.reverbNode.buffer = impulse;
      this.reverbReady = true;
      console.log('🎵 Reverb initialized');
    } catch (e) {
      console.warn('Could not initialize reverb:', e);
    }
  }

  setInstrument(instrumentId: number): void {
    const instrument = SYNTH_INSTRUMENTS.find(i => i.id === instrumentId);
    if (instrument) {
      this.currentInstrument = instrument;
      console.log(`🎹 Switched to: ${instrument.name}`);
    } else {
      this.currentInstrument = SYNTH_INSTRUMENTS[0];
      console.log(`🎹 Instrument ${instrumentId} not found, using Acoustic Piano`);
    }
  }

  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  async playNote(noteName: string, frequency: number): Promise<void> {
    if (this.activeNotes.has(noteName)) return;

    // Resume synchronously if needed - no await to avoid delay
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const instrument = this.currentInstrument;
    const now = this.audioContext.currentTime;
    const oscillators: OscillatorNode[] = [];
    const harmonicOscillators: OscillatorNode[] = [];

    // Create master gain for this note
    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(0, now);

    // Create filter if configured
    let filterNode: BiquadFilterNode | undefined;
    let preEffectNode: AudioNode = gainNode;

    if (instrument.filterType) {
      filterNode = this.audioContext.createBiquadFilter();
      filterNode.type = instrument.filterType;
      const baseFreq = instrument.filterFrequency || 2000;
      filterNode.frequency.setValueAtTime(baseFreq, now);
      filterNode.Q.value = instrument.filterQ || 1;
      
      // Filter envelope - opens filter during attack
      if (instrument.filterEnvelope) {
        filterNode.frequency.setValueAtTime(baseFreq, now);
        filterNode.frequency.linearRampToValueAtTime(
          baseFreq + instrument.filterEnvelope,
          now + instrument.attack
        );
        filterNode.frequency.exponentialRampToValueAtTime(
          baseFreq,
          now + instrument.attack + instrument.decay
        );
      }
      
      preEffectNode = filterNode;
      gainNode.connect(filterNode);
    }

    // Set up dry/wet routing for reverb
    let dryGain: GainNode | undefined;
    let wetGain: GainNode | undefined;
    
    if (this.reverbReady && this.reverbNode && instrument.reverbMix && instrument.reverbMix > 0) {
      dryGain = this.audioContext.createGain();
      wetGain = this.audioContext.createGain();
      
      dryGain.gain.value = 1 - instrument.reverbMix;
      wetGain.gain.value = instrument.reverbMix;
      
      preEffectNode.connect(dryGain);
      preEffectNode.connect(this.reverbNode);
      this.reverbNode.connect(wetGain);
      
      dryGain.connect(this.audioContext.destination);
      wetGain.connect(this.audioContext.destination);
    } else {
      preEffectNode.connect(this.audioContext.destination);
    }

    // Create primary oscillator
    const osc1 = this.audioContext.createOscillator();
    osc1.type = instrument.oscillatorType;
    osc1.frequency.setValueAtTime(frequency, now);
    
    // Add chorus effect (slight pitch modulation)
    if (instrument.chorusDepth) {
      const chorusLfo = this.audioContext.createOscillator();
      chorusLfo.type = 'sine';
      chorusLfo.frequency.value = 0.5 + Math.random() * 0.5; // Slight randomness
      const chorusGain = this.audioContext.createGain();
      chorusGain.gain.value = instrument.chorusDepth;
      chorusLfo.connect(chorusGain);
      chorusGain.connect(osc1.detune);
      chorusLfo.start(now);
    }
    
    osc1.connect(gainNode);
    oscillators.push(osc1);

    // Create harmonic oscillators for richer sound
    if (instrument.harmonics && instrument.harmonics.length > 0) {
      instrument.harmonics.forEach((amplitude, index) => {
        if (amplitude > 0) {
          const harmOsc = this.audioContext.createOscillator();
          harmOsc.type = 'sine'; // Harmonics are always sine waves
          harmOsc.frequency.setValueAtTime(frequency * (index + 2), now); // 2nd, 3rd, 4th... harmonics
          
          const harmGain = this.audioContext.createGain();
          harmGain.gain.value = amplitude * 0.3; // Scale down harmonics
          
          harmOsc.connect(harmGain);
          harmGain.connect(gainNode);
          harmonicOscillators.push(harmOsc);
        }
      });
    }

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
      harmonicOscillators.forEach(osc => lfoGain.connect(osc.frequency));
      lfo.start(now);
    }

    // Add tremolo if configured
    if (instrument.tremoloRate) {
      const tremoloLfo = this.audioContext.createOscillator();
      tremoloLfo.type = 'sine';
      tremoloLfo.frequency.value = instrument.tremoloRate;
      
      const tremoloGain = this.audioContext.createGain();
      tremoloGain.gain.value = 0.15;
      
      tremoloLfo.connect(tremoloGain);
      tremoloGain.connect(gainNode.gain);
      tremoloLfo.start(now);
    }

    // Apply ADSR envelope with smooth curves
    const attackTime = instrument.attack;
    const decayTime = instrument.decay;
    const sustainLevel = instrument.sustain * this.masterVolume;
    const peakLevel = this.masterVolume * 1.1; // Slight overshoot for punch

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(peakLevel, now + attackTime);
    gainNode.gain.exponentialRampToValueAtTime(
      Math.max(sustainLevel, 0.001),
      now + attackTime + decayTime
    );

    // Start all oscillators
    oscillators.forEach(osc => osc.start(now));
    harmonicOscillators.forEach(osc => osc.start(now));

    this.activeNotes.set(noteName, {
      oscillators,
      harmonicOscillators,
      gainNode,
      filterNode,
      lfo,
      dryGain,
      wetGain,
    });
  }

  stopNote(noteName: string): void {
    const note = this.activeNotes.get(noteName);
    if (!note) return;

    // Remove from active notes immediately to prevent stuck state
    this.activeNotes.delete(noteName);

    const now = this.audioContext.currentTime;
    const releaseTime = this.currentInstrument.release;

    // Apply release envelope with smooth exponential decay
    note.gainNode.gain.cancelScheduledValues(now);
    note.gainNode.gain.setValueAtTime(note.gainNode.gain.value, now);
    note.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

    // Stop and cleanup after release
    setTimeout(() => {
      note.oscillators.forEach(osc => {
        try { osc.stop(); } catch (e) {}
      });
      note.harmonicOscillators?.forEach(osc => {
        try { osc.stop(); } catch (e) {}
      });
      if (note.lfo) {
        try { note.lfo.stop(); } catch (e) {}
      }
    }, releaseTime * 1000 + 100);
  }

  stopAllNotes(): void {
    // Copy keys to array first to avoid modifying while iterating
    const noteNames = Array.from(this.activeNotes.keys());
    noteNames.forEach(noteName => {
      this.stopNote(noteName);
    });
  }

  // Force stop all notes immediately (no release envelope)
  forceStopAllNotes(): void {
    this.activeNotes.forEach((note) => {
      try {
        note.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
        note.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        note.oscillators.forEach(osc => { try { osc.stop(); } catch (e) {} });
        note.harmonicOscillators?.forEach(osc => { try { osc.stop(); } catch (e) {} });
        if (note.lfo) { try { note.lfo.stop(); } catch (e) {} }
      } catch (e) {}
    });
    this.activeNotes.clear();
  }

  getActiveNoteCount(): number {
    return this.activeNotes.size;
  }
}
