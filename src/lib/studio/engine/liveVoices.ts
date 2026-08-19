import * as Tone from 'tone';
import type { Instrument, TrackEqBand } from '../session';
import { buildInstrument, type EngineInstrument } from './instruments';
import { enabledEqBands, eqBandToBiquadOptions, trackEqSig } from './trackEq';
import { registerStudioAudio } from '../audioLeakGuard';

// Plays a MIDI keyboard live through a track's instrument, independent of the
// scheduled-playback engine. Builds one EngineInstrument from the given spec
// and routes it through the strip + EQ mirror kept in sync with the target
// track, terminating at an OUTPUT NODE the caller passes — normally the
// StudioEngine's masterIn, so live playing inherits master pan, master FX,
// mastering (HPF / Air / comp / ceiling / target LUFS), and Master Out from
// the same downstream chain playback uses. Callers that don't yet have the
// engine (e.g. warming, tests) can pass Tone.getDestination() as a fallback.
// Track FX are still NOT in this monitoring path (would require rebuilding
// the fx chain per edit). Rebuild via setInstrument() when the armed
// track's instrument changes; dispose() when input turns off.
// Triggers use Tone.immediate(): monitoring must not pay the transport lookAhead (~100ms); scheduled playback keeps its lookahead elsewhere.
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
  private output: Tone.ToneAudioNode | AudioNode;

  private unregister: () => void;

  constructor(output: Tone.ToneAudioNode | AudioNode = Tone.getDestination()) {
    this.panvol = new Tone.PanVol(0, 0);
    this.muteGate = new Tone.Gain(1);
    this.output = output;
    this.panvol.connect(this.muteGate);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.muteGate.connect(this.output as any);
    // Leak guard: if the owning effect's cleanup never runs (aborted
    // cleanup batch on unmount — seen in prod), the route-level
    // disposeAllStudioAudio() still reaches this instance.
    this.unregister = registerStudioAudio(this);
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
    // link into either the old first band (if any) or the output node, so
    // we can rewire cleanly below.
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tail.connect(this.output as any);
  }

  // Live monitoring MUST trigger at Tone.immediate() (raw currentTime),
  // never Tone.now(): now() adds context.lookAhead — 100ms at Tone's
  // default — on top of device output latency, which made live playing
  // feel a tenth of a second behind the keys. The lookahead exists so
  // TRANSPORT-scheduled events survive main-thread jank; an
  // already-received key press has nothing to look ahead for.

  noteOn(pitch: number, velocity01: number): void {
    const inst = this.inst;
    if (!inst) return;
    const now = Tone.immediate();
    // Re-striking a sustained pitch: release the ringing voice first so the
    // new attack doesn't stack on top of it.
    if (this.sustained.delete(pitch) && inst.triggerRelease) inst.triggerRelease(pitch, now);
    // Duplicate note-on for a pitch that is still HELD stacks a second
    // voice on it — and the single note-off then frees only one, leaving
    // the other ringing forever (the "stuck note"). Real keyboards make
    // this ordinary, not exotic: Komplete Kontrol hardware echoes every
    // key on 2–3 ports and the Studio subscribes to "All MIDI inputs",
    // so one press arrives as 2–3 note-ons. Release the held voice
    // before re-attacking so a pitch can never stack.
    if (this.held.has(pitch) && inst.triggerRelease) inst.triggerRelease(pitch, now);
    this.held.add(pitch);
    if (inst.triggerAttack) inst.triggerAttack(pitch, now, velocity01);
    else inst.triggerAttackRelease(pitch, 0.3, now, velocity01); // one-shot fallback (drums)
  }

  noteOff(pitch: number): void {
    this.held.delete(pitch);
    if (this.pedalDown) { this.sustained.add(pitch); return; } // damper keeps it ringing
    if (this.inst?.triggerRelease) this.inst.triggerRelease(pitch, Tone.immediate());
  }

  /** Piano damper (CC64). Lifting releases every sustained pitch whose key
   * is no longer physically held. Duplicate messages are no-ops. */
  sustain(down: boolean): void {
    if (down === this.pedalDown) return;
    this.pedalDown = down;
    if (down) return;
    const inst = this.inst;
    if (inst?.triggerRelease) {
      const now = Tone.immediate();
      for (const p of this.sustained) if (!this.held.has(p)) inst.triggerRelease(p, now);
    }
    this.sustained.clear();
  }

  dispose(): void {
    this.unregister();
    this.disposeInst();
    this.held.clear();
    this.pedalDown = false;
    this.specKey = '';
    for (const n of this.eqNodes) { try { n.dispose(); } catch { /* already gone */ } }
    this.eqNodes = [];
    this.eqSig = '';
    try { this.panvol.dispose(); this.muteGate.dispose(); } catch { /* already gone */ }
  }

  private disposeInst(): void {
    this.sustained.clear(); // voices die with the instrument
    if (!this.inst) return;
    // Belt-and-braces ordering: silence every voice BEFORE disposal.
    // dispose() is supposed to kill active voices too, but a voice that
    // survives a mid-note instrument switch rings with no handle left to
    // release it — the failure mode behind tonight's endless tone.
    try { this.inst.releaseAll?.(); } catch { /* nothing held */ }
    try { this.inst.dispose(); } catch { /* already gone */ }
    this.inst = null;
  }
}
