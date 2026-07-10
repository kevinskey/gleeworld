# Songwriting Add-On Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port kpjsongwriting.com into GleeWorld as the paid `songwriting` add-on module at full feature parity (lyric editor, AI assist, chord charts, recording, dictation/TTS), then migrate Kevin's data and flip the old domain to marketing.

**Architecture:** New tenant-RLS tables (`gw_songs`, `gw_song_recordings`, `gw_songwriting_ai_logs`) + a private `songwriting` storage bucket; a `songwriting-ai` edge function proxying DeepSeek; client pages in `src/pages/songwriting/` transplanted from `~/songwriter/client` (already React + Tailwind) with the fetch-to-Express API layer replaced by Supabase calls. Module gating rides the existing `gw_billing_modules` / `NAV_CATALOG` / `ModuleGate` plumbing untouched.

**Tech Stack:** React 18 + Vite + Tailwind (light-theme tokens), self-hosted Supabase (Postgres RLS, Storage, Deno edge functions), DeepSeek via OpenAI SDK-compatible REST, Tone.js, vitest.

**Spec:** `docs/superpowers/specs/2026-07-10-songwriting-addon-design.md` — read it first.

## Global Constraints

- Tenant-neutral copy; never "Spelman". Say **"students"** (not singers/members) and **"graduates"** (not alumni) in any UI copy.
- Light theme: white cards, dark text, cream page — use existing tokens, never dark-navy cards. Never set `color` on bare h1–h6 element rules.
- Sizing floors: `text-xs`/`text-sm` minimum body text, `w-4 h-4` minimum icons.
- Module id is exactly `songwriting` everywhere (catalog, gate, flags, entitlement check).
- Deploys: build locally + rsync **without `--delete`** (tenants/ bootstrap files live under the web root). Migrations applied on the droplet. Edge fn env changes need `docker compose up -d --force-recreate functions` in `/opt/supabase` (check `container_name` before any `docker compose down`).
- Old app source of truth: `~/songwriter` (do NOT modify it except in Tasks 13–15).
- Branch: `songwriting-addon`. Commit after every task.
- `DEEPSEEK_API_KEY` never ships to the client; no CSP change is needed (client only calls supabase.gleeworld.org).

---

### Task 1: Database migration — catalog row, tables, bucket

**Files:**
- Create: `supabase/migrations/20260710120000_songwriting_module.sql`
- Create: `scripts/songwriting-rls-check.sql`

**Interfaces:**
- Produces: tables `gw_songs`, `gw_song_recordings`, `gw_songwriting_ai_logs`; bucket `songwriting`; `gw_billing_modules` row id `songwriting`. Later tasks rely on these exact column names.

- [ ] **Step 1: Write the migration**

Follow the concert-planner + studio-sessions patterns exactly (RESTRICTIVE tenant policy, DEFAULT + BEFORE INSERT trigger, touch trigger, private bucket with path policies):

```sql
-- Songwriting add-on: AI-assisted lyric writing for students.
-- Port of kpjsongwriting.com. Songs are private to the writer by
-- default; visibility='tenant' opt-in makes a song readable (not
-- writable) by everyone in the tenant. Recordings are owner-only
-- even on shared songs (v1). AI usage rows are written by the
-- songwriting-ai edge function (service role) and double as the
-- rate-limit counter and per-tenant DeepSeek cost ledger.

CREATE TABLE IF NOT EXISTS public.gw_songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled song',
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  tempo_bpm INTEGER,
  key_signature TEXT,
  graveyard JSONB NOT NULL DEFAULT '[]'::jsonb,
  chord_chart JSONB,
  visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'tenant')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_songs_owner_idx
  ON public.gw_songs (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS gw_songs_tenant_shared_idx
  ON public.gw_songs (tenant_id, visibility, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.gw_song_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  song_id UUID NOT NULL REFERENCES public.gw_songs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,        -- path inside the 'songwriting' bucket
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_song_recordings_song_idx
  ON public.gw_song_recordings (song_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.gw_songwriting_ai_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  feature TEXT NOT NULL,            -- rhymes | next_line | synonyms | sensory | related | rewrite
  input_preview TEXT,
  output_preview TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_songwriting_ai_logs_rate_idx
  ON public.gw_songwriting_ai_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS gw_songwriting_ai_logs_tenant_idx
  ON public.gw_songwriting_ai_logs (tenant_id, created_at DESC);

-- ── tenant_id backfill triggers (belt-and-suspenders with DEFAULT) ──
CREATE OR REPLACE FUNCTION public.gw_songs_fill_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.current_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gw_songs_fill_tenant_trg ON public.gw_songs;
CREATE TRIGGER gw_songs_fill_tenant_trg
  BEFORE INSERT ON public.gw_songs
  FOR EACH ROW EXECUTE FUNCTION public.gw_songs_fill_tenant();

DROP TRIGGER IF EXISTS gw_song_recordings_fill_tenant_trg ON public.gw_song_recordings;
CREATE TRIGGER gw_song_recordings_fill_tenant_trg
  BEFORE INSERT ON public.gw_song_recordings
  FOR EACH ROW EXECUTE FUNCTION public.gw_songs_fill_tenant();

-- ── updated_at bump ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.gw_songs_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gw_songs_touch_trg ON public.gw_songs;
CREATE TRIGGER gw_songs_touch_trg
  BEFORE UPDATE ON public.gw_songs
  FOR EACH ROW EXECUTE FUNCTION public.gw_songs_touch();

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE public.gw_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_song_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_songwriting_ai_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_restrict ON public.gw_songs AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY tenant_isolation_restrict ON public.gw_song_recordings AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY tenant_isolation_restrict ON public.gw_songwriting_ai_logs AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Songs: owner full control; tenant-mates read shared songs only.
CREATE POLICY songs_select ON public.gw_songs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR visibility = 'tenant');
CREATE POLICY songs_insert ON public.gw_songs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY songs_update ON public.gw_songs FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY songs_delete ON public.gw_songs FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Recordings: owner-only, all verbs (spec: not shared in v1).
CREATE POLICY song_recordings_owner ON public.gw_song_recordings
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- AI logs: users may read their own usage; only the edge function
-- (service role, bypasses RLS) writes.
CREATE POLICY ai_logs_select_own ON public.gw_songwriting_ai_logs
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ── Storage bucket ───────────────────────────────────────────────────
-- Path layout: <tenant_id>/<user_id>/<song_id>/take-<ts>.<ext>
INSERT INTO storage.buckets (id, name, public)
VALUES ('songwriting', 'songwriting', false)
ON CONFLICT (id) DO NOTHING;

-- Owner-only (stricter than the studio bucket: recordings are private).
CREATE POLICY songwriting_bucket_owner_read ON storage.objects FOR SELECT
  USING (
    bucket_id = 'songwriting'
    AND (storage.foldername(name))[1] = current_tenant_id()::text
    AND owner = auth.uid()
  );
CREATE POLICY songwriting_bucket_owner_write ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'songwriting'
    AND (storage.foldername(name))[1] = current_tenant_id()::text
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
CREATE POLICY songwriting_bucket_owner_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'songwriting'
    AND (storage.foldername(name))[1] = current_tenant_id()::text
    AND owner = auth.uid()
  );

-- ── Billing catalog row (ships DARK: no stripe_price_id) ────────────
INSERT INTO public.gw_billing_modules
  (id, name, description, tier, category, icon, monthly_price_cents, is_active, sort_order)
VALUES (
  'songwriting',
  'Songwriting',
  'AI-assisted songwriting for your students: lyric editor with syllable counts, rhyme and next-line suggestions, chord charts, and demo recording.',
  'addon',
  'create',
  'PenLine',
  1499,
  true,
  70
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;
```

- [ ] **Step 2: Write the RLS verification script** (run on the droplet in Task 12)

`scripts/songwriting-rls-check.sql`:

```sql
-- Songwriting RLS smoke checks. Run as postgres on the droplet:
--   docker exec -i supabase-db psql -U postgres -d postgres < scripts/songwriting-rls-check.sql
-- Every SELECT must return the commented expectation.

-- 1. RLS is enabled on all three tables (expect 3 rows, all 't')
SELECT relname, relrowsecurity FROM pg_class
WHERE relname IN ('gw_songs','gw_song_recordings','gw_songwriting_ai_logs');

-- 2. RESTRICTIVE tenant policy exists on all three (expect 3 rows)
SELECT tablename, policyname FROM pg_policies
WHERE policyname = 'tenant_isolation_restrict'
  AND tablename IN ('gw_songs','gw_song_recordings','gw_songwriting_ai_logs');

-- 3. Catalog row present and dark (expect 1 row, stripe_price_id IS NULL)
SELECT id, tier, monthly_price_cents, stripe_price_id, is_active
FROM gw_billing_modules WHERE id = 'songwriting';

-- 4. Bucket exists and is private (expect public = false)
SELECT id, public FROM storage.buckets WHERE id = 'songwriting';

-- 5. Cross-user leak check: simulate two users in one tenant.
--    A private song must be invisible to the second user; a shared one visible.
BEGIN;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000aa","tenant_id":"00000000-0000-0000-0000-00000000dead","role":"authenticated"}';
SET LOCAL role = authenticated;
-- (uses current_tenant_id() from the claim; inserts as user aa)
INSERT INTO gw_songs (user_id, title) VALUES ('00000000-0000-0000-0000-0000000000aa','rls probe private');
INSERT INTO gw_songs (user_id, title, visibility) VALUES ('00000000-0000-0000-0000-0000000000aa','rls probe shared','tenant');
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000bb","tenant_id":"00000000-0000-0000-0000-00000000dead","role":"authenticated"}';
-- expect exactly 1 row (the shared one)
SELECT title FROM gw_songs WHERE title LIKE 'rls probe%';
ROLLBACK;
```

Note: step 5 assumes `current_tenant_id()` reads `request.jwt.claims` (it does — same mechanism every existing RLS test uses). The whole block rolls back; nothing persists.

- [ ] **Step 3: Sanity-check the SQL parses** (no local DB needed — Postgres in docker on the droplet is the real gate; here just confirm balanced statements)

Run: `grep -c "CREATE POLICY" supabase/migrations/20260710120000_songwriting_module.sql`
Expected: `12`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260710120000_songwriting_module.sql scripts/songwriting-rls-check.sql
git commit -m "feat(songwriting): schema, RLS, bucket, billing catalog row (ships dark)"
```

---

### Task 2: Transplant pure libraries + unit tests

**Files:**
- Create: `src/lib/songwriting/syllables.ts` (copy of `~/songwriter/client/src/lib/syllables.ts`)
- Create: `src/lib/songwriting/chords.ts`, `src/lib/songwriting/chordEngine.ts`, `src/lib/songwriting/rhymeKey.ts`, `src/lib/songwriting/speech.ts` (same sources)
- Test: `src/lib/songwriting/__tests__/syllables.test.ts`, `src/lib/songwriting/__tests__/chords.test.ts`

**Interfaces:**
- Produces: `countSyllables(line: string): number`; `parseChord(symbol: string): { notes: string[]; bass?: string } | null`; `class ChordEngine` with `EngineCallbacks`/`StartOptions`; `rhymeKey(word)`, `analyzeInternalRhymes(words)`, `tokenize(line)`, `tintFor(group)`; `isSpeechRecognitionSupported()`, `createRecognition()`, `isSpeechSynthesisSupported()`, `speakLines(...)`.

- [ ] **Step 1: Copy the five files verbatim**

```bash
mkdir -p src/lib/songwriting/__tests__
for f in syllables chords chordEngine rhymeKey speech; do
  cp ~/songwriter/client/src/lib/$f.ts src/lib/songwriting/$f.ts
done
```

Then fix any intra-file imports so they point at siblings (e.g. `chordEngine.ts` imports `./chords`). No other edits — these are dependency-free pure modules (chordEngine imports `tone`, already in package.json for Studio).

- [ ] **Step 2: Write failing tests**

`src/lib/songwriting/__tests__/syllables.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { countSyllables } from '../syllables';

describe('countSyllables', () => {
  it('counts a simple line', () => {
    expect(countSyllables('hello world')).toBe(3);
  });
  it('returns 0 for empty input', () => {
    expect(countSyllables('')).toBe(0);
  });
  it('handles silent e', () => {
    expect(countSyllables('love came home')).toBe(3);
  });
  it('ignores punctuation', () => {
    expect(countSyllables("don't stop believin'")).toBe(
      countSyllables('dont stop believin')
    );
  });
});
```

`src/lib/songwriting/__tests__/chords.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseChord } from '../chords';

describe('parseChord', () => {
  it('parses a major triad', () => {
    const c = parseChord('C');
    expect(c).not.toBeNull();
    expect(c!.notes.length).toBeGreaterThanOrEqual(3);
  });
  it('parses a slash chord bass', () => {
    const c = parseChord('G/B');
    expect(c!.bass).toBeTruthy();
  });
  it('rejects garbage', () => {
    expect(parseChord('notachord')).toBeNull();
  });
});
```

If an assertion disagrees with the ported implementation's actual behavior (e.g. syllable heuristics count "believin'" differently), fix the TEST to pin the real behavior — these libs shipped for months on kpjsongwriting.com; the port must not change behavior.

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/lib/songwriting`
Expected: PASS (adjust assertions per Step 2 note if a heuristic differs, then PASS)

- [ ] **Step 4: Commit**

```bash
git add src/lib/songwriting
git commit -m "feat(songwriting): port pure libs (syllables, chords, engine, rhymes, speech) with tests"
```

---

### Task 3: Types + songs data layer (Supabase CRUD)

**Files:**
- Create: `src/lib/songwriting/types.ts`
- Create: `src/lib/songwriting/songsApi.ts`
- Test: `src/lib/songwriting/__tests__/songsApi.test.ts`

**Interfaces:**
- Consumes: `supabase` from `@/integrations/supabase/client`; table `gw_songs` (Task 1).
- Produces:
  - Types `Section`, `GraveyardEntry`, `ChordChart`, `ChordBar`, `ChordLoop`, `TimeSignature`, `Song`, `SongSummary` (copied from old `client/src/lib/api.ts:18-78`, with `id: string` instead of `number` and added `visibility: 'private' | 'tenant'; user_id: string`).
  - `listMySongs(): Promise<SongSummary[]>`
  - `listSharedSongs(): Promise<SongSummary[]>` (visibility='tenant', excluding own)
  - `getSong(id: string): Promise<Song>`
  - `createSong(partial?: Partial<Song>): Promise<Song>`
  - `updateSong(id: string, patch: Partial<Song>): Promise<Song>`
  - `deleteSong(id: string): Promise<void>`
  - `setVisibility(id: string, visibility: 'private' | 'tenant'): Promise<void>`
  - `rowToSong(row: SongRow): Song` (exported for tests)

- [ ] **Step 1: Create `types.ts`**

Copy the type block from `~/songwriter/client/src/lib/api.ts` lines 18–78 verbatim, then apply exactly these changes: `Song.id: string`, add `Song.user_id: string`, add `Song.visibility: 'private' | 'tenant'`, `SongSummary = Omit<Song, 'sections' | 'notes' | 'graveyard' | 'chord_chart'> & { section_count: number }`. Drop the old `User` type (auth.users replaces it).

- [ ] **Step 2: Write failing test for the row mapper**

`src/lib/songwriting/__tests__/songsApi.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { rowToSong } from '../songsApi';

const row = {
  id: 'a1b2c3d4-0000-0000-0000-000000000001',
  user_id: 'u1',
  title: 'Test',
  sections: [{ id: 's1', type: 'verse', lines: ['la la'] }],
  notes: null,
  tempo_bpm: 92,
  key_signature: 'C',
  graveyard: [],
  chord_chart: null,
  visibility: 'private',
  created_at: '2026-07-10T00:00:00Z',
  updated_at: '2026-07-10T00:00:00Z',
};

describe('rowToSong', () => {
  it('maps jsonb columns through and defaults arrays', () => {
    const song = rowToSong({ ...row, sections: null, graveyard: null } as any);
    expect(song.sections).toEqual([]);
    expect(song.graveyard).toEqual([]);
  });
  it('preserves populated fields', () => {
    const song = rowToSong(row as any);
    expect(song.tempo_bpm).toBe(92);
    expect(song.sections).toHaveLength(1);
    expect(song.visibility).toBe('private');
  });
});
```

Run: `npx vitest run src/lib/songwriting/__tests__/songsApi.test.ts` — Expected: FAIL ("rowToSong is not defined" / module missing).

- [ ] **Step 3: Implement `songsApi.ts`**

```ts
import { supabase } from '@/integrations/supabase/client';
import type { Song, SongSummary } from './types';

export type SongRow = {
  id: string; user_id: string; title: string;
  sections: unknown; notes: string | null;
  tempo_bpm: number | null; key_signature: string | null;
  graveyard: unknown; chord_chart: unknown;
  visibility: 'private' | 'tenant';
  created_at: string; updated_at: string;
};

export function rowToSong(row: SongRow): Song {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    sections: (row.sections as Song['sections']) ?? [],
    notes: row.notes ?? '',
    tempo_bpm: row.tempo_bpm,
    key_signature: row.key_signature,
    graveyard: (row.graveyard as Song['graveyard']) ?? [],
    chord_chart: (row.chord_chart as Song['chord_chart']) ?? null,
    visibility: row.visibility,
    created_at: row.created_at,
    updated_at: row.updated_at,
  } as Song;
}

const SUMMARY_COLS =
  'id, user_id, title, tempo_bpm, key_signature, visibility, created_at, updated_at, sections';

function rowToSummary(row: SongRow): SongSummary {
  const sections = (row.sections as unknown[]) ?? [];
  const { sections: _s, ...rest } = rowToSong(row);
  const { notes: _n, graveyard: _g, chord_chart: _c, ...summary } = rest as Song;
  return { ...(summary as Omit<SongSummary, 'section_count'>), section_count: sections.length };
}

export async function listMySongs(): Promise<SongSummary[]> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  const { data, error } = await supabase
    .from('gw_songs').select(SUMMARY_COLS)
    .eq('user_id', uid).order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as SongRow[]).map(rowToSummary);
}

export async function listSharedSongs(): Promise<SongSummary[]> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  const { data, error } = await supabase
    .from('gw_songs').select(SUMMARY_COLS)
    .eq('visibility', 'tenant').neq('user_id', uid)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as SongRow[]).map(rowToSummary);
}

export async function getSong(id: string): Promise<Song> {
  const { data, error } = await supabase.from('gw_songs').select('*').eq('id', id).single();
  if (error) throw error;
  return rowToSong(data as SongRow);
}

export async function createSong(partial: Partial<Song> = {}): Promise<Song> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('gw_songs')
    .insert({
      user_id: auth?.user?.id,
      title: partial.title ?? 'Untitled song',
      sections: partial.sections ?? [],
      graveyard: partial.graveyard ?? [],
    })
    .select('*').single();
  if (error) throw error;
  return rowToSong(data as SongRow);
}

export async function updateSong(id: string, patch: Partial<Song>): Promise<Song> {
  const { id: _i, user_id: _u, created_at: _c, updated_at: _t, ...cols } = patch as Record<string, unknown>;
  const { data, error } = await supabase
    .from('gw_songs').update(cols).eq('id', id).select('*').single();
  if (error) throw error;
  return rowToSong(data as SongRow);
}

export async function deleteSong(id: string): Promise<void> {
  const { error } = await supabase.from('gw_songs').delete().eq('id', id);
  if (error) throw error;
}

export async function setVisibility(id: string, visibility: 'private' | 'tenant'): Promise<void> {
  const { error } = await supabase.from('gw_songs').update({ visibility }).eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/songwriting`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/songwriting/types.ts src/lib/songwriting/songsApi.ts src/lib/songwriting/__tests__/songsApi.test.ts
git commit -m "feat(songwriting): song types + Supabase CRUD data layer"
```

---

### Task 4: Recordings data layer (storage + metadata)

**Files:**
- Create: `src/lib/songwriting/recordingsApi.ts`
- Test: `src/lib/songwriting/__tests__/recordingsApi.test.ts`

**Interfaces:**
- Consumes: bucket `songwriting`, table `gw_song_recordings` (Task 1); `supabase` client.
- Produces:
  - `pickRecordingMime(): { mimeType: string; ext: string }` — Safari-safe codec pick
  - `uploadRecording(args: { songId: string; blob: Blob; mimeType: string; ext: string; durationMs?: number }): Promise<SongRecording>`
  - `listRecordings(songId: string): Promise<(SongRecording & { url: string })[]>` (1-hour signed URLs)
  - `deleteRecording(rec: SongRecording): Promise<void>`
  - Type `SongRecording = { id: string; song_id: string; user_id: string; storage_key: string; mime_type: string; size_bytes: number; duration_ms: number | null; created_at: string }`

- [ ] **Step 1: Write failing test for the codec pick**

`src/lib/songwriting/__tests__/recordingsApi.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pickRecordingMime } from '../recordingsApi';

describe('pickRecordingMime', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('prefers mp4/aac when webm is unsupported (Safari)', () => {
    vi.stubGlobal('MediaRecorder', {
      isTypeSupported: (t: string) => t.startsWith('audio/mp4'),
    });
    expect(pickRecordingMime()).toEqual({ mimeType: 'audio/mp4', ext: 'm4a' });
  });

  it('never returns webm on Safari even if Safari claims support (PR #80 husk bug)', () => {
    vi.stubGlobal('MediaRecorder', { isTypeSupported: () => true });
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh) AppleWebKit/605 Version/17 Safari/605',
      vendor: 'Apple Computer, Inc.',
    });
    expect(pickRecordingMime().ext).toBe('m4a');
  });

  it('uses webm/opus on Chrome', () => {
    vi.stubGlobal('MediaRecorder', { isTypeSupported: () => true });
    vi.stubGlobal('navigator', { userAgent: 'Chrome', vendor: 'Google Inc.' });
    expect(pickRecordingMime()).toEqual({ mimeType: 'audio/webm;codecs=opus', ext: 'webm' });
  });
});
```

Run: `npx vitest run src/lib/songwriting/__tests__/recordingsApi.test.ts` — Expected: FAIL.

- [ ] **Step 2: Implement `recordingsApi.ts`**

```ts
import { supabase } from '@/integrations/supabase/client';

export type SongRecording = {
  id: string; song_id: string; user_id: string; storage_key: string;
  mime_type: string; size_bytes: number; duration_ms: number | null;
  created_at: string;
};

// Safari claims webm MediaRecorder support but produces undecodable
// 5-byte husks (Part Tracks bug, PR #80). Detect Safari by vendor and
// force mp4/aac there; everywhere else prefer webm/opus.
export function pickRecordingMime(): { mimeType: string; ext: string } {
  const isSafari =
    typeof navigator !== 'undefined' &&
    /apple/i.test(navigator.vendor ?? '') &&
    !/chrome|crios|android/i.test(navigator.userAgent ?? '');
  const webm = 'audio/webm;codecs=opus';
  if (!isSafari && typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(webm)) {
    return { mimeType: webm, ext: 'webm' };
  }
  return { mimeType: 'audio/mp4', ext: 'm4a' };
}

async function tenantAndUser(): Promise<{ tenantId: string; userId: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token ?? '';
  const claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  return { tenantId: claims.tenant_id, userId: claims.sub };
}

// Upload the blob FIRST, insert metadata only after storage confirms,
// and let the caller keep its local blob until this resolves — a failed
// take must never be lost (Part Tracks lesson).
export async function uploadRecording(args: {
  songId: string; blob: Blob; mimeType: string; ext: string; durationMs?: number;
}): Promise<SongRecording> {
  const { tenantId, userId } = await tenantAndUser();
  const key = `${tenantId}/${userId}/${args.songId}/take-${Date.now()}.${args.ext}`;
  const { error: upErr } = await supabase.storage
    .from('songwriting')
    .upload(key, args.blob, { contentType: args.mimeType, upsert: false });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from('gw_song_recordings')
    .insert({
      song_id: args.songId,
      user_id: userId,
      storage_key: key,
      mime_type: args.mimeType,
      size_bytes: args.blob.size,
      duration_ms: args.durationMs ?? null,
    })
    .select('*').single();
  if (error) {
    // metadata failed → remove the orphan object so storage stays clean
    await supabase.storage.from('songwriting').remove([key]);
    throw error;
  }
  return data as SongRecording;
}

export async function listRecordings(songId: string): Promise<(SongRecording & { url: string })[]> {
  const { data, error } = await supabase
    .from('gw_song_recordings').select('*')
    .eq('song_id', songId).order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as SongRecording[];
  const out: (SongRecording & { url: string })[] = [];
  for (const rec of rows) {
    const { data: signed } = await supabase.storage
      .from('songwriting').createSignedUrl(rec.storage_key, 3600);
    out.push({ ...rec, url: signed?.signedUrl ?? '' });
  }
  return out;
}

export async function deleteRecording(rec: SongRecording): Promise<void> {
  const { error } = await supabase.from('gw_song_recordings').delete().eq('id', rec.id);
  if (error) throw error;
  await supabase.storage.from('songwriting').remove([rec.storage_key]);
}
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/lib/songwriting`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/songwriting/recordingsApi.ts src/lib/songwriting/__tests__/recordingsApi.test.ts
git commit -m "feat(songwriting): recordings storage layer with Safari-safe codec pick"
```

---

### Task 5: `songwriting-ai` edge function + client helper

**Files:**
- Create: `supabase/functions/songwriting-ai/index.ts`
- Create: `src/lib/songwriting/ai.ts`
- Test: `src/lib/songwriting/__tests__/ai.test.ts`

**Interfaces:**
- Consumes: `verifyJwtClaims` from `supabase/functions/_shared/verifyJwt.ts`; tables from Task 1; env `DEEPSEEK_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Produces:
  - Edge endpoint: POST body `{ feature: 'rhymes'|'next_line'|'synonyms'|'sensory'|'related'|'rewrite', payload: Record<string, unknown> }` → JSON result (same shapes the old Express routes returned) or `{ error }` with status 401/403/422/429/502.
  - Client: `askSongwritingAI(feature: AiFeature, payload: Record<string, unknown>): Promise<any>`; `type AiFeature`.

- [ ] **Step 1: Write the edge function**

The six prompt builders port **verbatim** from `~/songwriter/server/routes/ai.js` (rhymes L55-83, next-line L84-113, synonyms L114-143, sensory L144-174, related L175-204, rewrite L205-229) — copy each route's `system`/`user` template strings and its temperature/maxTokens into the `FEATURES` table below, renaming `next-line` → `next_line`. Structure:

```ts
// Songwriting AI assist: verifies the caller, checks the tenant's
// songwriting entitlement, rate-limits per user, proxies to DeepSeek,
// and logs usage to gw_songwriting_ai_logs (rate-limit counter + cost
// ledger). DEEPSEEK_API_KEY only ever lives here.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { verifyJwtClaims } from '../_shared/verifyJwt.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const MODEL = 'deepseek-chat'
const RATE_LIMIT = 200          // calls
const RATE_WINDOW_MIN = 15      // minutes

type FeatureSpec = {
  build: (p: Record<string, unknown>) => { system: string; user: string } | { error: string }
  temperature: number
  maxTokens: number
  inputPreview: (p: Record<string, unknown>) => string
}

// ⬇ PORT VERBATIM from ~/songwriter/server/routes/ai.js — one entry per
// route, system/user strings and temperature/maxTokens unchanged. The
// `build` fn returns {error} for the same 400-validations the old routes
// did (e.g. rhymes without `word`).
const FEATURES: Record<string, FeatureSpec> = {
  rhymes: {
    temperature: 0.7,
    maxTokens: 600,
    inputPreview: (p) => String(p.word ?? ''),
    build: (p) => {
      const word = p.word as string | undefined
      if (!word) return { error: 'word is required' }
      const context = (p.context as string) ?? ''
      const style = (p.style as string) ?? ''
      const system = `You are a songwriter's rhyme assistant. Return diverse, useful rhymes — mix perfect rhymes, near rhymes (slant/assonance), and multi-syllable rhymes. Prefer rhymes that fit the song's mood.

Output STRICT JSON:
{
  "perfect": ["word1", "word2", ...],
  "near": ["word1", "word2", ...],
  "multi": ["two word", "multi syllable", ...]
}
Give 8-12 options per category when possible. No explanations.`
      const user = `Word: ${word}
${context ? `Line context: ${context}\n` : ''}${style ? `Song style/mood: ${style}` : ''}`
      return { system, user }
    },
  },
  next_line: { /* port from L84-113 */ } as FeatureSpec,
  synonyms:  { /* port from L114-143 */ } as FeatureSpec,
  sensory:   { /* port from L144-174 */ } as FeatureSpec,
  related:   { /* port from L175-204 */ } as FeatureSpec,
  rewrite:   { /* port from L205-229 */ } as FeatureSpec,
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const apiKey = Deno.env.get('DEEPSEEK_API_KEY')
    if (!apiKey) return json({ error: 'AI not configured' }, 500)

    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const claims = await verifyJwtClaims(token)
    if (!claims) return json({ error: 'invalid_token' }, 401)
    const tenantId = claims.tenant_id as string | undefined
    const userId = claims.sub as string
    if (!tenantId) return json({ error: 'JWT missing tenant_id' }, 401)

    const sb = createClient(
      Deno.env.get('SUPABASE_URL') ?? 'http://kong:8000',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Entitlement: active/trial subscription row (or starter tier).
    const { data: mod } = await sb.from('gw_billing_modules')
      .select('tier').eq('id', 'songwriting').maybeSingle()
    if (mod?.tier !== 'starter') {
      const { data: sub } = await sb.from('gw_tenant_subscriptions')
        .select('status, current_period_end')
        .eq('tenant_id', tenantId).eq('module_id', 'songwriting').maybeSingle()
      const live = sub && ['active', 'trial'].includes(sub.status) &&
        (!sub.current_period_end || new Date(sub.current_period_end) > new Date())
      if (!live) return json({ error: 'songwriting_not_enabled' }, 403)
    }

    // Rate limit: RATE_LIMIT calls per RATE_WINDOW_MIN per user.
    const since = new Date(Date.now() - RATE_WINDOW_MIN * 60_000).toISOString()
    const { count } = await sb.from('gw_songwriting_ai_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId).gte('created_at', since)
    if ((count ?? 0) >= RATE_LIMIT) {
      return json({ error: 'Too many AI requests. Try again in a few minutes.' }, 429)
    }

    const { feature, payload = {} } = await req.json()
    const spec = FEATURES[feature as string]
    if (!spec) return json({ error: 'unknown feature' }, 422)
    const built = spec.build(payload)
    if ('error' in built) return json({ error: built.error }, 422)

    const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: built.system },
          { role: 'user', content: built.user },
        ],
        temperature: spec.temperature,
        max_tokens: spec.maxTokens,
        response_format: { type: 'json_object' },
      }),
    })
    if (!dsRes.ok) return json({ error: 'AI provider error' }, 502)
    const ds = await dsRes.json()
    const raw = ds.choices?.[0]?.message?.content ?? ''
    let parsed: unknown
    try { parsed = JSON.parse(raw) } catch { return json({ error: 'Failed to parse AI response' }, 502) }

    await sb.from('gw_songwriting_ai_logs').insert({
      tenant_id: tenantId,
      user_id: userId,
      feature,
      input_preview: spec.inputPreview(payload).slice(0, 300),
      output_preview: raw.slice(0, 300),
      prompt_tokens: ds.usage?.prompt_tokens ?? null,
      completion_tokens: ds.usage?.completion_tokens ?? null,
    })
    return json(parsed)
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})
```

Porting note: the old `rewrite` route may not use `response_format: json` — check its `callAI` call; if `responseFormat !== 'json'` there, add a `jsonMode: boolean` field to `FeatureSpec` and only send `response_format` when true, returning `{ text: raw }` for non-JSON features.

- [ ] **Step 2: Write the client helper + failing test**

`src/lib/songwriting/ai.ts`:

```ts
import { supabase } from '@/integrations/supabase/client';

export type AiFeature = 'rhymes' | 'next_line' | 'synonyms' | 'sensory' | 'related' | 'rewrite';

export class AiError extends Error {
  constructor(message: string, public status?: number) { super(message); }
}

export async function askSongwritingAI(
  feature: AiFeature,
  payload: Record<string, unknown>,
): Promise<any> {
  const { data, error } = await supabase.functions.invoke('songwriting-ai', {
    body: { feature, payload },
  });
  if (error) throw new AiError(error.message ?? 'AI request failed');
  if (data?.error) throw new AiError(data.error);
  return data;
}
```

`src/lib/songwriting/__tests__/ai.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

import { supabase } from '@/integrations/supabase/client';
import { askSongwritingAI, AiError } from '../ai';

describe('askSongwritingAI', () => {
  it('returns parsed data on success', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({ data: { perfect: ['moon'] }, error: null });
    await expect(askSongwritingAI('rhymes', { word: 'June' })).resolves.toEqual({ perfect: ['moon'] });
  });
  it('throws AiError on function error', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(askSongwritingAI('rhymes', { word: 'x' })).rejects.toBeInstanceOf(AiError);
  });
  it('throws AiError on embedded error payload (429 etc.)', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({ data: { error: 'Too many AI requests. Try again in a few minutes.' }, error: null });
    await expect(askSongwritingAI('rhymes', { word: 'x' })).rejects.toThrow(/Too many/);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/lib/songwriting`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/songwriting-ai src/lib/songwriting/ai.ts src/lib/songwriting/__tests__/ai.test.ts
git commit -m "feat(songwriting): DeepSeek edge function with entitlement + rate limit, client helper"
```

---

### Task 6: Module flags, nav catalog, routes

**Files:**
- Modify: `src/lib/navigation/moduleFlags.ts` (add flag)
- Modify: `src/lib/navigation/appDestinations.ts:11-15` (ModuleFlags interface)
- Modify: `src/lib/navigation/navCatalog.ts` (new entry in the `make` section, near line 67)
- Modify: `src/App.tsx` (lazy imports ~line 209, routes near the concert-planner block ~line 1498)

**Interfaces:**
- Consumes: pages `SongwritingLibraryPage` / `SongwritingEditorPage` (Tasks 7–8 create them; this task creates placeholder pages so the route compiles).
- Produces: `ModuleFlags.hasSongwriting: boolean`; nav key `songwriting`; routes `/songwriting` and `/songwriting/:songId`.

- [ ] **Step 1: Add the flag**

In `src/lib/navigation/appDestinations.ts` extend the interface:

```ts
export interface ModuleFlags {
  hasViewer: boolean; hasPartTracks: boolean; hasStudio: boolean;
  hasSightReading: boolean; hasBoxOffice: boolean; hasConcertPlanner: boolean;
  hasMerch: boolean; hasFinance: boolean; hasAcademy: boolean; hasStore: boolean;
  hasSongwriting: boolean;
}
```

In `src/lib/navigation/moduleFlags.ts` add to the returned object of `toModuleFlags`:

```ts
    hasSongwriting: hasModule('songwriting'),
```

Fix any other object literal the compiler now flags as missing `hasSongwriting` (search: `grep -rn "hasAcademy" src/` — every literal building ModuleFlags needs the new key).

- [ ] **Step 2: Add the nav entry**

In `src/lib/navigation/navCatalog.ts`, in the `make` section (after the `music-tools` line ~68), matching the existing one-line entry style:

```ts
  { key: 'songwriting', to: '/songwriting', label: 'Songwriting', icon: PenLine, section: 'make', tone: 'bg-violet-50 text-violet-600', tourId: 'nav-songwriting', gate: { module: 'songwriting' } },
```

Add `PenLine` to the existing `lucide-react` import at the top of the file.

- [ ] **Step 3: Create placeholder pages so routes compile**

`src/pages/songwriting/SongwritingLibraryPage.tsx`:

```tsx
export default function SongwritingLibraryPage() {
  return <div className="p-6 text-sm">Songwriting library — coming in Task 7.</div>;
}
```

`src/pages/songwriting/SongwritingEditorPage.tsx`:

```tsx
export default function SongwritingEditorPage() {
  return <div className="p-6 text-sm">Songwriting editor — coming in Task 8.</div>;
}
```

- [ ] **Step 4: Wire routes in `src/App.tsx`**

Lazy imports beside the other page imports (~line 209):

```ts
const SongwritingLibraryPage = lazy(() => import("./pages/songwriting/SongwritingLibraryPage"));
const SongwritingEditorPage = lazy(() => import("./pages/songwriting/SongwritingEditorPage"));
```

Routes: copy the `/dashboard/concert-planner` route block (App.tsx ~1498-1515) **exactly** — same `ProtectedRoute`/layout wrappers — changing only path/component, and wrap the page element in `ModuleGate`:

```tsx
<ModuleGate moduleId="songwriting"><SongwritingLibraryPage /></ModuleGate>
```
for `path="/songwriting"`, and
```tsx
<ModuleGate moduleId="songwriting"><SongwritingEditorPage /></ModuleGate>
```
for `path="/songwriting/:songId"`. `ModuleGate` is already imported in App.tsx.

- [ ] **Step 5: Verify build + tests**

Run: `npm run build && npx vitest run src/lib`
Expected: build succeeds; tests PASS. (Note: `tsc --noEmit` is a no-op in this repo — the Vite build is the type gate.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/navigation src/pages/songwriting src/App.tsx
git commit -m "feat(songwriting): module flag, nav entry, gated routes"
```

---

### Task 7: Library page

**Files:**
- Modify: `src/pages/songwriting/SongwritingLibraryPage.tsx` (replace placeholder)
- Reference: `~/songwriter/client/src/pages/LibraryPage.tsx` (93 lines — the source design)

**Interfaces:**
- Consumes: `listMySongs`, `listSharedSongs`, `createSong`, `deleteSong` (Task 3); `toast` from `sonner`; `useNavigate` from `react-router-dom`.
- Produces: the `/songwriting` screen; navigates to `/songwriting/:songId` on card click / create.

- [ ] **Step 1: Port LibraryPage**

Transplant `~/songwriter/client/src/pages/LibraryPage.tsx` with exactly these changes:
1. Replace every `api.*` call: `api.listSongs()` → `listMySongs()`, `api.createSong()` → `createSong()`, `api.deleteSong(id)` → `deleteSong(id)`.
2. Song ids are strings now — navigation becomes `navigate(\`/songwriting/${song.id}\`)`.
3. Add a second list below "Your songs": heading `Shared with your ensemble`, fed by `listSharedSongs()`, cards read-only (no delete button), same card markup.
4. Restyle to GleeWorld light theme: page container `p-4 md:p-6 max-w-5xl mx-auto`, cards `rounded-xl border bg-white shadow-sm p-4` (or reuse the repo `Card` component per `gleeworld-design`), body text `text-sm`, icons `w-4 h-4`.
5. Errors: wrap loads in try/catch → `toast.error('Could not load songs')`; delete asks `window.confirm` then `toast.success('Song deleted')`.
6. Copy check: no "singer/member/alumni" words; empty state reads "No songs yet — start your first one."

- [ ] **Step 2: Verify in dev**

Run: `npm run dev`, sign in as a user whose tenant has the module granted (until Task 12 deploys, grant locally by inserting a `gw_tenant_subscriptions` row for your dev tenant, or temporarily view as super admin — ModuleGate bypasses for super admins).
Expected: library renders, New Song creates a row and navigates, delete works, shared list shows another user's `visibility='tenant'` song.

- [ ] **Step 3: Commit**

```bash
git add src/pages/songwriting/SongwritingLibraryPage.tsx
git commit -m "feat(songwriting): library page with shared-songs section"
```

---

### Task 8: Editor shell — sections, syllables, graveyard, autosave

**Files:**
- Modify: `src/pages/songwriting/SongwritingEditorPage.tsx` (replace placeholder)
- Create: `src/pages/songwriting/components/SectionBlock.tsx`, `src/pages/songwriting/components/TopBar.tsx`
- Reference: `~/songwriter/client/src/pages/EditorPage.tsx` (517 lines), `client/src/components/SectionBlock.tsx` (268), `client/src/components/TopBar.tsx` (32)

**Interfaces:**
- Consumes: `getSong`, `updateSong`, `setVisibility` (Task 3); `countSyllables`, `rhymeKey` libs (Task 2); types (Task 3).
- Produces: working editor at `/songwriting/:songId`; the component slots later tasks fill: the page renders `<AIPanel …>` (Task 9), `<ChordChartEditor …>` (Task 10), `<RecorderPanel …>` (Task 11) — comment those three out with `{/* Task 9 */}` markers until their tasks land.

- [ ] **Step 1: Port SectionBlock + TopBar**

Copy both files from `~/songwriter/client/src/components/`, then:
1. Rewrite imports: `../lib/syllables` → `@/lib/songwriting/syllables`, `../lib/rhymeKey` → `@/lib/songwriting/rhymeKey`, `../lib/api` types → `@/lib/songwriting/types`.
2. Keep all editing logic (line editing, syllable badges, add/remove/reorder sections, send-line-to-graveyard) byte-identical — only imports and Tailwind classes change.
3. Restyle: swap any dark-scheme classes for light tokens (white card, `text-slate-900` body, `text-slate-500` metadata), enforce `text-sm` and `w-4 h-4` minimums.

- [ ] **Step 2: Port EditorPage**

Copy `EditorPage.tsx` → `SongwritingEditorPage.tsx`, then:
1. Param: `useParams<{ songId: string }>()`; load via `getSong(songId)`.
2. Replace the old save call inside the existing 800 ms debounce with `updateSong(songId, { title, sections, notes, tempo_bpm, key_signature, graveyard, chord_chart })`. Keep the old debounce/dirty-tracking structure as-is; on save failure `toast.error('Autosave failed — retrying')` and keep the dirty flag set so the next debounce retries. Lyric state must live in React state only (never cleared on failed save).
3. Add a Share toggle in the TopBar area: a small select or switch bound to `song.visibility`, calling `setVisibility(songId, v)`, labels "Private" / "Shared with your ensemble", `toast.success` on change.
4. Comment out `AIPanel`, `ChordChartEditor`, `RecorderPanel`, `TTSPlayButton` renders with `{/* restored in Task 9/10/11 */}` markers.
5. Restyle to light theme as in Step 1; page container `p-4 md:p-6 max-w-4xl mx-auto`.

- [ ] **Step 3: Verify in dev**

Run: `npm run dev`
Expected: open a song → sections render with live syllable counts as you type → wait ~1s → refresh → edits persisted. Graveyard drawer restores cut lines. Share toggle flips and persists.

- [ ] **Step 4: Run the full unit suite**

Run: `npx vitest run src/lib/songwriting`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/songwriting
git commit -m "feat(songwriting): editor with sections, syllables, graveyard, autosave, share toggle"
```

---

### Task 9: AI panel

**Files:**
- Create: `src/pages/songwriting/components/AIPanel.tsx`
- Modify: `src/pages/songwriting/SongwritingEditorPage.tsx` (restore the `{/* Task 9 */}` slot)
- Reference: `~/songwriter/client/src/components/AIPanel.tsx` (484 lines)

**Interfaces:**
- Consumes: `askSongwritingAI`, `AiError`, `AiFeature` (Task 5).
- Produces: `<AIPanel>` with the same props the old component took from EditorPage (check its export signature in the source file and keep it identical so the EditorPage call-site ports cleanly).

- [ ] **Step 1: Port AIPanel**

Copy the file, then:
1. Replace every old API call (`api.ai.rhymes(...)` etc. — the old client hits `/api/ai/<endpoint>`) with `askSongwritingAI('<feature>', payload)` using the same payload keys the old code sent (`word/context/style`, `previous_lines/section_type/style/count`, …). Endpoint `next-line` becomes feature `next_line`.
2. Error handling: catch `AiError`; a message containing "Too many" renders as an inline notice "You've hit the AI limit — try again in a few minutes."; anything else "AI assist is unavailable right now." The editor must be unaffected (panel-local state only).
3. Restyle to light theme, `text-sm`/`w-4 h-4` floors.

- [ ] **Step 2: Restore the EditorPage slot** — uncomment the `<AIPanel …>` render.

- [ ] **Step 3: Verify the failure states in dev**

The edge function isn't deployed until Task 12, so here verify the UI's error handling against the unreachable function: open the panel, trigger a rhymes request.
Expected: the panel shows "AI assist is unavailable right now.", no crash, and the editor keeps working. (Real AI responses are verified end-to-end in Task 12 Step 3/6.)

- [ ] **Step 4: Commit**

```bash
git add src/pages/songwriting
git commit -m "feat(songwriting): AI assist panel (rhymes, next line, synonyms, sensory, related, rewrite)"
```

---

### Task 10: Chord charts + TTS

**Files:**
- Create: `src/pages/songwriting/components/ChordChartEditor.tsx`, `src/pages/songwriting/components/SectionChordSlot.tsx`, `src/pages/songwriting/components/TTSPlayButton.tsx`
- Modify: `src/pages/songwriting/SongwritingEditorPage.tsx` (restore slots)
- Reference: `~/songwriter/client/src/components/{ChordChartEditor,SectionChordSlot,TTSPlayButton}.tsx` (425/92/92 lines)

**Interfaces:**
- Consumes: `ChordEngine`, `parseChord`, `speech` lib (Task 2); `ChordChart` types (Task 3); `updateSong` via the EditorPage's existing state flow (chord chart saves through the same autosave patch).
- Produces: chord chart editing + Tone.js playback + TTS lyric playback inside the editor.

- [ ] **Step 1: Port the three components** — same recipe: copy, rewrite imports to `@/lib/songwriting/*` and `./SectionChordSlot`, keep logic identical, restyle to light theme. `TTSPlayButton` uses `isSpeechSynthesisSupported()` and must render nothing when unsupported.

- [ ] **Step 2: Restore the EditorPage slots** — uncomment `<ChordChartEditor …>` and `<TTSPlayButton …>`.

- [ ] **Step 3: Verify in dev**

Run: `npm run dev`
Expected: add a chord loop to a section → press play → hear the progression (Tone.js needs a user gesture first — the play button is one); chart survives refresh (autosave path); TTS reads a section aloud in Chrome.

- [ ] **Step 4: Commit**

```bash
git add src/pages/songwriting
git commit -m "feat(songwriting): chord chart editor with Tone.js playback + TTS"
```

---

### Task 11: Recorder panel + dictation

**Files:**
- Create: `src/pages/songwriting/components/RecorderPanel.tsx`
- Modify: `src/pages/songwriting/SongwritingEditorPage.tsx` (restore slot; wire dictation)
- Reference: `~/songwriter/client/src/components/RecorderPanel.tsx` (412 lines)

**Interfaces:**
- Consumes: `pickRecordingMime`, `uploadRecording`, `listRecordings`, `deleteRecording` (Task 4); `createRecognition`, `isSpeechRecognitionSupported` (Task 2).
- Produces: take recording/playback/delete inside the editor; mic-dictation into the focused section line.

- [ ] **Step 1: Port RecorderPanel**

Copy, then:
1. Replace the multer-upload fetch with: `const { mimeType, ext } = pickRecordingMime()` when constructing the `MediaRecorder`, and `uploadRecording({ songId, blob, mimeType, ext, durationMs })` on stop. **Keep the local blob in state until `uploadRecording` resolves**; on failure show `toast.error('Upload failed — take kept locally')` with a retry button that re-calls `uploadRecording` with the same blob.
2. List/playback via `listRecordings(songId)` — `<audio src={rec.url}>` with the signed URL; delete via `deleteRecording(rec)` after `window.confirm`.
3. Dictation: port the existing Web Speech wiring as-is (uses `createRecognition()`); hide the mic button when `!isSpeechRecognitionSupported()`.
4. Light theme restyle, sizing floors.

- [ ] **Step 2: Restore the EditorPage slot.**

- [ ] **Step 3: Verify in dev (Chrome)**

Run: `npm run dev`
Expected: record a take → appears in list → plays back → survives refresh → delete removes it. Dictation inserts words into the active line. (Safari/iOS device check happens in Task 12.)

- [ ] **Step 4: Full unit suite + build**

Run: `npx vitest run src/lib && npm run build`
Expected: PASS, build clean.

- [ ] **Step 5: Commit**

```bash
git add src/pages/songwriting
git commit -m "feat(songwriting): recorder panel with upload-confirm safety + dictation"
```

---

### Task 12: Deploy + end-to-end verification

**Files:**
- No new source files. Droplet operations + `Documents/GitHub/gleeworld:verify` skill run.

**Interfaces:**
- Consumes: everything above.
- Produces: live module on supabase.gleeworld.org + gleeworld.org, granted to the main tenant.

- [ ] **Step 1: Local verify pass** — run the repo's scoped verify skill (preview server + Playwright at phone/desktop viewports) over the flow: library → create song → type lyrics → syllable count updates → autosave (refresh persists) → share toggle → second-user sees it in shared list. AI panel exercised with the edge function mocked/unreachable → friendly error.

- [ ] **Step 2: Apply the migration on the droplet**

```bash
scp supabase/migrations/20260710120000_songwriting_module.sql root@<droplet>:/tmp/
ssh root@<droplet> 'docker exec -i supabase-db psql -U postgres -d postgres < /tmp/20260710120000_songwriting_module.sql'
ssh root@<droplet> 'docker exec -i supabase-db psql -U postgres -d postgres' < scripts/songwriting-rls-check.sql
```

Expected: RLS check output matches every commented expectation (3× rowsecurity `t`, 3 restrictive policies, dark catalog row, private bucket, shared-song probe returns exactly 1 row).

- [ ] **Step 3: Deploy the edge function**

```bash
rsync -av supabase/functions/songwriting-ai/ root@<droplet>:/opt/supabase/functions/songwriting-ai/
ssh root@<droplet> 'grep -q DEEPSEEK_API_KEY /opt/supabase/.env || echo "ADD DEEPSEEK_API_KEY (copy from ~songwriter/.env on this droplet)"'
# after adding the key to the functions env:
ssh root@<droplet> 'cd /opt/supabase && docker compose up -d --force-recreate functions'
```

Smoke test (as an authenticated user token from the browser dev console):
`curl -s -X POST https://supabase.gleeworld.org/functions/v1/songwriting-ai -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"feature":"rhymes","payload":{"word":"June"}}'`
Expected: JSON with `perfect`/`near`/`multi` arrays. Then `gw_songwriting_ai_logs` has a row. Repeat with a tenant lacking the module → `{"error":"songwriting_not_enabled"}` 403.

- [ ] **Step 4: Grant the module to the main tenant** — superadmin UI per-tenant module toggle (or SQL upsert into `gw_tenant_subscriptions` status `active`).

- [ ] **Step 5: Build + deploy the SPA**

```bash
npm run build
rsync -av dist/ <deploy-user>@<droplet>:/var/www/gleeworld/html/   # NO --delete
```

- [ ] **Step 6: Production smoke** — on gleeworld.org: nav shows Songwriting; full flow (create, write, AI rhymes for real, chord playback, record a take, share). Verify a take on **real-device Safari/iPhone**: recording produces a playable m4a (>5 KB — the husk check). Verify the storage flatten log shows the new bucket objects reachable.

- [ ] **Step 7: Commit any deploy-doc updates + push branch, open PR**

```bash
git push -u origin songwriting-addon
gh pr create --title "Songwriting add-on: full port of kpjsongwriting.com" --body "Implements docs/superpowers/specs/2026-07-10-songwriting-addon-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

---

### Task 13: Archive ALL old-app data (before any freeze)

**Files:** droplet operations only; archive lands in DO Spaces + a local copy.

- [ ] **Step 1: Dump the database and uploads on the droplet**

The songwriter app lives on the consolidated droplet (198.211.113.144) as user `songwriter`. Find the DB name from its env first:

```bash
ssh root@198.211.113.144 'grep DATABASE_URL /home/songwriter/songwriter/server/.env'
ssh root@198.211.113.144 'sudo -u postgres pg_dump <dbname> | gzip > /root/songwriter-db-$(date +%F).sql.gz'
ssh root@198.211.113.144 'tar czf /root/songwriter-uploads-$(date +%F).tar.gz -C /home/songwriter/songwriter/server uploads'
```

- [ ] **Step 2: Copy off-droplet (local + DO Spaces)**

```bash
mkdir -p ~/Backups/songwriter
scp 'root@198.211.113.144:/root/songwriter-*.gz' ~/Backups/songwriter/
# DO Spaces (use whichever s3 tool is configured on the droplet for GleeWorld backups; verify with `which s3cmd rclone aws`)
```

Expected: both archives exist locally, `gunzip -t` passes, tar lists recordings.

- [ ] **Step 3: Record row counts for the import cross-check**

```bash
ssh root@198.211.113.144 'sudo -u postgres psql <dbname> -c "SELECT (SELECT count(*) FROM users) users, (SELECT count(*) FROM songs) songs, (SELECT count(*) FROM recordings) recordings;"'
```

Save the output — Task 14 verifies against it.

---

### Task 14: Import Kevin's songs + recordings

**Files:**
- Create: `scripts/import-songwriter-songs.mjs`

**Interfaces:**
- Consumes: old-app Postgres (droplet), Supabase service role key, bucket + tables from Task 1.
- Produces: Kevin's `gw_songs` + `gw_song_recordings` rows under his auth user in the main tenant.

- [ ] **Step 1: Write the import script**

```js
// One-off: import a single kpjsongwriting.com user's songs + recordings
// into GleeWorld. Run ON THE DROPLET (needs both the old DB and the
// recordings on disk):
//   node scripts/import-songwriter-songs.mjs \
//     --email kpj64110@gmail.com --tenant <main-tenant-uuid>
// Env: OLD_DATABASE_URL, SUPABASE_URL=https://supabase.gleeworld.org,
//      SUPABASE_SERVICE_ROLE_KEY, UPLOADS_DIR=/home/songwriter/songwriter/server/uploads/recordings
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const arg = (name) => process.argv[process.argv.indexOf(name) + 1];
const email = arg('--email');
const tenantId = arg('--tenant');
if (!email || !tenantId) throw new Error('--email and --tenant required');

const old = new pg.Client({ connectionString: process.env.OLD_DATABASE_URL });
await old.connect();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 1. Resolve users on both sides.
const { rows: [oldUser] } = await old.query('SELECT id FROM users WHERE email = $1', [email]);
if (!oldUser) throw new Error(`no old user for ${email}`);
const { data: page } = await sb.auth.admin.listUsers({ perPage: 1000 });
const newUser = page.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!newUser) throw new Error(`no GleeWorld auth user for ${email}`);

// 2. Songs — JSONB shapes are identical by design; insert with explicit
//    tenant/user (service role bypasses RLS; the trigger only fills nulls).
const { rows: songs } = await old.query('SELECT * FROM songs WHERE user_id = $1', [oldUser.id]);
const idMap = new Map();
for (const s of songs) {
  const { data, error } = await sb.from('gw_songs').insert({
    tenant_id: tenantId,
    user_id: newUser.id,
    title: s.title ?? 'Untitled song',
    sections: s.sections ?? [],
    notes: s.notes,
    tempo_bpm: s.tempo_bpm,
    key_signature: s.key_signature,
    graveyard: s.graveyard ?? [],
    chord_chart: s.chord_chart,
    created_at: s.created_at,
    updated_at: s.updated_at,
  }).select('id').single();
  if (error) throw new Error(`song "${s.title}": ${error.message}`);
  idMap.set(s.id, data.id);
  console.log(`song ok: ${s.title}`);
}

// 3. Recordings — upload file, then metadata (same order as the app).
const { rows: recs } = await old.query('SELECT * FROM recordings WHERE user_id = $1', [oldUser.id]);
let recOk = 0;
for (const r of recs) {
  const newSongId = idMap.get(r.song_id);
  if (!newSongId) { console.warn(`skip recording ${r.filename}: song not imported`); continue; }
  const file = path.join(process.env.UPLOADS_DIR, r.filename);
  if (!fs.existsSync(file)) { console.warn(`missing file ${file}`); continue; }
  const ext = path.extname(r.filename).slice(1) || 'webm';
  const key = `${tenantId}/${newUser.id}/${newSongId}/take-${Date.parse(r.created_at)}.${ext}`;
  const { error: upErr } = await sb.storage.from('songwriting')
    .upload(key, fs.readFileSync(file), { contentType: r.mime_type, upsert: true });
  if (upErr) { console.warn(`upload failed ${r.filename}: ${upErr.message}`); continue; }
  const { error } = await sb.from('gw_song_recordings').insert({
    tenant_id: tenantId, song_id: newSongId, user_id: newUser.id,
    storage_key: key, mime_type: r.mime_type,
    size_bytes: r.size_bytes ?? 0, duration_ms: r.duration_ms,
    created_at: r.created_at,
  });
  if (error) { console.warn(`meta failed ${r.filename}: ${error.message}`); continue; }
  recOk++;
}
console.log(`DONE: ${idMap.size}/${songs.length} songs, ${recOk}/${recs.length} recordings`);
await old.end();
```

- [ ] **Step 2: Run it on the droplet**

```bash
scp scripts/import-songwriter-songs.mjs root@198.211.113.144:/tmp/
ssh root@198.211.113.144   # then on the droplet, with env vars set from /opt/supabase/.env and the songwriter .env:
node /tmp/import-songwriter-songs.mjs --email kpj64110@gmail.com --tenant <main-tenant-uuid>
```

Expected: `DONE: N/N songs, M/M recordings` matching Task 13 Step 3's counts for that user (recordings may be fewer only for files missing on disk — each is warned individually).

- [ ] **Step 3: Verify in the app** — sign in on gleeworld.org: library lists the imported songs; open one → sections/graveyard/chords intact; takes play. The flatten cron must have made the uploaded objects reachable (uploads via service role land the same way; check one signed URL).

- [ ] **Step 4: Commit the script**

```bash
git add scripts/import-songwriter-songs.mjs
git commit -m "chore(songwriting): one-off import script for kpjsongwriting.com data"
```

---

### Task 15: Freeze old app + flip kpjsongwriting.com to marketing

**Files:** droplet nginx config + one static page; no gleeworld-repo changes.

- [ ] **Step 1: Freeze the old app** — banner + read-only. Simplest freeze: stop accepting writes by stopping the app entirely once Kevin confirms the import (other users were archived in Task 13, and the domain is about to stop pointing at the app):

```bash
ssh root@198.211.113.144 'sudo -u songwriter pm2 stop songwriter && sudo -u songwriter pm2 save'
```

(If a grace period for other users is wanted instead, skip this until the domain flip and let the archive be the record.) **Confirm with Kevin before stopping.**

- [ ] **Step 2: Create the marketing page**

`/var/www/kpjsongwriting/html/index.html` — a single static page: headline "Songwriter is now part of GleeWorld", one paragraph (AI-assisted lyric writing, chord charts, and demo recording now live inside GleeWorld), primary button linking to `https://gleeworld.org`, secondary link `mailto:` for former users wanting their data (it's archived). Style inline, light theme, no external assets.

- [ ] **Step 3: Swap the nginx site**

Edit the `kpjsongwriting.com` server block: replace the `proxy_pass` location with `root /var/www/kpjsongwriting/html; index index.html;` (keep the existing TLS cert lines). Then:

```bash
ssh root@198.211.113.144 'nginx -t && systemctl reload nginx'
```

Expected: `nginx -t` OK; `curl -s https://kpjsongwriting.com | grep GleeWorld` hits the new page. DNS stays grey-cloud.

- [ ] **Step 4: Update memory/docs** — note in the repo (README of the old project or ops notes) that the app is retired, data archived (Task 13 paths), and the domain serves static marketing.

---

## Post-plan open items (not tasks here)

- Stripe price creation + `UPDATE gw_billing_modules SET stripe_price_id=… WHERE id='songwriting'` to flip purchasable.
- All-modules bundle inclusion next time the bundle is touched.
- iOS build bump (app bundles `dist/`) — **ask Kevin before any ASC upload**.
- Individual-user (Personal plan) songwriting + import of the parked users' archive.
