#!/usr/bin/env node
// Studio premium-instrument sample converter.
//
// Reads recipes.json (produced per source library; see recipes/ once
// generated) and turns raw FLAC/WAV sample libraries into the MP3 + manifest
// layout the LayeredSampler engine streams from the gleeworld-studio Space:
//
//   out/<instrument>/manifest.json
//   out/<instrument>/l<layer>/<Note>.mp3        (pitched)
//   out/<instrument>/rel/<Note>.mp3             (release samples)
//   out/<instrument>/k<layer>/<drumNote>.mp3    (kits)
//
// Usage: node convert.mjs <recipes.json> <srcRoot> <outRoot> [instrument...]
//
// recipes.json shape:
// [{
//   "name": "grand_piano", "kind": "pitched",
//   "layers": [{ "maxVel": 32, "samples": { "C4": "48khz24bit/C4v4.flac", ... } }, ...],
//   "release": { "samples": { "C4": "48khz24bit/RelC4.flac", ... } },   // optional
//   "kit": { "36": [{ "maxVel": 52, "src": "kick/soft.flac" }, ...] },  // kind=kit
//   "gainDb": -3                                                        // optional trim
// }]
//
// This is a build-time tool run locally; it is not part of the app bundle.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const [recipesPath, srcRoot, outRoot, ...only] = process.argv.slice(2);
if (!recipesPath || !srcRoot || !outRoot) {
  console.error('usage: node convert.mjs <recipes.json> <srcRoot> <outRoot> [instrument...]');
  process.exit(1);
}

const recipes = JSON.parse(readFileSync(recipesPath, 'utf8'))
  .filter((r) => only.length === 0 || only.includes(r.name));

const BITRATE = '160k';

// Per-file peak level (dBFS) via ffmpeg volumedetect — pass 1 of peak
// normalization. volumedetect prints to stderr, hence the shell pipeline.
function peakDbOf(src) {
  const res = execFileSync('sh', ['-c',
    `ffmpeg -hide_banner -i ${JSON.stringify(join(srcRoot, src))} -af volumedetect -f null - 2>&1 | grep max_volume || true`,
  ]).toString();
  const m = /max_volume:\s*(-?[\d.]+)\s*dB/.exec(res);
  return m ? Number(m[1]) : null;
}

// Peak-normalization target. -1 dBFS pre-MP3: lame adds a hair of overshoot,
// so 0 dB would clip on decode.
const NORM_TARGET_DB = -1.0;

function convert(src, dst, gainDb, normalize) {
  if (existsSync(dst)) return; // idempotent re-runs
  mkdirSync(dirname(dst), { recursive: true });
  const filters = [];
  if (normalize === 'peak') {
    // KITS: every hit normalized to the same peak. Velocity dynamics come
    // from the engine's layer choice + gain ramp, not from quiet files —
    // a quiet "soft" sample UNDER the engine's velocity gain double-dips
    // and reads as "way too soft" (Kevin, 2026-08-17). gainDb still
    // applies on top as a deliberate trim when a recipe wants one.
    const peak = peakDbOf(src);
    if (peak !== null) filters.push(`volume=${(NORM_TARGET_DB - peak + (gainDb || 0)).toFixed(2)}dB`);
    else if (gainDb) filters.push(`volume=${gainDb}dB`);
  } else if (gainDb) filters.push(`volume=${gainDb}dB`);
  // Trim leading digital silence so note-on timing stays tight, keep tails.
  filters.push('silenceremove=start_periods=1:start_threshold=-60dB:start_silence=0.005');
  execFileSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', join(srcRoot, src),
    '-af', filters.join(','),
    '-ar', '44100', '-codec:a', 'libmp3lame', '-b:a', BITRATE,
    dst,
  ]);
}

let failures = 0;
for (const recipe of recipes) {
  const outDir = join(outRoot, recipe.name);
  const manifest = { name: recipe.name, kind: recipe.kind };
  console.log(`── ${recipe.name}`);

  const safe = (src, dst) => {
    try { convert(src, dst, recipe.gainDb, recipe.normalize); return true; }
    catch (e) { failures++; console.error(`  FAIL ${src}: ${e.message.split('\n')[0]}`); return false; }
  };

  if (recipe.kind === 'pitched') {
    manifest.layers = recipe.layers.map((layer, i) => {
      const urls = {};
      for (const [note, src] of Object.entries(layer.samples)) {
        if (safe(src, join(outDir, `l${i}`, `${note}.mp3`))) urls[note] = `l${i}/${note}.mp3`;
      }
      return { maxVel: layer.maxVel, urls };
    });
    if (recipe.release) {
      const urls = {};
      for (const [note, src] of Object.entries(recipe.release.samples)) {
        if (safe(src, join(outDir, 'rel', `${note}.mp3`))) urls[note] = `rel/${note}.mp3`;
      }
      manifest.release = { urls };
    }
  } else {
    manifest.kit = {};
    for (const [drumNote, hits] of Object.entries(recipe.kit)) {
      manifest.kit[drumNote] = [];
      hits.forEach((hit, i) => {
        if (safe(hit.src, join(outDir, `k${i}`, `${drumNote}.mp3`))) {
          manifest.kit[drumNote].push({ maxVel: hit.maxVel, url: `k${i}/${drumNote}.mp3` });
        }
      });
    }
  }

  // Sanity: layered manifests must end at maxVel 127 and stay ascending.
  const seqs = recipe.kind === 'pitched'
    ? [manifest.layers]
    : Object.values(manifest.kit).filter((h) => h.length > 0);
  for (const seq of seqs) {
    for (let i = 1; i < seq.length; i++) {
      if (seq[i].maxVel <= seq[i - 1].maxVel) throw new Error(`${recipe.name}: maxVel not ascending`);
    }
    if (seq.length && seq[seq.length - 1].maxVel !== 127) throw new Error(`${recipe.name}: last maxVel must be 127`);
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest));
  const noteCount = recipe.kind === 'pitched'
    ? manifest.layers.reduce((n, l) => n + Object.keys(l.urls).length, 0)
    : Object.values(manifest.kit).reduce((n, h) => n + h.length, 0);
  console.log(`  manifest written (${noteCount} samples)`);
}

if (failures) { console.error(`${failures} conversions failed`); process.exit(2); }
console.log('done');
