#!/usr/bin/env npx tsx
/**
 * Sweeps the real catholic-readings-api corpus and reports how much of it
 * parseCitation() resolves cleanly. Fetch-based rather than DB-based, matching
 * how the other Prayer import scripts avoid a live database dependency
 * (see scripts/import-prayer-calendar.ts).
 *
 *   npx tsx scripts/check-citation-coverage.ts --from 2026 --to 2027
 *
 * Definition of done (docs/superpowers/plans/2026-08-04-prayer-phase1.md):
 * >= 99% of citations fully parsed, 0 unresolved book names. Every unparsed
 * segment and unresolved book is printed — do not raise the threshold to
 * make a shortfall pass, investigate it instead.
 */

import { normalizeReadingsDay } from '../src/lib/prayer/readings';
import { parseCitation } from '../src/lib/prayer/citation';

const READINGS = 'https://cpbjr.github.io/catholic-readings-api/readings';

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const from = Number(arg('from', '2026'));
const to = Number(arg('to', '2027'));

async function fetchJson(url: string, attempt = 1): Promise<unknown | null> {
  try {
    const res = await fetch(url);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    // Parallel fetching against this host gets rate-limited; one serial retry
    // is what Phase 0 found necessary. See import-prayer-calendar.ts.
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 500 * attempt));
      return fetchJson(url, attempt + 1);
    }
    throw new Error(`${url}: ${(err as Error).message}`);
  }
}

function daysInYear(year: number): string[] {
  const days: string[] = [];
  const d = new Date(Date.UTC(year, 0, 1));
  while (d.getUTCFullYear() === year) {
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    days.push(`${year}-${mm}-${dd}`);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}

let totalCitations = 0;
let fullyParsed = 0;
const unresolvedBooks = new Map<string, number>();
const unparsedSegments: string[] = [];

for (let year = from; year <= to; year += 1) {
  let yearRows = 0;
  for (const date of daysInYear(year)) {
    const mmdd = date.slice(5);
    const payload = await fetchJson(`${READINGS}/${year}/${mmdd}.json`);
    if (!payload) continue;

    const day = normalizeReadingsDay(payload as Parameters<typeof normalizeReadingsDay>[0]);
    for (const reading of day.readings) {
      totalCitations += 1;
      yearRows += 1;
      const parsed = parseCitation(reading.citation);
      if (!parsed.usfmCode) {
        unresolvedBooks.set(reading.citation, (unresolvedBooks.get(reading.citation) ?? 0) + 1);
        continue;
      }
      if (parsed.unparsed.length > 0) {
        unparsedSegments.push(`${reading.citation} -> unparsed: ${parsed.unparsed.join(', ')}`);
        continue;
      }
      fullyParsed += 1;
    }
  }
  console.log(`${year}: ${yearRows} citations fetched`);
}

const pct = totalCitations === 0 ? 0 : (fullyParsed / totalCitations) * 100;
console.log(`\n${fullyParsed}/${totalCitations} citations fully parsed (${pct.toFixed(1)}%)`);

if (unresolvedBooks.size > 0) {
  console.log(`\nUnresolved book names (${unresolvedBooks.size} distinct citations):`);
  for (const [citation, count] of unresolvedBooks) console.log(`  ${count}x  ${citation}`);
}

if (unparsedSegments.length > 0) {
  console.log(`\nCitations with a malformed segment (${unparsedSegments.length}):`);
  for (const line of unparsedSegments) console.log(`  ${line}`);
}

if (pct < 99 || unresolvedBooks.size > 0) {
  console.error('\nBelow the >= 99% / 0-unresolved-books bar. Investigate before shipping.');
  process.exit(1);
}
