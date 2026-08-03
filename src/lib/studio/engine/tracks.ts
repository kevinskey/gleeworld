// Bind a Track from the session to a live audio graph node. Each
// track has:
//
//   panvol → fx chain → eq bands → output
//
// Audio tracks schedule Tone.Player instances per clip on the transport.
// MIDI tracks schedule note triggers against the track's instrument.
//
// Solo handling: a track is silenced when ANY track is soloed and it
// isn't. The engine could compute that globally — for Phase 2 we just
// honor mute; solo logic can be layered in when the mixer UI lands.

import * as Tone from 'tone';
import type { AudioAsset, AudioClip, MidiClip, Track } from '../session';
import { isAudioTrack, isMidiTrack, sanitizeCc } from '../session';
import { dbToGain } from './engine';
import { applySustain, trimNotesToDuration } from '../midiEdit';
import { buildFxChain, type EngineFxChain } from './fx';
import { buildInstrument, type EngineInstrument } from './instruments';
import { getAssetUrlSync } from './assetUrlCache';
import { enabledEqBands, eqBandToBiquadOptions } from './trackEq';

/** A clip + its loaded player, ready to be (re-)scheduled on the
 * transport. The engine collects these so it can re-register the
 * one-time `transport.schedule()` callbacks every time the user
 * presses Play (since `schedule` events are consumed on fire). */
export interface ClipPlayback {
  clipId: string;
  player: Tone.Player;
  startSeconds: number;
  offsetSeconds: number;
  durationSeconds: number;
}

export interface EngineTrack {
  trackId: string;
  output: Tone.ToneAudioNode;
  /** Pre-fader tap — signal BEFORE panvol. Pre-fader sends read here
   *  so a fader drag doesn't scale the send level. v2.0.0. */
  preFaderTap: Tone.ToneAudioNode;
  /** Post-fader tap — signal AFTER volume+pan+mute, BEFORE track FX.
   *  Post-fader sends read here. Muting the track silences post-fader
   *  sends too, which matches the DAW convention. v2.0.0. */
  postFaderTap: Tone.ToneAudioNode;
  /** Strip's PanVol node — exposed so automation (Phase 8) can drive
   *  .volume / .pan directly. Not for signal-graph reconnection;
   *  updateStrip is the only supported strip mutator. */
  panvol: Tone.PanVol;
  /** User-facing mute flag (persisted to session). Engine layer
   * uses this when computing solo overrides. */
  userMute: boolean;
  userSolo: boolean;
  /** Live clip→player pairs the engine can re-schedule on Play. */
  playbacks: ClipPlayback[];
  /** MIDI tracks' built instrument (undefined for audio tracks). Exposed
   *  so the engine can call `instrument?.releaseAll?.()` on pause/stop/
   *  seek — held synth/sampler voices are free-running like clip Players
   *  and must be cut explicitly, the transport doesn't touch them. */
  instrument?: EngineInstrument;
  updateStrip: (patch: { volume_db?: number; pan?: number; mute?: boolean; solo?: boolean }) => void;
  /** Incremental clip add — no track rebuild, no other clips touched.
   *  Used after a fresh recording lands so the new take is immediately
   *  playable without a full engine reload. */
  addClip: (clip: AudioClip, asset: AudioAsset) => void;
  /** Incremental clip remove. */
  removeClip: (clipId: string) => void;
  dispose: () => void;
}

export function buildTrack(track: Track, assets: AudioAsset[]): EngineTrack {
  // v2.0.0 signal path:
  //   source → preTap (unity Gain) → panvol → muteGate → fx → eq → output
  // preTap exists so pre-fader sends can read the raw source without
  // the fader/pan/mute applied. It's a passthrough (gain=1) on the
  // main signal path; only sends fan out from it. Pre-existing behavior
  // is preserved — no signal change vs. Phase 4a.
  const preTap = new Tone.Gain(1);
  const panvol = new Tone.PanVol(track.pan, track.volume_db);
  const muteGate = new Tone.Gain(track.mute ? 0 : 1);
  const fx = buildFxChain(track.fx);
  preTap.connect(panvol);
  panvol.connect(muteGate);
  muteGate.connect(fx.input);
  // Belt-and-suspenders: explicitly set the gain again after construction.
  // Some Tone versions don't fully resolve initializer values until the
  // node is referenced through its `.gain.value` setter.
  muteGate.gain.value = track.mute ? 0 : 1;

  // Per-track EQ (B1): one BiquadFilterNode per ENABLED track.eq band,
  // in series between the FX chain and the track output, in session
  // order. Canonical `q` IS the Web Audio BiquadFilterNode Q for these
  // RBJ filter types — passed through 1:1, no conversion (full mapping
  // note + per-type footnotes in trackEq.ts). Bands are baked into the
  // graph at build time (exactly like buildFxChain skips bypassed FX),
  // so ANY eq change rebuilds the track via useStudio's skeleton diff —
  // the same rebuild path fx changes take (trackEqSig sits next to the
  // fx signature in skeletonSig).
  const eqNodes = enabledEqBands(track.eq).map((band) => {
    const o = eqBandToBiquadOptions(band);
    return new Tone.BiquadFilter({ type: o.type, frequency: o.frequency, gain: o.gain, Q: o.Q });
  });
  let eqTail: Tone.ToneAudioNode = fx.output;
  for (const node of eqNodes) {
    eqTail.connect(node);
    eqTail = node;
  }

  const disposers: Array<() => void> = [
    () => preTap.dispose(),
    () => panvol.dispose(),
    () => muteGate.dispose(),
    () => fx.dispose(),
    () => { for (const n of eqNodes) n.dispose(); },
  ];
  const playbacks: ClipPlayback[] = [];
  let instrument: EngineInstrument | undefined;

  // Sources now feed preTap instead of panvol so pre-fader sends see
  // the raw signal. Main path still flows preTap → panvol → ... as
  // before, so audible output is identical.
  if (isAudioTrack(track)) {
    const assetMap = new Map(assets.map((a) => [a.id, a]));
    for (const clip of track.clips) {
      const asset = assetMap.get(clip.asset_id);
      if (!asset) continue;
      scheduleAudioClip(clip, asset, preTap, disposers, playbacks);
    }
  } else if (isMidiTrack(track)) {
    const inst = buildInstrument(track.instrument);
    instrument = inst;
    inst.output.connect(preTap);
    disposers.push(() => inst.dispose());
    for (const clip of track.clips) {
      scheduleMidiClip(clip, inst, disposers);
    }
  }

  return {
    trackId: track.id,
    // Track output = the last enabled EQ band, or fx.output when the
    // track has no enabled EQ (eqTail starts life as fx.output).
    output: eqTail,
    preFaderTap: preTap,
    postFaderTap: muteGate,
    panvol,
    userMute: track.mute,
    userSolo: track.solo,
    playbacks,
    instrument,
    updateStrip: (patch) => {
      // Smooth ramps (30 ms) prevent the click/pop you'd otherwise get
      // when the user drags a fader during playback. linearRampTo on the
      // Param keeps the schedule consistent with anything else queued.
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
    addClip: (clip, asset) => {
      if (!isAudioTrack(track)) return;
      scheduleAudioClip(clip, asset, panvol, disposers, playbacks);
    },
    removeClip: (clipId) => {
      // The matching disposer lives at the same index in `disposers` as
      // the playback in `playbacks` (both pushed by scheduleAudioClip).
      // Find and run the disposer that controls this clip's player.
      const pbIdx = playbacks.findIndex((p) => p.clipId === clipId);
      if (pbIdx < 0) return;
      // The disposer added by scheduleAudioClip removes the playback
      // entry by clipId — call it directly. We don't need to splice
      // disposers (running it twice is a no-op since player.dispose is
      // idempotent), but we DO want the cleanup side-effects now.
      // The disposer references `playbacks` by clipId so it works
      // regardless of where it sits in the disposers array.
      const pb = playbacks[pbIdx];
      try { pb.player.stop(); } catch { /* ignore */ }
      try { pb.player.dispose(); } catch { /* ignore */ }
      playbacks.splice(pbIdx, 1);
    },
    dispose: () => {
      for (const d of disposers) try { d(); } catch { /* ignore */ }
    },
  };
}

function scheduleAudioClip(
  clip: AudioClip,
  asset: AudioAsset,
  destination: Tone.ToneAudioNode,
  disposers: Array<() => void>,
  playbacks: ClipPlayback[],
) {
  const url = getAssetUrlSync(asset.id);
  if (!url) {
    console.warn('[studio] no signed URL cached for asset', asset.id);
    return;
  }
  console.log('[studio] scheduleAudioClip', { clipId: clip.id, assetId: asset.id, start: clip.start_seconds, duration: clip.duration_seconds, url: url.slice(0, 80) + '…' });

  const transport = Tone.getTransport();
  let scheduleId: number | null = null;

  const player = new Tone.Player({
    url,
    loop: false,
    autostart: false,
    reverse: clip.reverse,
    playbackRate: clip.time_stretch > 0 ? 1 / clip.time_stretch : 1,
    fadeIn: clip.fade_in_seconds,
    fadeOut: clip.fade_out_seconds,
    onload: () => {
      console.log('[studio] player loaded', { clipId: clip.id });
      if (player.disposed) return;
      // Register this clip as ready for re-scheduling on every Play.
      playbacks.push({
        clipId: clip.id,
        player,
        startSeconds: clip.start_seconds,
        offsetSeconds: clip.offset_seconds,
        durationSeconds: clip.duration_seconds,
      });
      // If the transport is already running, schedule this run too —
      // the engine's play()-time scheduler hasn't seen this player yet.
      if (transport.state === 'started') {
        const pos = transport.seconds;
        if (pos < clip.start_seconds) {
          scheduleId = transport.schedule((time) => {
            player.start(time, clip.offset_seconds, clip.duration_seconds);
          }, clip.start_seconds);
        } else if (pos < clip.start_seconds + clip.duration_seconds) {
          const into = pos - clip.start_seconds;
          try {
            player.start('+0', clip.offset_seconds + into, clip.duration_seconds - into);
          } catch (e) { console.error('[studio] immediate start failed', e); }
        }
      }
    },
    onerror: (err) => {
      console.error('[studio] Tone.Player load error for asset', asset.id, err);
    },
  });
  const gain = new Tone.Gain(dbToGain(clip.gain_db));
  player.connect(gain);
  gain.connect(destination);

  disposers.push(() => {
    if (scheduleId !== null) transport.clear(scheduleId);
    const idx = playbacks.findIndex((p) => p.clipId === clip.id);
    if (idx >= 0) playbacks.splice(idx, 1);
    try { player.dispose(); } catch { /* already disposed */ }
    gain.dispose();
  });
}

function scheduleMidiClip(
  clip: MidiClip,
  inst: EngineInstrument,
  disposers: Array<() => void>,
) {
  const transport = Tone.getTransport();
  const eventIds: number[] = [];
  // Pedal-lengthened effective durations (1.1.0 cc clips). Legacy clips
  // (no cc) pass through applySustain untouched — identical output.
  // sanitizeCc guards against a corrupt/malformed cc reaching the
  // scheduler even on a path that skipped validateSession() (spec §7:
  // corrupt/absent cc must behave as []).
  // trimNotesToDuration is defense-in-depth: MidiClipBlock's right-trim
  // already writes truncated notes into the clip, so persisted clips are
  // already trimmed — this guards legacy manifests saved before that
  // wiring existed. It runs BEFORE applySustain on purpose: a note that
  // was cut short by the trim can still be pedal-extended past the clip
  // boundary, same as an audio clip's tail ringing past its own edge —
  // what you see in the roll is the note's start/attack, not a promise
  // that the pedal can't carry it further.
  for (const note of applySustain(trimNotesToDuration(clip.notes, clip.duration_seconds), sanitizeCc(clip.cc))) {
    const noteStart = clip.start_seconds + note.start_seconds;
    const id = transport.schedule((time) => {
      inst.triggerAttackRelease(note.pitch, note.duration_seconds, time, note.velocity / 127);
    }, noteStart);
    eventIds.push(id);
  }
  disposers.push(() => {
    for (const id of eventIds) transport.clear(id);
  });
}
