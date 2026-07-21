// Runtime wrapper for one session Bus — mirror of EngineTrack, minus
// clip scheduling. A bus is a stereo submix: things (tracks or other
// buses) connect INTO its `input` node; the bus fader + pan + inserts
// process the mixed signal; the tail (`output`) connects to whatever
// downstream target the session declares (another bus or master).
//
// Solo semantics extend the track logic: while ANY bus or track is
// soloed, non-soloed buses whose downstream tail doesn't feed a
// soloed source are muted. The engine computes this globally.

import * as Tone from 'tone';
import type { Bus } from '../session';
import { buildFxChain, type EngineFxChain } from './fx';

export interface EngineBus {
  busId: string;
  /** Where other tracks/buses connect INTO this bus. */
  input: Tone.ToneAudioNode;
  /** The tail of the strip — connect this to a downstream target
   *  (another bus's input, or the engine's masterIn). */
  output: Tone.ToneAudioNode;
  /** Strip's PanVol node — exposed so automation (Phase 8) can drive
   *  .volume / .pan directly. Not for signal-graph reconnection. */
  panvol: Tone.PanVol;
  userMute: boolean;
  userSolo: boolean;
  updateStrip: (patch: { volume_db?: number; pan?: number; mute?: boolean; solo?: boolean }) => void;
  dispose: () => void;
}

export function buildBus(bus: Bus): EngineBus {
  const panvol = new Tone.PanVol(bus.pan, bus.volume_db);
  const muteGate = new Tone.Gain(bus.mute ? 0 : 1);
  const fx = buildFxChain(bus.fx);

  panvol.connect(muteGate);
  muteGate.connect(fx.input);

  const disposers: Array<() => void> = [
    () => panvol.dispose(),
    () => muteGate.dispose(),
    () => fx.dispose(),
  ];

  return {
    busId: bus.id,
    input: panvol,
    output: fx.output,
    panvol,
    userMute: bus.mute,
    userSolo: bus.solo,
    updateStrip: (patch) => {
      const now = Tone.now();
      if (patch.volume_db !== undefined) {
        try { panvol.volume.cancelScheduledValues(now); panvol.volume.linearRampTo(patch.volume_db, 0.03, now); }
        catch { panvol.volume.value = patch.volume_db; }
      }
      if (patch.pan !== undefined) {
        try { panvol.pan.cancelScheduledValues(now); panvol.pan.linearRampTo(patch.pan, 0.03, now); }
        catch { panvol.pan.value = patch.pan; }
      }
      if (patch.mute !== undefined) {
        try { muteGate.gain.cancelScheduledValues(now); muteGate.gain.linearRampTo(patch.mute ? 0 : 1, 0.02, now); }
        catch { muteGate.gain.value = patch.mute ? 0 : 1; }
      }
      // solo handled by caller (engine-level)
    },
    dispose: () => {
      for (const d of disposers) try { d(); } catch { /* ignore */ }
    },
  };
}

// Silence the unused type-import warning on downstream files.
export type _EngineFxChainMarker = EngineFxChain;
