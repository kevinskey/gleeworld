// Tone.js wrapper that plays a chord chart with a metronome click.
//
// Lifecycle:
//   const engine = new ChordEngine();
//   await engine.start(chart, bpm, { onBar, onBeat, onStop });
//   engine.stop();
//
// One engine instance per app — Tone has a single global Transport, so we
// reuse synths across plays and just rebuild the schedule each start().

import * as Tone from 'tone';
import { parseChord } from './chords';
import type { TimeSignature, ChordChart, ChordLoop } from './types';

const beatsPerBar = (sig: TimeSignature): number => {
  switch (sig) {
    case '4/4': return 4;
    case '3/4': return 3;
    case '6/8': return 6;
    case '2/4': return 2;
  }
};

export type EngineCallbacks = {
  onBar?: (barIndex: number) => void;
  onBeat?: (barIndex: number, beatInBar: number) => void;
  onStop?: () => void;
};

export type StartOptions = {
  loop?: ChordLoop | null;
  click?: boolean;
};

export class ChordEngine {
  private chordSynth: Tone.PolySynth | null = null;
  private bassSynth: Tone.Synth | null = null;
  private clickSynth: Tone.MembraneSynth | null = null;
  private accentSynth: Tone.MembraneSynth | null = null;
  private parts: Tone.Part[] = [];
  // Read by every click callback so the user can mute/unmute mid-playback
  // without restarting.
  private clickEnabled = true;

  setClick(on: boolean) { this.clickEnabled = on; }

  private ensureSynths() {
    if (!this.chordSynth) {
      this.chordSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.4, sustain: 0.4, release: 1.4 },
        volume: -10,
      }).toDestination();
    }
    if (!this.bassSynth) {
      this.bassSynth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.02, decay: 0.5, sustain: 0.5, release: 1.5 },
        volume: -8,
      }).toDestination();
    }
    if (!this.clickSynth) {
      this.clickSynth = new Tone.MembraneSynth({
        pitchDecay: 0.01,
        octaves: 4,
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
        volume: -16,
      }).toDestination();
    }
    if (!this.accentSynth) {
      this.accentSynth = new Tone.MembraneSynth({
        pitchDecay: 0.01,
        octaves: 4,
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
        volume: -10,
      }).toDestination();
    }
  }

  async start(chart: ChordChart, bpm: number, cb: EngineCallbacks = {}, opts: StartOptions = {}) {
    if (chart.bars.length === 0) return;

    await Tone.start();
    this.ensureSynths();
    this.disposeParts();

    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    Tone.Transport.position = 0;
    Tone.Transport.bpm.value = bpm;

    const beats = beatsPerBar(chart.time_signature);
    Tone.Transport.timeSignature = beats;

    const beatDur = '4n';
    const subBeatDur = chart.time_signature === '6/8' ? '8n' : '4n';
    const beatSec = 60 / bpm;
    const barSec = beats * beatSec;

    type ChordEvt = { time: number; notes: string[]; bass?: string };
    type ClickEvt = { time: number; accent: boolean; barIdx: number; beatInBar: number };

    const chordEvents: ChordEvt[] = [];
    const clickEvents: ClickEvt[] = [];

    // Encode one bar's worth of click + chord events at the given time offset,
    // using the *original* bar index for UI highlighting (so the third loop
    // pass still highlights bar 3, not "the 9th bar in the schedule").
    const emitBar = (barIdx: number, timeOffset: number) => {
      const bar = chart.bars[barIdx];
      const chords = bar.chords.length > 0 ? bar.chords : [''];
      chords.forEach((symbol, chordIdx) => {
        if (!symbol.trim()) return;
        const parsed = parseChord(symbol);
        if (!parsed) return;
        const fractional = (chordIdx / chords.length) * beats;
        chordEvents.push({
          time: timeOffset + fractional * beatSec,
          notes: parsed.notes,
          bass: parsed.bass,
        });
      });
      for (let beat = 0; beat < beats; beat++) {
        clickEvents.push({
          time: timeOffset + beat * beatSec,
          accent: beat === 0,
          barIdx,
          beatInBar: beat,
        });
      }
    };

    // Validate + clamp loop region to the actual bar count.
    const loop: ChordLoop | null = opts.loop && chart.bars.length > 0 ? {
      startBar: Math.max(0, Math.min(opts.loop.startBar, chart.bars.length - 1)),
      endBar: Math.max(0, Math.min(opts.loop.endBar, chart.bars.length - 1)),
      count: Math.max(0, Math.floor(opts.loop.count || 0)),
    } : null;
    const validLoop = loop && loop.endBar >= loop.startBar;

    let cursor = 0;
    const finiteRepeats = validLoop && loop.count > 0;
    const infiniteRepeats = validLoop && loop.count === 0;

    if (validLoop) {
      // 1. Pre-loop bars play once.
      for (let i = 0; i < loop.startBar; i++) {
        emitBar(i, cursor);
        cursor += barSec;
      }
      if (finiteRepeats) {
        // 2a. Loop region played `count` times in-line (single expanded schedule).
        for (let r = 0; r < loop.count; r++) {
          for (let i = loop.startBar; i <= loop.endBar; i++) {
            emitBar(i, cursor);
            cursor += barSec;
          }
        }
        // 3. Post-loop bars play once.
        for (let i = loop.endBar + 1; i < chart.bars.length; i++) {
          emitBar(i, cursor);
          cursor += barSec;
        }
      }
      // 2b. For infinite mode we DON'T inline the loop — we attach a separate
      // looping Part below that starts at `cursor` and wraps the loop region.
    } else {
      for (let i = 0; i < chart.bars.length; i++) {
        emitBar(i, cursor);
        cursor += barSec;
      }
    }

    const chordPart = new Tone.Part<ChordEvt>((t, e) => {
      this.chordSynth!.triggerAttackRelease(e.notes, beatDur, t, 0.7);
      if (e.bass) this.bassSynth!.triggerAttackRelease(e.bass, beatDur, t, 0.9);
    }, chordEvents);

    this.clickEnabled = opts.click !== false;
    const clickPart = new Tone.Part<ClickEvt>((t, e) => {
      if (this.clickEnabled) {
        if (e.accent) this.accentSynth!.triggerAttackRelease('G3', subBeatDur, t);
        else this.clickSynth!.triggerAttackRelease('C3', subBeatDur, t);
      }
      Tone.Draw.schedule(() => {
        if (e.beatInBar === 0) cb.onBar?.(e.barIdx);
        cb.onBeat?.(e.barIdx, e.beatInBar);
      }, t);
    }, clickEvents);

    chordPart.start(0);
    clickPart.start(0);
    this.parts.push(chordPart as unknown as Tone.Part);
    this.parts.push(clickPart as unknown as Tone.Part);

    if (infiniteRepeats) {
      // Attach an additional looping Part containing only the loop region;
      // it starts where the pre-loop ended and never stops.
      const loopChordEvents: ChordEvt[] = [];
      const loopClickEvents: ClickEvt[] = [];
      let lc = 0;
      for (let i = loop!.startBar; i <= loop!.endBar; i++) {
        const bar = chart.bars[i];
        const chords = bar.chords.length > 0 ? bar.chords : [''];
        chords.forEach((symbol, chordIdx) => {
          if (!symbol.trim()) return;
          const parsed = parseChord(symbol);
          if (!parsed) return;
          const fractional = (chordIdx / chords.length) * beats;
          loopChordEvents.push({
            time: lc + fractional * beatSec,
            notes: parsed.notes,
            bass: parsed.bass,
          });
        });
        for (let beat = 0; beat < beats; beat++) {
          loopClickEvents.push({
            time: lc + beat * beatSec,
            accent: beat === 0,
            barIdx: i,
            beatInBar: beat,
          });
        }
        lc += barSec;
      }

      const loopChord = new Tone.Part<ChordEvt>((t, e) => {
        this.chordSynth!.triggerAttackRelease(e.notes, beatDur, t, 0.7);
        if (e.bass) this.bassSynth!.triggerAttackRelease(e.bass, beatDur, t, 0.9);
      }, loopChordEvents);

      const loopClick = new Tone.Part<ClickEvt>((t, e) => {
        if (this.clickEnabled) {
          if (e.accent) this.accentSynth!.triggerAttackRelease('G3', subBeatDur, t);
          else this.clickSynth!.triggerAttackRelease('C3', subBeatDur, t);
        }
        Tone.Draw.schedule(() => {
          if (e.beatInBar === 0) cb.onBar?.(e.barIdx);
          cb.onBeat?.(e.barIdx, e.beatInBar);
        }, t);
      }, loopClickEvents);

      loopChord.loop = true;
      loopClick.loop = true;
      loopChord.loopStart = 0;
      loopClick.loopStart = 0;
      loopChord.loopEnd = lc;
      loopClick.loopEnd = lc;
      loopChord.start(cursor);
      loopClick.start(cursor);
      this.parts.push(loopChord as unknown as Tone.Part);
      this.parts.push(loopClick as unknown as Tone.Part);
    } else {
      // Auto-stop at the end of the schedule.
      Tone.Transport.scheduleOnce((t) => {
        Tone.Draw.schedule(() => {
          this.stop();
          cb.onStop?.();
        }, t);
      }, cursor);
    }

    Tone.Transport.start();
  }

  stop() {
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    this.disposeParts();
  }

  private disposeParts() {
    this.parts.forEach((p) => { try { p.dispose(); } catch { /* noop */ } });
    this.parts = [];
  }

  dispose() {
    this.stop();
    this.chordSynth?.dispose();
    this.bassSynth?.dispose();
    this.clickSynth?.dispose();
    this.accentSynth?.dispose();
    this.chordSynth = null;
    this.bassSynth = null;
    this.clickSynth = null;
    this.accentSynth = null;
  }
}
