#!/usr/bin/env node
// Builds recipes.json for convert.mjs from the raw downloaded libraries.
// Encodes everything we learned inspecting each library's actual layout
// (naming schemes, octave conventions, velocity markings, SFZ mappings).
//
// Usage: node build-recipes.mjs <srcRoot> <recipesOut.json>
//   srcRoot = the samplesrc/ directory of downloaded libraries.
// Run extract-sf2.mjs for the choir BEFORE this (see README.md).

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [srcRoot, outPath] = process.argv.slice(2);
if (!srcRoot || !outPath) {
  console.error('usage: node build-recipes.mjs <srcRoot> <recipesOut.json>');
  process.exit(1);
}

const NOTE = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
function parseNote(token) {
  // 'F#3', 'Db4', 'ab3' → { name (sharp form), midi }
  const m = /^([A-Ga-g])(#|b)?(\d)$/.exec(token);
  if (!m) return null;
  let letter = m[1].toUpperCase() + (m[2] ?? '');
  if (FLAT[letter]) letter = FLAT[letter];
  const idx = NOTE.indexOf(letter);
  if (idx < 0) return null;
  return { midi: (Number(m[3]) + 1) * 12 + idx };
}
const midiToNote = (p) => `${NOTE[p % 12]}${Math.floor(p / 12) - 1}`;
const transposeNote = (token, semitones) => {
  const n = parseNote(token);
  return n ? midiToNote(n.midi + semitones) : null;
};

const ls = (dir) => (existsSync(join(srcRoot, dir)) ? readdirSync(join(srcRoot, dir)) : []);
const recipes = [];

// ── Salamander Grand Piano: samples/<Note>v<1..16>.flac + rel<1..88> ──
{
  const dir = 'salamander_piano/SalamanderGrandPiano-SFZ+FLAC-V3+20200602/samples';
  const files = ls(dir);
  const LAYERS = [{ v: 4, maxVel: 32 }, { v: 8, maxVel: 64 }, { v: 12, maxVel: 96 }, { v: 16, maxVel: 127 }];
  const layers = LAYERS.map(({ v, maxVel }) => {
    const samples = {};
    for (const f of files) {
      const m = new RegExp(`^([A-G]#?\\d)v${v}\\.flac$`).exec(f);
      if (m) samples[m[1]] = join(dir, f);
    }
    return { maxVel, samples };
  });
  // rel<N>.flac maps to MIDI 20+N (verified against the bundled SFZ).
  const release = { samples: {} };
  for (const f of files) {
    const m = /^rel(\d+)\.flac$/.exec(f);
    if (m) release.samples[midiToNote(20 + Number(m[1]))] = join(dir, f);
  }
  recipes.push({ name: 'grand_piano', kind: 'pitched', layers, release, gainDb: 3 });
}

// ── VSCO2 CE strings ─────────────────────────────────────────────────
// Section folders are named an octave low (C1 = sounding C2); solo violin
// files are at true pitch. `pick` maps a folder scan into note→file.
const V = 'vsco2_ce_strings/Strings';
function scanVsco(dir, layerTokens, offset, range = [0, 127]) {
  // layerTokens e.g. ['v1','v2'] or ['p','f'] — one output layer per token.
  const files = ls(dir);
  return layerTokens.map((tok) => {
    const samples = {};
    for (const f of files) {
      if (!/\.wav$/i.test(f)) continue;
      // Note token, then the layer token, then optional RR suffix. Keep RR1 only.
      const m = new RegExp(`_([A-G]#?b?\\d)_(?:${tok})(?:_(?:rr|RR)?1)?(?:_1)?\\.wav$`, 'i').exec(f);
      if (!m) continue;
      const note = transposeNote(m[1], offset);
      if (!note) continue;
      const midi = parseNote(note).midi;
      if (midi < range[0] || midi > range[1]) continue;
      if (!samples[note]) samples[note] = join(dir, f);
    }
    return samples;
  });
}
const mergeLayers = (maxVels, ...perSourceLayers) =>
  maxVels.map((maxVel, i) => ({
    maxVel,
    samples: Object.assign({}, ...perSourceLayers.map((src) => src[i])),
  }));

const E3 = parseNote('E3').midi, C4 = parseNote('C4').midi;
{
  // Ensemble: cello sections low, violas mid, violins top. 2 layers.
  const cello = scanVsco(`${V}/Cello Section/susvib`, ['v1', 'v3'], 12, [0, E3]);
  const viola = scanVsco(`${V}/Viola Section/susvib`, ['v1', 'v2'], 12, [E3 + 1, C4 - 1]);
  const violin = scanVsco(`${V}/Violin Section/susVib`, ['v1', 'v2'], 12, [C4, 127]);
  recipes.push({
    name: 'string_ensemble', kind: 'pitched',
    layers: mergeLayers([64, 127], cello, viola, violin), gainDb: 4,
  });
}
{
  const solo = scanVsco(`${V}/Solo Violin/Arco Vib`, ['p', 'f'], 0);
  recipes.push({ name: 'violin', kind: 'pitched', layers: mergeLayers([64, 127], solo), gainDb: 4 });
}
{
  const cello = scanVsco(`${V}/Cello Section/susvib`, ['v1', 'v3'], 12);
  recipes.push({ name: 'cello', kind: 'pitched', layers: mergeLayers([64, 127], cello), gainDb: 4 });
}
{
  const cello = scanVsco(`${V}/Cello Section/pizzT`, ['v1', 'v2'], 12, [0, E3]);
  const viola = scanVsco(`${V}/Viola Section/pizz`, ['v1', 'v2'], 12, [E3 + 1, C4 - 1]);
  const violin = scanVsco(`${V}/Violin Section/Pizz`, ['v1', 'v2'], 12, [C4, 127]);
  recipes.push({
    name: 'pizzicato', kind: 'pitched',
    layers: mergeLayers([64, 127], cello, viola, violin), gainDb: 4,
  });
}

// ── Choir (extracted from FluidR3_GM.sf2 by extract-sf2.mjs) ─────────
{
  const dir = 'fluidr3_gm/extracted-choir';
  const samples = {};
  for (const f of ls(dir)) {
    const m = /^([A-G]#?\d)\.wav$/.exec(f);
    if (m) samples[m[1]] = join(dir, f);
  }
  recipes.push({ name: 'choir_aahs', kind: 'pitched', layers: [{ maxVel: 127, samples }] });
}

// ── Spanish classical guitar: chromatic single layer ─────────────────
{
  const dir = 'spanish_guitar/SpanishClassicalGuitar-SFZ+FLAC-20190618/samples';
  const samples = {};
  for (const f of ls(dir)) {
    const m = /^([A-G]#?\d)\.flac$/.exec(f);
    if (m) samples[m[1]] = join(dir, f);
  }
  recipes.push({ name: 'guitar_nylon', kind: 'pitched', layers: [{ maxVel: 127, samples }] });
}

// ── Church organ: C/F# per octave, single layer ──────────────────────
{
  const dir = 'church_organ/ChurchOrganEmulation-SFZ-20190924/samples';
  const samples = {};
  for (const f of ls(dir)) {
    const m = /^([A-G]#?\d)\.wav$/.exec(f);
    if (m) samples[m[1]] = join(dir, f);
  }
  recipes.push({ name: 'pipe_organ', kind: 'pitched', layers: [{ maxVel: 127, samples }] });
}

// ── Wurlitzer EP200: Samples/<note><pp|mp|f>.flac (flats, lowercase) ──
{
  const dir = 'greg_sullivan_epianos/Wurlitzer EP200/Samples';
  const files = ls(dir);
  const LAYERS = [{ tok: 'pp', maxVel: 48 }, { tok: 'mp', maxVel: 94 }, { tok: 'f', maxVel: 127 }];
  const layers = LAYERS.map(({ tok, maxVel }) => {
    const samples = {};
    for (const f of files) {
      const m = new RegExp(`^([a-g]b?\\d)${tok}\\.flac$`).exec(f);
      if (!m) continue;
      const note = transposeNote(m[1], 0);
      if (note) samples[note] = join(dir, f);
    }
    return { maxVel, samples };
  });
  recipes.push({ name: 'electric_piano', kind: 'pitched', layers });
}

// ── Drum kits ────────────────────────────────────────────────────────
// Muldjord (SFZ parse): per-piece folders of numbered soft→loud FLACs.
// AVL repacks (SFZ parse): flat "<note>-<desc>-<velIdx>.wav".
// Both SFZs give exact key + lovel/hivel; we parse regions generically,
// group by key, dedupe round-robins, and thin to at most 4 layers.
function parseSfzRegions(sfzPath) {
  const text = readFileSync(join(srcRoot, sfzPath), 'utf8')
    .replace(/\/\/[^\n]*/g, '');
  const regions = [];
  let group = {}, current = null, scope = null;
  for (const token of text.split(/\s+/)) {
    if (token === '<group>') { group = {}; scope = group; current = null; continue; }
    if (token === '<region>') { current = { ...group }; regions.push(current); scope = current; continue; }
    if (token.startsWith('<')) { scope = null; current = null; continue; }
    const eq = token.indexOf('=');
    if (eq > 0 && scope) {
      const k = token.slice(0, eq), v = token.slice(eq + 1);
      // sample paths may contain spaces — greedily reattach to the previous
      // sample= value when the token has no '=' (handled below).
      scope[k] = v;
      scope.__last = k;
    } else if (scope && scope.__last === 'sample') {
      scope.sample += ' ' + token;
    }
  }
  return regions.filter((r) => r.sample && (r.key ?? r.lokey) !== undefined);
}

function kitFromSfz(sfzPath, baseDir, { keep, gainDb, remap } = {}) {
  const regions = parseSfzRegions(sfzPath);
  const byKey = new Map();
  for (const r of regions) {
    const srcKey = Number(r.key ?? r.lokey);
    // Non-GM kits (Muldjord) carry their own layout; remap fans one source
    // key out to one or more GM drum notes (e.g. closed hat → 42 and 44).
    const keys = remap ? (remap[srcKey] ?? []) : [srcKey];
    for (const key of keys) {
    if (keep && !keep.has(key)) continue;
    const hivel = Number(r.hivel ?? 127);
    const seq = Number(r.seq_position ?? 1);
    if (seq !== 1) continue; // first round-robin only
    const src = join(baseDir, r.sample.replace(/\\/g, '/').replace(/^\.\//, ''));
    if (!existsSync(join(srcRoot, src))) continue;
    if (!byKey.has(key)) byKey.set(key, new Map());
    const band = byKey.get(key);
    if (!band.has(hivel)) band.set(hivel, src); // dedupe extra RRs sharing a band
    }
  }
  const kit = {};
  for (const [key, band] of byKey) {
    let hits = [...band.entries()].sort((a, b) => a[0] - b[0])
      .map(([hivel, src]) => ({ maxVel: hivel, src }));
    // Thin to at most 4 evenly spaced layers, always keeping the loudest.
    if (hits.length > 4) {
      const idx = [0, 1, 2, 3].map((i) => Math.round((i * (hits.length - 1)) / 3));
      hits = [...new Set(idx)].map((i) => hits[i]);
    }
    hits[hits.length - 1].maxVel = 127;
    kit[key] = hits;
  }
  return { kit, gainDb };
}

// GM notes worth keeping (kick..ride bell range, incl. stick click 31/35).
const GM_KEEP = new Set([31, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 55, 57, 59]);

{
  const base = 'muldjord_kit/MuldjordKit SFZ+FLAC-20201018';
  // Muldjord's SFZ lives on keys 48–66 in piece order (KdrumL..SnareRest2),
  // decoded from its group/sample table; RideRBell + SnareRest2 are dropped.
  const MULDJORD_TO_GM = {
    48: [36], 49: [35], 50: [38], 51: [40], 52: [42, 44], 53: [46],
    54: [51], 55: [53], 56: [59], 58: [49], 59: [57], 60: [52],
    61: [50], 62: [47], 63: [45], 64: [41], 65: [37],
  };
  recipes.push({ name: 'kit_studio', kind: 'kit', ...kitFromSfz(`${base}/MuldjordKit 20201018.sfz`, base, { keep: GM_KEEP, remap: MULDJORD_TO_GM }) });
}
{
  const base = 'avl_drums/RED_ZEPPELIN_2023_repack';
  recipes.push({ name: 'kit_rock', kind: 'kit', ...kitFromSfz(`${base}/Red_Zeppelin_2023_repack.sfz`, base, { keep: GM_KEEP }) });
}
{
  const base = 'avl_drums/BLACK_PEARL_2023_repack';
  recipes.push({ name: 'kit_jazz', kind: 'kit', ...kitFromSfz(`${base}/Black_Pearl_2023_repack.sfz`, base, { keep: GM_KEEP }) });
}

// ── Report + write ───────────────────────────────────────────────────
for (const r of recipes) {
  const count = r.kind === 'pitched'
    ? r.layers.map((l) => Object.keys(l.samples).length).join('+')
    : `${Object.keys(r.kit).length} pieces`;
  console.log(`${r.name.padEnd(18)} ${count}`);
  if (r.kind === 'pitched' && r.layers.every((l) => Object.keys(l.samples).length === 0)) {
    throw new Error(`${r.name}: recipe is empty — layout assumption broken`);
  }
  if (r.kind === 'kit' && Object.keys(r.kit).length === 0) {
    throw new Error(`${r.name}: kit is empty — SFZ parse failed`);
  }
}
writeFileSync(outPath, JSON.stringify(recipes, null, 1));
console.log(`wrote ${outPath}`);
