/**
 * Precise Audio Scheduler using Web Audio API timing
 * This replaces setTimeout with accurate musical timing
 */

export interface ScheduledEvent {
  id: string;
  time: number; // Web Audio time
  callback: () => void;
  type: 'note' | 'metronome' | 'marker';
}

export class AudioScheduler {
  private audioContext: AudioContext;
  private events: ScheduledEvent[] = [];
  private isRunning = false;
  private startTime = 0;
  private lookahead = 25.0; // ms - how far ahead to schedule
  private scheduleAheadTime = 0.1; // seconds - how far ahead to schedule audio
  private timerID: number | null = null;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.startTime = this.audioContext.currentTime;
    this.scheduler();
  }

  stop() {
    this.isRunning = false;
    if (this.timerID) {
      clearTimeout(this.timerID);
      this.timerID = null;
    }
    this.events = [];
  }

  scheduleEvent(event: Omit<ScheduledEvent, 'id'>): string {
    const id = Math.random().toString(36).substr(2, 9);
    this.events.push({ ...event, id });
    this.events.sort((a, b) => a.time - b.time);
    return id;
  }

  cancelEvent(id: string) {
    this.events = this.events.filter(event => event.id !== id);
  }

  private scheduler() {
    if (!this.isRunning) return;

    const currentTime = this.audioContext.currentTime;
    const scheduleTime = currentTime + this.scheduleAheadTime;

    // Execute events that are due
    while (this.events.length > 0 && this.events[0].time <= scheduleTime) {
      const event = this.events.shift()!;
      event.callback();
    }

    // Schedule next check
    this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
  }

  getCurrentTime(): number {
    return this.audioContext.currentTime - this.startTime;
  }

  getAudioTime(): number {
    return this.audioContext.currentTime;
  }
}