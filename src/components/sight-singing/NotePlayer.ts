/**
 * Note Player for sight-reading exercises
 * Synthesizes and plays musical notes using Web Audio API
 */

export interface Note {
  pitch: string; // e.g., "C4", "F#5"
  duration: number; // in beats
  startBeat: number; // when to start playing (in beats from beginning)
}

export class NotePlayer {
  private audioContext: AudioContext;
  private gainNode: GainNode;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.gainNode = audioContext.createGain();
    this.gainNode.connect(audioContext.destination);
    this.gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  }

  // Convert note name to frequency
  private noteToFrequency(note: string): number {
    const noteMap: { [key: string]: number } = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
      'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };

    const match = note.match(/^([A-G][#b]?)(\d+)$/);
    if (!match) return 440; // Default to A4

    const noteName = match[1];
    const octave = parseInt(match[2]);
    
    const semitone = noteMap[noteName];
    if (semitone === undefined) return 440;

    // A4 = 440Hz, calculate frequency
    const A4 = 440;
    const semitonesFromA4 = (octave - 4) * 12 + (semitone - 9);
    return A4 * Math.pow(2, semitonesFromA4 / 12);
  }

  // Play a single note
  playNote(pitch: string, duration: number, startTime: number): void {
    try {
      const frequency = this.noteToFrequency(pitch);
      const oscillator = this.audioContext.createOscillator();
      const noteGain = this.audioContext.createGain();

      oscillator.connect(noteGain);
      noteGain.connect(this.gainNode);

      // Use a warm sine wave for vocal-like sound
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, startTime);

      // Create smooth envelope
      const attackTime = 0.1;
      const releaseTime = 0.2;
      const sustainLevel = 0.7;

      noteGain.gain.setValueAtTime(0, startTime);
      noteGain.gain.linearRampToValueAtTime(sustainLevel, startTime + attackTime);
      noteGain.gain.setValueAtTime(sustainLevel, startTime + duration - releaseTime);
      noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);

      console.log('Playing note:', { pitch, frequency, startTime, duration });
    } catch (error) {
      console.error('Error playing note:', error);
    }
  }

  // Set overall volume
  setVolume(volume: number): void {
    this.gainNode.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.1);
  }

  // Stop all currently playing notes
  stop(): void {
    // Create a new gain node to effectively stop all current notes
    this.gainNode.disconnect();
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    this.gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
  }
}