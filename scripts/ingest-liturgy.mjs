#!/usr/bin/env node
// Builds supabase/functions/_shared/liturgy/corpus.ts from documents you hold
// a licence for.
//
//   node scripts/ingest-liturgy.mjs <dir>
//
// WHY THIS TAKES LOCAL FILES AND NOT URLS
//
// The Academy ingest scrapes a website because that site is Kevin's own. The
// liturgical sources are not: Vatican texts are © Libreria Editrice Vaticana,
// the GIRM and the US adaptations are © USCCB/ICEL, and Sing to the Lord and
// Built of Living Stones are © USCCB. Pointing a scraper at vatican.va would
// copy them into this repository, which is not ours to do. So the input is a
// directory YOU control, holding material you are licensed to use: a diocesan
// handbook, a licensed extract, policies you wrote yourself.
//
// INPUT FORMAT
//
// One JSON file per document:
//
// {
//   "document": "GIRM",
//   "documentTitle": "General Instruction of the Roman Missal",
//   "issuedBy": "USCCB",
//   "authority": "conference_adaptation",
//   "kind": "instruction",
//   "jurisdiction": "US",
//   "year": 2011,
//   "edition": "3rd typical edition",
//   "current": true,
//   "copyright": "© USCCB/ICEL — licensed excerpt",
//   "url": "https://www.usccb.org/...",
//   "sections": [
//     { "section": "48", "title": "The Entrance Chant", "text": "..." }
//   ]
// }
//
// Every field above is required except url, edition and year, because an
// answer that cannot say WHOSE rule it is and WHERE it applies is not usable.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const OUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../supabase/functions/_shared/liturgy/corpus.ts',
);

const AUTHORITY = new Set([
  'universal_law', 'papal_or_dicastery', 'conference_adaptation',
  'conference_guidance', 'diocesan_policy', 'local_practice',
]);
const KIND = new Set(['law', 'rubric', 'instruction', 'guidance', 'catechesis', 'policy']);

const slug = (s) => String(s).toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');

function chunksFrom(doc, file) {
  const need = (field) => {
    if (!doc[field]) throw new Error(`${file}: missing "${field}"`);
    return doc[field];
  };
  const authority = need('authority');
  if (!AUTHORITY.has(authority)) {
    throw new Error(`${file}: authority "${authority}" is not one of ${[...AUTHORITY].join(', ')}`);
  }
  const kind = need('kind');
  if (!KIND.has(kind)) {
    throw new Error(`${file}: kind "${kind}" is not one of ${[...KIND].join(', ')}`);
  }
  if (!Array.isArray(doc.sections) || doc.sections.length === 0) {
    throw new Error(`${file}: no sections`);
  }

  return doc.sections.map((s) => {
    const text = String(s.text ?? '').replace(/\s+/g, ' ').trim();
    if (!text) throw new Error(`${file}: section ${s.section ?? '?'} has no text`);
    return {
      id: `${slug(need('document'))}/${slug(s.section ?? s.title ?? text.slice(0, 24))}`,
      document: doc.document,
      documentTitle: need('documentTitle'),
      issuedBy: need('issuedBy'),
      authority,
      kind,
      jurisdiction: need('jurisdiction'),
      section: String(s.section ?? ''),
      year: doc.year,
      edition: doc.edition,
      // Absent means current: a document is assumed in force unless it is
      // explicitly marked superseded, which is how these are actually filed.
      current: doc.current !== false,
      url: doc.url,
      copyright: doc.copyright,
      // The heading carries the document code so a search for "GIRM 48" hits
      // the right passage — the scorer weights titles more heavily.
      title: `${doc.document} ${s.section ?? ''} ${s.title ?? ''}`.replace(/\s+/g, ' ').trim(),
      text,
    };
  });
}

const dir = process.argv[2];
if (!dir) {
  console.error('usage: node scripts/ingest-liturgy.mjs <dir-of-licensed-json>');
  process.exit(1);
}

const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
if (files.length === 0) {
  console.error(`No .json documents in ${dir}.`);
  process.exit(1);
}

const chunks = [];
for (const file of files) {
  const doc = JSON.parse(readFileSync(path.join(dir, file), 'utf8'));
  const produced = chunksFrom(doc, file);
  chunks.push(...produced);
  console.log(`${file}: ${produced.length} sections (${doc.document}, ${doc.authority})`);
}

// Stable order so a re-ingest produces a reviewable diff rather than churn.
chunks.sort((a, b) => a.id.localeCompare(b.id));

const banner = `// GENERATED FILE — do not edit by hand.
// Regenerate: node scripts/ingest-liturgy.mjs <dir>
// ${chunks.length} sections from ${files.length} document(s).
//
// Only material the platform is licensed to hold belongs here. See the
// ingest script for why this is not scraped.
`;

writeFileSync(
  OUT,
  `${banner}\nimport type { LiturgyChunk } from './types.ts';\n\n`
  + `export const LITURGY_CORPUS: LiturgyChunk[] = ${JSON.stringify(chunks, null, 2)};\n`,
);
console.log(`\nWrote ${chunks.length} sections to ${path.relative(process.cwd(), OUT)}`);
