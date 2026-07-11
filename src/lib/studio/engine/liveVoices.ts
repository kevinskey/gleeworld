import * as Tone from 'tone';
import type { Instrument } from '../session';
import { buildInstrument, type EngineInstrument } from './instruments';

// Plays a MIDI keyboard live through a track's instrument, independent of the
// scheduled-playback engine. Builds one EngineInstrument from the given spec and
// routes it straight to the main output (track FX/mixer are intentionally NOT in
// this monitoring path — v1). Rebuild via setInstrument() when the armed track's
// instrument changes; dispose() when input turns off.
export class LiveVoices {
  private inst: EngineInstrument | null = null;
  private specKey = '';
  private held = new Set<number>();

  setInstrument(spec: Instrument | null): void {
    const key = spec ? `${spec.type}:${spec.preset_id ?? ''}` : '';
    if (key === this.specKey) return; // no-op when unchanged (avoids audio glitches)
    this.disposeInst();
    this.specKey = key;
    if (!spec) return;
    this.inst = buildInstrument(spec);
    this.inst.output.connect(Tone.getDestination());
  }

  noteOn(pitch: number, velocity01: number): void {
    const inst = this.inst;
    if (!inst) return;
    const now = Tone.now();
    this.held.add(pitch);
    if (inst.triggerAttack) inst.triggerAttack(pitch, now, velocity01);
    else inst.triggerAttackRelease(pitch, 0.3, now, velocity01); // one-shot fallback (drums)
  }

  noteOff(pitch: number): void {
    const inst = this.inst;
    this.held.delete(pitch);
    if (inst?.triggerRelease) inst.triggerRelease(pitch, Tone.now());
  }

  dispose(): void {
    this.disposeInst();
    this.held.clear();
    this.specKey = '';
  }

  private disposeInst(): void {
    if (!this.inst) return;
    try { this.inst.dispose(); } catch { /* already gone */ }
    this.inst = null;
  }
}
