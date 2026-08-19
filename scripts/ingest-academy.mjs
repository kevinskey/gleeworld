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

// A `globals` entry is either "NAME" (use the page-level cfg) or
// { name, cfg } when a page's globals have different record shapes.
const globalEntries = (source) =>
  source.globals.map((g) => (typeof g === 'string' ? { name: g, cfg: source.cfg } : g));

async function extractData(page, source) {
  const groups = [];
  for (const { name, cfg } of globalEntries(source)) {
    // Global lexical `const` bindings from a classic <script> are visible to
    // evaluated code in the same realm, but are NOT on `window`.
    const value = await page.evaluate((n) => {
      try { return eval(n); } catch { return null; }
    }, name);
    if (value == null) throw new Error(`${source.page}: global ${name} not found`);
    groups.push({ cfg, records: flatten(value) });
  }
  return groups;
}

async function extractDom(page, source) {
  const records = await page.$$eval(
    source.blockSelector,
    (nodes, titleSel) => nodes.map((node) => {
      const titleNode = node.querySelector(titleSel);
      const title = (titleNode?.textContent ?? '').trim();
      const clone = node.cloneNode(true);
      clone.querySelectorAll(titleSel).forEach((n) => n.remove());
      const body = (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
      return { name: title, body };
    }),
    source.titleSelector,
  );

  // Some blocks carry no title element (e.g. church.html's 3 `.card full`
  // panels). Derive a title from the body rather than dropping the content.
  for (const record of records) {
    if (!record.name && record.body) {
      const head = record.body.slice(0, 60).trim();
      record.name = record.body.length > 60 ? `${head}…` : head;
    }
  }
  return records;
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
      const domCfg = { titleField: 'name', fields: ['body'] };
      let groups;
      if (source.mode === 'api') {
        groups = [{ cfg: source.cfg, records: await extractApi(source) }];
      } else {
        const page = await browser.newPage();
        const res = await page.goto(source.url, { waitUntil: 'networkidle' });
        if (!res || res.status() !== 200) {
          throw new Error(`${source.page}: ${source.url} returned ${res?.status()}`);
        }
        groups = source.mode === 'data'
          ? await extractData(page, source)
          : [{ cfg: domCfg, records: await extractDom(page, source) }];
        await page.close();
      }

      const totalRecords = groups.reduce((n, g) => n + g.records.length, 0);
      if (totalRecords === 0) throw new Error(`${source.page}: extracted 0 records`);

      const ctx = { page: source.page, pageTitle: source.pageTitle, url: source.url };
      let kept = 0;
      let skipped = 0;
      for (const group of groups) {
        for (const record of group.records) {
          const chunk = recordToChunk(record, group.cfg ?? domCfg, ctx);
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
      }

      // A page that yields records but no chunks means the field config is
      // wrong. Fail rather than quietly shipping a corpus missing that page.
      if (kept === 0) {
        throw new Error(`${source.page}: 0 chunks from ${totalRecords} records — check the field config in manifest.mjs`);
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
