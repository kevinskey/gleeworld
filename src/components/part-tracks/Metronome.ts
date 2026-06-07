/**
 * Web Audio metronome with lookahead scheduling.
 *
 * Why lookahead: setTimeout is jittery (5–20 ms drift per tick). For a count-in
 * the drift is harmless, but for a 10-minute continuous click track the beats
 * would noticeably wander. We schedule clicks against AudioContext.currentTime
 * (sample-accurate) and use setTimeout only to keep the scheduling loop ticking.
 *
 * Standard pattern: a 25 ms timer wakes up, looks 100 ms into the future, and
 * schedules any click that falls in that window via osc.start(exactTime).
 */
export interface MetronomeBeatEvent {
  /** 0-indexed beat within the measure. */
  beatInMeasure: number;
  /** 0-indexed measure since start(). */
  measure: number;
  /** Absolute count, 0-indexed. */
  totalBeat: number;
  /** AudioContext time the click will sound. */
  scheduledAt: number;
}

export class Metronome {
  private readonly ctx: AudioContext;
  private bpm: number;
  private beatsPerMeasure: number;
  /** Where metronome clicks go. Pass an AudioNode to capture into a stream
   *  (e.g. a MediaStreamDestinationNode) — otherwise speakers. */
  private destination: AudioNode;

  private currentTotalBeat = 0;
  private nextNoteTime = 0;
  private timerId: number | null = null;
  private maxBeats: number = Infinity;
  private onBeat?: (e: MetronomeBeatEvent) => void;
  private doneResolver?: () => void;
  private gainLevel = 0.6;

  private readonly lookaheadMs = 25;
  private readonly scheduleAheadSec = 0.1;

  constructor(
    ctx: AudioContext,
    bpm: number,
    beatsPerMeasure: number,
    destination?: AudioNode,
  ) {
    this.ctx = ctx;
    this.bpm = bpm;
    this.beatsPerMeasure = beatsPerMeasure;
    this.destination = destination ?? ctx.destination;
  }

  setVolume(level: number) { this.gainLevel = Math.max(0, Math.min(1, level)); }

  /**
   * Start playing clicks. If `totalBeats` is finite, the returned promise
   * resolves once that many clicks have been scheduled AND audibly played.
   */
  start(totalBeats: number = Infinity, onBeat?: (e: MetronomeBeatEvent) => void): Promise<void> {
    this.stop(); // safety
    this.maxBeats = totalBeats;
    this.onBeat = onBeat;
    this.currentTotalBeat = 0;
    // Leave a small lead so the first click isn't clipped.
    this.nextNoteTime = this.ctx.currentTime + 0.06;
    return new Promise<void>(resolve => {
      this.doneResolver = resolve;
      this.scheduler();
    });
  }

  stop() {
    if (this.timerId != null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.doneResolver) {
      const r = this.doneResolver;
      this.doneResolver = undefined;
      r();
    }
  }

  private scheduler() {
    while (
      this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadSec &&
      this.currentTotalBeat < this.maxBeats
    ) {
      const beatInMeasure = this.currentTotalBeat % this.beatsPerMeasure;
      const measure = Math.floor(this.currentTotalBeat / this.beatsPerMeasure);
      const isDownbeat = beatInMeasure === 0;
      this.scheduleClick(this.nextNoteTime, isDownbeat);
      if (this.onBeat) {
        const cb = this.onBeat;
        const delayMs = Math.max(0, (this.nextNoteTime - this.ctx.currentTime) * 1000);
        const ev: MetronomeBeatEvent = {
          beatInMeasure,
          measure,
          totalBeat: this.currentTotalBeat,
          scheduledAt: this.nextNoteTime,
        };
        setTimeout(() => cb(ev), delayMs);
      }
      this.currentTotalBeat++;
      this.nextNoteTime += 60 / this.bpm;
    }

    if (this.currentTotalBeat >= this.maxBeats) {
      // Wait for the last scheduled click to actually sound (+ a small tail).
      const tailMs = Math.max(0, (this.nextNoteTime - this.ctx.currentTime) * 1000 + 50);
      this.timerId = window.setTimeout(() => {
        this.timerId = null;
        const r = this.doneResolver;
        this.doneResolver = undefined;
        if (r) r();
      }, tailMs);
      return;
    }

    this.timerId = window.setTimeout(() => this.scheduler(), this.lookaheadMs);
  }

  private scheduleClick(time: number, isDownbeat: boolean) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = isDownbeat ? 1500 : 1000;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(this.gainLevel, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    osc.connect(gain).connect(this.destination);
    osc.start(time);
    osc.stop(time + 0.06);
  }
}
