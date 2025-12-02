// CDN-based soundfont loader for real MIDI instrument sounds
// Uses MIDI.js soundfonts from gleitz.github.io

const SOUNDFONT_CDN = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM';

// Map GM instrument IDs to soundfont names
const GM_INSTRUMENT_NAMES: Record<number, string> = {
  0: 'acoustic_grand_piano',
  1: 'bright_acoustic_piano',
  2: 'electric_grand_piano',
  3: 'honkytonk_piano',
  4: 'electric_piano_1',
  5: 'electric_piano_2',
  6: 'harpsichord',
  7: 'clavinet',
  8: 'celesta',
  9: 'glockenspiel',
  10: 'music_box',
  11: 'vibraphone',
  12: 'marimba',
  13: 'xylophone',
  14: 'tubular_bells',
  15: 'dulcimer',
  16: 'drawbar_organ',
  17: 'percussive_organ',
  18: 'rock_organ',
  19: 'church_organ',
  20: 'reed_organ',
  21: 'accordion',
  22: 'harmonica',
  23: 'tango_accordion',
  24: 'acoustic_guitar_nylon',
  25: 'acoustic_guitar_steel',
  26: 'electric_guitar_jazz',
  27: 'electric_guitar_clean',
  28: 'electric_guitar_muted',
  29: 'overdriven_guitar',
  30: 'distortion_guitar',
  31: 'guitar_harmonics',
  32: 'acoustic_bass',
  33: 'electric_bass_finger',
  34: 'electric_bass_pick',
  35: 'fretless_bass',
  36: 'slap_bass_1',
  37: 'slap_bass_2',
  38: 'synth_bass_1',
  39: 'synth_bass_2',
  40: 'violin',
  41: 'viola',
  42: 'cello',
  43: 'contrabass',
  44: 'tremolo_strings',
  45: 'pizzicato_strings',
  46: 'orchestral_harp',
  47: 'timpani',
  48: 'string_ensemble_1',
  49: 'string_ensemble_2',
  50: 'synth_strings_1',
  51: 'synth_strings_2',
  52: 'choir_aahs',
  53: 'voice_oohs',
  54: 'synth_choir',
  55: 'orchestra_hit',
  56: 'trumpet',
  57: 'trombone',
  58: 'tuba',
  59: 'muted_trumpet',
  60: 'french_horn',
  61: 'brass_section',
  62: 'synth_brass_1',
  63: 'synth_brass_2',
  64: 'soprano_sax',
  65: 'alto_sax',
  66: 'tenor_sax',
  67: 'baritone_sax',
  68: 'oboe',
  69: 'english_horn',
  70: 'bassoon',
  71: 'clarinet',
  72: 'piccolo',
  73: 'flute',
  74: 'recorder',
  75: 'pan_flute',
  76: 'blown_bottle',
  77: 'shakuhachi',
  78: 'whistle',
  79: 'ocarina',
  80: 'lead_1_square',
  81: 'lead_2_sawtooth',
  82: 'lead_3_calliope',
  83: 'lead_4_chiff',
  84: 'lead_5_charang',
  85: 'lead_6_voice',
  86: 'lead_7_fifths',
  87: 'lead_8_bass__lead',
  88: 'pad_1_new_age',
  89: 'pad_2_warm',
  90: 'pad_3_polysynth',
  91: 'pad_4_choir',
  92: 'pad_5_bowed',
  93: 'pad_6_metallic',
  94: 'pad_7_halo',
  95: 'pad_8_sweep',
};

// Note name to MIDI number mapping
const NOTE_TO_MIDI: Record<string, number> = {};
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Build note to MIDI mapping (A0 = 21, C4 = 60, C8 = 108)
for (let octave = 0; octave <= 8; octave++) {
  NOTE_NAMES.forEach((note, index) => {
    const midiNumber = 12 + octave * 12 + index; // C0 = 12
    NOTE_TO_MIDI[`${note}${octave}`] = midiNumber;
  });
}

// Cache for loaded audio buffers
const audioBufferCache: Map<string, Map<string, AudioBuffer>> = new Map();
const loadingPromises: Map<string, Promise<Map<string, AudioBuffer>>> = new Map();

export class SoundfontPlayer {
  private audioContext: AudioContext;
  private currentInstrument: string = 'acoustic_grand_piano';
  private buffers: Map<string, AudioBuffer> = new Map();
  private activeNodes: Map<string, { source: AudioBufferSourceNode; gain: GainNode }> = new Map();
  private volume: number = 0.5;
  private isLoading: boolean = false;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  async loadInstrument(instrumentId: number): Promise<boolean> {
    const instrumentName = GM_INSTRUMENT_NAMES[instrumentId] || 'acoustic_grand_piano';
    
    if (instrumentName === this.currentInstrument && this.buffers.size > 0) {
      console.log(`🎹 Instrument ${instrumentName} already loaded`);
      return true;
    }

    // Check cache first
    if (audioBufferCache.has(instrumentName)) {
      this.buffers = audioBufferCache.get(instrumentName)!;
      this.currentInstrument = instrumentName;
      console.log(`🎹 Loaded ${instrumentName} from cache`);
      return true;
    }

    // Check if already loading
    if (loadingPromises.has(instrumentName)) {
      console.log(`🎹 Waiting for ${instrumentName} to finish loading...`);
      this.buffers = await loadingPromises.get(instrumentName)!;
      this.currentInstrument = instrumentName;
      return true;
    }

    this.isLoading = true;
    console.log(`🎹 Loading soundfont: ${instrumentName}...`);

    const loadPromise = this.fetchInstrumentSamples(instrumentName);
    loadingPromises.set(instrumentName, loadPromise);

    try {
      this.buffers = await loadPromise;
      audioBufferCache.set(instrumentName, this.buffers);
      this.currentInstrument = instrumentName;
      this.isLoading = false;
      console.log(`🎹 Soundfont ${instrumentName} loaded successfully (${this.buffers.size} notes)`);
      return true;
    } catch (error) {
      console.error(`🎹 Failed to load soundfont ${instrumentName}:`, error);
      this.isLoading = false;
      loadingPromises.delete(instrumentName);
      return false;
    }
  }

  private async fetchInstrumentSamples(instrumentName: string): Promise<Map<string, AudioBuffer>> {
    const buffers = new Map<string, AudioBuffer>();
    
    // Load a subset of notes for faster loading (we'll use nearest neighbor for missing notes)
    const notesToLoad = [
      'A0', 'C1', 'D#1', 'F#1', 'A1',
      'C2', 'D#2', 'F#2', 'A2',
      'C3', 'D#3', 'F#3', 'A3',
      'C4', 'D#4', 'F#4', 'A4',
      'C5', 'D#5', 'F#5', 'A5',
      'C6', 'D#6', 'F#6', 'A6',
      'C7', 'D#7', 'F#7', 'A7',
      'C8'
    ];

    const loadPromises = notesToLoad.map(async (note) => {
      try {
        // Convert note name to soundfont format (e.g., C4 -> C4, C#4 -> Db4)
        const soundfontNote = note.replace('#', 's');
        const url = `${SOUNDFONT_CDN}/${instrumentName}-mp3/${soundfontNote}.mp3`;
        
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`🎹 Note ${note} not available for ${instrumentName}`);
          return;
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        buffers.set(note, audioBuffer);
      } catch (error) {
        console.warn(`🎹 Failed to load note ${note}:`, error);
      }
    });

    await Promise.all(loadPromises);
    return buffers;
  }

  private findNearestBuffer(noteName: string): { buffer: AudioBuffer; pitchShift: number } | null {
    // Try exact match first
    if (this.buffers.has(noteName)) {
      return { buffer: this.buffers.get(noteName)!, pitchShift: 0 };
    }

    // Get MIDI number for the requested note
    const targetMidi = NOTE_TO_MIDI[noteName];
    if (targetMidi === undefined) return null;

    // Find nearest loaded note
    let nearestNote: string | null = null;
    let nearestDistance = Infinity;

    this.buffers.forEach((_, loadedNote) => {
      const loadedMidi = NOTE_TO_MIDI[loadedNote];
      if (loadedMidi !== undefined) {
        const distance = Math.abs(targetMidi - loadedMidi);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestNote = loadedNote;
        }
      }
    });

    if (nearestNote && nearestDistance <= 6) { // Max 6 semitones shift
      const loadedMidi = NOTE_TO_MIDI[nearestNote];
      const pitchShift = targetMidi - loadedMidi;
      return { buffer: this.buffers.get(nearestNote)!, pitchShift };
    }

    return null;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  async playNote(noteName: string): Promise<void> {
    if (this.activeNodes.has(noteName)) return; // Already playing

    const result = this.findNearestBuffer(noteName);
    if (!result) {
      console.warn(`🎹 No buffer found for note ${noteName}`);
      return;
    }

    const { buffer, pitchShift } = result;

    // Make sure audio context is running
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;
    source.playbackRate.value = Math.pow(2, pitchShift / 12); // Pitch shift in semitones
    
    gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    source.start();
    console.log(`🎵 Playing ${noteName} (shift: ${pitchShift})`);

    this.activeNodes.set(noteName, { source, gain: gainNode });

    source.onended = () => {
      this.activeNodes.delete(noteName);
    };
  }

  stopNote(noteName: string): void {
    const nodes = this.activeNodes.get(noteName);
    if (!nodes) return;

    const { source, gain } = nodes;
    const now = this.audioContext.currentTime;

    // Quick fade out
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    setTimeout(() => {
      try {
        source.stop();
      } catch (e) {
        // Already stopped
      }
      this.activeNodes.delete(noteName);
    }, 150);
  }

  stopAllNotes(): void {
    this.activeNodes.forEach((_, noteName) => {
      this.stopNote(noteName);
    });
  }

  isReady(): boolean {
    return this.buffers.size > 0 && !this.isLoading;
  }

  getLoadingStatus(): boolean {
    return this.isLoading;
  }

  getCurrentInstrument(): string {
    return this.currentInstrument;
  }
}
