// Velocity-layered premium instruments ("gw:" presets). Fetches the
// instrument's manifest.json from the studio-samples bank, then builds:
//
//   • LayeredSampler (pitched) — one Tone.Sampler per velocity layer; each
//     note-on routes to the layer covering its MIDI velocity, so a soft piano
//     note plays a genuinely soft sample, not a quiet loud one. Optional
//     release samples (piano dampers) fire on note-off of a held note.
//   • KitSampler (drums) — GM drum note → velocity-layered one-shots that
//     always play to their natural end (note duration is ignored, matching
//     the basic-kit contract). Every hit gets its own source + gain so
//     overlapping hits at different velocities never fight over one node.
//
// Manifests and decoded sample buffers are cached at module level:
//   - engine rebuilds / LiveVoices swaps reuse decoded audio instead of
//     re-downloading and re-decoding the whole instrument;
//   - offline renders (mixdown/export/region — Tone.Offline) construct
//     synchronously from cache, and Tone.Offline's own
//     ToneAudioBuffer.loaded() wait covers any still-pending downloads.
//     Export paths call preloadGwSession() first to warm the cache.
//
// A manifest that cannot be fetched falls back to the instrument's GM
// equivalent (passed in by the caller) so a track is never silently dead.

import * as Tone from 'tone';
import type { EngineInstrument } from './instruments';
import type { Session } from '../session';
import {
  GW_BY_NAME, GwManifest, fromGwPresetId, gwLayerIndexForVelocity, gwManifestUrl, gwSampleUrl,
  gwSampleRelForFormat, pickGwSampleFormat,
} from '../gwInstruments';

const NOTE = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function midiToNote(p: number): string {
  const octave = Math.floor(p / 12) - 1;
  return `${NOTE[p % 12]}${octave}`;
}

// ── module caches ────────────────────────────────────────────────────

// name → resolved manifest (or in-flight fetch). Failed fetches are removed
// so a later rebuild can retry.
const manifestCache = new Map<string, GwManifest | Promise<GwManifest>>();

// absolute URL → decoded audio. ToneAudioBuffer holds a raw AudioBuffer,
// which is context-independent — safe to reuse across live and offline
// contexts. Failed downloads evict themselves for retry.
const bufferCache = new Map<string, Tone.ToneAudioBuffer>();

function getManifest(name: string): GwManifest | Promise<GwManifest> {
  const hit = manifestCache.get(name);
  if (hit) return hit;
  const p = fetch(gwManifestUrl(name))
    .then((r) => {
      if (!r.ok) throw new Error(`manifest ${r.status}`);
      return r.json() as Promise<GwManifest>;
    })
    .then((m) => { manifestCache.set(name, m); return m; })
    .catch((e) => { manifestCache.delete(name); throw e; });
  manifestCache.set(name, p);
  return p;
}

// Sample encoding pinned per instrument at first use, so preload and later
// voice builds request identical URLs (a probe resolving in between must not
// split an instrument across mp3 and webm and re-download half the set).
const formatCache = new Map<string, 'mp3' | 'webm'>();

function sampleUrl(name: string, manifest: GwManifest, rel: string): string {
  let fmt = formatCache.get(name);
  if (!fmt) {
    fmt = pickGwSampleFormat(manifest);
    formatCache.set(name, fmt);
  }
  return gwSampleUrl(name, gwSampleRelForFormat(rel, fmt));
}

function getBuffer(url: string): Tone.ToneAudioBuffer {
  const hit = bufferCache.get(url);
  if (hit) return hit;
  const buf = new Tone.ToneAudioBuffer({
    url,
    onerror: () => { bufferCache.delete(url); },
  });
  bufferCache.set(url, buf);
  return buf;
}

// Touch every sample of every gw instrument in the session so downloads are
// registered, then wait for them. Export paths await this BEFORE Tone.Offline
// so offline construction is fully synchronous from cache. Buffer errors are
// non-fatal (missing notes just stay silent).
export async function preloadGwSession(session: Session): Promise<void> {
  const names = new Set<string>();
  for (const t of session.tracks) {
    if (t.kind !== 'midi') continue;
    const name = fromGwPresetId(t.instrument?.preset_id);
    if (name && GW_BY_NAME[name]) names.add(name);
  }
  await Promise.all([...names].map(async (name) => {
    try {
      const manifest = await getManifest(name);
      for (const layer of manifest.layers ?? []) {
        for (const rel of Object.values(layer.urls)) getBuffer(sampleUrl(name, manifest, rel));
      }
      for (const rel of Object.values(manifest.release?.urls ?? {})) getBuffer(sampleUrl(name, manifest, rel));
      for (const hits of Object.values(manifest.kit ?? {})) {
        for (const hit of hits) getBuffer(sampleUrl(name, manifest, hit.url));
      }
    } catch { /* manifest unreachable — instrument falls back at build time */ }
  }));
  await Tone.ToneAudioBuffer.loaded().catch(() => { /* per-buffer onerror already handled */ });
}

// ── instrument construction ──────────────────────────────────────────

export function buildGwInstrument(name: string, makeFallback: () => EngineInstrument): EngineInstrument {
  const out = new Tone.Gain(1);
  let voice: EngineInstrument | null = null;
  let disposed = false;
  // Guard async completion against context swaps: a voice built after a
  // render/context change must not connect into the wrong (or dead) graph.
  const buildContext = Tone.getContext();

  const build = (manifest: GwManifest) => (manifest.kind === 'kit'
    ? buildKitVoice(name, manifest, out)
    : buildLayeredVoice(name, manifest, out));

  const m = getManifest(name);
  if (m instanceof Promise) {
    m.then((manifest) => {
      if (disposed || Tone.getContext() !== buildContext) return;
      voice = build(manifest);
    }).catch(() => {
      if (disposed || Tone.getContext() !== buildContext) return;
      const fb = makeFallback();
      fb.output.connect(out);
      voice = fb;
    });
  } else {
    voice = build(m);
  }

  return {
    output: out,
    triggerAttackRelease: (pitch, dur, time, vel) => voice?.triggerAttackRelease(pitch, dur, time, vel),
    triggerAttack: (pitch, time, vel) => voice?.triggerAttack?.(pitch, time, vel),
    triggerRelease: (pitch, time) => voice?.triggerRelease?.(pitch, time),
    releaseAll: () => voice?.releaseAll?.(),
    dispose: () => { disposed = true; voice?.dispose(); out.dispose(); },
  };
}

function buildLayeredVoice(name: string, manifest: GwManifest, out: Tone.Gain): EngineInstrument {
  const layers = manifest.layers ?? [];
  const samplerUrls = (urls: Record<string, string>) =>
    Object.fromEntries(Object.entries(urls).map(([note, rel]) => [note, getBuffer(sampleUrl(name, manifest, rel))]));

  // No load gates: cached ToneAudioBuffers fill in as they arrive, and a
  // trigger that finds no loaded sample throws — caught below, note dropped.
  // A partially loaded layer plays the notes it has (one missing file must
  // not sink the layer).
  const samplers = layers.map((layer) => new Tone.Sampler({
    urls: samplerUrls(layer.urls),
    release: 0.3, // avoid clicky note-offs; samples carry their own decay
  }).connect(out));

  let releaseSampler: Tone.Sampler | null = null;
  if (manifest.release) {
    releaseSampler = new Tone.Sampler({
      urls: samplerUrls(manifest.release.urls),
      volume: -18,
    }).connect(out);
  }

  // Which layer holds each live note, so note-off releases the same sampler
  // that attacked (and dampers only fire for notes that actually sounded).
  const heldLayer = new Map<number, number>();

  const layerFor = (vel01: number): number =>
    gwLayerIndexForVelocity(layers, Math.max(1, Math.round(vel01 * 127)));

  return {
    output: out,
    triggerAttackRelease: (pitch, dur, time, vel) => {
      try { samplers[layerFor(vel)].triggerAttackRelease(midiToNote(pitch), dur, time, vel); }
      catch { /* sample not loaded yet — drop the note */ }
    },
    triggerAttack: (pitch, time, vel) => {
      const i = layerFor(vel);
      // Retriggered note-on without a note-off: release the old voice first
      // so it can't hang forever.
      const prev = heldLayer.get(pitch);
      if (prev !== undefined) {
        try { samplers[prev].triggerRelease(midiToNote(pitch), time); } catch { /* not sounding */ }
        heldLayer.delete(pitch);
      }
      try {
        samplers[i].triggerAttack(midiToNote(pitch), time, vel);
        heldLayer.set(pitch, i);
      } catch { /* sample not loaded yet — drop the note */ }
    },
    triggerRelease: (pitch, time) => {
      const i = heldLayer.get(pitch);
      if (i === undefined) return; // never sounded — no release, no damper
      heldLayer.delete(pitch);
      try { samplers[i].triggerRelease(midiToNote(pitch), time); } catch { /* already ended */ }
      if (releaseSampler) {
        try { releaseSampler.triggerAttackRelease(midiToNote(pitch), 0.8, time, 0.5); }
        catch { /* damper sample not loaded */ }
      }
    },
    // Transport pause/stop/seek: cut every held note now, no damper —
    // this is a hard stop, not a musical note-off. Use Tone.immediate()
    // (see liveVoices.ts header comment): this must not pay the transport
    // lookAhead (~100ms) the way scheduled playback does, or held notes
    // ring on past the pause/stop/seek point.
    releaseAll: () => {
      const time = Tone.immediate();
      for (const [pitch, i] of heldLayer) {
        try { samplers[i].triggerRelease(midiToNote(pitch), time); } catch { /* already ended */ }
      }
      heldLayer.clear();
    },
    dispose: () => {
      samplers.forEach((s) => s.dispose());
      releaseSampler?.dispose();
      // cached buffers are shared — never disposed here
    },
  };
}

// GM hi-hat choke: striking a closed (42) or pedal (44) hat silences a
// ringing open hat (46) — every hardware drum machine and GM module does
// this, and without it open hats smear over trap hat patterns.
const HAT_CHOKERS = new Set([42, 44]);
const HAT_OPEN = 46;
const CHOKE_FADE_S = 0.03;

function buildKitVoice(name: string, manifest: GwManifest, out: Tone.Gain): EngineInstrument {
  const kit = manifest.kit ?? {};
  // Pre-touch buffers so downloads start (and register with Tone's loader).
  for (const hits of Object.values(kit)) for (const h of hits) getBuffer(sampleUrl(name, manifest, h.url));

  let disposed = false;
  // Ringing open-hat hits, so a closed hat can choke them. Entries remove
  // themselves in onended, so the set only ever holds live sources.
  const openHats = new Set<{ src: Tone.ToneBufferSource; gain: Tone.Gain }>();
  const hit = (pitch: number, time: number, vel01: number) => {
    if (disposed) return;
    const hits = kit[String(pitch)];
    if (!hits) return;
    const vel = Math.max(1, Math.round(vel01 * 127));
    const i = gwLayerIndexForVelocity(hits, vel);
    const buf = getBuffer(sampleUrl(name, manifest, hits[i].url));
    if (!buf.loaded) return;
    if (HAT_CHOKERS.has(pitch)) {
      for (const oh of openHats) {
        // Fast fade instead of hard stop — a zero-crossing-agnostic cut
        // clicks; 30ms reads as the real pedal-catch sound.
        try {
          oh.gain.gain.cancelScheduledValues(time);
          oh.gain.gain.setValueAtTime(oh.gain.gain.value, time);
          oh.gain.gain.linearRampToValueAtTime(0, time + CHOKE_FADE_S);
          oh.src.stop(time + CHOKE_FADE_S);
        } catch { /* already ended */ }
      }
      openHats.clear();
    }
    // Within the chosen layer, follow velocity with a gentle gain ramp
    // (the big dynamic jumps come from the layer switch itself). One
    // source + gain per hit: overlapping hits and ringing tails keep
    // their own level instead of sharing a mutable volume node.
    const ratio = Math.min(1, vel / Math.max(1, hits[i].maxVel));
    const gain = new Tone.Gain(0.6 + 0.4 * ratio).connect(out);
    const src = new Tone.ToneBufferSource({ url: buf, fadeOut: 0.01 }).connect(gain);
    const entry = { src, gain };
    if (pitch === HAT_OPEN) openHats.add(entry);
    src.onended = () => { openHats.delete(entry); src.dispose(); gain.dispose(); };
    src.start(time);
  };

  return {
    output: out,
    // One-shots: duration is ignored, samples ring out naturally.
    triggerAttackRelease: (pitch, _dur, time, vel) => hit(pitch, time, vel),
    triggerAttack: (pitch, time, vel) => hit(pitch, time, vel),
    dispose: () => { disposed = true; },
  };
}
