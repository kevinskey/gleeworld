# Reading Music — Phase 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand `/dashboard/sight-reading` as `/dashboard/reading-music`, reorganize the existing pitch-matching and sight-singing surfaces into a six-domain skill tree, add a lightweight placement diagnostic, and wire per-domain mastery rings — all without changing what the existing tools do. Phase 2 (Rhythm Machine + Assessment mode) and Phase 3 (Teacher surface + Repertoire integration) get their own plans.

**Architecture:** New top-level page `ReadingMusicPage` with a domain-based tab strip (Continue / Pitch & Intervals / Rhythm / Sight-Singing / Dictation / Harmony & Chords / Scales & Theory / Progress / Class). Existing `PitchMatchTab` is re-homed under Pitch & Intervals; the sight-singing practice bits are extracted from `SightReadingStudio` into `SightSingingTab`. Placeholder tabs are stubs pending Phase 2/3. Per-domain mastery is derived client-side from existing attempt tables via one aggregation VIEW. Placement diagnostic is a 5-question modal writing to a new `gw_reading_music_placement` table. Nav catalog entry renames "Sight Reading" → "Reading Music"; the old `/dashboard/sight-reading` path becomes a permanent 301 redirect. **No new music-skill modules ship in Phase 1** — those are Phase 2/3.

**Tech Stack:** Postgres 15 + Supabase RLS, React 18 + TypeScript, Tailwind + shadcn/ui, TanStack Query, Vitest, existing `useMicPitch` AudioWorklet, existing `generateExercise` sight-reading generator.

## Global Constraints

- Multi-tenant SaaS: new tables tenant-scoped via `current_tenant_id()` default; new user-facing rows scope `user_id = auth.uid()` in RLS.
- Solfège: **movable-do with la-based minor** everywhere (Kodály/US standard). Do not use fixed-do.
- Studio sizing: text-xs / text-sm min; icons w-4 h-4.
- Light theme only: white cards, dark text, cream page. Never dark-navy cards.
- Never hardcode "Spelman" or any tenant name. Never use "singers/alumnae" — say "students" and "graduates".
- Migrations idempotent (`IF NOT EXISTS`, `DROP POLICY IF EXISTS ... CREATE POLICY`).
- Deploy = local build + `bash scripts/deploy-frontend.sh` from `~/Documents/GitHub/gleeworld-repertoire/`.
- Prod DB writes via `ssh root@supabase.gleeworld.org "docker exec -i supabase-db psql -U postgres -d postgres" < migration.sql`.
- Old `/dashboard/sight-reading` becomes a permanent redirect to `/dashboard/reading-music`. Deep-link params (`?academyExercise=…`, `?tab=…`) MUST survive the redirect.
- Placement diagnostic scoring is deterministic per the level table in Task 3.
- Adaptive Elo / adaptive difficulty is out of scope. Placement writes ONCE per user (retake via a button).

---

## File Structure

**New — migrations:**
- `supabase/migrations/20260728010000_reading_music_placement.sql` — `gw_reading_music_placement` table.
- `supabase/migrations/20260728010100_reading_music_domain_summary.sql` — `reading_music_domain_summary` VIEW.

**New — client:**
- `src/lib/readingMusic/domains.ts` — the six domain definitions + 16-level metadata.
- `src/lib/readingMusic/api.ts` — TanStack hooks: `useMyPlacement`, `useDomainSummary`, `useSubmitPlacement`.
- `src/lib/readingMusic/__tests__/api.test.ts` — Vitest.
- `src/pages/dashboard/ReadingMusicPage.tsx` — new top-level page + tab routing.
- `src/pages/readingMusic/ContinueTab.tsx` — landing: warm-up + placement CTA + assignments placeholder.
- `src/pages/readingMusic/PitchIntervalsTab.tsx` — wrapper embedding existing `PitchMatchTab`.
- `src/pages/readingMusic/SightSingingTab.tsx` — extracted sight-singing practice controls.
- `src/pages/readingMusic/PlaceholderTab.tsx` — reusable "Coming in Phase 2/3" surface.
- `src/pages/readingMusic/DomainProgressTab.tsx` — six mastery-ring cards.
- `src/pages/readingMusic/PlacementDiagnostic.tsx` — 5-question modal.
- `src/pages/readingMusic/MasteryRing.tsx` — reusable SVG ring.

**Modify:**
- `src/App.tsx` — new `/dashboard/reading-music` route; 301-style redirect from `/dashboard/sight-reading`.
- `src/lib/navigation/navCatalog.ts` — rename entry from "Sight Reading" to "Reading Music"; keep the `sight` key for backward compat with stored user tile layouts.
- `src/lib/navigation/__tests__/appDestinations.test.ts` — add `/dashboard/reading-music` to KNOWN_ROUTES.

---

## Task 1: Migration — `gw_reading_music_placement`

**Files:**
- Create: `supabase/migrations/20260728010000_reading_music_placement.sql`

**Interfaces:**
- Consumes: `auth.users`, `gw_tenants`, `current_tenant_id()`, `set_tenant_id_default()` (existing).
- Produces:
  - Table `gw_reading_music_placement(id uuid PK, tenant_id uuid FK gw_tenants NOT NULL DEFAULT current_tenant_id(), user_id uuid FK auth.users NOT NULL DEFAULT auth.uid(), level integer NOT NULL CHECK 1..16, taken_at timestamptz NOT NULL DEFAULT now())`.
  - Unique `(user_id)` (one placement per user; retake overwrites via upsert).
  - RLS: tenant iso + self all + teacher/admin read.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260728010000_reading_music_placement.sql`:

```sql
CREATE TABLE IF NOT EXISTS gw_reading_music_placement (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL DEFAULT current_tenant_id() REFERENCES gw_tenants(id),
  user_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  level      integer NOT NULL CHECK (level BETWEEN 1 AND 16),
  taken_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS gw_reading_music_placement_tenant_idx
  ON gw_reading_music_placement (tenant_id, taken_at DESC);

ALTER TABLE gw_reading_music_placement ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gw_rmp_tenant_iso ON gw_reading_music_placement;
CREATE POLICY gw_rmp_tenant_iso
  ON gw_reading_music_placement AS RESTRICTIVE
  FOR ALL TO authenticated, anon
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS gw_rmp_self_all ON gw_reading_music_placement;
CREATE POLICY gw_rmp_self_all
  ON gw_reading_music_placement FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS gw_rmp_teacher_read ON gw_reading_music_placement;
CREATE POLICY gw_rmp_teacher_read
  ON gw_reading_music_placement FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM gw_profiles p
            WHERE p.user_id = auth.uid()
              AND (p.is_super_admin = true OR p.is_admin = true))
  );

DROP TRIGGER IF EXISTS trg_gw_rmp_tenant_default ON gw_reading_music_placement;
CREATE TRIGGER trg_gw_rmp_tenant_default
  BEFORE INSERT ON gw_reading_music_placement
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id_default();
```

- [ ] **Step 2: Apply + verify**

```bash
ssh root@supabase.gleeworld.org "docker exec -i supabase-db psql -U postgres -d postgres" \
  < ~/Documents/GitHub/gleeworld-repertoire/supabase/migrations/20260728010000_reading_music_placement.sql

ssh root@supabase.gleeworld.org "docker exec -i supabase-db psql -U postgres -d postgres -c '\\d gw_reading_music_placement'"
```

Expected: table with 5 columns, unique (user_id), tenant default, 3 RLS policies.

- [ ] **Step 3: Commit**

```bash
cd ~/Documents/GitHub/gleeworld-repertoire
git add supabase/migrations/20260728010000_reading_music_placement.sql
git commit -m "feat(reading-music): gw_reading_music_placement table + RLS"
```

---

## Task 2: Migration — `reading_music_domain_summary` view

**Files:**
- Create: `supabase/migrations/20260728010100_reading_music_domain_summary.sql`

**Interfaces:**
- Consumes: `gw_pitch_match_attempts` (existing), `gw_sight_reading_activity` (existing).
- Produces:
  - View `reading_music_domain_summary` with columns `user_id, domain (text), attempts int, matched int, accuracy_pct int, last_activity_at timestamptz`. Domain ∈ {`pitch_intervals`, `sight_singing`}. Rhythm/dictation/harmony/scales are absent (no rows) — that's fine and rendered as 0% in UI.

- [ ] **Step 1: Verify `gw_sight_reading_activity` table shape**

```bash
ssh root@supabase.gleeworld.org "docker exec -i supabase-db psql -U postgres -d postgres -c '\\d gw_sight_reading_activity'"
```

If a `user_id` and `created_at` column exist with a "score" or "accuracy" column, use it. If the schema is different, adjust the view definition below. If the table doesn't exist at all, use `gw_sight_reading_exercises` for a count-only accuracy (log `attempts` but leave `matched` = 0).

- [ ] **Step 2: Write the migration**

Create `supabase/migrations/20260728010100_reading_music_domain_summary.sql`:

```sql
-- Client-facing rollup for the Reading Music Progress tab. Pitch &
-- Intervals sources from gw_pitch_match_attempts (matched flag).
-- Sight-Singing sources from gw_sight_reading_activity or, if that
-- table's shape doesn't fit, remains 0 attempts. Missing rows for
-- other domains (rhythm/dictation/harmony/scales) render as 0% in UI.

CREATE OR REPLACE VIEW reading_music_domain_summary AS
WITH pitch AS (
  SELECT
    user_id,
    'pitch_intervals'::text AS domain,
    COUNT(*)::int AS attempts,
    SUM(CASE WHEN matched THEN 1 ELSE 0 END)::int AS matched,
    MAX(created_at) AS last_activity_at
  FROM gw_pitch_match_attempts
  GROUP BY user_id
),
sight AS (
  -- If gw_sight_reading_activity doesn't have the expected shape,
  -- collapse to a zero-row expression by adding WHERE false. The Progress
  -- tab renders 0% cleanly when a domain has no summary row.
  SELECT
    user_id,
    'sight_singing'::text AS domain,
    COUNT(*)::int AS attempts,
    0::int AS matched,
    MAX(created_at) AS last_activity_at
  FROM gw_sight_reading_activity
  GROUP BY user_id
)
SELECT
  user_id,
  domain,
  attempts,
  matched,
  CASE WHEN attempts = 0 THEN 0
       ELSE ROUND((matched::numeric / attempts::numeric) * 100)::int END AS accuracy_pct,
  last_activity_at
FROM pitch
UNION ALL
SELECT
  user_id,
  domain,
  attempts,
  matched,
  CASE WHEN attempts = 0 THEN 0
       ELSE ROUND((matched::numeric / attempts::numeric) * 100)::int END AS accuracy_pct,
  last_activity_at
FROM sight;

GRANT SELECT ON reading_music_domain_summary TO authenticated;
```

- [ ] **Step 3: Apply + verify**

```bash
ssh root@supabase.gleeworld.org "docker exec -i supabase-db psql -U postgres -d postgres" \
  < ~/Documents/GitHub/gleeworld-repertoire/supabase/migrations/20260728010100_reading_music_domain_summary.sql
ssh root@supabase.gleeworld.org "docker exec -i supabase-db psql -U postgres -d postgres -c 'SELECT * FROM reading_music_domain_summary LIMIT 3;'"
```

Expected: query executes (may return 0 rows).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260728010100_reading_music_domain_summary.sql
git commit -m "feat(reading-music): reading_music_domain_summary view"
```

---

## Task 3: Domain definitions + level table

**Files:**
- Create: `src/lib/readingMusic/domains.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type DomainId = 'pitch_intervals' | 'rhythm' | 'sight_singing' | 'dictation' | 'harmony' | 'scales_theory'`
  - `interface Domain { id: DomainId; label: string; blurb: string; }` — array `DOMAINS` in the order listed above.
  - `interface Level { id: number; name: string; ageBand: string; focus: string; }` — array `LEVELS` for levels 1..16.
  - `scoreToLevel(correct: number, total: number): number` — deterministic placement scorer. Details in Step 2.

- [ ] **Step 1: Write the file**

Create `src/lib/readingMusic/domains.ts`:

```typescript
export type DomainId =
  | 'pitch_intervals'
  | 'rhythm'
  | 'sight_singing'
  | 'dictation'
  | 'harmony'
  | 'scales_theory';

export interface Domain {
  id: DomainId;
  label: string;
  blurb: string;
  status: 'live' | 'placeholder';
}

export const DOMAINS: Domain[] = [
  { id: 'pitch_intervals', label: 'Pitch & Intervals', blurb: 'Match pitches, sing and identify intervals, chord qualities.', status: 'live' },
  { id: 'rhythm',          label: 'Rhythm',            blurb: 'Clap-back, read-and-clap, dictation. Rhythm Machine ships Phase 2.', status: 'placeholder' },
  { id: 'sight_singing',   label: 'Sight-Singing',     blurb: 'Sing generated lines with real-time pitch feedback.', status: 'live' },
  { id: 'dictation',       label: 'Dictation',         blurb: 'Hear it, notate it. Melodic and harmonic dictation. Ships Phase 2.', status: 'placeholder' },
  { id: 'harmony',         label: 'Harmony & Chords',  blurb: 'Chord ID, cadence ID, Roman numerals. Ships Phase 2.', status: 'placeholder' },
  { id: 'scales_theory',   label: 'Scales & Theory',   blurb: 'Key signatures, scales, modes, notation literacy. Ships Phase 3.', status: 'placeholder' },
];

export interface Level {
  id: number; // 1..16
  name: string;
  ageBand: string;
  focus: string;
}

export const LEVELS: Level[] = [
  { id: 1,  name: 'Beat & Voice',           ageBand: 'K–1',    focus: 'Steady beat, high/low, echo 3-note.' },
  { id: 2,  name: 'Pentatonic Play',        ageBand: '2–3',    focus: 's-m-l-d-r, ta/ti-ti, quarter+eighth.' },
  { id: 3,  name: 'Diatonic Doorway',       ageBand: '3–4',    focus: 'Full major scale, fa/ti, half notes/rests.' },
  { id: 4,  name: 'Staff & Key',            ageBand: '4–5',    focus: 'Treble/bass literacy, C/G/F key sigs.' },
  { id: 5,  name: 'Intervals I',            ageBand: '5–6',    focus: '2nds/3rds/P5/P8; natural minor.' },
  { id: 6,  name: 'Rhythm Depth',           ageBand: '6–7',    focus: 'Dotted rhythms, 6/8, syncopation basics.' },
  { id: 7,  name: 'Chord Colors',           ageBand: '7–8',    focus: 'Triad ID; 2-bar melodic dictation.' },
  { id: 8,  name: 'Key Fluency',            ageBand: 'HS 9',   focus: 'All 15 key sigs, all intervals + inversions.' },
  { id: 9,  name: 'Cadences & Function',    ageBand: 'HS 10',  focus: 'PAC/IAC/HC/Deceptive; 4-chord dictation.' },
  { id: 10, name: 'Chromatic Sight-Sing',   ageBand: 'HS 11',  focus: 'di/ri/fi/si/li; tonicization.' },
  { id: 11, name: 'Seventh Chords',         ageBand: 'HS–AP',  focus: 'Seventh-chord ID, figured bass.' },
  { id: 12, name: 'AP Aural Prep',          ageBand: 'AP',     focus: 'Harmonic + melodic dictation with modulation.' },
  { id: 13, name: 'AP Written Prep',        ageBand: 'AP',     focus: 'SATB voice-leading, Roman numerals.' },
  { id: 14, name: 'Modes & Modal Ear',      ageBand: 'Col 1',  focus: 'Church modes; C-clef reading.' },
  { id: 15, name: 'Modulation & Chromaticism', ageBand: 'Col 2', focus: 'Secondary dominants, borrowed chords.' },
  { id: 16, name: 'Post-Tonal Literacy',    ageBand: 'Col 3–4', focus: 'Atonal sight-sing, mixed meter, set-class ID.' },
];

// Deterministic placement scorer. Maps # correct out of 5 diagnostic
// questions to a starting level. Curved conservative so students land
// somewhere they can succeed rather than somewhere too hard.
export function scoreToLevel(correct: number, total: number): number {
  if (total !== 5) throw new Error('placement diagnostic must be exactly 5 questions');
  switch (correct) {
    case 0: case 1: return 1;
    case 2:         return 3;
    case 3:         return 5;
    case 4:         return 8;
    case 5:         return 11;
    default:        return 1;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/readingMusic/domains.ts
git commit -m "feat(reading-music): domain + level definitions + placement scorer"
```

---

## Task 4: Client API + Vitest

**Files:**
- Create: `src/lib/readingMusic/api.ts`
- Create: `src/lib/readingMusic/__tests__/api.test.ts`

**Interfaces:**
- Consumes: `supabase`, `scoreToLevel`, `DomainId`.
- Produces:
  - `interface PlacementRow { user_id: string; level: number; taken_at: string; }`
  - `interface DomainSummaryRow { user_id: string; domain: DomainId; attempts: number; matched: number; accuracy_pct: number; last_activity_at: string | null; }`
  - `useMyPlacement(): UseQueryResult<PlacementRow | null>` — reads `gw_reading_music_placement` for the current user.
  - `useSubmitPlacement(): UseMutationResult<PlacementRow, Error, { correct: number; total: number }>` — computes level via `scoreToLevel`, upserts.
  - `useDomainSummary(): UseQueryResult<DomainSummaryRow[]>` — reads `reading_music_domain_summary` for current user.

- [ ] **Step 1: Write the test**

Create `src/lib/readingMusic/__tests__/api.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { scoreToLevel } from '../domains';

describe('scoreToLevel', () => {
  it('maps 0/5 and 1/5 to Level 1', () => {
    expect(scoreToLevel(0, 5)).toBe(1);
    expect(scoreToLevel(1, 5)).toBe(1);
  });
  it('maps 2/5 to Level 3', () => { expect(scoreToLevel(2, 5)).toBe(3); });
  it('maps 3/5 to Level 5', () => { expect(scoreToLevel(3, 5)).toBe(5); });
  it('maps 4/5 to Level 8', () => { expect(scoreToLevel(4, 5)).toBe(8); });
  it('maps 5/5 to Level 11', () => { expect(scoreToLevel(5, 5)).toBe(11); });
  it('rejects non-5 totals', () => { expect(() => scoreToLevel(3, 4)).toThrow(); });
});
```

- [ ] **Step 2: Run test — expect FAIL** (`../domains` not yet importing all needed names, or the scorer file already exists so should pass)

```bash
cd ~/Documents/GitHub/gleeworld-repertoire
npx vitest run src/lib/readingMusic/__tests__/api.test.ts
```

Expected: PASS (Task 3 already created `scoreToLevel`; the test verifies the same function).

- [ ] **Step 3: Write `src/lib/readingMusic/api.ts`**

```typescript
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { scoreToLevel, type DomainId } from './domains';

export interface PlacementRow {
  user_id: string;
  level: number;
  taken_at: string;
}

export interface DomainSummaryRow {
  user_id: string;
  domain: DomainId;
  attempts: number;
  matched: number;
  accuracy_pct: number;
  last_activity_at: string | null;
}

export function useMyPlacement(): UseQueryResult<PlacementRow | null> {
  return useQuery({
    queryKey: ['reading-music-placement'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_reading_music_placement')
        .select('user_id, level, taken_at')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as PlacementRow | null) ?? null;
    },
  });
}

export function useSubmitPlacement(): UseMutationResult<PlacementRow, Error, { correct: number; total: number }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ correct, total }) => {
      const level = scoreToLevel(correct, total);
      const { data, error } = await supabase
        .from('gw_reading_music_placement')
        .upsert({ level }, { onConflict: 'user_id' })
        .select('user_id, level, taken_at')
        .single();
      if (error) throw error;
      return data as PlacementRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reading-music-placement'] }),
  });
}

export function useDomainSummary(): UseQueryResult<DomainSummaryRow[]> {
  return useQuery({
    queryKey: ['reading-music-domain-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reading_music_domain_summary')
        .select('user_id, domain, attempts, matched, accuracy_pct, last_activity_at');
      if (error) throw error;
      return (data ?? []) as DomainSummaryRow[];
    },
  });
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/lib/readingMusic/__tests__/api.test.ts
```

Expected: 6/6 pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/readingMusic/api.ts src/lib/readingMusic/__tests__/api.test.ts
git commit -m "feat(reading-music): API hooks + placement scorer tests"
```

---

## Task 5: MasteryRing SVG component

**Files:**
- Create: `src/pages/readingMusic/MasteryRing.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `<MasteryRing percent={number} size?={number} label?={string} />` — round progress ring drawn with two SVG circles (background + foreground stroke-dasharray).

- [ ] **Step 1: Write the component**

Create `src/pages/readingMusic/MasteryRing.tsx`:

```tsx
interface Props {
  percent: number;    // 0..100
  size?: number;      // outer diameter in px, default 64
  label?: string;     // small text under the ring; often the percentage
}

// Mastery ring: two concentric SVG circles. The foreground uses
// stroke-dasharray to draw a partial arc equal to `percent`. Amber
// accent when fully mastered (100%) to reward the completion, slate
// otherwise.
export function MasteryRing({ percent, size = 64, label }: Props) {
  const clamped = Math.max(0, Math.min(100, percent));
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;
  const complete = clamped >= 100;
  const strokeColor = complete ? '#f59e0b' : '#0f172a';

  return (
    <div className="inline-flex flex-col items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#e2e8f0" strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={strokeColor} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {label && <span className="text-xs mt-1 text-slate-600">{label}</span>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/readingMusic/MasteryRing.tsx
git commit -m "feat(reading-music): MasteryRing SVG component"
```

---

## Task 6: `ReadingMusicPage` shell + tab routing

**Files:**
- Create: `src/pages/dashboard/ReadingMusicPage.tsx`
- Create: `src/pages/readingMusic/PlaceholderTab.tsx`

**Interfaces:**
- Consumes: `DOMAINS`, `useMyPlacement`, `useDomainSummary`, `useUserRole` (existing hook returning `{ isAdmin }`).
- Produces: page component with a tab strip: Continue / one tab per domain / Progress / (Class if admin). Each tab body will be filled by Tasks 7-10 and Task 12.

- [ ] **Step 1: Write `PlaceholderTab.tsx`**

```tsx
interface Props {
  title: string;
  shipsIn: string;   // e.g. "Phase 2"
  blurb: string;
}

export function PlaceholderTab({ title, shipsIn, blurb }: Props) {
  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
      <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">Coming in {shipsIn}</p>
      <p className="text-lg font-semibold text-slate-900">{title}</p>
      <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">{blurb}</p>
    </div>
  );
}
```

- [ ] **Step 2: Write `ReadingMusicPage.tsx`**

The page reuses the existing `voice` state pattern from the current `SightReadingStudio` (persisted in localStorage under `gw_sr_voice`) because Sight-Singing and Pitch & Intervals both consume the singer's tessitura.

```tsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import type { Voice } from '@/lib/sightReading/generate';
import { useUserRole } from '@/hooks/useUserRole';
import { DOMAINS } from '@/lib/readingMusic/domains';
import { ContinueTab } from '@/pages/readingMusic/ContinueTab';
import { PitchIntervalsTab } from '@/pages/readingMusic/PitchIntervalsTab';
import { SightSingingTab } from '@/pages/readingMusic/SightSingingTab';
import { PlaceholderTab } from '@/pages/readingMusic/PlaceholderTab';
import { DomainProgressTab } from '@/pages/readingMusic/DomainProgressTab';

export default function ReadingMusicPage() {
  const { isAdmin } = useUserRole();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') ?? 'continue';
  const [tab, setTab] = useState<string>(initialTab);

  // Shared voice control — persisted so bass students don't re-pick each
  // session. Matches the key the old SightReadingStudio wrote to.
  const [voice, setVoice] = useState<Voice>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('gw_sr_voice') : null;
    return stored === 'alto' || stored === 'tenor' || stored === 'bass' ? stored : 'soprano';
  });
  useEffect(() => {
    try { localStorage.setItem('gw_sr_voice', voice); } catch { /* private mode */ }
  }, [voice]);

  return (
    <DashboardPageShell
      title="Reading Music"
      subtitle="Musicianship training from elementary to college level."
      maxWidth="6xl"
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap w-full h-auto">
          <TabsTrigger value="continue">Continue</TabsTrigger>
          {DOMAINS.map((d) => (
            <TabsTrigger key={d.id} value={d.id}>{d.label}</TabsTrigger>
          ))}
          <TabsTrigger value="progress">Progress</TabsTrigger>
          {isAdmin() && <TabsTrigger value="class">Class</TabsTrigger>}
        </TabsList>

        <TabsContent value="continue" className="mt-4">
          <ContinueTab onGoTo={setTab} />
        </TabsContent>

        <TabsContent value="pitch_intervals" className="mt-4">
          <PitchIntervalsTab voice={voice} onVoiceChange={setVoice} />
        </TabsContent>

        <TabsContent value="rhythm" className="mt-4">
          <PlaceholderTab
            title="Rhythm Machine"
            shipsIn="Phase 2"
            blurb="Clap-back exercises, read-and-clap with Takadimi/Kodály/counting toggle, meter and syncopation drills."
          />
        </TabsContent>

        <TabsContent value="sight_singing" className="mt-4">
          <SightSingingTab voice={voice} onVoiceChange={setVoice} />
        </TabsContent>

        <TabsContent value="dictation" className="mt-4">
          <PlaceholderTab
            title="Melodic & Harmonic Dictation"
            shipsIn="Phase 2"
            blurb="Hear a phrase, notate it. Two-bar diatonic to full modulating dictation."
          />
        </TabsContent>

        <TabsContent value="harmony" className="mt-4">
          <PlaceholderTab
            title="Harmony & Chords"
            shipsIn="Phase 2"
            blurb="Chord quality ID, cadence ID, Roman numeral analysis."
          />
        </TabsContent>

        <TabsContent value="scales_theory" className="mt-4">
          <PlaceholderTab
            title="Scales & Theory"
            shipsIn="Phase 3"
            blurb="Key signatures, scale ID, modes, silent notation drills."
          />
        </TabsContent>

        <TabsContent value="progress" className="mt-4">
          <DomainProgressTab />
        </TabsContent>

        {isAdmin() && (
          <TabsContent value="class" className="mt-4">
            <PlaceholderTab
              title="Class Dashboard"
              shipsIn="Phase 3"
              blurb="Roster heatmap, assign flow, per-student progress, struggling-students weekly digest."
            />
          </TabsContent>
        )}
      </Tabs>
    </DashboardPageShell>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: fails on missing `ContinueTab`, `PitchIntervalsTab`, `SightSingingTab`, `DomainProgressTab` — those are Tasks 7-10. OK to commit and progress; tsc goes green after those tasks.

- [ ] **Step 4: Commit**

```bash
git add src/pages/dashboard/ReadingMusicPage.tsx src/pages/readingMusic/PlaceholderTab.tsx
git commit -m "feat(reading-music): ReadingMusicPage shell + PlaceholderTab"
```

---

## Task 7: `ContinueTab` — landing

**Files:**
- Create: `src/pages/readingMusic/ContinueTab.tsx`
- Create: `src/pages/readingMusic/PlacementDiagnostic.tsx`

**Interfaces:**
- Consumes: `useMyPlacement`, `useSubmitPlacement`, `LEVELS`.
- Produces: landing UI with (a) a big "Continue" or "Take placement" card, (b) a warm-up card, (c) an assignments strip placeholder. `onGoTo(tab: string)` fires when a card is clicked to jump to the relevant domain tab.

- [ ] **Step 1: Write the placement diagnostic modal**

Create `src/pages/readingMusic/PlacementDiagnostic.tsx`:

```tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSubmitPlacement } from '@/lib/readingMusic/api';
import { LEVELS } from '@/lib/readingMusic/domains';

// 5-question diagnostic. Each question has one correct answer.
// Questions are deliberately conceptual (not sung) so the modal doesn't
// need the mic and can finish quickly.
interface QA {
  prompt: string;
  choices: string[];
  correctIndex: number;
}
const QUESTIONS: QA[] = [
  {
    prompt: 'Which pair sounds the SAME pitch?',
    choices: ['C4 and G4', 'C4 and C4 (same note)', 'C4 and D4', 'C4 and E4'],
    correctIndex: 1,
  },
  {
    prompt: 'How many semitones is a perfect fifth?',
    choices: ['5', '6', '7', '8'],
    correctIndex: 2,
  },
  {
    prompt: 'In 4/4 time, how many beats does a half note last?',
    choices: ['1', '2', '3', '4'],
    correctIndex: 1,
  },
  {
    prompt: 'How many sharps are in the key of D major?',
    choices: ['1', '2', '3', '4'],
    correctIndex: 1,
  },
  {
    prompt: 'Which chord quality is C-Eb-G?',
    choices: ['Major', 'Minor', 'Diminished', 'Augmented'],
    correctIndex: 1,
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (level: number) => void;
}

export function PlacementDiagnostic({ open, onOpenChange, onComplete }: Props) {
  const submit = useSubmitPlacement();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);

  const done = idx >= QUESTIONS.length;
  const q = done ? null : QUESTIONS[idx];
  const correct = answers.reduce((n, a, i) => n + (a === QUESTIONS[i].correctIndex ? 1 : 0), 0);

  const finish = () => {
    submit.mutate(
      { correct, total: QUESTIONS.length },
      {
        onSuccess: (row) => {
          const lvl = LEVELS.find((l) => l.id === row.level);
          toast.success(`Placed at Level ${row.level}${lvl ? ` — ${lvl.name}` : ''}`);
          onComplete(row.level);
          onOpenChange(false);
          setIdx(0);
          setAnswers([]);
        },
        onError: (e) => toast.error(`Couldn't save placement: ${e.message}`),
      },
    );
  };

  const answer = (i: number) => {
    const next = [...answers, i];
    setAnswers(next);
    setIdx(idx + 1);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setIdx(0); setAnswers([]); } onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Placement — 5 quick questions</DialogTitle>
        </DialogHeader>
        {!done && q && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Question {idx + 1} of {QUESTIONS.length}</p>
            <p className="text-sm text-slate-900 font-medium">{q.prompt}</p>
            <div className="grid grid-cols-1 gap-2">
              {q.choices.map((c, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="justify-start rounded-full"
                  onClick={() => answer(i)}
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>
        )}
        {done && (
          <div className="space-y-3">
            <p className="text-sm">You answered {correct} of {QUESTIONS.length} correctly.</p>
            <p className="text-xs text-slate-500">We'll set your starting level so you're not too easy or too hard.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIdx(0); setAnswers([]); }}>
                Redo
              </Button>
              <Button disabled={submit.isPending} onClick={finish}>
                {submit.isPending ? 'Saving…' : 'Save my level'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Write `ContinueTab.tsx`**

```tsx
import { useState } from 'react';
import { Play, ListMusic, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMyPlacement } from '@/lib/readingMusic/api';
import { LEVELS } from '@/lib/readingMusic/domains';
import { PlacementDiagnostic } from '@/pages/readingMusic/PlacementDiagnostic';

interface Props {
  onGoTo: (tab: string) => void;
}

export function ContinueTab({ onGoTo }: Props) {
  const placement = useMyPlacement();
  const [diagOpen, setDiagOpen] = useState(false);
  const level = placement.data?.level ?? null;
  const levelDef = level ? LEVELS.find((l) => l.id === level) : null;

  return (
    <div className="space-y-4">
      {/* Placement CTA / Continue card */}
      {!placement.isLoading && !level && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white p-6 shadow-md">
          <p className="text-[11px] uppercase tracking-widest text-slate-300">Start here</p>
          <p className="text-xl font-semibold mt-1">Where should we start you?</p>
          <p className="text-sm text-slate-300 mt-1 max-w-md">
            5 quick questions to place you at the right level. You can skip and start at Level 1 if you'd rather.
          </p>
          <div className="flex gap-2 mt-3">
            <Button onClick={() => setDiagOpen(true)}>Take placement</Button>
            <Button variant="outline" className="bg-transparent text-white border-white/40" onClick={() => onGoTo('sight_singing')}>
              Skip — start at Level 1
            </Button>
          </div>
        </div>
      )}
      {level && levelDef && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white p-6 shadow-md">
          <p className="text-[11px] uppercase tracking-widest text-slate-300">Continue</p>
          <p className="text-xl font-semibold mt-1">Level {level} — {levelDef.name}</p>
          <p className="text-sm text-slate-300 mt-1">{levelDef.focus}</p>
          <div className="flex gap-2 mt-3">
            <Button onClick={() => onGoTo('sight_singing')}>
              <Play className="w-4 h-4 mr-1" /> Continue
            </Button>
            <Button variant="outline" className="bg-transparent text-white border-white/40" onClick={() => setDiagOpen(true)}>
              Retake placement
            </Button>
          </div>
        </div>
      )}

      {/* Daily Warm-up card */}
      <button
        type="button"
        onClick={() => onGoTo('pitch_intervals')}
        className="w-full text-left rounded-2xl bg-white p-5 shadow-sm border-2 border-emerald-200 hover:border-emerald-400 transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-emerald-700">Daily warm-up</p>
            <p className="text-lg font-semibold text-slate-900 mt-0.5">60 seconds — Home Tone</p>
            <p className="text-xs text-slate-600 mt-1">Anchor your ear before drills. Sing the tonic 5 times.</p>
          </div>
          <div className="shrink-0 w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
        </div>
      </button>

      {/* Assignments strip (empty for Phase 1) */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Assignments</p>
        <div className="rounded-xl bg-slate-50 border border-dashed border-slate-200 p-6 text-center">
          <p className="text-sm text-slate-600">No assignments right now.</p>
          <p className="text-xs text-slate-500 mt-1">Teachers can assign practice starting in Phase 3.</p>
        </div>
      </div>

      {/* Jump into any domain */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Or jump to a domain</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => onGoTo('pitch_intervals')}>
            <ListMusic className="w-4 h-4 mr-1" /> Pitch & Intervals
          </Button>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => onGoTo('sight_singing')}>
            <ListMusic className="w-4 h-4 mr-1" /> Sight-Singing
          </Button>
          <Badge variant="outline" className="text-xs">Rhythm · Dictation · Harmony · Scales — coming soon</Badge>
        </div>
      </div>

      <PlacementDiagnostic
        open={diagOpen}
        onOpenChange={setDiagOpen}
        onComplete={() => { /* onSuccess in the modal already invalidates the query */ }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck the two new files**

```bash
npx tsc --noEmit
```

Still fails on `PitchIntervalsTab`/`SightSingingTab`/`DomainProgressTab` — those are next. That's expected.

- [ ] **Step 4: Commit**

```bash
git add src/pages/readingMusic/ContinueTab.tsx src/pages/readingMusic/PlacementDiagnostic.tsx
git commit -m "feat(reading-music): ContinueTab landing + 5-question PlacementDiagnostic"
```

---

## Task 8: `PitchIntervalsTab` — wraps existing PitchMatchTab

**Files:**
- Create: `src/pages/readingMusic/PitchIntervalsTab.tsx`

**Interfaces:**
- Consumes: existing `PitchMatchTab` component from `src/pages/sightReading/PitchMatchTab.tsx`.
- Produces: `<PitchIntervalsTab voice onVoiceChange />` — thin wrapper adding the Voice selector at the top so the user can change tessitura without leaving the tab.

- [ ] **Step 1: Write the wrapper**

```tsx
import { Card, CardContent } from '@/components/ui/card';
import type { Voice } from '@/lib/sightReading/generate';
import { PitchMatchTab } from '@/pages/sightReading/PitchMatchTab';

interface Props {
  voice: Voice;
  onVoiceChange: (v: Voice) => void;
}

export function PitchIntervalsTab({ voice, onVoiceChange }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <label htmlFor="pit-voice" className="text-sm text-slate-600">Voice</label>
          <select
            id="pit-voice"
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
            value={voice}
            onChange={(e) => onVoiceChange(e.target.value as Voice)}
          >
            <option value="soprano">Soprano</option>
            <option value="alto">Alto</option>
            <option value="tenor">Tenor</option>
            <option value="bass">Bass</option>
          </select>
          <span className="text-xs text-slate-500">Sets and free-play modes adapt to your range.</span>
        </CardContent>
      </Card>
      <PitchMatchTab voice={voice} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/readingMusic/PitchIntervalsTab.tsx
git commit -m "feat(reading-music): PitchIntervalsTab wrapper for existing PitchMatchTab"
```

---

## Task 9: `SightSingingTab` — extract sight-singing practice from `SightReadingStudio`

**Files:**
- Create: `src/pages/readingMusic/SightSingingTab.tsx`

**Interfaces:**
- Consumes: existing `generateExercise` + `SingFlow` from `src/pages/sightReading/*`.
- Produces: `<SightSingingTab voice onVoiceChange />` — Voice/Key/Level/Measures controls + Pitch Pipe + Start Practice. Launches `SingFlow` when Start is clicked. Does not include the Library / Progress / Class sub-tabs — those are outer tabs (Progress) or defer to Phase 3 (Class).

- [ ] **Step 1: Read existing SightReadingStudio for the sight-singing bits to copy**

Read `src/pages/sightReading/SightReadingStudio.tsx`. The parts to copy are:
- The state: `level`, `musicKey`, `measures`, `priming`, the exercise/setter.
- The `soundPitchPipe()` helper.
- The Voice/Key/Level/Measures + Pitch Pipe control row.
- The `start()` handler calling `generateExercise(...)`.
- The `SingFlow` render when `exercise` is set.

Do NOT copy: the Library/Progress/Class inner tabs, the `academyExercise` deep-link handling (that remains supported at the old route via the redirect).

- [ ] **Step 2: Write `SightSingingTab.tsx`**

```tsx
import { useState } from 'react';
import { Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SingFlow } from '@/pages/sightReading/SingFlow';
import { generateExercise, type Voice } from '@/lib/sightReading/generate';
import type { ExerciseIR } from '@/lib/sightReading/ir';

const ACTIVITY_KEY = 'gw_sight_reading_activity';

interface Props {
  voice: Voice;
  onVoiceChange: (v: Voice) => void;
}

export function SightSingingTab({ voice, onVoiceChange }: Props) {
  const [exercise, setExercise] = useState<ExerciseIR | null>(null);
  const [level, setLevel] = useState(1);
  const [musicKey, setMusicKey] = useState('C');
  const [measures, setMeasures] = useState(8);
  const [priming, setPriming] = useState(false);

  const start = () =>
    setExercise(
      generateExercise({ level, key: musicKey, seed: Math.floor(Math.random() * 1e9), bars: measures, voice }),
    );

  const soundPitchPipe = async () => {
    if (priming) return;
    setPriming(true);
    try {
      const AC = window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      if (ctx.state !== 'running') await ctx.resume();
      const ir = generateExercise({ level, key: musicKey, seed: 1, voice });
      const hz = 440 * Math.pow(2, (ir.tonicMidi - 69) / 12);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = hz;
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.2, t + 0.02);
      g.gain.setValueAtTime(0.2, t + 1.1);
      g.gain.linearRampToValueAtTime(0, t + 1.3);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 1.35);
      await new Promise((r) => setTimeout(r, 1400));
      await ctx.close();
    } catch {
      /* audio blocked */
    } finally {
      setPriming(false);
    }
  };

  if (exercise) {
    return <SingFlow exercise={exercise} onExit={() => setExercise(null)} activityKey={ACTIVITY_KEY} />;
  }

  return (
    <div className="space-y-4">
      <Button size="lg" className="w-full rounded-full" onClick={start}>
        Start practice
      </Button>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <div className="inline-flex items-center gap-2">
            <label className="text-slate-600" htmlFor="ss-voice">Voice</label>
            <select
              id="ss-voice"
              className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
              value={voice}
              onChange={(e) => onVoiceChange(e.target.value as Voice)}
            >
              <option value="soprano">Soprano</option>
              <option value="alto">Alto</option>
              <option value="tenor">Tenor</option>
              <option value="bass">Bass</option>
            </select>
          </div>
          <div className="inline-flex items-center gap-2">
            <label className="text-slate-600" htmlFor="ss-key">Key</label>
            <select
              id="ss-key"
              className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
              value={musicKey}
              onChange={(e) => setMusicKey(e.target.value)}
            >
              {['C', 'D', 'Eb', 'E', 'F', 'G', 'A', 'Bb'].map((k) => (<option key={k}>{k}</option>))}
            </select>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <span className="text-slate-600 mr-1">Level</span>
            {[1, 2, 3, 4, 5, 6].map((l) => (
              <button
                key={l}
                type="button"
                aria-label={`Level ${l}`}
                aria-pressed={level === l}
                onClick={() => setLevel(l)}
                className={`h-8 w-8 rounded-full text-sm font-semibold ${
                  level === l ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="inline-flex items-center gap-1.5">
            <span className="text-slate-600 mr-1">Measures</span>
            {[4, 8, 16].map((m) => (
              <button
                key={m}
                type="button"
                aria-label={`${m} measures`}
                aria-pressed={measures === m}
                onClick={() => setMeasures(m)}
                className={`h-8 min-w-[2rem] rounded-full px-2 text-sm font-semibold ${
                  measures === m ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="sm:ml-auto rounded-full" onClick={soundPitchPipe} disabled={priming}>
            <Music className="mr-1.5 h-4 w-4" /> Pitch pipe
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/readingMusic/SightSingingTab.tsx
git commit -m "feat(reading-music): SightSingingTab extracted from SightReadingStudio"
```

---

## Task 10: `DomainProgressTab` — six mastery-ring cards

**Files:**
- Create: `src/pages/readingMusic/DomainProgressTab.tsx`

**Interfaces:**
- Consumes: `DOMAINS`, `useDomainSummary`, `MasteryRing`.
- Produces: page of 6 domain cards, each showing the domain label + a MasteryRing whose percent = the summary row's `accuracy_pct` (or 0 if no row).

- [ ] **Step 1: Write the component**

```tsx
import { DOMAINS, type DomainId } from '@/lib/readingMusic/domains';
import { useDomainSummary } from '@/lib/readingMusic/api';
import { MasteryRing } from './MasteryRing';

export function DomainProgressTab() {
  const { data, isLoading } = useDomainSummary();

  const rowFor = (id: DomainId) => data?.find((r) => r.domain === id);

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Mastery rings track your accuracy in each domain. Rhythm, Dictation, Harmony, and Scales open in later phases.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {DOMAINS.map((d) => {
          const row = rowFor(d.id);
          const percent = row?.accuracy_pct ?? 0;
          const attempts = row?.attempts ?? 0;
          return (
            <div key={d.id} className="rounded-2xl bg-white p-4 shadow-sm text-center">
              <MasteryRing percent={percent} label={`${percent}%`} />
              <p className="text-sm font-medium text-slate-900 mt-2">{d.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {attempts === 0 ? 'No attempts yet' : `${attempts} attempts`}
              </p>
            </div>
          );
        })}
      </div>
      {isLoading && <p className="text-xs text-slate-500">Loading…</p>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/readingMusic/DomainProgressTab.tsx
git commit -m "feat(reading-music): DomainProgressTab with per-domain mastery rings"
```

---

## Task 11: Nav rebrand + route + redirect

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/lib/navigation/navCatalog.ts`
- Modify: `src/lib/navigation/__tests__/appDestinations.test.ts`

**Interfaces:**
- Consumes: `ReadingMusicPage`.
- Produces:
  - Route `/dashboard/reading-music` mounted with `ReadingMusicPage`.
  - `/dashboard/sight-reading` and `/dashboard/sight-reading/:anything` produce a `<Navigate>` to `/dashboard/reading-music` preserving `?tab=` and other search params.
  - Nav entry with key `sight` (unchanged for backward compat with stored home_tile_layout) but label "Reading Music" and `to: '/dashboard/reading-music'`. Icon stays `Eye` or switches to `BookOpen` if visually cleaner.

- [ ] **Step 1: Add lazy import + route in `src/App.tsx`**

Find the existing lazy-imports near line 195 and add:

```tsx
const ReadingMusicPage = lazy(() => import("./pages/dashboard/ReadingMusicPage"));
```

Find the existing `/dashboard/sight-reading` `<Route>` (grep for it) and add these routes IMMEDIATELY BEFORE it:

```tsx
<Route
  path="/dashboard/reading-music"
  element={
    <ProtectedRoute>
      <UniversalLayout showHeader={false} showFooter={false} containerized={false}>
        <DashboardShell><ReadingMusicPage /></DashboardShell>
      </UniversalLayout>
    </ProtectedRoute>
  }
/>
<Route
  path="/dashboard/sight-reading"
  element={<RedirectWithSearch to="/dashboard/reading-music" />}
/>
<Route
  path="/dashboard/sight-reading/:rest"
  element={<RedirectWithSearch to="/dashboard/reading-music" />}
/>
```

`RedirectWithSearch` already exists in App.tsx (used by the `/music-library` redirect near line 2221 — copy that pattern; if the wildcard version needs adaptation, use `<Navigate to="/dashboard/reading-music" replace />` for the wildcard).

Then DELETE the existing `<Route path="/dashboard/sight-reading" element={<... SightReadingStudio ...} />` block — its function is now the redirect above. Keep the SightReadingStudio component file for now (it's still imported for the `/dashboard/sight-reading/editor` sub-route referenced from LibraryTabAdmin — verify with grep; if that sub-route exists, keep it aliased to a new `/dashboard/reading-music/editor` and redirect old paths).

**Concrete deletion:** grep for `path="/dashboard/sight-reading"` in App.tsx; the current match is the SightReadingStudio route. Replace that whole block with the three new routes above.

- [ ] **Step 2: Update `src/lib/navigation/navCatalog.ts`**

Find the existing nav entry with `key: 'sight'` (currently label "Sight Reading"). Change the label and `to`:

```typescript
{ key: 'sight', to: '/dashboard/reading-music', label: 'Reading Music', icon: Eye, section: 'music', tone: 'bg-violet-50 text-violet-600', tourId: 'nav-reading-music', gate: { module: 'sight_reading' } },
```

Keep `key: 'sight'` unchanged so existing `home_tile_layout` values still resolve.

- [ ] **Step 3: Update `KNOWN_ROUTES` in the nav test**

In `src/lib/navigation/__tests__/appDestinations.test.ts`, add `/dashboard/reading-music` to the KNOWN_ROUTES set. Keep `/dashboard/sight-reading` in the set too (it 301s but the destination test doesn't distinguish).

- [ ] **Step 4: Typecheck**

```bash
cd ~/Documents/GitHub/gleeworld-repertoire
npx tsc --noEmit
```

Fix ANY errors introduced by these edits. Preexisting baseline errors are OK.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/lib/navigation/navCatalog.ts src/lib/navigation/__tests__/appDestinations.test.ts
git commit -m "feat(reading-music): rebrand /dashboard/sight-reading → /dashboard/reading-music with 301 redirect"
```

---

## Task 12: Deploy + smoke test

**Files:** deploy artifacts only.

- [ ] **Step 1: Push branch**

```bash
cd ~/Documents/GitHub/gleeworld-repertoire
git push
```

- [ ] **Step 2: Build + deploy**

```bash
bash scripts/deploy-frontend.sh
```

Expected: build succeeds, live md5 matches local.

- [ ] **Step 3: DB smoke**

```bash
ssh root@supabase.gleeworld.org "docker exec -i supabase-db psql -U postgres -d postgres \
  -c '\\d gw_reading_music_placement' \
  -c 'SELECT * FROM reading_music_domain_summary LIMIT 3;'"
```

Expected: table structure + view executes.

- [ ] **Step 4: Manual browser walk-through**

Hard-refresh gleeworld.org, then:
1. Sidebar → **Music** section → click **Reading Music** (formerly Sight Reading). Route resolves to `/dashboard/reading-music`.
2. Navigate to `gleeworld.org/dashboard/sight-reading` directly — verify 301 to `/dashboard/reading-music`.
3. On Continue tab: verify placement CTA card. Click **Take placement**. Answer 5 questions. Verify a toast fires "Placed at Level X — Y" and the Continue card flips to "Level X · Y".
4. Click Pitch & Intervals tab. Verify the Voice selector is at top and the existing Pitch Match Sets landing renders below.
5. Click Sight-Singing tab. Change Voice to Alto. Click **Start practice**. Verify a SingFlow launches.
6. Click Rhythm / Dictation / Harmony / Scales tabs — each shows "Coming in Phase N" placeholder.
7. Click Progress tab. Verify 6 domain cards render with mastery rings. Pitch & Intervals should show >0% if the user has any prior `gw_pitch_match_attempts`.
8. Sign in as super-admin, verify the Class tab appears and shows the Phase 3 placeholder.

- [ ] **Step 5: Update MEMORY.md**

Append to `.claude/projects/-Users-kevinjohnson/memory/project_reading_music.md` (new file):

```
Phase 1 (Foundation) SHIPPED YYYY-MM-DD. /dashboard/reading-music is the rebrand of Sight Reading; old path 301s. Six domain tabs (2 live: Pitch & Intervals, Sight-Singing; 4 placeholders). Placement diagnostic writes gw_reading_music_placement. Per-domain mastery via reading_music_domain_summary view. Phase 2 (Rhythm Machine + Assessment mode) + Phase 3 (Teacher surface + Repertoire) get their own plans.
```

Then add one line to `MEMORY.md` index.

- [ ] **Step 6: Empty ceremony commit + push**

```bash
git commit --allow-empty -m "chore(reading-music): Phase 1 shipped"
git push
```

---

## Follow-ups (out of scope for Phase 1)

- **Phase 2 — Rhythm Machine + Assessment mode**: onset detection via `AnalyserNode` + spectral flux; Takadimi/Kodály/counting toggle; Assessment vs Practice mode flag; waveform + piano-roll comparison; teacher override.
- **Phase 3 — Teacher surface + real repertoire**: class roster heatmap, assign flow, weekly struggling-students digest, Repertoire-catalog integration for real octavo sight-reading, UIL/FVA/GMEA rubrics.
- **Voice-change mode**: middle-school boys track; pitch matching de-prioritized during voice change. Design decision noted in spec; implementation deferred to a later phase.
- **Custom exercise Library**: SightReadingStudio's Library sub-tab (admin exercise authoring) still exists at the old route via the redirect target's editor sub-route. In Phase 2 or 3, move it under a Library sub-toggle in the Sight-Singing tab.
- **Adaptive Elo**: mentioned in the spec, deferred to post-MVP.
- **Placement diagnostic v2**: add optional sung questions once Assessment mode ships.
