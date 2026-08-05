#!/usr/bin/env npx tsx
/**
 * Sweeps every imported reading citation through parseCitation() and reports
 * anything that fails to resolve — an unrecognised book name, or a segment
 * that lands in `unparsed`. This is the real-corpus check that unit tests
 * (which exercise a handful of hand-picked examples) cannot substitute for.
 *
 *   npx tsx scripts/check-citation-coverage.ts
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY — this is a read-only
 * sweep of gw_prayer_readings, so the service role is used only to bypass
 * RLS (the table is `authenticated`-read, not `anon`-read), not to write.
 *
 * Per the Phase 1 plan: expect >= 99% of citations to fully parse, with 0
 * unresolved book names. Do not raise the threshold to make this pass —
 * investigate every failure instead.
 */

import { createClient } from '@supabase/supabase-js';
import { parseCitation } from '../src/lib/prayer/citation';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const supabase = createClient(url, key);

type ReadingRow = { citation: string; slot: string };

async function fetchAllCitations(): Promise<ReadingRow[]> {
  const rows: ReadingRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('gw_prayer_readings')
      .select('citation, slot')
      .neq('slot', 'note')
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`fetch citations: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as ReadingRow[]));
    if (data.length < pageSize) break;
  }
  return rows;
}

const rows = await fetchAllCitations();
if (rows.length === 0) {
  console.error('No rows returned from gw_prayer_readings — has Phase 0 data been imported?');
  process.exit(1);
}

let fullyParsed = 0;
const unresolvedBooks = new Map<string, number>();
const unparsedSegments: { citation: string; segments: string[] }[] = [];

for (const row of rows) {
  const result = parseCitation(row.citation);
  if (result.usfmCode === null) {
    unresolvedBooks.set(row.citation, (unresolvedBooks.get(row.citation) ?? 0) + 1);
    continue;
  }
  if (result.unparsed.length > 0) {
    unparsedSegments.push({ citation: row.citation, segments: result.unparsed });
    continue;
  }
  fullyParsed++;
}

const total = rows.length;
const pct = ((fullyParsed / total) * 100).toFixed(1);

console.log(`${fullyParsed}/${total} citations fully parsed (${pct}%)`);

if (unresolvedBooks.size > 0) {
  console.log(`\n${unresolvedBooks.size} citations with an unresolved book name:`);
  for (const [citation, count] of unresolvedBooks) {
    console.log(`  ${citation} (x${count})`);
  }
}

if (unparsedSegments.length > 0) {
  console.log(`\n${unparsedSegments.length} citations with a malformed segment:`);
  for (const { citation, segments } of unparsedSegments) {
    console.log(`  ${citation} -> unparsed: ${segments.join(', ')}`);
  }
}

if (fullyParsed / total < 0.99 || unresolvedBooks.size > 0) {
  console.error('\nBelow the 99% threshold, or an unresolved book name exists. Investigate before shipping.');
  process.exit(1);
}
