#!/usr/bin/env npx tsx
/**
 * Generates SQL to populate gw_prayer_calendar_days and gw_prayer_readings.
 *
 *   npx tsx scripts/import-prayer-calendar.ts --from 2026 --to 2027 --out /tmp/prayer.sql
 *   psql "$DB_URL" -v ON_ERROR_STOP=1 -f /tmp/prayer.sql
 *
 * Two upstreams, deliberately:
 *   - LitCal (Apache-2.0) for the CALENDAR. Complete for 2020-2035.
 *   - catholic-readings-api (MIT) for the reading CITATIONS. LitCal's own
 *     citations are blank on 28-50% of dates per year, mostly ferial weekdays
 *     in Ordinary Time, so they are not used.
 *
 * Reading citations exist upstream for 2026 and 2027 only. A year with no
 * readings data is reported loudly, never skipped silently.
 */

import { writeFileSync } from 'node:fs';
import { normalizeLitCalYear } from '../src/lib/prayer/litcal';
import { normalizeReadingsDay } from '../src/lib/prayer/readings';
import { parseCitation } from '../src/lib/prayer/citation';
import { lit, arrayLit, jsonLit, header, FOOTER } from './prayer-sql';

const LITCAL = 'https://litcal.johnromanodorazio.com/api/dev/calendar/nation/US';
const READINGS = 'https://cpbjr.github.io/catholic-readings-api/readings';

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const from = Number(arg('from', '2026'));
const to = Number(arg('to', '2027'));
const out = arg('out', '/tmp/prayer-calendar.sql');

async function fetchJson(url: string, attempt = 1): Promise<unknown | null> {
  try {
    const res = await fetch(url);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    // Fetching this dataset in parallel gets rate-limited: 16 concurrent
    // workers produced 36 consecutive failures that all recovered serially.
    // One patient retry is enough.
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 500 * attempt));
      return fetchJson(url, attempt + 1);
    }
    throw new Error(`${url}: ${(err as Error).message}`);
  }
}

// LitCal returns the LITURGICAL year: `year=2026` spans 2025-11-29 to
// 2026-11-28. Reading citations are filed under the CIVIL year. Iterating
// civil dates would leave the Advent/Christmas tail of the previous year
// uncovered and throw away readings past the liturgical year end, so the
// readings fetch is driven off the dates the calendar actually contains.

const statements: string[] = [];
let calendarRows = 0;
let readingRows = 0;
let readingRowsResolved = 0;
let readingRowsWithMalformedSegment = 0;

for (let year = from; year <= to; year++) {
  // ---- calendar ----------------------------------------------------------
  const payload = await fetchJson(`${LITCAL}?year=${year}`);
  if (!payload) throw new Error(`LitCal has no calendar for ${year}`);
  const days = normalizeLitCalYear(payload as never);

  for (const day of days) {
    calendarRows++;
    statements.push(
      `INSERT INTO public.gw_prayer_calendar_days
  (rite, day_date, event_key, name, rank_grade, rank_label, color,
   liturgical_season, sunday_cycle, psalter_week, is_holy_day_of_obligation, source)
VALUES (${lit(day.rite)}, ${lit(day.dayDate)}, ${lit(day.eventKey)}, ${lit(day.name)},
        ${lit(day.rankGrade)}, ${lit(day.rankLabel)}, ${arrayLit(day.color)},
        ${lit(day.liturgicalSeason)}, ${lit(day.sundayCycle)}, ${lit(day.psalterWeek)},
        ${lit(day.isHolyDayOfObligation)}, 'litcal')
ON CONFLICT (rite, day_date, event_key) DO UPDATE SET
  name = EXCLUDED.name, rank_grade = EXCLUDED.rank_grade,
  rank_label = EXCLUDED.rank_label, color = EXCLUDED.color,
  liturgical_season = EXCLUDED.liturgical_season,
  sunday_cycle = EXCLUDED.sunday_cycle, psalter_week = EXCLUDED.psalter_week,
  is_holy_day_of_obligation = EXCLUDED.is_holy_day_of_obligation,
  updated_at = now();`,
    );
  }
  console.log(`${year}: calendar — ${days.length} events, ${new Set(days.map((d) => d.dayDate)).size} dates`);

  // ---- readings ----------------------------------------------------------
  let covered = 0;
  const missing: string[] = [];
  const calendarDates = [...new Set(days.map((d) => d.dayDate))].sort();
  for (const date of calendarDates) {
    const [yyyy, mm, dd] = date.split('-');
    const payload = await fetchJson(`${READINGS}/${yyyy}/${mm}-${dd}.json`);
    if (!payload) {
      missing.push(date);
      continue;
    }
    const day = normalizeReadingsDay(payload as never);
    if (!day.readings.length) {
      missing.push(date);
      continue;
    }
    covered++;

    // Attach to the highest-ranking celebration on that date. rank_grade DESC
    // picks the solemnity/feast over a concurrent optional memorial.
    for (const r of day.readings) {
      readingRows++;
      // Parsed once here rather than at query time, so prayer_day_full() can
      // join straight to gw_bible_verses in pure SQL — see
      // src/lib/prayer/citation.ts for why parsing lives in exactly one place.
      const parsed = parseCitation(r.citation);
      if (parsed.usfmCode) readingRowsResolved++;
      if (parsed.unparsed.length) readingRowsWithMalformedSegment++;

      statements.push(
        `INSERT INTO public.gw_prayer_readings (calendar_day_id, slot, citation, schema_label, sort_order, source, parsed_citation)
SELECT d.id, ${lit(r.slot)}, ${lit(r.citation)}, ${lit(r.schemaLabel)}, ${lit(r.sortOrder)}, ${lit(r.source)}, ${jsonLit(parsed)}
FROM public.gw_prayer_calendar_days d
WHERE d.rite = 'roman_catholic' AND d.day_date = ${lit(day.dayDate)}
ORDER BY d.rank_grade DESC NULLS LAST, d.event_key
LIMIT 1
ON CONFLICT (calendar_day_id, slot, schema_label) DO UPDATE SET
  citation = EXCLUDED.citation, sort_order = EXCLUDED.sort_order,
  source = EXCLUDED.source, parsed_citation = EXCLUDED.parsed_citation;`,
      );
    }
    await new Promise((r) => setTimeout(r, 40)); // be polite; parallel gets throttled
  }

  console.log(`${year}: readings — ${covered}/${calendarDates.length} calendar dates covered, ${missing.length} without`);
  if (missing.length) {
    console.log(`  no readings: ${missing.slice(0, 12).join(', ')}${missing.length > 12 ? ` … +${missing.length - 12}` : ''}`);
  }
  if (covered === 0) {
    console.log(`  !! ${year} has NO reading data upstream (only 2026-2027 are populated).`);
  }
}

writeFileSync(
  out,
  header(
    'Prayer module — liturgical calendar + Mass reading citations',
    'LitCal (Apache-2.0) calendar; catholic-readings-api (MIT) citations',
    calendarRows + readingRows,
  ) + statements.join('\n\n') + FOOTER,
);

console.log(`\nwrote ${out}: ${calendarRows} calendar rows, ${readingRows} reading rows`);
console.log(
  `citation parsing: ${readingRowsResolved}/${readingRows} resolved a book, ` +
    `${readingRowsWithMalformedSegment} had at least one malformed segment`,
);
