#!/usr/bin/env node
/**
 * Render the extracted facts into a searchable corpus.
 *
 *   npm run ingest:musicfacts
 *   bash scripts/deploy-functions.sh assistant-chat
 *
 * The corpus is a SNAPSHOT — stale until re-ingested.
 *
 * Every sentence here is written by these templates. No prose from any source
 * document reaches the output: the input is numbers, note names and instrument
 * names, and the wording around them is ours. That is what makes this corpus
 * safe to ship where the original documents were not.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(HERE, '../docs/reference/data');
const OUT = path.resolve(HERE, '../supabase/functions/_shared/musicfacts/corpus.ts');

const read = (name) => JSON.parse(readFileSync(path.join(DATA, `${name}.json`), 'utf8'));

const list = (items) =>
  items.length <= 1 ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/** "C3–A6" — en dash, the way a musician writes a range. */
const range = ([lo, hi]) => `${lo}–${hi}`;

/** Human label for an extracted range key. */
const RANGE_LABEL = {
  full: 'Full range',
  written: 'Written range',
  section: 'Practical section range',
  student: 'Practical student range',
  'advanced-student': 'Practical range for an advanced student',
  soloist: 'Practical soloist range',
  practical: 'Practical range',
};
/** "b-flat" → "B♭" (slugify spells accidentals out so they survive). */
const noteFromSlug = (s) =>
  s.replace(/-flat/g, '♭').replace(/-sharp/g, '♯').toUpperCase();

const rangeLabel = (key) =>
  RANGE_LABEL[key]
  ?? (key.startsWith('sounding')
    ? `Sounding range${key.length > 9 ? ` (${noteFromSlug(key.slice(9))})` : ''}`
    : `${key[0].toUpperCase()}${key.slice(1).replace(/-/g, ' ')} range`);

/** Render a structured transposition fact as our own sentence. */
function transposition(t) {
  if (!t) return '';
  if (t.sounds === 'as written') return 'Non-transposing; sounds as written.';
  // "a two octaves and a major second lower" — drop the article when the
  // interval already starts with a count.
  const article = /^(one|two|three|four|\d)/i.test(t.interval) ? '' : 'a ';
  return `Sounds ${article}${t.interval} ${t.direction} than written.`;
}

function instrumentChunk(x) {
  const parts = [];

  const rangeKeys = Object.keys(x.ranges);
  if (rangeKeys.length) {
    parts.push(rangeKeys.map((k) => `${rangeLabel(k)} ${range(x.ranges[k])}.`).join(' '));
  }

  if (x.transposition) parts.push(transposition(x.transposition));
  for (const v of x.transpositionVariants) {
    parts.push(`${v.name}: ${transposition(v)}`);
  }

  if (x.clefs.length) {
    parts.push(`Notated in ${list(x.clefs.map((c) => `${c} clef`))}.`);
  }

  if (x.registers.length) {
    const spans = x.registers.map((r) => (r.name ? `${r.name} ${range([r.low, r.high])}` : range([r.low, r.high])));
    parts.push(`Registers: ${spans.join('; ')}.`);
  }

  for (const v of x.variants) {
    const bits = [
      v.transposition ? transposition(v.transposition) : null,
      v.range ? `Range ${range(v.range)}.` : null,
    ].filter(Boolean);
    if (bits.length) parts.push(`${v.name}: ${bits.join(' ')}`);
  }

  return {
    id: x.id,
    domain: 'instrument',
    subject: x.name,
    // Family in the title so "string ranges" and "brass transposition" retrieve.
    title: `${x.name} — range and transposition (${x.family.replace(/-/g, ' ')})`,
    text: parts.join(' '),
  };
}

function voiceChunk(x) {
  // "Mixed adult choir (SATB), sounding pitch" → "SATB"
  const short = /\(([A-Z]+)\)/.exec(x.ensemble)?.[1] ?? x.ensemble;
  const parts = [];
  if (x.comfortable) parts.push(`Comfortable range ${range(x.comfortable)}.`);
  if (x.extremeLow && x.extremeHigh) {
    parts.push(`Extremes ${range([x.extremeLow, x.extremeHigh])}, usable but not to be written on for long.`);
  }
  if (x.tessituraCenter) parts.push(`Ideal tessitura centres on ${x.tessituraCenter}.`);
  parts.push(`These are sounding pitches for a ${x.ensemble.replace(/,\s*sounding pitch$/, '')}.`);

  return {
    id: x.id,
    domain: 'voice',
    subject: `${x.part} (${short})`,
    title: `${x.part} range in ${short} — choral voice part`,
    text: parts.join(' '),
  };
}


function scoreOrderChunk(groups) {
  const body = groups
    .map((g) => `${g.family}: ${g.items.join(', ')}.`)
    .join(' ');
  return {
    id: 'score-order/orchestra',
    domain: 'score-order',
    subject: 'Orchestral score order',
    title: 'Orchestral score order, top to bottom — who goes where on the page',
    text: `Standard orchestral score order, from the top of the page down. ${body} Horns sit above trumpets by convention, despite sounding lower.`,
  };
}

function ensembleChunk(x) {
  return {
    id: x.id,
    domain: 'ensemble',
    subject: x.name,
    title: `${x.name} — standard instrumentation`,
    // The shorthand reads Flutes.Oboes.Clarinets.Bassoons — Horns.Trumpets.
    // Trombones.Tuba — Timpani, Percussion — Harp, Keyboards — Strings.
    text: `Instrumentation: ${x.instrumentation}. The numbers read flutes.oboes.clarinets.bassoons — horns.trumpets.trombones.tuba — timpani and percussion — harp and keyboards — strings.`,
  };
}

const instruments = read('instruments');
const voices = read('voices');
const scoreOrder = read('score-order');
const ensembles = read('ensembles');

const chunks = [
  ...instruments.map(instrumentChunk),
  ...voices.map(voiceChunk),
  ...(scoreOrder.length ? [scoreOrderChunk(scoreOrder)] : []),
  ...ensembles.map(ensembleChunk),
].filter((c) => c.text.trim().length > 0);

chunks.sort((a, b) => a.id.localeCompare(b.id));

const body = [
  '// GENERATED FILE — do not edit by hand.',
  '// Regenerate: npm run ingest:musicfacts (then deploy assistant-chat).',
  '//',
  '// Facts extracted from local reference documents; every sentence below is',
  '// written by scripts/ingest-musicfacts.mjs, not copied from any source.',
  "import type { MusicFactChunk } from './types.ts';",
  '',
  `export const MUSIC_FACTS: MusicFactChunk[] = ${JSON.stringify(chunks, null, 2)};`,
  '',
].join('\n');

writeFileSync(OUT, body, 'utf8');
console.log(`  instruments ${String(instruments.length).padStart(3)}`);
console.log(`  voices      ${String(voices.length).padStart(3)}`);
console.log(`  score order ${String(scoreOrder.length).padStart(3)} groups`);
console.log(`  ensembles   ${String(ensembles.length).padStart(3)}`);
console.log(`\n  TOTAL ${chunks.length} chunks -> ${path.relative(process.cwd(), OUT)}`);
