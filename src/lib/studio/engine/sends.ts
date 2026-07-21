// Runtime wrapper for one track send.
//
// A send taps a Gain node off the source track (from the pre-fader
// tap when `pre_fader: true`, or from the post-fader tap when
// `pre_fader: false`) and routes it into the target bus's input.
// Disabled sends are baked as gain=0 so a toggle is a live change,
// not a graph rebuild.
//
// The tap fan-out uses a second `.connect()` on the same source node
// — Tone lets you connect a source to multiple downstream targets
// without disturbing the primary edge.

import * as Tone from 'tone';
import type { Send } from '../session';
import { dbToGain } from './engine';

export interface EngineSend {
  sendId: string;
  gain: Tone.Gain;
  targetBusId: string;
  preFader: boolean;
  enabled: boolean;
  /** Wired source (tap point) — kept so dispose() can disconnect
   *  exactly the edge this send installed. */
  source: Tone.ToneAudioNode;
  /** Wired target (bus input) — same story. */
  target: Tone.ToneAudioNode;
  updateLevel: (levelDb: number) => void;
  dispose: () => void;
}

/** Wire one send: source (pre or post tap) → gain → target bus input.
 *  Disabled sends have gain=0 so the graph stays wired the same way
 *  whether the send is on or off (a toggle is a param change, not a
 *  structural rebuild). */
export function buildSend(
  spec: Send,
  source: Tone.ToneAudioNode,
  target: Tone.ToneAudioNode,
): EngineSend {
  const gainValue = spec.enabled ? dbToGain(spec.level_db) : 0;
  const gain = new Tone.Gain(gainValue);
  source.connect(gain);
  gain.connect(target);
  return {
    sendId: spec.id,
    gain,
    targetBusId: spec.target_bus_id,
    preFader: spec.pre_fader,
    enabled: spec.enabled,
    source,
    target,
    updateLevel: (levelDb) => {
      const now = Tone.now();
      const target = spec.enabled ? dbToGain(levelDb) : 0;
      try { gain.gain.cancelScheduledValues(now); gain.gain.linearRampTo(target, 0.03, now); }
      catch { gain.gain.value = target; }
    },
    dispose: () => {
      try { source.disconnect(gain); } catch { /* already gone */ }
      try { gain.disconnect(target); } catch { /* already gone */ }
      try { gain.dispose(); } catch { /* already gone */ }
    },
  };
}
