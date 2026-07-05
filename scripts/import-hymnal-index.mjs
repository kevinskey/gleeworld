#!/usr/bin/env node
// Import scraped hymnal index JSON files into gw_hymn_index.
//
// Usage:
//   SUPABASE_URL=https://supabase.gleeworld.org \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/import-hymnal-index.mjs <dir-with-json>
//
// Expects <dir>/<HYMNALID>.json — an array of { number, title, authors }
// (factual index metadata from Hymnary.org; titles/numbers only, never
// hymn texts, which are copyrighted).

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const [dir] = process.argv.slice(2);
const URL_BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!dir || !URL_BASE || !KEY) {
  console.error('usage: SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/import-hymnal-index.mjs <dir>');
  process.exit(1);
}

const files = readdirSync(dir).filter((f) => /^[A-Z0-9]+\.json$/.test(f));
let total = 0;
for (const file of files) {
  const hymnalId = file.replace(/\.json$/, '');
  const rows = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  const records = rows
    .filter((r) => r.number && r.title)
    .map((r) => ({
      hymnal_id: hymnalId,
      number: String(r.number).trim(),
      title: String(r.title).trim(),
      authors: r.authors ? String(r.authors).trim() : null,
    }));
  for (let i = 0; i < records.length; i += 500) {
    const chunk = records.slice(i, i + 500);
    const resp = await fetch(`${URL_BASE}/rest/v1/gw_hymn_index?on_conflict=hymnal_id,number,title`, {
      method: 'POST',
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(chunk),
    });
    if (!resp.ok) {
      console.error(`${hymnalId}: chunk at ${i} failed ${resp.status}: ${await resp.text()}`);
      process.exit(1);
    }
  }
  total += records.length;
  console.log(`${hymnalId}: ${records.length} hymns`);
}
console.log(`done — ${total} rows`);
