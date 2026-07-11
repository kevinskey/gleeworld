// General MIDI instrument catalog (all 128 programs, 16 families of 8) plus the
// helper that configures a Tone.Sampler to stream that instrument's samples from
// the MusyngKite soundfont on gleitz.github.io (already allow-listed in the CSP).
//
// Names are the canonical MIDI.js/gleitz soundfont filenames — they map 1:1 to
// the folders under <bank>/<name>-mp3/. Program number is the array position.

export interface GmInstrument {
  program: number;   // GM program 0..127
  name: string;      // soundfont folder name, e.g. 'violin'
  label: string;     // display label, e.g. 'Violin'
  family: string;    // one of GM_FAMILY_ORDER
}

// 16 families × 8, in GM program order. Names are the soundfont folder names.
const FAMILY_INSTRUMENTS: Record<string, string[]> = {
  'Piano': ['acoustic_grand_piano', 'bright_acoustic_piano', 'electric_grand_piano', 'honkytonk_piano', 'electric_piano_1', 'electric_piano_2', 'harpsichord', 'clavinet'],
  'Chromatic Percussion': ['celesta', 'glockenspiel', 'music_box', 'vibraphone', 'marimba', 'xylophone', 'tubular_bells', 'dulcimer'],
  'Organ': ['drawbar_organ', 'percussive_organ', 'rock_organ', 'church_organ', 'reed_organ', 'accordion', 'harmonica', 'tango_accordion'],
  'Guitar': ['acoustic_guitar_nylon', 'acoustic_guitar_steel', 'electric_guitar_jazz', 'electric_guitar_clean', 'electric_guitar_muted', 'overdriven_guitar', 'distortion_guitar', 'guitar_harmonics'],
  'Bass': ['acoustic_bass', 'electric_bass_finger', 'electric_bass_pick', 'fretless_bass', 'slap_bass_1', 'slap_bass_2', 'synth_bass_1', 'synth_bass_2'],
  'Strings': ['violin', 'viola', 'cello', 'contrabass', 'tremolo_strings', 'pizzicato_strings', 'orchestral_harp', 'timpani'],
  'Ensemble': ['string_ensemble_1', 'string_ensemble_2', 'synth_strings_1', 'synth_strings_2', 'choir_aahs', 'voice_oohs', 'synth_choir', 'orchestra_hit'],
  'Brass': ['trumpet', 'trombone', 'tuba', 'muted_trumpet', 'french_horn', 'brass_section', 'synth_brass_1', 'synth_brass_2'],
  'Reed': ['soprano_sax', 'alto_sax', 'tenor_sax', 'baritone_sax', 'oboe', 'english_horn', 'bassoon', 'clarinet'],
  'Pipe': ['piccolo', 'flute', 'recorder', 'pan_flute', 'blown_bottle', 'shakuhachi', 'whistle', 'ocarina'],
  'Synth Lead': ['lead_1_square', 'lead_2_sawtooth', 'lead_3_calliope', 'lead_4_chiff', 'lead_5_charang', 'lead_6_voice', 'lead_7_fifths', 'lead_8_bass__lead'],
  'Synth Pad': ['pad_1_new_age', 'pad_2_warm', 'pad_3_polysynth', 'pad_4_choir', 'pad_5_bowed', 'pad_6_metallic', 'pad_7_halo', 'pad_8_sweep'],
  'Synth Effects': ['fx_1_rain', 'fx_2_soundtrack', 'fx_3_crystal', 'fx_4_atmosphere', 'fx_5_brightness', 'fx_6_goblins', 'fx_7_echoes', 'fx_8_scifi'],
  'Ethnic': ['sitar', 'banjo', 'shamisen', 'koto', 'kalimba', 'bagpipe', 'fiddle', 'shanai'],
  'Percussive': ['tinkle_bell', 'agogo', 'steel_drums', 'woodblock', 'taiko_drum', 'melodic_tom', 'synth_drum', 'reverse_cymbal'],
  'Sound Effects': ['guitar_fret_noise', 'breath_noise', 'seashore', 'bird_tweet', 'telephone_ring', 'helicopter', 'applause', 'gunshot'],
};

export const GM_FAMILY_ORDER = Object.keys(FAMILY_INSTRUMENTS);

// Title-case a soundfont folder name for display: 'electric_piano_1' → 'Electric Piano 1'.
function toLabel(name: string): string {
  return name
    .replace(/__/g, ' & ')
    .replace(/_/g, ' ')
    .replace(/\bscifi\b/i, 'Sci-Fi')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}

// Flat catalog of all 128, program = global index, grouped in family order.
export const GM_INSTRUMENTS: GmInstrument[] = GM_FAMILY_ORDER.flatMap((family, fi) =>
  FAMILY_INSTRUMENTS[family].map((name, i) => ({
    program: fi * 8 + i,
    name,
    label: toLabel(name),
    family,
  })),
);

export const GM_BY_NAME: Record<string, GmInstrument> =
  Object.fromEntries(GM_INSTRUMENTS.map((g) => [g.name, g]));

// Instruments grouped by family, in order — for a grouped picker.
export const GM_GROUPED: { family: string; instruments: GmInstrument[] }[] =
  GM_FAMILY_ORDER.map((family) => ({
    family,
    instruments: GM_INSTRUMENTS.filter((g) => g.family === family),
  }));

const SOUNDFONT_BANK = 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite';

// Sample notes to load per instrument: minor thirds (C, Eb, Gb, A) across
// octaves 1–6. ~24 samples, so Tone.Sampler pitch-shifts at most ~1.5 semitones
// between real samples — cheap to load, still natural. Filenames use flats (the
// gleitz convention), and Tone accepts these note names directly.
const SAMPLE_NOTES = (() => {
  const roots = ['C', 'Eb', 'Gb', 'A'];
  const out: string[] = [];
  for (let octave = 1; octave <= 6; octave++) for (const r of roots) out.push(`${r}${octave}`);
  return out;
})();

// Tone.Sampler config for a GM instrument: { urls, baseUrl }. `urls` maps each
// sample note to its file; Tone fills the gaps by pitch-shifting.
export function gmSamplerConfig(name: string): { urls: Record<string, string>; baseUrl: string } {
  const urls: Record<string, string> = {};
  for (const note of SAMPLE_NOTES) urls[note] = `${note}.mp3`;
  return { urls, baseUrl: `${SOUNDFONT_BANK}/${name}-mp3/` };
}

// preset_id encoding for a MIDI track instrument: 'gm:<name>'.
export const GM_PRESET_PREFIX = 'gm:';
export const toGmPresetId = (name: string) => `${GM_PRESET_PREFIX}${name}`;
export const fromGmPresetId = (presetId: string | undefined): string | null =>
  presetId?.startsWith(GM_PRESET_PREFIX) ? presetId.slice(GM_PRESET_PREFIX.length) : null;
