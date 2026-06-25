// Bind a Track from the session to a live audio graph node. Each
// track has:
//
//   panvol → fx chain → output
//
// Audio tracks schedule Tone.Player instances per clip on the transport.
// MIDI tracks schedule note triggers against the track's instrument.
//
// Solo handling: a track is silenced when ANY track is soloed and it
// isn't. The engine could compute that globally — for Phase 2 we just
// honor mute; solo logic can be layered in when the mixer UI lands.

import * as Tone from 'tone';
import type { AudioAsset, AudioClip, MidiClip, Track } from '../session';
import { isAudioTrack, isMidiTrack } from '../session';
import { dbToGain } from './engine';
import { buildFxChain, type EngineFxChain } from './fx';
import { buildInstrument, type EngineInstrument } from './instruments';
import { getAssetUrlSync } from './assetUrlCache';

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
  /** User-facing mute flag (persisted to session). Engine layer
   * uses this when computing solo overrides. */
  userMute: boolean;
  userSolo: boolean;
  /** Live clip→player pairs the engine can re-schedule on Play. */
  playbacks: ClipPlayback[];
  updateStrip: (patch: { volume_db?: number; pan?: number; mute?: boolean; solo?: boolean }) => void;
  dispose: () => void;
}

export function buildTrack(track: Track, assets: AudioAsset[]): EngineTrack {
  // Tone.PanVol's second constructor argument is volume in dB, NOT a
  // linear gain. Passing dbToGain() here was silently boosting tracks by
  // +1 dB and would have been the wrong value for any non-zero volume.
  const panvol = new Tone.PanVol(track.pan, track.volume_db);
  const muteGate = new Tone.Gain(track.mute ? 0 : 1);
  const fx = buildFxChain(track.fx);
  panvol.connect(muteGate);
  muteGate.connect(fx.input);
  // Belt-and-suspenders: explicitly set the gain again after construction.
  // Some Tone versions don't fully resolve initializer values until the
  // node is referenced through its `.gain.value` setter.
  muteGate.gain.value = track.mute ? 0 : 1;

  const disposers: Array<() => void> = [
    () => panvol.dispose(),
    () => muteGate.dispose(),
    () => fx.dispose(),
  ];
  const playbacks: ClipPlayback[] = [];

  if (isAudioTrack(track)) {
    const assetMap = new Map(assets.map((a) => [a.id, a]));
    for (const clip of track.clips) {
      const asset = assetMap.get(clip.asset_id);
      if (!asset) continue;
      scheduleAudioClip(clip, asset, panvol, disposers, playbacks);
    }
  } else if (isMidiTrack(track)) {
    const inst = buildInstrument(track.instrument);
    inst.output.connect(panvol);
    disposers.push(() => inst.dispose());
    for (const clip of track.clips) {
      scheduleMidiClip(clip, inst, disposers);
    }
  }

  return {
    trackId: track.id,
    output: fx.output,
    userMute: track.mute,
    userSolo: track.solo,
    playbacks,
    updateStrip: (patch) => {
      if (patch.volume_db !== undefined) panvol.volume.value = patch.volume_db;
      if (patch.pan !== undefined) panvol.pan.value = patch.pan;
      if (patch.mute !== undefined) muteGate.gain.value = patch.mute ? 0 : 1;
      // solo handled by caller (engine-level)
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
  for (const note of clip.notes) {
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
