#!/usr/bin/env node
// Minimal SoundFont (.sf2) preset extractor for the studio-samples pipeline.
//
// Pulls every zone of one preset out of an SF2, unrolls each sample's
// sustain loop to a target length (Tone.Sampler cannot loop, so sustained
// sounds like choir must be baked long), and writes one WAV per zone named
// by its root note: out/<Note>.wav. Stereo sample pairs (sampleType 2/4 +
// sampleLink) are joined into stereo WAVs.
//
// Usage: node extract-sf2.mjs <file.sf2> <bank> <preset> <outDir> [seconds=8]

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [sf2Path, bankArg, presetArg, outDir, secondsArg] = process.argv.slice(2);
if (!sf2Path || bankArg === undefined || presetArg === undefined || !outDir) {
  console.error('usage: node extract-sf2.mjs <file.sf2> <bank> <preset> <outDir> [seconds]');
  process.exit(1);
}
const wantBank = Number(bankArg), wantPreset = Number(presetArg);
const targetSeconds = Number(secondsArg ?? 8);

const buf = readFileSync(sf2Path);

// ── RIFF walk ────────────────────────────────────────────────────────
function chunks(start, end) {
  const out = [];
  let o = start;
  while (o + 8 <= end) {
    const id = buf.toString('ascii', o, o + 4);
    const size = buf.readUInt32LE(o + 4);
    out.push({ id, start: o + 8, size });
    o += 8 + size + (size % 2);
  }
  return out;
}
if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'sfbk') {
  throw new Error('not an sf2');
}
const top = chunks(12, 8 + buf.readUInt32LE(4));
const lists = Object.fromEntries(top.filter((c) => c.id === 'LIST')
  .map((c) => [buf.toString('ascii', c.start, c.start + 4), c]));
const pdta = chunks(lists.pdta.start + 4, lists.pdta.start + lists.pdta.size);
const sdta = chunks(lists.sdta.start + 4, lists.sdta.start + lists.sdta.size);
const byId = (arr, id) => arr.find((c) => c.id === id);
const smpl = byId(sdta, 'smpl');

// ── pdta records ─────────────────────────────────────────────────────
function records(chunk, stride, read) {
  const out = [];
  for (let o = chunk.start; o + stride <= chunk.start + chunk.size; o += stride) out.push(read(o));
  return out;
}
const phdr = records(byId(pdta, 'phdr'), 38, (o) => ({
  name: buf.toString('ascii', o, o + 20).replace(/\0.*$/, ''),
  preset: buf.readUInt16LE(o + 20), bank: buf.readUInt16LE(o + 22),
  bagIndex: buf.readUInt16LE(o + 24),
}));
const pbag = records(byId(pdta, 'pbag'), 4, (o) => ({ genIndex: buf.readUInt16LE(o) }));
const pgen = records(byId(pdta, 'pgen'), 4, (o) => ({ op: buf.readUInt16LE(o), amount: buf.readUInt16LE(o + 2) }));
const inst = records(byId(pdta, 'inst'), 22, (o) => ({ bagIndex: buf.readUInt16LE(o + 20) }));
const ibag = records(byId(pdta, 'ibag'), 4, (o) => ({ genIndex: buf.readUInt16LE(o) }));
const igen = records(byId(pdta, 'igen'), 4, (o) => ({ op: buf.readUInt16LE(o), amount: buf.readUInt16LE(o + 2) }));
const shdr = records(byId(pdta, 'shdr'), 46, (o) => ({
  name: buf.toString('ascii', o, o + 20).replace(/\0.*$/, ''),
  start: buf.readUInt32LE(o + 20), end: buf.readUInt32LE(o + 24),
  loopStart: buf.readUInt32LE(o + 28), loopEnd: buf.readUInt32LE(o + 32),
  rate: buf.readUInt32LE(o + 36), originalPitch: buf.readUInt8(o + 40),
  link: buf.readUInt16LE(o + 42), type: buf.readUInt16LE(o + 44),
}));

const GEN_INSTRUMENT = 41, GEN_SAMPLE_ID = 53, GEN_ROOT_KEY = 58;

// ── find the preset's instrument, then its sample zones ──────────────
const pi = phdr.findIndex((p) => p.bank === wantBank && p.preset === wantPreset);
if (pi < 0) throw new Error(`preset ${wantBank}:${wantPreset} not found`);
console.log(`preset: "${phdr[pi].name}"`);
let instIndex = -1;
for (let b = phdr[pi].bagIndex; b < phdr[pi + 1].bagIndex; b++) {
  for (let g = pbag[b].genIndex; g < pbag[b + 1].genIndex; g++) {
    if (pgen[g].op === GEN_INSTRUMENT) instIndex = pgen[g].amount;
  }
}
if (instIndex < 0) throw new Error('preset has no instrument generator');

const zones = [];
for (let b = inst[instIndex].bagIndex; b < inst[instIndex + 1].bagIndex; b++) {
  let sampleId = -1, rootKey = -1;
  for (let g = ibag[b].genIndex; g < ibag[b + 1].genIndex; g++) {
    if (igen[g].op === GEN_SAMPLE_ID) sampleId = igen[g].amount;
    if (igen[g].op === GEN_ROOT_KEY) rootKey = igen[g].amount;
  }
  if (sampleId >= 0) zones.push({ sampleId, rootKey });
}
console.log(`${zones.length} sample zones`);

// ── render: read PCM, unroll loop, write WAV ─────────────────────────
const NOTE = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const noteName = (p) => `${NOTE[p % 12]}${Math.floor(p / 12) - 1}`;

function pcm(s) {
  // 16-bit samples; shdr offsets are in sample frames from smpl start.
  const frames = [];
  for (let i = s.start; i < s.end; i++) frames.push(buf.readInt16LE(smpl.start + i * 2));
  const loopStart = s.loopStart - s.start, loopEnd = s.loopEnd - s.start;
  const target = s.rate * targetSeconds;
  if (loopEnd > loopStart && frames.length < target) {
    const loop = frames.slice(loopStart, loopEnd);
    const tail = frames.slice(loopEnd);
    const body = frames.slice(0, loopEnd);
    while (body.length < target - tail.length) body.push(...loop);
    body.push(...tail);
    return body;
  }
  return frames;
}

function writeWav(path, channels, rate) {
  const n = channels[0].length, ch = channels.length;
  const data = Buffer.alloc(n * ch * 2);
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) {
    data.writeInt16LE(channels[c][i] ?? 0, (i * ch + c) * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
  header.writeUInt16LE(ch, 22); header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * ch * 2, 28); header.writeUInt16LE(ch * 2, 32);
  header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([header, data]));
}

mkdirSync(outDir, { recursive: true });
const done = new Set();
for (const z of zones) {
  const s = shdr[z.sampleId];
  if (s.type & 2) continue; // right half of a stereo pair; handled via its left
  const root = z.rootKey >= 0 ? z.rootKey : s.originalPitch;
  const note = noteName(root);
  if (done.has(note)) continue;
  done.add(note);
  const left = pcm(s);
  const isLeft = (s.type & 4) && s.link < shdr.length;
  const chans = isLeft ? [left, pcm(shdr[s.link])] : [left];
  if (chans.length === 2 && chans[1].length !== chans[0].length) {
    chans[1].length = chans[0].length;
  }
  writeWav(join(outDir, `${note}.wav`), chans, s.rate);
  console.log(`  ${note}.wav  (${s.name}, ${(left.length / s.rate).toFixed(1)}s${isLeft ? ', stereo' : ''})`);
}
console.log('done');
