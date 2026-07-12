// Velocity-layered premium instruments ("gw:" presets). Fetches the
// instrument's manifest.json from the gleeworld-studio Space, then builds:
//
//   • LayeredSampler (pitched) — one Tone.Sampler per velocity layer; each
//     note-on routes to the layer covering its MIDI velocity, so a soft piano
//     note plays a genuinely soft sample, not a quiet loud one. Optional
//     release samples (piano dampers) fire briefly on note-off.
//   • KitSampler (drums) — GM drum note → velocity-layered one-shots that
//     always play to their natural end (note duration is ignored, matching
//     the basic-kit contract).
//
// Loading is lazy like the GM samplers: triggers before samples arrive are
// dropped silently; the Space serves everything with immutable cache headers.

import * as Tone from 'tone';
import type { EngineInstrument } from './instruments';
import {
  GwManifest, gwLayerIndexForVelocity, gwManifestUrl, gwSampleUrl,
} from '../gwInstruments';

const NOTE = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function midiToNote(p: number): string {
  const octave = Math.floor(p / 12) - 1;
  return `${NOTE[p % 12]}${octave}`;
}

// Resolve a manifest's relative sample paths to absolute URLs.
function absoluteUrls(name: string, urls: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(urls).map(([note, rel]) => [note, gwSampleUrl(name, rel)]));
}

export function buildGwInstrument(name: string): EngineInstrument {
  const out = new Tone.Gain(1);
  // Filled in asynchronously once the manifest arrives; every trigger
  // delegates through `voice` so the swap is invisible to callers.
  let voice: EngineInstrument | null = null;
  let disposed = false;

  fetch(gwManifestUrl(name))
    .then((r) => {
      if (!r.ok) throw new Error(`manifest ${r.status}`);
      return r.json() as Promise<GwManifest>;
    })
    .then((manifest) => {
      if (disposed) return;
      voice = manifest.kind === 'kit'
        ? buildKitSampler(name, manifest, out)
        : buildLayeredSampler(name, manifest, out);
    })
    .catch(() => { /* unreachable manifest — instrument stays silent */ });

  return {
    output: out,
    triggerAttackRelease: (pitch, dur, time, vel) => voice?.triggerAttackRelease(pitch, dur, time, vel),
    triggerAttack: (pitch, time, vel) => voice?.triggerAttack?.(pitch, time, vel),
    triggerRelease: (pitch, time) => voice?.triggerRelease?.(pitch, time),
    dispose: () => { disposed = true; voice?.dispose(); out.dispose(); },
  };
}

function buildLayeredSampler(name: string, manifest: GwManifest, out: Tone.Gain): EngineInstrument {
  const layers = manifest.layers ?? [];
  const loaded: boolean[] = layers.map(() => false);
  const samplers = layers.map((layer, i) => new Tone.Sampler({
    urls: absoluteUrls(name, layer.urls),
    release: 0.3, // avoid clicky note-offs; samples carry their own decay
    onload: () => { loaded[i] = true; },
    onerror: () => { /* one missing file must not sink the layer */ },
  }).connect(out));

  // Release samples (e.g. Salamander dampers): quiet one-shots on note-off.
  let releaseSampler: Tone.Sampler | null = null;
  let releaseLoaded = false;
  if (manifest.release) {
    releaseSampler = new Tone.Sampler({
      urls: absoluteUrls(name, manifest.release.urls),
      volume: -18,
      onload: () => { releaseLoaded = true; },
      onerror: () => {},
    }).connect(out);
  }

  // Which layer is holding each live note, so release routes to the same
  // sampler that attacked. Playback (attackRelease) doesn't need this.
  const heldLayer = new Map<number, number>();

  const layerFor = (vel01: number): number =>
    gwLayerIndexForVelocity(layers, Math.max(1, Math.round(vel01 * 127)));

  return {
    output: out,
    triggerAttackRelease: (pitch, dur, time, vel) => {
      const i = layerFor(vel);
      if (loaded[i]) samplers[i].triggerAttackRelease(midiToNote(pitch), dur, time, vel);
    },
    triggerAttack: (pitch, time, vel) => {
      const i = layerFor(vel);
      if (!loaded[i]) return;
      heldLayer.set(pitch, i);
      samplers[i].triggerAttack(midiToNote(pitch), time, vel);
    },
    triggerRelease: (pitch, time) => {
      const i = heldLayer.get(pitch);
      heldLayer.delete(pitch);
      if (i !== undefined && loaded[i]) samplers[i].triggerRelease(midiToNote(pitch), time);
      if (releaseSampler && releaseLoaded) {
        releaseSampler.triggerAttackRelease(midiToNote(pitch), 0.8, time, 0.5);
      }
    },
    dispose: () => {
      samplers.forEach((s) => s.dispose());
      releaseSampler?.dispose();
    },
  };
}

function buildKitSampler(name: string, manifest: GwManifest, out: Tone.Gain): EngineInstrument {
  const kit = manifest.kit ?? {};
  // One Tone.Player per (note, layer). Retriggering restarts the sample —
  // fine for drums, where fast rolls choke the previous hit anyway.
  const players = new Map<string, Tone.Player>();
  for (const [note, hits] of Object.entries(kit)) {
    hits.forEach((hit, i) => {
      const p = new Tone.Player({ url: gwSampleUrl(name, hit.url), fadeOut: 0.01 }).connect(out);
      players.set(`${note}:${i}`, p);
    });
  }

  const hit = (pitch: number, time: number, vel01: number) => {
    const hits = kit[String(pitch)];
    if (!hits) return;
    const vel = Math.max(1, Math.round(vel01 * 127));
    const i = gwLayerIndexForVelocity(hits, vel);
    const p = players.get(`${pitch}:${i}`);
    if (!p || !p.loaded) return;
    // Within the chosen layer, follow velocity with a gentle gain ramp
    // (the big dynamic jumps come from the layer switch itself).
    const ratio = Math.min(1, vel / Math.max(1, hits[i].maxVel));
    p.volume.value = Tone.gainToDb(0.6 + 0.4 * ratio);
    p.start(time);
  };

  return {
    output: out,
    // One-shots: duration is ignored, samples ring out naturally.
    triggerAttackRelease: (pitch, _dur, time, vel) => hit(pitch, time, vel),
    triggerAttack: (pitch, time, vel) => hit(pitch, time, vel),
    dispose: () => { players.forEach((p) => p.dispose()); },
  };
}
