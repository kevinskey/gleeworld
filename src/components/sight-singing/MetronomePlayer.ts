/**
 * Precise Metronome using Web Audio API timing
 */

import { AudioScheduler } from './AudioScheduler';

export class MetronomePlayer {
  private audioContext: AudioContext;
  private scheduler: AudioScheduler;
  private tempo = 120; // BPM
  private isPlaying = false;
  private nextNoteTime = 0;
  private noteLength = 0.05; // Length of metronome click
  private beatNumber = 0;
  private beatsPerMeasure = 4;
  private onBeatCallback?: (beatNumber: number, isDownbeat: boolean) => void;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.scheduler = new AudioScheduler(audioContext);
  }

  start(tempo: number = 120, beatsPerMeasure: number = 4) {
    if (this.isPlaying) return;

    this.tempo = tempo;
    this.beatsPerMeasure = beatsPerMeasure;
    this.isPlaying = true;
    this.beatNumber = 0;
    this.nextNoteTime = this.audioContext.currentTime;

    this.scheduler.start();
    this.scheduleNote();
  }

  stop() {
    this.isPlaying = false;
    this.scheduler.stop();
  }

  setTempo(tempo: number) {
    this.tempo = tempo;
  }

  onBeat(callback: (beatNumber: number, isDownbeat: boolean) => void) {
    this.onBeatCallback = callback;
  }

  private scheduleNote() {
    if (!this.isPlaying) return;

    const isDownbeat = this.beatNumber % this.beatsPerMeasure === 0;
    
    // Schedule the metronome click
    this.scheduler.scheduleEvent({
      time: this.nextNoteTime,
      type: 'metronome',
      callback: () => this.playClick(isDownbeat)
    });

    // Notify beat callback
    if (this.onBeatCallback) {
      this.onBeatCallback(this.beatNumber, isDownbeat);
    }

    // Calculate next note time
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += secondsPerBeat;
    this.beatNumber++;

    // Schedule next note with proper timing (not immediate)
    if (this.isPlaying) {
      // Use a small delay to prevent overwhelming the scheduler
      const scheduleDelay = Math.max(1, (secondsPerBeat * 1000) / 4); // Quarter of beat duration in ms
      setTimeout(() => this.scheduleNote(), scheduleDelay);
    }
  }

  private playClick(isDownbeat: boolean) {
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Different frequencies for downbeat vs regular beat
      oscillator.frequency.setValueAtTime(
        isDownbeat ? 800 : 400, 
        this.audioContext.currentTime
      );
      oscillator.type = 'square';

      // Create sharp click envelope
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.001);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + this.noteLength);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + this.noteLength);
    } catch (error) {
      console.error('Error playing metronome click:', error);
    }
  }

  getBeatPosition(): { beat: number, measure: number } {
    return {
      beat: this.beatNumber % this.beatsPerMeasure,
      measure: Math.floor(this.beatNumber / this.beatsPerMeasure)
    };
  }
}