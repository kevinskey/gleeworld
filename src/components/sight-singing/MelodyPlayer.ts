/**
 * Precise Melody Player using Web Audio API timing
 * MIDI-like note scheduling system
 */

import { AudioScheduler } from './AudioScheduler';

export interface MelodyNote {
  note: string;
  time: number; // In beats
  duration: number; // In beats
  velocity?: number;
}

export class MelodyPlayer {
  private audioContext: AudioContext;
  private scheduler: AudioScheduler;
  private tempo = 120; // BPM
  private isPlaying = false;
  private melody: MelodyNote[] = [];
  private startTime = 0;
  private onNoteCallback?: (note: MelodyNote, index: number) => void;
  private onProgressCallback?: (progress: number, noteIndex: number) => void;

  // Note frequencies (A440 tuning)
  private noteFrequencies: { [key: string]: number } = {
    'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81,
    'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00,
    'A#3': 233.08, 'B3': 246.94,
    'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63,
    'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00,
    'A#4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25,
    'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00
  };

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.scheduler = new AudioScheduler(audioContext);
  }

  loadMelody(melody: MelodyNote[]) {
    this.melody = [...melody];
  }

  start(tempo: number = 120) {
    if (this.isPlaying || this.melody.length === 0) return;

    this.tempo = tempo;
    this.isPlaying = true;
    this.startTime = this.audioContext.currentTime;

    this.scheduler.start();
    this.scheduleMelody();
  }

  stop() {
    this.isPlaying = false;
    this.scheduler.stop();
  }

  setTempo(tempo: number) {
    this.tempo = tempo;
  }

  onNote(callback: (note: MelodyNote, index: number) => void) {
    this.onNoteCallback = callback;
  }

  onProgress(callback: (progress: number, noteIndex: number) => void) {
    this.onProgressCallback = callback;
  }

  private scheduleMelody() {
    const secondsPerBeat = 60.0 / this.tempo;

    this.melody.forEach((note, index) => {
      const noteTime = this.startTime + (note.time * secondsPerBeat);
      const noteDuration = note.duration * secondsPerBeat;

      // Schedule note start
      this.scheduler.scheduleEvent({
        time: noteTime,
        type: 'note',
        callback: () => {
          if (this.isPlaying) {
            this.playNote(note, noteDuration);
            
            // Notify callbacks
            if (this.onNoteCallback) {
              this.onNoteCallback(note, index);
            }
            
            if (this.onProgressCallback) {
              const progress = ((index + 1) / this.melody.length) * 100;
              this.onProgressCallback(progress, index);
            }
          }
        }
      });
    });

    // Schedule completion callback
    if (this.melody.length > 0) {
      const lastNote = this.melody[this.melody.length - 1];
      const endTime = this.startTime + ((lastNote.time + lastNote.duration) * secondsPerBeat);
      
      this.scheduler.scheduleEvent({
        time: endTime,
        type: 'marker',
        callback: () => {
          if (this.onProgressCallback) {
            this.onProgressCallback(0, -1); // Reset progress
          }
        }
      });
    }
  }

  private playNote(note: MelodyNote, duration: number) {
    try {
      const frequency = this.noteFrequencies[note.note];
      if (!frequency) {
        console.warn('Unknown note:', note.note);
        return;
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      oscillator.type = 'sine';

      // Create musical envelope (ADSR-like)
      const velocity = note.velocity || 0.3;
      const attackTime = 0.02;
      const decayTime = duration * 0.3;
      const sustainLevel = velocity * 0.7;
      const releaseTime = duration * 0.1;

      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(velocity, this.audioContext.currentTime + attackTime);
      gainNode.gain.linearRampToValueAtTime(sustainLevel, this.audioContext.currentTime + attackTime + decayTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration - releaseTime);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);

      console.log(`🎵 Playing ${note.note} (${frequency.toFixed(1)}Hz) for ${duration.toFixed(2)}s`);
    } catch (error) {
      console.error('Error playing note:', error);
    }
  }

  getCurrentProgress(): { time: number, beat: number } {
    if (!this.isPlaying) return { time: 0, beat: 0 };
    
    const elapsedTime = this.audioContext.currentTime - this.startTime;
    const elapsedBeats = elapsedTime / (60.0 / this.tempo);
    
    return {
      time: elapsedTime,
      beat: elapsedBeats
    };
  }
}