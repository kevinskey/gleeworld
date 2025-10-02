import { ParsedScore, ParsedNote } from './musicXMLParser';

export class MusicXMLPlayer {
  private audioContext: AudioContext | null = null;
  private outputNode: AudioNode | null = null;
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
      console.log('Created new audio context, state:', this.audioContext.state);
    }
    
    // Always ensure context is running before use
    if (this.audioContext.state === 'suspended') {
      console.log('Resuming suspended audio context...');
      this.audioContext.resume().then(() => {
        console.log('Audio context resumed, state:', this.audioContext?.state);
      });
    }
    
    return this.audioContext;
  }

  public async ensureUnlocked() {
    const ctx = this.initAudioContext();
    try {
      await ctx.resume();
    } catch (e) {
      // ignore
    }
    // iOS/WebKit unlock: play a very short silent buffer
    try {
      const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      const t = ctx.currentTime + 0.001;
      source.start(t);
      // Stop slightly after start to ensure the graph actually runs
      source.stop(t + 0.005);
    } catch (e) {
      // ignore
    }
    return ctx.state === 'running';
  }

  public setOutputNode(node: AudioNode | null) {
    this.outputNode = node;
  }

  public getAudioContext(): AudioContext {
    return this.initAudioContext();
  }
  private createTone(frequency: number, startTime: number, duration: number, volume: number = 0.3, noteSound: string = 'piano'): void {
    console.log('Creating tone with sound:', noteSound, 'frequency:', frequency);
    
    // Ensure audio context is ready before creating oscillator
    const audioContext = this.initAudioContext();
    if (audioContext.state !== 'running') {
      console.warn('Audio context not running, state:', audioContext.state);
      // Try to resume context synchronously if possible
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    if (this.outputNode) {
      gainNode.connect(this.outputNode);
    } else {
      gainNode.connect(audioContext.destination);
    }
    
    oscillator.frequency.value = frequency;
    
    // Set oscillator type based on sound selection
    switch (noteSound) {
      case 'piano':
        oscillator.type = 'sine';
        console.log('Using piano sound (sine wave)');
        break;
      case 'flute':
        oscillator.type = 'sine';
        volume *= 0.8; // Softer
        console.log('Using flute sound (soft sine wave)');
        break;
      case 'xylophone':
        oscillator.type = 'square';
        volume *= 0.6; // Sharper but quieter
        console.log('Using xylophone sound (square wave)');
        break;
      case 'synth':
        oscillator.type = 'sawtooth';
        console.log('Using synth sound (sawtooth wave)');
        break;
      default:
        oscillator.type = 'sine';
        console.log('Using default sound (sine wave)');
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
    if (this.outputNode) {
      gainNode.connect(this.outputNode);
    } else {
      gainNode.connect(audioContext.destination);
    }
    
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

  async playScore(parsedScore: ParsedScore, mode: 'click-only' | 'click-and-score' | 'pitch-only' = 'click-and-score', soundSettings?: { notes: string; click: string }): Promise<void> {
    console.log('🎹 MusicXMLPlayer.playScore called with mode:', mode);
    console.log('🎹 ParsedScore:', parsedScore);
    console.log('🎹 Sound settings:', soundSettings);
    
    if (this.isPlaying) {
      console.log('🎹 Already playing, stopping first...');
      this.stop();
    }

    const audioContext = this.initAudioContext();
    console.log('🎹 Audio context state:', audioContext.state);
    
    // Ensure audio context is properly resumed before scheduling any audio
    try {
      await audioContext.resume();
      console.log('🎹 Audio context state after resume:', audioContext.state);
      
      if (audioContext.state !== 'running') {
        console.error('❌ Audio context failed to start properly, state:', audioContext.state);
        throw new Error('Audio context failed to initialize. Please try clicking again.');
      }
    } catch (error) {
      console.error('❌ Failed to resume audio context:', error);
      throw new Error('Audio playback requires user interaction. Please try again.');
    }
    
    this.isPlaying = true;
    this.startTime = audioContext.currentTime;
    
    console.log('🎹 Starting playback with mode:', mode, 'at time:', this.startTime);
    
    // Wait a brief moment for audio context to stabilize
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Calculate intro duration (one measure of clicks)
    const beatDuration = 60 / parsedScore.tempo;
    const introDuration = parsedScore.timeSignature.beats * beatDuration;
    console.log('🎹 Beat duration:', beatDuration, 'Intro duration:', introDuration);
    
    if (mode === 'click-only' || mode === 'click-and-score') {
      // Play click track for intro + all measures
      console.log('🎹 Creating click track with sound:', soundSettings?.click || 'woodblock');
      this.createClickTrack(parsedScore.tempo, parsedScore.measures.length, parsedScore.timeSignature, soundSettings?.click || 'woodblock');
    }
    
    if (mode === 'click-and-score' || mode === 'pitch-only') {
      // Schedule all notes with intro delay (only add intro delay if we have clicks)
      const introDelay = (mode === 'click-and-score') ? introDuration : 0;
      console.log('🎹 NOTES SECTION: Scheduling notes for playback');
      console.log('🎹 Mode:', mode, '| Sound:', soundSettings?.notes || 'piano');
      console.log('🎹 Intro delay:', introDelay, 'seconds');
      console.log('🎹 Measures to process:', parsedScore.measures.length);
      console.log('🎹 Full parsed score structure:', JSON.stringify(parsedScore, null, 2));
      
      let noteCount = 0;
      let notesScheduled = 0;
      
      parsedScore.measures.forEach((measure, measureIndex) => {
        console.log(`🎹 MEASURE ${measureIndex + 1}:`, {
          measureNumber: measure.number,
          notesArray: measure.notes,
          notesLength: measure.notes?.length,
          notesType: typeof measure.notes,
          isArray: Array.isArray(measure.notes)
        });
        
        if (measure.notes && Array.isArray(measure.notes) && measure.notes.length > 0) {
          console.log(`🎹 Processing ${measure.notes.length} notes in measure ${measureIndex + 1}`);
          
          measure.notes.forEach((note, noteIndex) => {
            console.log(`🎹 NOTE ${noteIndex} in measure ${measureIndex + 1}:`, {
              step: note.step,
              octave: note.octave,
              frequency: note.frequency,
              duration: note.duration,
              startTime: note.startTime,
              noteStartTime: this.startTime + introDelay + note.startTime
            });
            
            const noteStartTime = this.startTime + introDelay + note.startTime;
            
            try {
              console.log(`🎹 CREATING TONE: ${note.step}${note.octave} at ${noteStartTime}s`);
              this.createTone(note.frequency, noteStartTime, note.duration, 0.4, soundSettings?.notes || 'piano');
              notesScheduled++;
              console.log(`✅ Tone created successfully for note ${noteCount}`);
            } catch (error) {
              console.error(`❌ Failed to create tone for note ${noteCount}:`, error);
            }
            
            noteCount++;
          });
        } else {
          console.warn(`⚠️ Measure ${measureIndex + 1} has invalid notes:`, {
            hasNotes: !!measure.notes,
            isArray: Array.isArray(measure.notes),
            length: measure.notes?.length,
            content: measure.notes
          });
        }
      });
      
      console.log(`🎹 NOTES SUMMARY: Processed ${noteCount} total notes, scheduled ${notesScheduled} tones`);
      
      if (noteCount === 0) {
        console.error('❌ CRITICAL: No notes were found in any measure!');
        console.error('❌ This means the MusicXML parsing failed or the exercise has no notes');
      } else if (notesScheduled === 0) {
        console.error('❌ CRITICAL: Notes found but no tones were scheduled!');
        console.error('❌ This means tone creation is failing');
      }
    }
    
    // Auto-stop when complete - adjust duration based on mode
    const introDelay = (mode === 'click-and-score') ? introDuration : 0;
    const totalDuration = introDelay + parsedScore.totalDuration + 1; // +1 second buffer
    console.log('🎹 Total playback duration:', totalDuration, 'seconds');
    
    const stopTimeout = setTimeout(() => {
      console.log('⏰ Auto-stop timeout triggered');
      this.stop();
    }, totalDuration * 1000);
    
    this.clickTrack.push(stopTimeout);
    
    console.log('✅ MusicXMLPlayer.playScore setup complete');
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