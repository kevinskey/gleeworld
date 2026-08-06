# Prayer Module — Phase 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the platform reference data for the Prayer module — the Roman Catholic liturgical calendar with Mass reading citations, and the full text of a public-domain Catholic Bible — so that one SQL call answers "what is today, and what is read?"

**Architecture:** Two classes of table. Calendar, readings, translations, books and verses are **platform reference data**: no `tenant_id`, readable by every authenticated user, writable only by `super_admin`. This is a deliberate exception to the tenant-RLS invariant that holds on 586/606 tables, and it is why Task 1 ships an explicit SQL test asserting these tables are *intentionally* tenant-less. Data is imported once by idempotent Node scripts and stored as rows, so there is no runtime dependency on any third-party API and no new CSP `connect-src` host.

**Tech Stack:** PostgreSQL (self-hosted Supabase), SQL migrations under `supabase/migrations/`, SQL assertion tests under `supabase/migrations/tests/`, Node ESM import scripts under `scripts/` (matching `import-hymnal-index.mjs`), Vitest for unit tests of pure parsing/normalisation logic.

## Global Constraints

- Table prefix is `gw_`. All new objects live in schema `public`.
- Reference tables in this phase have **no `tenant_id` column**, no `set_tenant_id_default` trigger, and **no** `tenant_isolation_restrict` policy. They are read-only to `authenticated` and writable only by `super_admin`.
- Role checks must accept **both** `'super_admin'` and legacy `'super-admin'`.
- The self-hosted DB has **no `schema_migrations` table** — verify migrations by inspecting objects, not by a migration ledger. DDL is applied as `-U supabase_admin`.
- Kevin runs all production DB statements himself via the `!` prefix. Never apply a migration to production from this session.
- After any DDL that the PostgREST API must see: `NOTIFY pgrst, 'reload schema';`
- Import scripts are Node ESM `.mjs` under `scripts/`, invoked manually, idempotent, and safe to re-run.
- `npm test` is `vitest run`. Unit tests live beside the code as `*.test.ts`.
- No new npm **runtime** dependency in this phase (`romcal` is not needed). `tsx` is added as a **dev** dependency because Node's native type-stripping will not resolve extensionless relative imports, so the admin import scripts need a TS runner.

---

## Verified findings from the spike (2026-08-04)

These were tested against the live sources, not assumed. They are the reason this plan is shaped the way it is.

**LitCal API** — `https://litcal.johnromanodorazio.com/api/dev/calendar/nation/US?year=YYYY` (project is Apache-2.0):

- Returns `year_type: LITURGICAL` — the liturgical year, e.g. `year=2026` spans **2025-11-29 → 2026-11-28**.
- 556 events across **365 distinct dates with zero gaps**. Full coverage.
- Years 2020, 2027 and 2035 all return HTTP 200 → the whole intended window is available.
- Each event carries: `event_key`, `name`, `color[]`, `grade`, `grade_lcl`, `type`, `date` (ISO-8601 **string**, e.g. `"2025-11-29T00:00:00+00:00"`), `liturgical_season`, `psalter_week`, `liturgical_year` (e.g. `"YEAR A"`, present on 229 of 556), and `readings`.
- `readings` is a **dict on 535 events and a plain string on 21** — the importer must handle both.
- Dict sub-keys observed: `first_reading` (532), `responsorial_psalm` (532), `second_reading` (123), `gospel_acclamation` (532), `gospel` (532), plus rarer `night`/`dawn`/`day` (Christmas), `palm_gospel` (Palm Sunday), `third_reading`…`seventh_reading` + `responsorial_psalm_2`…`_7` + `epistle` (Easter Vigil), `evening`, and `schema_one`/`schema_two`/`schema_three` (Pentecost Vigil).
- The five common sub-keys are an **exact 1:1 match** with the existing `gw_liturgy_masses` columns `first_reading`, `responsorial_psalm`, `second_reading`, `gospel_acclamation`, `gospel`. That is what makes the Phase 4 Liturgy Planner autofill trivial.
- String-valued `readings`: 17 `SatMemBVM*` events read `"From the Common of the Blessed Virgin Mary"`; 4 are empty strings.
- `readings` also **nests** complete formularies: Christmas under `night`/`dawn`/`day`, the Pentecost Vigil under `schema_one`/`two`/`three`. An early version of the normaliser dropped these silently and lost Christmas entirely; they now flatten into `schema_label`.

> **CORRECTION (2026-08-04).** An earlier revision of this plan claimed only two
> dates per year lack readings. **That was wrong.** The check that produced it
> treated `readings: {"first_reading": "", …}` — a dict of empty strings — as
> coverage. Re-measured properly:
>
> | Year | Dates with no readings |
> |---|---|
> | 2020 | 105 (28.8%) |
> | 2024 | 170 (46.6%) |
> | 2026 | 104 (28.5%) |
> | 2027 | **184 (50.4%)** |
> | 2030 | 165 (45.2%) |
>
> The gaps are almost entirely **ferial weekdays in Ordinary Time** — the Year
> I/II weekday lectionary. LitCal exposes no lectionary endpoint. This is not
> patchable, so **LitCal supplies the calendar only.**

**catholic-readings-api** — `https://cpbjr.github.io/catholic-readings-api/readings/YYYY/MM-DD.json` (**MIT**), the readings source:

- **Citations only — no scripture text.** This is what keeps the licensing posture intact: citations are references, and the text renders from public-domain WEBCE we host ourselves.
- Measured by fetching **all 365 days of 2026**: every day present, every day with at least one citation, 1,165 readings total, zero collisions on the `(slot, schema_label)` unique key.
- Flat, all-string payload. Exactly four slots: `firstReading` (363), `psalm` (365), `secondReading` (72), `gospel` (365). **No `gospel_acclamation`** — LitCal has that for the days it covers, but mixing provenance per-slot is deliberately out of scope for Phase 0.
- **Only 2026 and 2027 are populated upstream**; 2024, 2025 and 2028 are not. Adding each new year is an ongoing maintenance task and a real dependency on a single-maintainer project (29 stars, last push 2026-06-28).
- **Fetching in parallel gets rate-limited**: 16 workers produced 36 consecutive failures, all of which recovered on a serial retry. The importer must fetch politely with retry, or vendor the data from a pinned commit.

**World English Bible Catholic Edition** — `https://ebible.org/Scriptures/eng-web-c_usfm.zip`:

- 3.0 MB zip → 19.4 MB, 77 files, **73 `.usfm` book files**.
- Deuterocanon present in Catholic book order: `41-TOB`, `42-JDT`, `43-ESG`, `45-WIS`, `46-SIR`, `47-BAR`, `52-1MA`, `53-2MA`, `66-DAG`.
- `copr.htm` states verbatim: *"The World English Bible is in the Public Domain. That means that it is not copyrighted."* Note `"World English Bible"` is a **trademark of eBible.org** — the name may not be used in a way implying endorsement, so the UI attributes it as the translation name only.

**`romcal` is not needed.** It is MIT and correct, but it supplies calendar data *only* — no reading citations — and LitCal supplies the same calendar fields (season, rank, colour, Sunday cycle, psalter week) **plus** the US national-calendar variants. Taking both would mean reconciling two sources of truth for the same facts. **This plan uses LitCal for the calendar and drops `romcal` entirely**, removing a dependency the design doc had assumed. Readings come from catholic-readings-api, above.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/20260804120000_prayer_calendar.sql` | `gw_prayer_calendar_days` + `gw_prayer_readings`; reference-table RLS |
| `supabase/migrations/tests/prayer_calendar_test.sql` | Asserts calendar schema, RLS shape, and the deliberate absence of `tenant_id` |
| `supabase/migrations/20260804130000_prayer_bible.sql` | `gw_bible_translations`, `gw_bible_books`, `gw_bible_verses` + FTS index |
| `supabase/migrations/tests/prayer_bible_test.sql` | Asserts bible schema, RLS shape, FTS index presence |
| `supabase/migrations/20260804140000_prayer_day_rpc.sql` | `public.prayer_day(date, text)` RPC — the Phase 0 deliverable |
| `supabase/migrations/tests/prayer_day_rpc_test.sql` | Asserts the RPC returns a day + readings for a seeded date |
| `src/lib/prayer/slots.ts` | Canonical slot vocabulary + ordering shared by every readings source |
| `src/lib/prayer/litcal.ts` | Pure normalisation: LitCal event JSON → calendar-day rows |
| `src/lib/prayer/readings.ts` | Pure normalisation: catholic-readings-api day JSON → reading rows |
| `src/lib/prayer/readings.test.ts` | Vitest unit tests for the readings normaliser |
| `scripts/import-readings.mjs` | Fetches reading citations for a year (serially), upserts rows |
| `src/lib/prayer/litcal.test.ts` | Vitest unit tests for the above, including the string/empty edge cases |
| `src/lib/prayer/usfm.ts` | Pure USFM parser: book file text → `{book, chapter, verse, text}[]` |
| `src/lib/prayer/usfm.test.ts` | Vitest unit tests for the parser |
| `scripts/import-litcal.mjs` | Fetches a year range, calls `litcal.ts`, upserts rows |
| `scripts/import-webce.mjs` | Unzips WEBCE USFM, calls `usfm.ts`, upserts verses |

Parsing logic is deliberately split from the import scripts so it is unit-testable without a database or network.

---

### Task 1: Calendar + readings schema

**Files:**
- Create: `supabase/migrations/20260804120000_prayer_calendar.sql`
- Test: `supabase/migrations/tests/prayer_calendar_test.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: tables `public.gw_prayer_calendar_days(id uuid, rite text, day_date date, event_key text, name text, rank_grade int, rank_label text, color text[], liturgical_season text, sunday_cycle char(1), weekday_cycle char(1), psalter_week int, is_holy_day_of_obligation bool, source text, created_at timestamptz, updated_at timestamptz)` with `UNIQUE (rite, day_date, event_key)`, and `public.gw_prayer_readings(id uuid, calendar_day_id uuid REFERENCES gw_prayer_calendar_days(id) ON DELETE CASCADE, slot text, citation text, schema_label text, sort_order int)` with `UNIQUE (calendar_day_id, slot, schema_label)`. Later tasks join on `gw_prayer_calendar_days.id`.

- [ ] **Step 1: Write the failing SQL test**

Create `supabase/migrations/tests/prayer_calendar_test.sql`:

```sql
-- supabase/migrations/tests/prayer_calendar_test.sql
-- Run against a DB with 20260804120000_prayer_calendar.sql applied.
-- Asserts reference-table shape: RLS on, NO tenant_id, read-to-authenticated,
-- write-to-super_admin only.
BEGIN;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['gw_prayer_calendar_days','gw_prayer_readings'] LOOP
    ASSERT (SELECT count(*) = 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = t), t || ' missing';
    ASSERT (SELECT relrowsecurity FROM pg_class
            WHERE relname = t AND relnamespace = 'public'::regnamespace),
           t || ': RLS not enabled';
    -- These are PLATFORM REFERENCE tables. Absence of tenant_id is deliberate.
    ASSERT (SELECT count(*) = 0 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = t
              AND column_name = 'tenant_id'),
           t || ': has tenant_id — reference tables must be tenant-neutral';
    ASSERT (SELECT count(*) = 0 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = t
              AND permissive = 'RESTRICTIVE'),
           t || ': unexpected RESTRICTIVE policy on a reference table';
    ASSERT (SELECT count(*) = 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = t
              AND policyname = t || '_read'),
           t || ': read policy missing';
    ASSERT (SELECT count(*) = 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = t
              AND policyname = t || '_admin_write'),
           t || ': admin write policy missing';
  END LOOP;
END $$;

DO $$
BEGIN
  ASSERT (SELECT count(*) = 1 FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname = 'gw_prayer_calendar_days_rite_date_key_uidx'),
         'unique (rite, day_date, event_key) index missing';
  ASSERT (SELECT count(*) = 1 FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname = 'gw_prayer_readings_day_slot_uidx'),
         'unique (calendar_day_id, slot, schema_label) index missing';
END $$;

ROLLBACK;
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
psql "$PRAYER_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/tests/prayer_calendar_test.sql
```

Expected: FAIL with `gw_prayer_calendar_days missing`.

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20260804120000_prayer_calendar.sql`:

```sql
-- Prayer module — liturgical calendar + Mass reading citations.
--
-- PLATFORM REFERENCE DATA. Unlike almost every other gw_ table, these have
-- NO tenant_id: the Roman calendar is identical for every tenant, so copying
-- 365 rows/year per tenant would be pure waste and a consistency hazard.
-- Readable by every authenticated user; writable only by super_admin.
--
-- Source: LiturgicalCalendarAPI (Apache-2.0), national calendar US.
-- `rite` exists so an RCL/devotional track can be added later without a
-- schema change.

-- Super-admin-only predicate for the Prayer reference tables.
-- Mirrors the house pattern in 20260803120000_excuse_form_settings.sql but
-- WITHOUT is_admin: tenant admins must not be able to edit the Roman calendar.
-- Accepts the boolean column and both role spellings.
CREATE OR REPLACE FUNCTION public.gw_is_platform_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles p
     WHERE p.user_id = auth.uid()
       AND (p.is_super_admin OR p.role IN ('super_admin', 'super-admin'))
  );
$$;

CREATE TABLE IF NOT EXISTS public.gw_prayer_calendar_days (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rite                      text NOT NULL DEFAULT 'roman_catholic'
                              CHECK (rite IN ('roman_catholic','rcl','devotional')),
  day_date                  date NOT NULL,
  event_key                 text NOT NULL,
  name                      text NOT NULL,
  rank_grade                int,
  rank_label                text,
  color                     text[] NOT NULL DEFAULT '{}',
  liturgical_season         text,
  sunday_cycle              char(1) CHECK (sunday_cycle IN ('A','B','C')),
  -- LitCal does not expose the weekday (ferial) cycle, so the importer leaves
  -- this NULL. Phase 1 derives it: Cycle I in odd-numbered liturgical years,
  -- Cycle II in even. Column exists now so that backfill needs no migration.
  weekday_cycle             char(1) CHECK (weekday_cycle IN ('I','II')),
  psalter_week              int,
  is_holy_day_of_obligation boolean NOT NULL DEFAULT false,
  source                    text NOT NULL DEFAULT 'litcal',
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS gw_prayer_calendar_days_rite_date_key_uidx
  ON public.gw_prayer_calendar_days (rite, day_date, event_key);

CREATE INDEX IF NOT EXISTS gw_prayer_calendar_days_rite_date_idx
  ON public.gw_prayer_calendar_days (rite, day_date);

CREATE TABLE IF NOT EXISTS public.gw_prayer_readings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_day_id uuid NOT NULL
                    REFERENCES public.gw_prayer_calendar_days(id) ON DELETE CASCADE,
  -- first_reading | responsorial_psalm | second_reading | gospel_acclamation |
  -- gospel | palm_gospel | epistle | third_reading … seventh_reading, etc.
  slot            text NOT NULL,
  citation        text NOT NULL,
  -- Christmas night/dawn/day, Pentecost Vigil schema_one/two/three, else ''.
  schema_label    text NOT NULL DEFAULT '',
  sort_order      int  NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS gw_prayer_readings_day_slot_uidx
  ON public.gw_prayer_readings (calendar_day_id, slot, schema_label);

ALTER TABLE public.gw_prayer_calendar_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_prayer_readings      ENABLE ROW LEVEL SECURITY;

-- Reference data: everyone signed in may read.
CREATE POLICY gw_prayer_calendar_days_read ON public.gw_prayer_calendar_days
  FOR SELECT TO authenticated USING (true);
CREATE POLICY gw_prayer_readings_read ON public.gw_prayer_readings
  FOR SELECT TO authenticated USING (true);

-- Only platform super-admins may write. Accepts both role spellings.
CREATE POLICY gw_prayer_calendar_days_admin_write ON public.gw_prayer_calendar_days
  FOR ALL TO authenticated
  USING (public.gw_is_platform_super_admin())
  WITH CHECK (public.gw_is_platform_super_admin());
CREATE POLICY gw_prayer_readings_admin_write ON public.gw_prayer_readings
  FOR ALL TO authenticated
  USING (public.gw_is_platform_super_admin())
  WITH CHECK (public.gw_is_platform_super_admin());

NOTIFY pgrst, 'reload schema';
```

> `gw_is_platform_super_admin()` is new in this migration and deliberately
> narrower than the existing `is_current_user_admin_or_super_admin()` (which
> also returns true for tenant admins). The older `is_super_admin(uuid)` helper
> checks `profiles.role = 'super-admin'` only and would miss the `'super_admin'`
> spelling, so it is not used here.

- [ ] **Step 4: Run the test to verify it passes**

```bash
psql "$PRAYER_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260804120000_prayer_calendar.sql
psql "$PRAYER_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/tests/prayer_calendar_test.sql
```

Expected: no ASSERT failures; the test's final `ROLLBACK` leaves the DB clean.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260804120000_prayer_calendar.sql \
        supabase/migrations/tests/prayer_calendar_test.sql
git commit -m "feat(prayer): liturgical calendar + readings reference tables"
```

---

### Task 2: LitCal normaliser + importer

**Files:**
- Create: `src/lib/prayer/litcal.ts`
- Test: `src/lib/prayer/litcal.test.ts`
- Create: `scripts/import-litcal.mjs`

**Interfaces:**
- Consumes: tables from Task 1.
- Produces: `normalizeLitCalYear(payload: LitCalPayload): NormalizedDay[]` where
  `NormalizedDay = { rite: 'roman_catholic'; dayDate: string; eventKey: string; name: string; rankGrade: number | null; rankLabel: string | null; color: string[]; liturgicalSeason: string | null; sundayCycle: 'A'|'B'|'C'|null; psalterWeek: number | null; isHolyDayOfObligation: boolean; readings: NormalizedReading[] }`
  and `NormalizedReading = { slot: string; citation: string; schemaLabel: string; sortOrder: number }`.
  Task 3 does not depend on this; Task 5's test seeds rows directly.

- [ ] **Step 1: Write the failing unit test**

Create `src/lib/prayer/litcal.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalizeLitCalYear } from './litcal';

const sundayEvent = {
  event_key: 'Advent1',
  name: 'First Sunday of Advent',
  color: ['purple'],
  grade: 6,
  grade_lcl: 'Sunday',
  date: '2025-11-30T00:00:00+00:00',
  liturgical_season: 'ADVENT',
  liturgical_year: 'YEAR A',
  psalter_week: 1,
  readings: {
    first_reading: 'Isaiah 2:1-5',
    responsorial_psalm: 'Psalm 122: 1-2, 3-4, 4-5, 6-7, 8-9',
    second_reading: 'Romans 13:11-14',
    gospel_acclamation: 'Cf. Psalm 85:8',
    gospel: 'Matthew 24:37-44',
  },
};

// LitCal returns a plain STRING here, not a dict — 21 events per year do.
const commonEvent = {
  event_key: 'SatMemBVM1',
  name: 'Saturday Memorial of the BVM',
  color: ['white'],
  grade: 1,
  date: '2025-12-06T00:00:00+00:00',
  liturgical_season: 'ADVENT',
  psalter_week: 1,
  readings: 'From the Common of the Blessed Virgin Mary',
};

const emptyEvent = { ...commonEvent, event_key: 'ThursdayAfterAshWednesday', readings: '' };

describe('normalizeLitCalYear', () => {
  it('maps the five common reading slots with stable sort order', () => {
    const [day] = normalizeLitCalYear({ litcal: [sundayEvent] });
    expect(day.dayDate).toBe('2025-11-30');
    expect(day.sundayCycle).toBe('A');
    expect(day.liturgicalSeason).toBe('ADVENT');
    expect(day.readings.map((r) => r.slot)).toEqual([
      'first_reading',
      'responsorial_psalm',
      'second_reading',
      'gospel_acclamation',
      'gospel',
    ]);
    expect(day.readings[0]).toEqual({
      slot: 'first_reading',
      citation: 'Isaiah 2:1-5',
      schemaLabel: '',
      sortOrder: 0,
    });
  });

  it('keeps a string-valued readings field as a single note slot', () => {
    const [day] = normalizeLitCalYear({ litcal: [commonEvent] });
    expect(day.readings).toEqual([
      {
        slot: 'note',
        citation: 'From the Common of the Blessed Virgin Mary',
        schemaLabel: '',
        sortOrder: 0,
      },
    ]);
  });

  it('produces no readings for an empty string', () => {
    const [day] = normalizeLitCalYear({ litcal: [emptyEvent] });
    expect(day.readings).toEqual([]);
  });

  it('derives the Sunday cycle letter from "YEAR A" style values', () => {
    const [a] = normalizeLitCalYear({ litcal: [{ ...sundayEvent, liturgical_year: 'YEAR C' }] });
    expect(a.sundayCycle).toBe('C');
    const [b] = normalizeLitCalYear({ litcal: [{ ...sundayEvent, liturgical_year: undefined }] });
    expect(b.sundayCycle).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/prayer/litcal.test.ts
```

Expected: FAIL — cannot resolve `./litcal`.

- [ ] **Step 3: Write the normaliser**

Create `src/lib/prayer/litcal.ts`:

```ts
export interface NormalizedReading {
  slot: string;
  citation: string;
  schemaLabel: string;
  sortOrder: number;
}

export interface NormalizedDay {
  rite: 'roman_catholic';
  dayDate: string;
  eventKey: string;
  name: string;
  rankGrade: number | null;
  rankLabel: string | null;
  color: string[];
  liturgicalSeason: string | null;
  sundayCycle: 'A' | 'B' | 'C' | null;
  psalterWeek: number | null;
  isHolyDayOfObligation: boolean;
  readings: NormalizedReading[];
}

interface LitCalEvent {
  event_key: string;
  name: string;
  color?: string[];
  grade?: number;
  grade_lcl?: string;
  date: string;
  liturgical_season?: string;
  liturgical_year?: string;
  psalter_week?: number;
  holy_day_of_obligation?: boolean;
  readings?: Record<string, string> | string;
}

export interface LitCalPayload {
  litcal: LitCalEvent[];
}

/**
 * Canonical slot order. Anything LitCal emits that is not listed here still
 * gets imported, sorted after the known slots in the order LitCal returned it,
 * so rare Easter Vigil / Pentecost Vigil schemas survive without a code change.
 */
const SLOT_ORDER = [
  'first_reading',
  'responsorial_psalm',
  'second_reading',
  'gospel_acclamation',
  'gospel',
];

function cycleLetter(value: string | undefined): 'A' | 'B' | 'C' | null {
  if (!value) return null;
  const m = /\b([ABC])\b/.exec(value.toUpperCase());
  return m ? (m[1] as 'A' | 'B' | 'C') : null;
}

function normalizeReadings(readings: LitCalEvent['readings']): NormalizedReading[] {
  if (!readings) return [];

  // 21 events a year carry a plain string ("From the Common of the BVM") or ''.
  if (typeof readings === 'string') {
    const citation = readings.trim();
    return citation ? [{ slot: 'note', citation, schemaLabel: '', sortOrder: 0 }] : [];
  }

  const entries = Object.entries(readings).filter(
    ([, citation]) => typeof citation === 'string' && citation.trim() !== '',
  );

  entries.sort(([a], [b]) => {
    const ia = SLOT_ORDER.indexOf(a);
    const ib = SLOT_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return 0;
  });

  return entries.map(([slot, citation], i) => ({
    slot,
    citation: citation.trim(),
    schemaLabel: '',
    sortOrder: i,
  }));
}

export function normalizeLitCalYear(payload: LitCalPayload): NormalizedDay[] {
  return (payload.litcal ?? []).map((e) => ({
    rite: 'roman_catholic' as const,
    dayDate: e.date.slice(0, 10),
    eventKey: e.event_key,
    name: e.name,
    rankGrade: typeof e.grade === 'number' ? e.grade : null,
    rankLabel: e.grade_lcl ?? null,
    color: e.color ?? [],
    liturgicalSeason: e.liturgical_season ?? null,
    sundayCycle: cycleLetter(e.liturgical_year),
    psalterWeek: typeof e.psalter_week === 'number' ? e.psalter_week : null,
    isHolyDayOfObligation: e.holy_day_of_obligation === true,
    readings: normalizeReadings(e.readings),
  }));
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/prayer/litcal.test.ts
```

Expected: 4 passing.

- [ ] **Step 5: Commit the normaliser**

```bash
git add src/lib/prayer/litcal.ts src/lib/prayer/litcal.test.ts
git commit -m "feat(prayer): LitCal event normaliser with string/empty readings handling"
```

- [ ] **Step 6: Write the import script**

Create `scripts/import-litcal.mjs`, following the shape of `scripts/import-hymnal-index.mjs`:

```js
#!/usr/bin/env node
// Import Roman Catholic liturgical calendar + Mass reading citations from
// LiturgicalCalendarAPI (Apache-2.0) into gw_prayer_calendar_days / gw_prayer_readings.
//
// Idempotent: re-running upserts the same rows. Safe to re-run after a fix.
//
//   node scripts/import-litcal.mjs --from 2020 --to 2035
//   node scripts/import-litcal.mjs --from 2026 --to 2026 --dry-run
//
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.

import { createClient } from '@supabase/supabase-js';
import { normalizeLitCalYear } from '../src/lib/prayer/litcal.ts';

const API = 'https://litcal.johnromanodorazio.com/api/dev/calendar/nation/US';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const from = Number(arg('from', 2026));
const to = Number(arg('to', 2026));
const dryRun = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

for (let year = from; year <= to; year++) {
  const res = await fetch(`${API}?year=${year}`);
  if (!res.ok) throw new Error(`LitCal ${year}: HTTP ${res.status}`);
  const days = normalizeLitCalYear(await res.json());

  const dates = new Set(days.map((d) => d.dayDate));
  const withReadings = new Set(days.filter((d) => d.readings.length).map((d) => d.dayDate));
  const gaps = [...dates].filter((d) => !withReadings.has(d)).sort();
  console.log(
    `${year}: ${days.length} events, ${dates.size} dates, ${gaps.length} without readings`,
  );
  if (gaps.length) console.log(`  no-reading dates: ${gaps.join(', ')}`);
  if (dryRun) continue;

  for (const day of days) {
    const { data: row, error } = await supabase
      .from('gw_prayer_calendar_days')
      .upsert(
        {
          rite: day.rite,
          day_date: day.dayDate,
          event_key: day.eventKey,
          name: day.name,
          rank_grade: day.rankGrade,
          rank_label: day.rankLabel,
          color: day.color,
          liturgical_season: day.liturgicalSeason,
          sunday_cycle: day.sundayCycle,
          psalter_week: day.psalterWeek,
          is_holy_day_of_obligation: day.isHolyDayOfObligation,
          source: 'litcal',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'rite,day_date,event_key' },
      )
      .select('id')
      .single();
    if (error) throw new Error(`${day.dayDate} ${day.eventKey}: ${error.message}`);

    if (!day.readings.length) continue;
    const { error: rErr } = await supabase.from('gw_prayer_readings').upsert(
      day.readings.map((r) => ({
        calendar_day_id: row.id,
        slot: r.slot,
        citation: r.citation,
        schema_label: r.schemaLabel,
        sort_order: r.sortOrder,
      })),
      { onConflict: 'calendar_day_id,slot,schema_label' },
    );
    if (rErr) throw new Error(`${day.dayDate} readings: ${rErr.message}`);
  }
  console.log(`${year}: imported`);
}
```

> `.select()` after every write and check the error — demo-tenant writes have
> failed **silently** in this codebase before. The `throw` on error above is not
> optional.

- [ ] **Step 7: Dry-run a single year and read the gap report**

```bash
node scripts/import-litcal.mjs --from 2026 --to 2026 --dry-run
```

Expected output includes `556 events, 365 dates, 2 without readings` and lists
`2026-02-19, 2026-02-20`. If the gap count is anything other than 2, stop and
investigate before importing — the shape of the upstream data has changed.

- [ ] **Step 8: Import the full window into a scratch/staging database**

```bash
node scripts/import-litcal.mjs --from 2020 --to 2035
```

Expected: one `imported` line per year, no throws.

- [ ] **Step 9: Import reading citations from catholic-readings-api**

The Ash-Wednesday backfill this step used to describe is obsolete: the gap is
~150 dates a year, not two. Readings come from a different source entirely.

Add `scripts/import-readings.mjs` (run with `npx tsx`) that walks every date in
a year, fetches `https://cpbjr.github.io/catholic-readings-api/readings/YYYY/MM-DD.json`,
normalises via `normalizeReadingsDay`, and attaches rows to the matching
`gw_prayer_calendar_days` row of highest `rank_grade` for that date.

Requirements proven by the spike:
- **Fetch serially with a small delay and one retry.** 16 parallel workers
  produced 36 consecutive failures against GitHub Pages. All recovered serially.
- Only **2026 and 2027** exist upstream. The script must report, not silently
  skip, a year with no data.
- `.select()` after every write and throw on error — silent write failures have
  bitten this codebase before.

- [ ] **Step 10: Confirm zero gaps remain**

```sql
SELECT d.day_date
FROM public.gw_prayer_calendar_days d
WHERE d.rite = 'roman_catholic'
GROUP BY d.day_date
HAVING count(*) FILTER (
  WHERE EXISTS (SELECT 1 FROM public.gw_prayer_readings r WHERE r.calendar_day_id = d.id)
) = 0
ORDER BY d.day_date;
```

Expected: **0 rows.**

- [ ] **Step 11: Commit**

```bash
git add scripts/import-litcal.mjs \
        scripts/import-readings.mjs
git commit -m "feat(prayer): calendar + reading citation importers"
```

---

### Task 3: Bible schema

**Files:**
- Create: `supabase/migrations/20260804130000_prayer_bible.sql`
- Test: `supabase/migrations/tests/prayer_bible_test.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: `public.gw_bible_translations(id uuid, code text UNIQUE, name text, language text, is_public_domain bool, has_deuterocanon bool, attribution text)`, `public.gw_bible_books(id uuid, translation_id uuid, usfm_code text, name text, canon_order int, testament text)` with `UNIQUE (translation_id, usfm_code)`, and `public.gw_bible_verses(id uuid, book_id uuid, chapter int, verse int, text text, search_tsv tsvector GENERATED)` with `UNIQUE (book_id, chapter, verse)`. Task 4 inserts into these; Task 5 reads them.

- [ ] **Step 1: Write the failing SQL test**

Create `supabase/migrations/tests/prayer_bible_test.sql`:

```sql
-- supabase/migrations/tests/prayer_bible_test.sql
-- Run against a DB with 20260804130000_prayer_bible.sql applied.
BEGIN;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['gw_bible_translations','gw_bible_books','gw_bible_verses'] LOOP
    ASSERT (SELECT count(*) = 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = t), t || ' missing';
    ASSERT (SELECT relrowsecurity FROM pg_class
            WHERE relname = t AND relnamespace = 'public'::regnamespace),
           t || ': RLS not enabled';
    ASSERT (SELECT count(*) = 0 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = t
              AND column_name = 'tenant_id'),
           t || ': has tenant_id — scripture is tenant-neutral reference data';
    ASSERT (SELECT count(*) = 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_read'),
           t || ': read policy missing';
  END LOOP;

  ASSERT (SELECT count(*) = 1 FROM pg_indexes
          WHERE schemaname = 'public' AND indexname = 'gw_bible_verses_search_idx'),
         'full-text search index missing';
  ASSERT (SELECT count(*) = 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'gw_bible_verses'
            AND column_name = 'search_tsv' AND is_generated = 'ALWAYS'),
         'search_tsv must be a generated column';
END $$;

ROLLBACK;
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
psql "$PRAYER_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/tests/prayer_bible_test.sql
```

Expected: FAIL with `gw_bible_translations missing`.

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20260804130000_prayer_bible.sql`:

```sql
-- Prayer module — scripture text.
--
-- PLATFORM REFERENCE DATA, no tenant_id: the text of the Bible is the same
-- for every tenant. ~31k verses per translation, so a handful of translations
-- is well under 100 MB.
--
-- Word-concordance search is a generated tsvector + GIN index, so no external
-- search service and no new CSP connect-src host is required.

CREATE TABLE IF NOT EXISTS public.gw_bible_translations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text NOT NULL UNIQUE,          -- 'WEBCE', 'DRA', 'KJV'
  name             text NOT NULL,
  language         text NOT NULL DEFAULT 'en',
  is_public_domain boolean NOT NULL DEFAULT true,
  has_deuterocanon boolean NOT NULL DEFAULT false,
  -- Shown in the reader. "World English Bible" is a trademark of eBible.org,
  -- so this names the translation without implying endorsement.
  attribution      text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gw_bible_books (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_id uuid NOT NULL
                   REFERENCES public.gw_bible_translations(id) ON DELETE CASCADE,
  usfm_code      text NOT NULL,                   -- 'GEN', 'TOB', 'MAT'
  name           text NOT NULL,
  canon_order    int  NOT NULL,
  testament      text NOT NULL
                   CHECK (testament IN ('OT','NT','DC'))
);

CREATE UNIQUE INDEX IF NOT EXISTS gw_bible_books_translation_usfm_uidx
  ON public.gw_bible_books (translation_id, usfm_code);

CREATE TABLE IF NOT EXISTS public.gw_bible_verses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id    uuid NOT NULL REFERENCES public.gw_bible_books(id) ON DELETE CASCADE,
  chapter    int  NOT NULL,
  verse      int  NOT NULL,
  text       text NOT NULL,
  search_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED
);

CREATE UNIQUE INDEX IF NOT EXISTS gw_bible_verses_ref_uidx
  ON public.gw_bible_verses (book_id, chapter, verse);

CREATE INDEX IF NOT EXISTS gw_bible_verses_search_idx
  ON public.gw_bible_verses USING GIN (search_tsv);

ALTER TABLE public.gw_bible_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_bible_books        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_bible_verses       ENABLE ROW LEVEL SECURITY;

CREATE POLICY gw_bible_translations_read ON public.gw_bible_translations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY gw_bible_books_read ON public.gw_bible_books
  FOR SELECT TO authenticated USING (true);
CREATE POLICY gw_bible_verses_read ON public.gw_bible_verses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY gw_bible_translations_admin_write ON public.gw_bible_translations
  FOR ALL TO authenticated
  USING (public.gw_is_platform_super_admin())
  WITH CHECK (public.gw_is_platform_super_admin());
CREATE POLICY gw_bible_books_admin_write ON public.gw_bible_books
  FOR ALL TO authenticated
  USING (public.gw_is_platform_super_admin())
  WITH CHECK (public.gw_is_platform_super_admin());
CREATE POLICY gw_bible_verses_admin_write ON public.gw_bible_verses
  FOR ALL TO authenticated
  USING (public.gw_is_platform_super_admin())
  WITH CHECK (public.gw_is_platform_super_admin());

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
psql "$PRAYER_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260804130000_prayer_bible.sql
psql "$PRAYER_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/tests/prayer_bible_test.sql
```

Expected: no ASSERT failures.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260804130000_prayer_bible.sql \
        supabase/migrations/tests/prayer_bible_test.sql
git commit -m "feat(prayer): bible translation/book/verse reference tables with FTS"
```

---

### Task 4: USFM parser + WEBCE import

**Files:**
- Create: `src/lib/prayer/usfm.ts`
- Test: `src/lib/prayer/usfm.test.ts`
- Create: `scripts/import-webce.mjs`

**Interfaces:**
- Consumes: tables from Task 3.
- Produces: `parseUsfmBook(source: string): { usfmCode: string; name: string; verses: ParsedVerse[] }` where `ParsedVerse = { chapter: number; verse: number; text: string }`.

- [ ] **Step 1: Write the failing unit test**

Create `src/lib/prayer/usfm.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseUsfmBook } from './usfm';

const SAMPLE = `\\id GEN 01GENeng-web-c.usfm World English Bible (Catholic)
\\h Genesis
\\toc1 The First Book of Moses, Commonly Called Genesis
\\mt1 Genesis
\\c 1
\\p
\\v 1 In the beginning, God created the heavens and the earth.
\\v 2 The earth was formless and empty. Darkness was on the surface of the deep.
\\c 2
\\p
\\v 1 The heavens, the earth, and all their vast array were finished.
`;

describe('parseUsfmBook', () => {
  it('extracts the book code and human name', () => {
    const book = parseUsfmBook(SAMPLE);
    expect(book.usfmCode).toBe('GEN');
    expect(book.name).toBe('Genesis');
  });

  it('extracts verses with chapter numbers', () => {
    const { verses } = parseUsfmBook(SAMPLE);
    expect(verses).toHaveLength(3);
    expect(verses[0]).toEqual({
      chapter: 1,
      verse: 1,
      text: 'In the beginning, God created the heavens and the earth.',
    });
    expect(verses[2]).toEqual({
      chapter: 2,
      verse: 1,
      text: 'The heavens, the earth, and all their vast array were finished.',
    });
  });

  it('strips inline markup and footnotes from verse text', () => {
    const withMarkup = `\\id PSA
\\h Psalms
\\c 23
\\v 1 Yahweh\\f + \\fr 23:1 \\ft "Yahweh" is God's proper Name.\\f* is my shepherd; \\wj I shall lack nothing.\\wj*
`;
    const { verses } = parseUsfmBook(withMarkup);
    expect(verses[0].text).toBe('Yahweh is my shepherd; I shall lack nothing.');
  });

  it('joins a verse that continues across multiple lines', () => {
    const wrapped = `\\id JHN
\\h John
\\c 1
\\v 1 In the beginning was the Word,
and the Word was with God.
`;
    const { verses } = parseUsfmBook(wrapped);
    expect(verses[0].text).toBe('In the beginning was the Word, and the Word was with God.');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/prayer/usfm.test.ts
```

Expected: FAIL — cannot resolve `./usfm`.

- [ ] **Step 3: Write the parser**

Create `src/lib/prayer/usfm.ts`:

```ts
export interface ParsedVerse {
  chapter: number;
  verse: number;
  text: string;
}

export interface ParsedBook {
  usfmCode: string;
  name: string;
  verses: ParsedVerse[];
}

/** Footnotes (\f … \f*) and cross-refs (\x … \x*) are dropped entirely. */
function stripMarkup(raw: string): string {
  return raw
    .replace(/\\f\s.*?\\f\*/gs, '')
    .replace(/\\x\s.*?\\x\*/gs, '')
    // Character-level markers: \wj … \wj*, \nd … \nd*, \add … \add*, etc.
    .replace(/\\\+?[a-z]+\d?\*/g, '')
    .replace(/\\\+?[a-z]+\d?\s?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseUsfmBook(source: string): ParsedBook {
  const lines = source.split(/\r?\n/);

  let usfmCode = '';
  let name = '';
  let chapter = 0;
  const verses: ParsedVerse[] = [];
  let current: { chapter: number; verse: number; parts: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    const text = stripMarkup(current.parts.join(' '));
    if (text) verses.push({ chapter: current.chapter, verse: current.verse, text });
    current = null;
  };

  for (const line of lines) {
    const id = /^\\id\s+(\S+)/.exec(line);
    if (id) {
      usfmCode = id[1];
      continue;
    }

    const h = /^\\h\s+(.+)$/.exec(line);
    if (h) {
      name = h[1].trim();
      continue;
    }

    const c = /^\\c\s+(\d+)/.exec(line);
    if (c) {
      flush();
      chapter = Number(c[1]);
      continue;
    }

    const v = /^\\v\s+(\d+)(?:-\d+)?\s*(.*)$/.exec(line);
    if (v) {
      flush();
      current = { chapter, verse: Number(v[1]), parts: [v[2] ?? ''] };
      continue;
    }

    // Any other backslash marker at line start ends nothing — but a bare
    // continuation line belongs to the verse currently being built.
    if (current && !/^\\/.test(line) && line.trim() !== '') {
      current.parts.push(line);
    }
  }

  flush();
  return { usfmCode, name, verses };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/prayer/usfm.test.ts
```

Expected: 4 passing.

- [ ] **Step 5: Commit the parser**

```bash
git add src/lib/prayer/usfm.ts src/lib/prayer/usfm.test.ts
git commit -m "feat(prayer): USFM book parser"
```

- [ ] **Step 6: Write the import script**

Create `scripts/import-webce.mjs`:

```js
#!/usr/bin/env node
// Import the World English Bible Catholic Edition (public domain) from the
// eBible.org USFM release into gw_bible_* tables.
//
//   curl -sSLo /tmp/webc.zip https://ebible.org/Scriptures/eng-web-c_usfm.zip
//   unzip -q /tmp/webc.zip -d /tmp/webc
//   node scripts/import-webce.mjs --dir /tmp/webc
//
// Idempotent. Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { parseUsfmBook } from '../src/lib/prayer/usfm.ts';

const dirIdx = process.argv.indexOf('--dir');
const dir = dirIdx === -1 ? '/tmp/webc' : process.argv[dirIdx + 1];

const DEUTEROCANON = new Set([
  'TOB', 'JDT', 'ESG', 'WIS', 'SIR', 'BAR', '1MA', '2MA', 'DAG',
]);
// eBible filenames are ordered: 01-GEN…, 41-TOB…, 70-MAT… — the numeric
// prefix IS the Catholic canon order, so use it directly.
const NT_START = 70;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const { data: translation, error: tErr } = await supabase
  .from('gw_bible_translations')
  .upsert(
    {
      code: 'WEBCE',
      name: 'World English Bible (Catholic)',
      language: 'en',
      is_public_domain: true,
      has_deuterocanon: true,
      attribution: 'World English Bible (Catholic Edition). Public domain. Source: eBible.org.',
    },
    { onConflict: 'code' },
  )
  .select('id')
  .single();
if (tErr) throw new Error(`translation upsert: ${tErr.message}`);

const files = (await readdir(dir)).filter((f) => f.endsWith('.usfm')).sort();
let totalVerses = 0;

for (const file of files) {
  const order = Number(file.slice(0, 2));
  const book = parseUsfmBook(await readFile(join(dir, file), 'utf8'));
  if (!book.usfmCode || !book.verses.length) {
    console.log(`skip ${file} (no verses)`);
    continue;
  }

  const testament = DEUTEROCANON.has(book.usfmCode)
    ? 'DC'
    : order >= NT_START
      ? 'NT'
      : 'OT';

  const { data: bookRow, error: bErr } = await supabase
    .from('gw_bible_books')
    .upsert(
      {
        translation_id: translation.id,
        usfm_code: book.usfmCode,
        name: book.name || book.usfmCode,
        canon_order: order,
        testament,
      },
      { onConflict: 'translation_id,usfm_code' },
    )
    .select('id')
    .single();
  if (bErr) throw new Error(`${file} book upsert: ${bErr.message}`);

  for (let i = 0; i < book.verses.length; i += 1000) {
    const chunk = book.verses.slice(i, i + 1000).map((v) => ({
      book_id: bookRow.id,
      chapter: v.chapter,
      verse: v.verse,
      text: v.text,
    }));
    const { error: vErr } = await supabase
      .from('gw_bible_verses')
      .upsert(chunk, { onConflict: 'book_id,chapter,verse' });
    if (vErr) throw new Error(`${file} verses: ${vErr.message}`);
  }

  totalVerses += book.verses.length;
  console.log(`${book.usfmCode.padEnd(5)} ${String(book.verses.length).padStart(5)} verses`);
}

console.log(`total: ${files.length} files, ${totalVerses} verses`);
```

- [ ] **Step 7: Download, extract and run the import**

```bash
curl -sSLo /tmp/webc.zip https://ebible.org/Scriptures/eng-web-c_usfm.zip
unzip -q -o /tmp/webc.zip -d /tmp/webc
node scripts/import-webce.mjs --dir /tmp/webc
```

Expected: 73 book lines and a total in the 35,000–37,000 verse range (WEBCE
includes the deuterocanon, so it exceeds the ~31,102 of a 66-book Protestant
canon). If the total is under 30,000, the parser dropped verses — stop and
diagnose before continuing.

- [ ] **Step 8: Spot-check the imported text**

```sql
SELECT b.usfm_code, v.chapter, v.verse, v.text
FROM public.gw_bible_verses v
JOIN public.gw_bible_books b ON b.id = v.book_id
WHERE b.usfm_code IN ('GEN','TOB','JHN')
  AND (v.chapter, v.verse) IN ((1,1),(3,16))
ORDER BY b.canon_order, v.chapter, v.verse;
```

Expected: Genesis 1:1 reads "In the beginning, God created the heavens and the
earth."; John 3:16 is present; Tobit returns rows, proving the deuterocanon
imported. No row may contain a `\` character — that would mean markup leaked
through `stripMarkup`.

- [ ] **Step 9: Commit**

```bash
git add scripts/import-webce.mjs
git commit -m "feat(prayer): WEBCE scripture importer"
```

---

### Task 5: The `prayer_day` RPC — Phase 0 deliverable

**Files:**
- Create: `supabase/migrations/20260804140000_prayer_day_rpc.sql`
- Test: `supabase/migrations/tests/prayer_day_rpc_test.sql`

**Interfaces:**
- Consumes: `gw_prayer_calendar_days`, `gw_prayer_readings` (Task 1), and `gw_bible_*` (Task 3).
- Produces: `public.prayer_day(p_date date, p_rite text DEFAULT 'roman_catholic') RETURNS jsonb`. This is the single call the Phase 1 "Today" screen and the Phase 4 Liturgy Planner autofill both use.

- [ ] **Step 1: Write the failing SQL test**

Create `supabase/migrations/tests/prayer_day_rpc_test.sql`:

```sql
-- supabase/migrations/tests/prayer_day_rpc_test.sql
-- Seeds one day, asserts the RPC shape, then rolls back.
BEGIN;

INSERT INTO public.gw_prayer_calendar_days
  (id, rite, day_date, event_key, name, rank_grade, rank_label, color,
   liturgical_season, sunday_cycle, psalter_week)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'roman_catholic', DATE '2025-11-30',
   'Advent1', 'First Sunday of Advent', 6, 'Sunday', ARRAY['purple'],
   'ADVENT', 'A', 1);

INSERT INTO public.gw_prayer_readings (calendar_day_id, slot, citation, schema_label, sort_order)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'first_reading', 'Isaiah 2:1-5', '', 0),
  ('11111111-1111-1111-1111-111111111111', 'gospel', 'Matthew 24:37-44', '', 4);

DO $$
DECLARE result jsonb;
BEGIN
  result := public.prayer_day(DATE '2025-11-30');

  ASSERT result->>'date' = '2025-11-30', 'date wrong: ' || coalesce(result->>'date','<null>');
  ASSERT jsonb_array_length(result->'events') = 1, 'expected exactly 1 event';
  ASSERT result->'events'->0->>'name' = 'First Sunday of Advent', 'event name wrong';
  ASSERT result->'events'->0->>'sunday_cycle' = 'A', 'cycle wrong';
  ASSERT result->'events'->0->>'liturgical_season' = 'ADVENT', 'season wrong';
  ASSERT jsonb_array_length(result->'events'->0->'readings') = 2, 'expected 2 readings';
  -- readings must come back in sort_order, not insertion or alphabetical order
  ASSERT result->'events'->0->'readings'->0->>'slot' = 'first_reading', 'reading order wrong';
  ASSERT result->'events'->0->'readings'->1->>'citation' = 'Matthew 24:37-44', 'gospel wrong';

  -- A date with nothing imported returns an empty event list, never NULL.
  result := public.prayer_day(DATE '1900-01-01');
  ASSERT result IS NOT NULL, 'RPC returned NULL for an unknown date';
  ASSERT jsonb_array_length(result->'events') = 0, 'unknown date should have 0 events';
END $$;

ROLLBACK;
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
psql "$PRAYER_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/tests/prayer_day_rpc_test.sql
```

Expected: FAIL with `function public.prayer_day(date) does not exist`.

- [ ] **Step 3: Write the RPC**

Create `supabase/migrations/20260804140000_prayer_day_rpc.sql`:

```sql
-- prayer_day(date, rite) — "what is today, and what is read?"
--
-- Returns every celebration on the date (a day can carry a feria plus an
-- optional memorial) with its reading citations in liturgical order.
-- SECURITY INVOKER: reference tables are readable by all authenticated users,
-- so no elevation is needed and RLS still applies.

CREATE OR REPLACE FUNCTION public.prayer_day(
  p_date date,
  p_rite text DEFAULT 'roman_catholic'
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'date', p_date,
    'rite', p_rite,
    'events', COALESCE(
      (
        SELECT jsonb_agg(e ORDER BY e->>'rank_grade' DESC NULLS LAST, e->>'event_key')
        FROM (
          SELECT jsonb_build_object(
            'event_key',         d.event_key,
            'name',              d.name,
            'rank_grade',        d.rank_grade,
            'rank_label',        d.rank_label,
            'color',             d.color,
            'liturgical_season', d.liturgical_season,
            'sunday_cycle',      d.sunday_cycle,
            'psalter_week',      d.psalter_week,
            'is_holy_day_of_obligation', d.is_holy_day_of_obligation,
            'readings', COALESCE(
              (
                SELECT jsonb_agg(
                         jsonb_build_object(
                           'slot',         r.slot,
                           'citation',     r.citation,
                           'schema_label', r.schema_label
                         )
                         ORDER BY r.schema_label, r.sort_order
                       )
                FROM public.gw_prayer_readings r
                WHERE r.calendar_day_id = d.id
              ),
              '[]'::jsonb
            )
          ) AS e
          FROM public.gw_prayer_calendar_days d
          WHERE d.day_date = p_date
            AND d.rite = p_rite
        ) AS events
      ),
      '[]'::jsonb
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.prayer_day(date, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
psql "$PRAYER_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260804140000_prayer_day_rpc.sql
psql "$PRAYER_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/tests/prayer_day_rpc_test.sql
```

Expected: no ASSERT failures.

- [ ] **Step 5: Prove the Phase 0 goal against real imported data**

```sql
SELECT jsonb_pretty(public.prayer_day(CURRENT_DATE));
```

Expected: today's celebration name, season, colour, cycle and the day's reading
citations. **This output is the Phase 0 deliverable** — paste it into the PR.

- [ ] **Step 6: Run the full test suite and lint**

```bash
npm test
npx eslint src/lib/prayer scripts/import-litcal.mjs scripts/import-webce.mjs
npm run typecheck:guard
```

Expected: all tests pass, no new lint errors, and `typecheck:guard` reports no
**newly introduced** errors. Per `CLAUDE.md`, `tsconfig.app.json` sets
`noCheck: true`, so `typecheck:guard` — not `tsc` — is the real gate. Do **not**
regenerate `.typecheck-baseline.txt` to make it pass.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260804140000_prayer_day_rpc.sql \
        supabase/migrations/tests/prayer_day_rpc_test.sql
git commit -m "feat(prayer): prayer_day RPC — calendar + readings for a date"
```

---

## Definition of done

- [ ] `SELECT jsonb_pretty(public.prayer_day(CURRENT_DATE));` returns today's celebration and readings.
- [ ] The gap query in Task 2 Step 10 returns **0 rows** across the imported window.
- [ ] `gw_bible_verses` holds 35,000–37,000 WEBCE verses including deuterocanonical books, and no verse text contains a `\`.
- [ ] `npm test` passes, `npm run typecheck:guard` shows no new errors, and all three new SQL test files pass.
- [ ] All five reference tables assert-tested as tenant-less, RLS-enabled, read-to-authenticated, write-to-super-admin.
- [ ] **security-auditor run on the branch**, specifically reviewing the tenant-less reference tables against the platform's tenant-isolation invariant. This is the one architectural exception in the phase and must not merge unreviewed.

## Explicitly out of scope for Phase 0

No UI, no route, no module registration in the catalog, no `useModuleAccess('prayer')` gating, no Strong's or TSK import, no devotional content, no intentions, no circles, no Liturgy Planner wiring. Phase 0 produces queryable data and nothing a user can see.
