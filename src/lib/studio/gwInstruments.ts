// GleeWorld Studio premium instrument catalog ("gw:" presets). These are
// self-hosted, velocity-layered sample sets converted from free/open-license
// libraries (see CREDITS.md) and served from the gleeworld-studio Space —
// already allow-listed in the CSP via *.digitaloceanspaces.com.
//
// Each instrument is described by a manifest.json (see GwManifest) generated
// by scripts/studio-samples/; the engine is fully manifest-driven and never
// hardcodes sample file lists.

export const GW_SAMPLE_BASE =
  'https://gleeworld-studio.sfo3.digitaloceanspaces.com/studio-samples';

export interface GwInstrument {
  name: string;          // manifest folder name, e.g. 'grand_piano'
  label: string;         // picker label, e.g. 'Grand Piano'
  kind: 'pitched' | 'kit';
}

// Picker order: keyboard → voices → strings → guitars → organ → kits.
export const GW_INSTRUMENTS: GwInstrument[] = [
  { name: 'grand_piano',      label: 'Grand Piano',              kind: 'pitched' },
  { name: 'electric_piano',   label: 'Electric Piano',           kind: 'pitched' },
  { name: 'choir_aahs',       label: 'Choir Aahs',               kind: 'pitched' },
  { name: 'string_ensemble',  label: 'String Ensemble',          kind: 'pitched' },
  { name: 'violin',           label: 'Violin',                   kind: 'pitched' },
  { name: 'cello',            label: 'Cello',                    kind: 'pitched' },
  { name: 'pizzicato',        label: 'Pizzicato Strings',        kind: 'pitched' },
  { name: 'guitar_nylon',     label: 'Acoustic Guitar · Nylon',  kind: 'pitched' },
  { name: 'guitar_steel',     label: 'Acoustic Guitar · Steel',  kind: 'pitched' },
  { name: 'pipe_organ',       label: 'Pipe Organ',               kind: 'pitched' },
  { name: 'kit_studio',       label: 'Drum Kit · Studio',        kind: 'kit' },
  { name: 'kit_rock',         label: 'Drum Kit · Rock',          kind: 'kit' },
  { name: 'kit_jazz',         label: 'Drum Kit · Jazz',          kind: 'kit' },
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
  return `${GW_SAMPLE_BASE}/${name}/${relative}`;
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
