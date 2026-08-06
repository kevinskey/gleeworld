#!/usr/bin/env node
/**
 * Pull FACTS out of the local music reference documents.
 *
 *   node scripts/extract-musicfacts.mjs <dir-with-the-three-md-files>
 *
 * Writes docs/reference/data/*.json. Only structured factual fields are read:
 * transposition, clefs, range endpoints, register spans, voice-part ranges.
 * Prose is never carried across — not the "Character" column of a register
 * table, not a single narrative paragraph. The source documents are derived
 * from published references and stay out of git; the extracted facts do not
 * belong to anyone and do.
 *
 * Parsed rather than retyped on purpose: 230 hand-copied pitch pairs would
 * carry transcription errors, and a wrong range is worse than no range.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = process.argv[2] || path.join(process.env.HOME, 'Downloads');
const OUT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../docs/reference/data',
);

const FILES = {
  orchestration: 'Orchestration_and_Instrumentation_Reference.md',
  choral: 'choral_composition_reference.md',
};

/** Scientific pitch, accepting unicode or ASCII accidentals. */
const PITCH = /\b([A-G])(♭|♯|b|#)?(-?\d)\b/;

/** Normalize to ASCII-free canonical form: "B♭4" stays, "Bb4" becomes "B♭4". */
function pitch(cell) {
  if (!cell) return null;
  // Strip parenthetical commentary first — "A3 (weak, no carrying power)"
  // and "E2 (D2 for a few)" must not contribute their second pitch.
  const cleaned = cell.replace(/\([^)]*\)/g, ' ').replace(/\*\*/g, ' ');
  const m = PITCH.exec(cleaned);
  if (!m) return null;
  const acc = m[2] === 'b' ? '♭' : m[2] === '#' ? '♯' : (m[2] || '');
  return `${m[1]}${acc}${m[3]}`;
}

/** "G3 – B6" / "G3 - B6" / "G3–B6" → ["G3","B6"] */
function span(cell) {
  if (!cell) return null;
  const cleaned = cell.replace(/\([^)]*\)/g, ' ').replace(/\*\*/g, ' ');
  const parts = cleaned.split(/[–—-]/).map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const lo = pitch(parts[0]);
  const hi = pitch(parts[parts.length - 1]);
  return lo && hi ? [lo, hi] : null;
}

const stripMd = (s) => s.replace(/\*\*/g, '').replace(/`/g, '').trim();

function readDoc(key) {
  return readFileSync(path.join(SRC, FILES[key]), 'utf8').split('\n');
}

/** Rows of a markdown table starting at `i`, as arrays of trimmed cells. */
function tableAt(lines, i) {
  const rows = [];
  while (i < lines.length && lines[i].trim().startsWith('|')) {
    const cells = lines[i].split('|').slice(1, -1).map((c) => c.trim());
    if (!cells.every((c) => /^:?-+:?$/.test(c))) rows.push(cells);
    i++;
  }
  return { rows, end: i };
}

// ---------------------------------------------------------------- instruments

const FAMILY_HEADINGS = [
  [/^## 7\. The String Family/, 'strings'],
  [/^## 8\. The Woodwind Family/, 'woodwinds'],
  [/^## 9\. The Brass Family/, 'brass'],
  [/^## 10\. Percussion/, 'percussion'],
  [/^## 11\. Keyboards, Harp/, 'keyboard-and-plucked'],
];

/** Slug from free text. Accidentals are spelled out so B♭ survives. */
const slugify = (s) =>
  stripMd(s).toLowerCase().replace(/♭/g, '-flat').replace(/♯/g, '-sharp')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Reduce a transposition sentence to the FACT it contains and discard the rest.
 *
 * The source writes "Clarinet in E♭ — sounds a minor third higher than written.
 * The high, shrill member." Only the interval and direction are facts; "the
 * high, shrill member" is the author's prose and must not reach the corpus.
 * Anything this cannot parse is dropped rather than passed through, because
 * passing it through is exactly the failure this design exists to prevent.
 */
function parseTransposition(textIn) {
  if (!textIn) return null;
  const t = stripMd(textIn);
  if (/sounds as written/i.test(t) || /^none\b/i.test(t)) return { sounds: 'as written' };
  const m = /sounds\s+(?:an?\s+)?([a-z0-9 ,♭♯'-]+?)\s+(lower|higher)\s+than written/i.exec(t);
  if (!m) return null;
  return { interval: m[1].trim().replace(/\s+/g, ' '), direction: m[2].toLowerCase() };
}

/** "Clarinet in B♭" → "B♭", when the name carries a key. */
const keyOf = (name) => /\bin\s+([A-G][♭♯]?)\b/.exec(name)?.[1] ?? null;

/**
 * Normalize a range label into a key. The documents vary a lot:
 *   "Range"                          → full
 *   "Range (written, all soprano…)"  → written
 *   "Sounding (B♭)"                  → sounding-b
 *   "Practical (section)"            → section
 */
function rangeKey(label) {
  const l = stripMd(label).toLowerCase();
  const paren = /\(([^)]*)\)/.exec(l)?.[1] ?? '';
  const base = l.replace(/\([^)]*\)/g, '').trim();
  const qualifier = paren.split(/[,;]/)[0].trim();
  if (base.startsWith('sounding')) return slugify(`sounding ${qualifier}`) || 'sounding';
  if (base.startsWith('practical')) return slugify(qualifier) || 'practical';
  if (/written/.test(qualifier)) return 'written';
  if (base === 'range' || base === 'full') return qualifier ? slugify(qualifier) : 'full';
  return slugify(base) || 'full';
}

/**
 * Register tables come in two shapes:
 *   | Register | Span | Character |     ← named register, separate span column
 *   | Register | Character |            ← col 0 IS the span ("B♭1 – F2")
 * Find the span column by header name, else by which column actually parses
 * as a span. Never take a Character column.
 */
function parseRegisterTable(rows) {
  const header = rows[0].map((c) => c.toLowerCase());
  const body = rows.slice(1);
  if (!body.length) return [];

  let spanCol = header.findIndex((c) => /span|range/.test(c));
  if (spanCol < 0) {
    spanCol = header.findIndex((_, ci) =>
      body.filter((r) => span(r[ci])).length > body.length / 2);
  }
  if (spanCol < 0) return [];

  const nameCol = header.findIndex((c, ci) => ci !== spanCol && /register|name/.test(c));
  return body.flatMap((r) => {
    const s = span(r[spanCol]);
    if (!s) return [];
    const name = nameCol >= 0 ? stripMd(r[nameCol]) : null;
    return [{ name: name || null, low: s[0], high: s[1] }];
  });
}

function extractInstruments(lines) {
  const out = [];
  let family = null;
  let cur = null;

  const flush = () => {
    // Sections with neither a range nor a transposition are overview prose
    // ("7.0 String principles that apply to all bowed instruments").
    if (cur && (Object.keys(cur.ranges).length || cur.transposition || cur.variants.length)) {
      out.push(cur);
    }
    cur = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const [re, key] of FAMILY_HEADINGS) if (re.test(line)) { flush(); family = key; }
    if (/^## 12\. The Human Voice/.test(line)) { flush(); family = null; }
    if (/^# PART III/.test(line)) { flush(); family = null; }

    const head = /^### (\d+)\.(\d+)\s+(.+?)\s*$/.exec(line);
    if (head && family) {
      flush();
      cur = {
        id: `${family}/${slugify(head[3])}`,
        name: stripMd(head[3]),
        family,
        section: `${head[1]}.${head[2]}`,
        transposition: null,
        transpositionVariants: [],
        clefs: [],
        ranges: {},
        registers: [],
        variants: [],
      };
      continue;
    }
    if (!cur) continue;

    // **Label:** value        (inline)
    // **Label:**              (bullets follow)
    const labelled = /^\*\*([^:*]+):\*\*\s*(.*)$/.exec(line);
    if (labelled) {
      const label = labelled[1].trim();
      const inline = labelled[2].trim();

      if (/^transposition/i.test(label)) {
        const rawBullets = [];
        if (!inline) {
          for (let j = i + 1; j < lines.length && lines[j].trim().startsWith('-'); j++) {
            rawBullets.push(stripMd(lines[j].trim().replace(/^-\s*/, '')));
          }
        }
        // Structured facts only. The raw sentence is used for clef detection
        // below and then discarded — it carries the author's prose.
        cur.transposition = parseTransposition(inline);
        for (const b of rawBullets) {
          const parsed = parseTransposition(b);
          if (!parsed) continue;
          cur.transpositionVariants.push({ name: stripMd(b.split(/[—–-]/)[0]), key: keyOf(b), ...parsed });
        }
        const src = inline || rawBullets.join(' ');
        for (const c of ['treble', 'bass', 'alto', 'tenor']) {
          if (new RegExp(`\\b${c} clef\\b`, 'i').test(src)) cur.clefs.push(c);
        }
        continue;
      }

      if (/^(range|sounding|written)/i.test(label)) {
        const s = span(inline);
        if (s) {
          cur.ranges[rangeKey(label)] = s;
        } else {
          // Bullet form: "- Full: G3 – C8", "- Practical (section): G3 – B6"
          for (let j = i + 1; j < lines.length; j++) {
            const b = lines[j].trim();
            if (!b) continue;
            if (!b.startsWith('-')) break;
            const m = /^-\s*([^:]+):\s*(.+)$/.exec(b);
            if (!m) continue;
            const bs = span(m[2]);
            if (bs) cur.ranges[rangeKey(m[1])] = bs;
          }
        }
        continue;
      }
      continue;
    }

    // Sub-instrument: a bold-only line followed by bullets, e.g. **Contrabassoon**
    const sub = /^\*\*([A-Z][^*]{2,40})\*\*\s*$/.exec(line);
    if (sub && lines[i + 1]?.trim().startsWith('-')) {
      const name = stripMd(sub[1]);
      // Prose section labels use the same bold-line shape as sub-instrument
      // names ("**Idiomatic writing.**" vs "**Contrabassoon**"). A trailing
      // period marks a sentence fragment, never an instrument.
      const PROSE_LABEL = /^(character|idiomatic|caution|note|notation|register|range|technique|writing|scoring|balance)/i;
      if (name.endsWith('.') || PROSE_LABEL.test(name)) continue;
      const variant = { name, transposition: null, range: null };
      for (let j = i + 1; j < lines.length && lines[j].trim().startsWith('-'); j++) {
        const b = stripMd(lines[j].trim().replace(/^-\s*/, ''));
        if (!variant.transposition) variant.transposition = parseTransposition(b);
        const s = span(b);
        if (s && !variant.range && /range/i.test(b)) variant.range = s;
      }
      if (variant.transposition || variant.range) cur.variants.push(variant);
      continue;
    }

    if (/^\|/.test(line) && /register|span/i.test(line)) {
      const { rows, end } = tableAt(lines, i);
      cur.registers.push(...parseRegisterTable(rows));
      i = end - 1;
    }
  }
  flush();
  return out;
}

// --------------------------------------------------------------------- voices

function extractVoices(lines) {
  const out = [];
  let ensemble = null;
  for (let i = 0; i < lines.length; i++) {
    const h = /^### (.+?)\s*$/.exec(lines[i]);
    if (h) ensemble = stripMd(h[1]);
    if (!/^\|\s*Part\s*\|/.test(lines[i]) || !ensemble) continue;

    const { rows, end } = tableAt(lines, i);
    const header = rows[0].map((c) => c.toLowerCase());
    const col = (needle) => header.findIndex((c) => c.includes(needle));
    const iLow = col('extreme low');
    const iBand = col('comfortable');
    const iHigh = col('extreme high');
    const iTess = col('tessitura');

    for (const r of rows.slice(1)) {
      const band = iBand >= 0 ? span(r[iBand]) : null;
      const low = iLow >= 0 ? pitch(r[iLow]) : null;
      const high = iHigh >= 0 ? pitch(r[iHigh]) : null;
      if (!band && !low && !high) continue;
      const slug = `${ensemble} ${r[0]}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      out.push({
        id: `voice/${slug}`,
        part: stripMd(r[0]),
        ensemble,
        extremeLow: low,
        extremeHigh: high,
        comfortable: band,
        tessituraCenter: iTess >= 0 ? pitch(r[iTess]) : null,
      });
    }
    i = end - 1;
  }
  return out;
}

// ----------------------------------------------------------------------- main

const orchestration = readDoc('orchestration');
const choral = readDoc('choral');

const instruments = extractInstruments(orchestration);
const voices = extractVoices(choral);

mkdirSync(OUT_DIR, { recursive: true });
const write = (name, data) => {
  writeFileSync(path.join(OUT_DIR, `${name}.json`), `${JSON.stringify(data, null, 2)}\n`);
  console.log(`  ${name.padEnd(14)} ${String(data.length).padStart(4)} records`);
};

if (instruments.length < 20) console.warn(`  WARNING: only ${instruments.length} instruments parsed`);
if (voices.length === 0) throw new Error('0 voice parts parsed — the document format changed');

write('instruments', instruments);
write('voices', voices);
console.log(`\n  -> ${path.relative(process.cwd(), OUT_DIR)}`);
