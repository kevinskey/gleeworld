#!/usr/bin/env node
// Regenerates supabase/functions/_shared/academy/corpus.ts from the live site.
//   node scripts/ingest-academy.mjs
// Run manually; the corpus is a snapshot and goes stale when the site changes.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { SOURCES } from './academy/manifest.mjs';
import { recordToChunk } from './academy/normalize.mjs';

const OUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../supabase/functions/_shared/academy/corpus.ts',
);

const flatten = (value) => (Array.isArray(value) ? value : Object.values(value ?? {}));

async function extractData(page, source) {
  const records = [];
  for (const name of source.globals) {
    // Global lexical `const` bindings from a classic <script> are visible to
    // evaluated code in the same realm, but are NOT on `window`.
    const value = await page.evaluate((n) => {
      try { return eval(n); } catch { return null; }
    }, name);
    if (value == null) throw new Error(`${source.page}: global ${name} not found`);
    records.push(...flatten(value));
  }
  return records;
}

async function extractDom(page, source) {
  return page.$$eval(
    source.blockSelector,
    (nodes, titleSel) => nodes.map((node) => {
      const titleNode = node.querySelector(titleSel);
      const title = (titleNode?.textContent ?? '').trim();
      const clone = node.cloneNode(true);
      clone.querySelectorAll(titleSel).forEach((n) => n.remove());
      return { name: title, body: (clone.textContent ?? '').replace(/\s+/g, ' ').trim() };
    }),
    source.titleSelector,
  );
}

async function extractApi(source) {
  const res = await fetch(source.apiUrl);
  if (!res.ok) throw new Error(`${source.page}: ${source.apiUrl} returned ${res.status}`);
  const json = await res.json();
  return json[source.collection] ?? [];
}

async function main() {
  const browser = await chromium.launch();
  const chunks = [];
  const seen = new Set();
  const report = [];

  try {
    for (const source of SOURCES) {
      let records;
      if (source.mode === 'api') {
        records = await extractApi(source);
      } else {
        const page = await browser.newPage();
        const res = await page.goto(source.url, { waitUntil: 'networkidle' });
        if (!res || res.status() !== 200) {
          throw new Error(`${source.page}: ${source.url} returned ${res?.status()}`);
        }
        records = source.mode === 'data'
          ? await extractData(page, source)
          : await extractDom(page, source);
        await page.close();
      }

      if (records.length === 0) throw new Error(`${source.page}: extracted 0 records`);

      const cfg = source.cfg ?? { titleField: 'name', fields: ['body'] };
      const ctx = { page: source.page, pageTitle: source.pageTitle, url: source.url };
      let kept = 0;
      let skipped = 0;
      for (const record of records) {
        const chunk = recordToChunk(record, cfg, ctx);
        if (!chunk) { skipped++; continue; }
        // Disambiguate collisions rather than silently dropping a chunk.
        if (seen.has(chunk.id)) {
          let n = 2;
          while (seen.has(`${chunk.id}-${n}`)) n++;
          chunk.id = `${chunk.id}-${n}`;
        }
        seen.add(chunk.id);
        chunks.push(chunk);
        kept++;
      }
      report.push(`  ${source.page.padEnd(20)} ${String(kept).padStart(4)} chunks  (${skipped} skipped)`);
    }
  } finally {
    await browser.close();
  }

  chunks.sort((a, b) => a.id.localeCompare(b.id));

  const body = [
    '// GENERATED FILE — do not edit by hand.',
    '// Regenerate: node scripts/ingest-academy.mjs',
    `// Source: kevinphillipjohnson.com/academy (${SOURCES.length} sources)`,
    "import type { AcademyChunk } from './types.ts';",
    '',
    `export const ACADEMY_CORPUS: AcademyChunk[] = ${JSON.stringify(chunks, null, 2)};`,
    '',
  ].join('\n');

  writeFileSync(OUT, body, 'utf8');
  console.log(report.join('\n'));
  console.log(`\n  TOTAL ${chunks.length} chunks -> ${path.relative(process.cwd(), OUT)}`);
}

main().catch((err) => { console.error(`\nIngest failed: ${err.message}`); process.exit(1); });
