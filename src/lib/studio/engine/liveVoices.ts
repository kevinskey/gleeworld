import * as Tone from 'tone';
import type { Instrument, TrackEqBand } from '../session';
import { buildInstrument, type EngineInstrument } from './instruments';
import { dbToGain } from './engine';
import { enabledEqBands, eqBandToBiquadOptions, trackEqSig } from './trackEq';

// Plays a MIDI keyboard live through a track's instrument, independent of the
// scheduled-playback engine. Builds one EngineInstrument from the given spec
// and routes it through the strip + EQ + master mirror kept in sync with the
// target track and the session's master strip, so live playing hears the same
// volume / pan / mute / EQ / master out that playback does. Track FX are
// still NOT in this monitoring path (would require rebuilding the fx chain
// on every edit). Rebuild via setInstrument() when the armed track's
// instrument changes; dispose() when input turns off.
export class LiveVoices {
  private inst: EngineInstrument | null = null;
  private specKey = '';
  private eqNodes: Tone.BiquadFilter[] = [];
  private eqSig = '';
  private held = new Set<number>();
  private pedalDown = false;
  private sustained = new Set<number>(); // key up, damper holding the voice
  private panvol: Tone.PanVol;
  private muteGate: Tone.Gain;
  private masterGain: Tone.Gain;

  constructor() {
    this.panvol = new Tone.PanVol(0, 0);
    this.muteGate = new Tone.Gain(1);
    this.masterGain = new Tone.Gain(1);
    this.panvol.connect(this.muteGate);
    this.muteGate.connect(this.masterGain);
    this.masterGain.connect(Tone.getDestination());
  }

  setInstrument(spec: Instrument | null): void {
    const key = spec ? `${spec.type}:${spec.preset_id ?? ''}` : '';
    if (key === this.specKey) return; // no-op when unchanged (avoids audio glitches)
    this.disposeInst();
    this.specKey = key;
    if (!spec) return;
    this.inst = buildInstrument(spec);
    this.inst.output.connect(this.panvol);
  }

  /** Mirror the target track's strip so the live monitor is controlled by
   * the same knobs the user sees on the track. */
  setStrip(strip: { volume_db: number; pan: number; mute: boolean }): void {
    this.panvol.volume.value = strip.volume_db;
    this.panvol.pan.value = strip.pan;
    this.muteGate.gain.value = strip.mute ? 0 : 1;
  }

  /** Mirror the target track's EQ into the monitor path. Rebuilds the chain
   * on any band change (params, order, enabled, add/remove) — matches the
   * skeleton-diff full-rebuild policy the playback engine uses. */
  setEq(bands: TrackEqBand[] | undefined): void {
    const sig = trackEqSig(bands);
    if (sig === this.eqSig) return;
    this.eqSig = sig;
    // Tear down the current EQ segment. muteGate.disconnect() drops the
    // link into either the old first band (if any) or masterGain, so we
    // can rewire cleanly below.
    try { this.muteGate.disconnect(); } catch { /* nothing wired */ }
    for (const n of this.eqNodes) { try { n.dispose(); } catch { /* already gone */ } }
    this.eqNodes = enabledEqBands(bands).map((band) => {
      const o = eqBandToBiquadOptions(band);
      return new Tone.BiquadFilter({ type: o.type, frequency: o.frequency, gain: o.gain, Q: o.Q });
    });
    let tail: Tone.ToneAudioNode = this.muteGate;
    for (const node of this.eqNodes) {
      tail.connect(node);
      tail = node;
    }
    tail.connect(this.masterGain);
  }

  /** Mirror the session's master out so the Master Out sliders control the
   * live monitor the same way they control playback. */
  setMaster(volume_db: number): void {
    this.masterGain.gain.value = dbToGain(volume_db);
  }

  noteOn(pitch: number, velocity01: number): void {
    const inst = this.inst;
    if (!inst) return;
    const now = Tone.now();
    // Re-striking a sustained pitch: release the ringing voice first so the
    // new attack doesn't stack on top of it.
    if (this.sustained.delete(pitch) && inst.triggerRelease) inst.triggerRelease(pitch, now);
    this.held.add(pitch);
    if (inst.triggerAttack) inst.triggerAttack(pitch, now, velocity01);
    else inst.triggerAttackRelease(pitch, 0.3, now, velocity01); // one-shot fallback (drums)
  }

  noteOff(pitch: number): void {
    this.held.delete(pitch);
    if (this.pedalDown) { this.sustained.add(pitch); return; } // damper keeps it ringing
    if (this.inst?.triggerRelease) this.inst.triggerRelease(pitch, Tone.now());
  }

  /** Piano damper (CC64). Lifting releases every sustained pitch whose key
   * is no longer physically held. Duplicate messages are no-ops. */
  sustain(down: boolean): void {
    if (down === this.pedalDown) return;
    this.pedalDown = down;
    if (down) return;
    const inst = this.inst;
    if (inst?.triggerRelease) {
      const now = Tone.now();
      for (const p of this.sustained) if (!this.held.has(p)) inst.triggerRelease(p, now);
    }
    this.sustained.clear();
  }

  dispose(): void {
    this.disposeInst();
    this.held.clear();
    this.pedalDown = false;
    this.specKey = '';
    for (const n of this.eqNodes) { try { n.dispose(); } catch { /* already gone */ } }
    this.eqNodes = [];
    this.eqSig = '';
    try { this.panvol.dispose(); this.muteGate.dispose(); this.masterGain.dispose(); } catch { /* already gone */ }
  }

  private disposeInst(): void {
    this.sustained.clear(); // voices die with the instrument
    if (!this.inst) return;
    try { this.inst.dispose(); } catch { /* already gone */ }
    this.inst = null;
  }
}
