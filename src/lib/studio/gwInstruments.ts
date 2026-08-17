// GleeWorld Studio premium instrument catalog ("gw:" presets). These are
// self-hosted, velocity-layered sample sets converted from free/open-license
// libraries (see scripts/studio-samples/CREDITS.md), stored in the glee-world
// Space under studio-samples/ and served through the supabase.gleeworld.org
// public-storage proxy — that path already sends Access-Control-Allow-Origin
// (plain Spaces URLs don't) and is allow-listed in the CSP.
//
// Each instrument is described by a manifest.json (see GwManifest) generated
// by scripts/studio-samples/; the engine is fully manifest-driven and never
// hardcodes sample file lists.

export const GW_SAMPLE_BASE =
  'https://supabase.gleeworld.org/storage/v1/object/public/studio-samples';

export interface GwInstrument {
  name: string;          // manifest folder name, e.g. 'grand_piano'
  label: string;         // picker label, e.g. 'Grand Piano'
  kind: 'pitched' | 'kit';
  // GM soundfont instrument to fall back to when the premium manifest can't
  // be fetched (offline bank, renamed instrument). Kits omit it and fall
  // back to the synthesized basic kit instead.
  gmFallback?: string;
}

// Picker order: keyboard → voices → strings → guitars → organ → kits.
export const GW_INSTRUMENTS: GwInstrument[] = [
  { name: 'grand_piano',      label: 'Grand Piano',              kind: 'pitched', gmFallback: 'acoustic_grand_piano' },
  { name: 'electric_piano',   label: 'Electric Piano',           kind: 'pitched', gmFallback: 'electric_piano_1' },
  { name: 'choir_aahs',       label: 'Choir Aahs',               kind: 'pitched', gmFallback: 'choir_aahs' },
  { name: 'string_ensemble',  label: 'String Ensemble',          kind: 'pitched', gmFallback: 'string_ensemble_1' },
  { name: 'violin',           label: 'Violin',                   kind: 'pitched', gmFallback: 'violin' },
  { name: 'cello',            label: 'Cello Section',            kind: 'pitched', gmFallback: 'cello' },
  { name: 'pizzicato',        label: 'Pizzicato Strings',        kind: 'pitched', gmFallback: 'pizzicato_strings' },
  { name: 'guitar_nylon',     label: 'Acoustic Guitar',          kind: 'pitched', gmFallback: 'acoustic_guitar_nylon' },
  { name: 'pipe_organ',       label: 'Pipe Organ',               kind: 'pitched', gmFallback: 'church_organ' },
  { name: 'kit_studio',       label: 'Drum Kit · Studio',        kind: 'kit' },
  { name: 'kit_rock',         label: 'Drum Kit · Rock',          kind: 'kit' },
  { name: 'kit_jazz',         label: 'Drum Kit · Jazz',          kind: 'kit' },
  // 808 family (added 2026-08-17): Michael Fischer's 1994 TR-808 set + the
  // CC0 trap kits, converted by scripts/studio-samples from
  // ~/Music/Samples/808 recipes (recipes-808.json). bass_808 is PITCHED —
  // two FFT-tuned long subs (G1/A1) playable chromatically.
  { name: 'kit_808',          label: 'Drum Kit · TR-808',        kind: 'kit' },
  { name: 'kit_trap',         label: 'Drum Kit · Trap',          kind: 'kit' },
  { name: 'bass_808',         label: '808 Bass',                 kind: 'pitched', gmFallback: 'synth_bass_2' },
];

export const GW_BY_NAME: Record<string, GwInstrument> =
  Object.fromEntries(GW_INSTRUMENTS.map((g) => [g.name, g]));

// One velocity layer of a pitched instrument: `urls` maps note names
// (e.g. 'C4') to files relative to the instrument folder. A note-on with
// MIDI velocity <= maxVel (1..127) plays from the first matching layer.
export interface GwLayer {
  maxVel: number;
  urls: Record<string, string>;
}

// One velocity layer of a single kit piece (relative file URL).
export interface GwKitHit {
  maxVel: number;
  url: string;
}

export interface GwManifest {
  name: string;
  kind: 'pitched' | 'kit';
  // Pitched: velocity layers in ascending maxVel order (last must be 127).
  layers?: GwLayer[];
  // Optional release samples (played briefly on note-off; piano dampers).
  release?: { urls: Record<string, string> };
  // Kit: GM drum MIDI note (as string) → hits in ascending maxVel order.
  kit?: Record<string, GwKitHit[]>;
}

export function gwManifestUrl(name: string): string {
  return `${GW_SAMPLE_BASE}/${name}/manifest.json`;
}

export function gwSampleUrl(name: string, relative: string): string {
  // Sample filenames use sharp note names ('l0/C#4.mp3'); an unencoded '#'
  // would start a URL fragment and truncate the request. Encode each path
  // segment, never the separators.
  const encoded = relative.split('/').map(encodeURIComponent).join('/');
  return `${GW_SAMPLE_BASE}/${name}/${encoded}`;
}

// Pick the layer index for a MIDI velocity (1..127): first layer whose
// maxVel covers it; velocities past the last maxVel clamp to the top layer.
export function gwLayerIndexForVelocity(layers: { maxVel: number }[], velocity: number): number {
  for (let i = 0; i < layers.length; i++) {
    if (velocity <= layers[i].maxVel) return i;
  }
  return layers.length - 1;
}

// preset_id encoding, alongside the GM 'gm:' prefix: 'gw:<name>'.
export const GW_PRESET_PREFIX = 'gw:';
export const toGwPresetId = (name: string) => `${GW_PRESET_PREFIX}${name}`;
export const fromGwPresetId = (presetId: string | undefined): string | null =>
  presetId?.startsWith(GW_PRESET_PREFIX) ? presetId.slice(GW_PRESET_PREFIX.length) : null;
