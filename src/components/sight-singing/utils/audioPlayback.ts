import { ParsedScore, ParsedNote } from './musicXMLParser';

export class MusicXMLPlayer {
  private audioContext: AudioContext | null = null;
  private scheduledNodes: Array<{ oscillator: OscillatorNode; gain: GainNode; timeout: NodeJS.Timeout }> = [];
  private isPlaying = false;
  private startTime = 0;
  private clickTrack: Array<NodeJS.Timeout> = [];

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    return this.audioContext;
  }

  private createTone(frequency: number, startTime: number, duration: number, volume: number = 0.3, noteSound: string = 'piano'): void {
    const audioContext = this.initAudioContext();
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    
    // Set oscillator type based on sound selection
    switch (noteSound) {
      case 'piano':
        oscillator.type = 'sine';
        break;
      case 'flute':
        oscillator.type = 'sine';
        volume *= 0.8; // Softer
        break;
      case 'xylophone':
        oscillator.type = 'square';
        volume *= 0.6; // Sharper but quieter
        break;
      case 'synth':
        oscillator.type = 'sawtooth';
        break;
      default:
        oscillator.type = 'sine';
    }
    
    // Envelope: fade in and out
    const fadeTime = noteSound === 'xylophone' ? 0.01 : 0.02;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + fadeTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + duration - fadeTime);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
    
    // Store reference for cleanup
    const timeout = setTimeout(() => {
      this.scheduledNodes = this.scheduledNodes.filter(node => node.oscillator !== oscillator);
    }, (startTime - audioContext.currentTime + duration) * 1000);
    
    this.scheduledNodes.push({ oscillator, gain: gainNode, timeout });
  }

  private createPercussionClick(isDownbeat: boolean, startTime: number, duration: number = 0.1, volume: number = 0.3, clickSound: string = 'woodblock'): void {
    console.log('Creating percussion click with sound:', clickSound, 'isDownbeat:', isDownbeat);
    const audioContext = this.initAudioContext();
    
    // Create noise buffer for percussion sound
    const bufferSize = audioContext.sampleRate * duration;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    
    // Generate sound based on click type
    for (let i = 0; i < bufferSize; i++) {
      let noise: number;
      
      if (clickSound === 'beep') {
        // Generate a pure tone for beep
        const freq = isDownbeat ? 800 : 600;
        noise = Math.sin(2 * Math.PI * freq * i / audioContext.sampleRate);
      } else {
        // White noise for woodblock
        noise = Math.random() * 2 - 1;
        
        // Apply simple high-pass filtering for crisp click
        if (i > 0) {
          noise = noise * 0.7 + output[i - 1] * 0.3;
        }
      }
      
      // Shape the envelope for sharp attack
      const envPhase = i / bufferSize;
      const envelope = clickSound === 'beep' 
        ? Math.exp(-envPhase * 4) // Longer for beep
        : Math.exp(-envPhase * (isDownbeat ? 8 : 12)); // Shorter for woodblock
      
      output[i] = noise * envelope;
    }
    
    // Create buffer source
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    
    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Volume control
    gainNode.gain.setValueAtTime(volume * (isDownbeat ? 1.2 : 0.8), startTime);
    
    source.start(startTime);
    
    // Store reference for cleanup
    const timeout = setTimeout(() => {
      this.scheduledNodes = this.scheduledNodes.filter(node => node.oscillator !== source as any);
    }, (startTime - audioContext.currentTime + duration) * 1000);
    
    this.scheduledNodes.push({ oscillator: source as any, gain: gainNode, timeout });
  }

  private createClickTrack(tempo: number, measures: number, timeSignature: { beats: number; beatType: number }, clickSound: string = 'woodblock'): void {
    const audioContext = this.initAudioContext();
    const beatDuration = 60 / tempo; // seconds per beat
    const totalBeats = measures * timeSignature.beats + timeSignature.beats; // +1 measure for intro
    
    // Start with one measure click intro
    for (let beat = 0; beat < totalBeats; beat++) {
      const beatTime = audioContext.currentTime + beat * beatDuration;
      const isDownbeat = beat % timeSignature.beats === 0;
      
      this.createPercussionClick(isDownbeat, beatTime, 0.1, 0.2, clickSound);
    }
  }

  async playScore(parsedScore: ParsedScore, mode: 'click-only' | 'click-and-score' = 'click-and-score', soundSettings?: { notes: string; click: string }): Promise<void> {
    if (this.isPlaying) {
      this.stop();
    }

    const audioContext = this.initAudioContext();
    
    // Ensure audio context is resumed (required for user interaction)
    try {
      await audioContext.resume();
      console.log('Audio context state:', audioContext.state);
    } catch (error) {
      console.error('Failed to resume audio context:', error);
      throw new Error('Audio playback requires user interaction. Please try again.');
    }
    
    this.isPlaying = true;
    this.startTime = audioContext.currentTime;
    
    console.log('Starting playback with mode:', mode, 'at time:', this.startTime);
    
    // Calculate intro duration (one measure of clicks)
    const beatDuration = 60 / parsedScore.tempo;
    const introDuration = parsedScore.timeSignature.beats * beatDuration;
    
    if (mode === 'click-only' || mode === 'click-and-score') {
      // Play click track for intro + all measures
      console.log('Creating click track with sound:', soundSettings?.click || 'woodblock');
      this.createClickTrack(parsedScore.tempo, parsedScore.measures.length, parsedScore.timeSignature, soundSettings?.click || 'woodblock');
    }
    
    if (mode === 'click-and-score') {
      // Schedule all notes with intro delay
      console.log('Scheduling notes for playback with sound:', soundSettings?.notes || 'piano', parsedScore.measures.length, 'measures');
      let noteCount = 0;
      parsedScore.measures.forEach((measure, measureIndex) => {
        measure.notes.forEach((note, noteIndex) => {
          const noteStartTime = this.startTime + introDuration + note.startTime;
          console.log(`Note ${noteCount++}: freq=${note.frequency}, start=${noteStartTime}, duration=${note.duration}`);
          this.createTone(note.frequency, noteStartTime, note.duration, 0.4, soundSettings?.notes || 'piano');
        });
      });
      console.log(`Total notes scheduled: ${noteCount}`);
    }
    
    // Auto-stop when complete
    const totalDuration = introDuration + parsedScore.totalDuration + 1; // +1 second buffer
    const stopTimeout = setTimeout(() => {
      this.stop();
    }, totalDuration * 1000);
    
    this.clickTrack.push(stopTimeout);
  }

  stop(): void {
    this.isPlaying = false;
    
    // Stop all scheduled audio nodes
    this.scheduledNodes.forEach(({ oscillator, timeout }) => {
      try {
        clearTimeout(timeout);
        if (oscillator.context.state !== 'closed') {
          oscillator.stop();
        }
      } catch (error) {
        // Node might already be stopped
      }
    });
    
    this.scheduledNodes = [];
    
    // Clear click track timeouts
    this.clickTrack.forEach(timeout => clearTimeout(timeout));
    this.clickTrack = [];
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  dispose(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}