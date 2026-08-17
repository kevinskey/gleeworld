# Music Library Limits (Personal Annotations · CPDL Save · Offline Vault) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the three remaining Music Library v1 limits: annotations persist on personal (My Music) scores, CPDL works can be saved to My Music with a cached PDF, and saved scores are viewable offline/logged-out at `/my-music`.

**Architecture:** A new user-scoped `gw_personal_score_annotations` table (no tenant_id — personal data follows the person) plus id-routing inside `useSheetMusicAnnotations` so every existing viewer surface works unchanged; a `target: 'personal'` mode in the `pd-add-to-library` edge function that copies the shared pd-cache PDF into the caller's private `personal-scores` folder; and a raw-IndexedDB vault (`files` + `manifest` stores) behind a `useOfflineVault` hook, surfaced as save-to-device actions in My Music and a public `/my-music` route.

**Tech Stack:** Vite 7 + React 18 + TS, shadcn, @tanstack/react-query 5, Supabase (self-hosted), Deno edge functions, vitest 4 (node default env, `// @vitest-environment jsdom` docblock for component tests), raw IndexedDB + `fake-indexeddb` (dev only).

**Spec:** `docs/superpowers/specs/2026-07-12-personal-music-library-design.md` (phases 3–4 + the annotations follow-up ledgered in PR #142). Phase 2 of that spec (publisher store + watermarking) already shipped in evolved form via the Partner Marketplace (`partner-webhook`, `partner-watermark`, `partner-download-url`) — no task here re-implements it.

**Deliberate deviations from the spec** (report these in the PR body):
1. Raw IndexedDB instead of the `idb` library — repo convention (see `src/lib/studio/engine/exportRender.ts`, `packages/design-studio/src/lib/fabric/fontPathCache.ts`); no new runtime dependency.
2. Offline annotation **sync** is cut from v1: `/my-music` is view-only offline. Annotations require being signed in (they save server-side).
3. CPDL personal saves **copy** the cached PDF into `personal-scores/<uid>/cpdl/<pd_work_id>.pdf` rather than pointing at the shared `pd-cache/` object — keeps the viewer, bucket RLS, and the vault on one uniform path (`gw_personal_scores.storage_path` always means "object in personal-scores").
4. Annotation **layers** stay tenant-only (the layers table is tenant-fenced); personal-score annotations are always ungrouped. Layer UI is hidden for personal scores.

## Global Constraints

- Worktree: `/private/tmp/claude-501/-Users-kevinjohnson/2ca71cd2-becc-4f08-974d-63046415a2c6/scratchpad/gw-music-limits`, branch `fix/music-library-limits` off `origin/main` (296546d50). `node_modules` already installed. If reinstalling: `npm ci --legacy-peer-deps --no-audit --no-fund` (plain `npm ci` fails on a pdfjs-dist peer conflict). Never pipe npm through `tail` — check `$?`.
- vitest default environment is **node**; every component test file MUST start with `// @vitest-environment jsdom` on line 1.
- `gw_personal_scores` and everything hanging off it deliberately has **NO tenant_id** — document the exception in the migration header comment (RLS audit sweeps look for that).
- Personal viewer ids use the `personal:` prefix via `src/lib/viewerScoreId.ts` (`toViewerScoreId`, `isPersonalScoreId`, `toTableId`). `src/lib/viewer/scoreIds.ts` (`p_` prefix) is dead code with zero importers.
- `gw_personal_scores` is not in the generated Supabase types — use the `(supabase as any).from('gw_personal_score_annotations')` cast pattern (matches `usePersonalScores.ts`).
- Service-worker caching is banned (`public/sw.js` is a self-uninstall stub). Offline = IndexedDB only; the SPA shell itself still needs network on a cold load — that is accepted.
- No new user-visible copy may hardcode a tenant name; say "students" not "singers"; never "alumnae/alumni".
- After writes on tables where RESTRICTIVE policies can silently match 0 rows, always `.select()` and treat empty as failure.
- Migrations deploy via `psql --single-transaction` as `-U supabase_admin` on the droplet (`ssh root@198.211.113.144`, container `supabase-db`); the self-hosted DB has no schema_migrations table — verify by object inspection.
- Edge functions deploy by copying into `/opt/supabase/volumes/functions/<name>/` on the droplet; Deno relative imports need explicit `.ts`.
- Frontend deploys only via `scripts/deploy-frontend.sh` (never hand-rolled `rsync --delete`).
- Existing test baseline: `npx vitest run` has pre-existing failures on main. Capture the baseline BEFORE the first change (Task 1 Step 0) and compare at the end — zero NEW failures allowed.

---

### Task 1: Migration — `gw_personal_score_annotations`

**Files:**
- Create: `supabase/migrations/20260817120000_personal_score_annotations.sql`
- Create: `supabase/migrations/tests/personal_score_annotations_test.sql`

**Interfaces:**
- Produces: table `public.gw_personal_score_annotations` with columns `id uuid PK`, `personal_score_id uuid NOT NULL FK → gw_personal_scores(id) ON DELETE CASCADE`, `user_id uuid NOT NULL DEFAULT auth.uid() FK → auth.users(id) ON DELETE CASCADE`, `page_number int NOT NULL`, `annotation_type text CHECK IN ('drawing','highlight','text_note','stamp')`, `annotation_data jsonb NOT NULL`, `position_data jsonb NOT NULL`, `created_at/updated_at timestamptz`. Owner-only RLS. Tasks 2+ depend on these exact column names.

- [ ] **Step 0: Capture the vitest baseline (untouched worktree)**

```bash
cd /private/tmp/claude-501/-Users-kevinjohnson/2ca71cd2-becc-4f08-974d-63046415a2c6/scratchpad/gw-music-limits
npx vitest run 2>&1 | tail -8 > /tmp/vitest-baseline.txt; cat /tmp/vitest-baseline.txt
```

Record the failed-suite/failed-test counts; they are the comparison target for Task 9.

- [ ] **Step 1: Write the migration**

`supabase/migrations/20260817120000_personal_score_annotations.sql`:

```sql
-- Annotations for personal (My Music) scores.
--
-- gw_sheet_music_annotations FKs gw_sheet_music, so personal scores
-- (gw_personal_scores) could never persist markup — the viewer hid or
-- errored on the affordance. This table is the personal-side twin.
--
-- MULTI-TENANT AUDIT NOTE: like gw_personal_scores itself, this table
-- deliberately has NO tenant_id and NO tenant isolation policy. A personal
-- library follows the person across tenants; every row is reachable only
-- by its owner via auth.uid(). This is the documented exception pattern
-- (see 20260712120000_personal_music_library.sql and the all-clear in
-- 20260808110000_close_two_confirmed_rls_holes.sql).
--
-- No layers: gw_sheet_music_annotation_layers is tenant-fenced, so
-- personal annotations are always "ungrouped" (viewer treats null layer
-- as always-visible).

CREATE TABLE IF NOT EXISTS public.gw_personal_score_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_score_id uuid NOT NULL
    REFERENCES public.gw_personal_scores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  page_number integer NOT NULL,
  annotation_type text NOT NULL
    CHECK (annotation_type IN ('drawing','highlight','text_note','stamp')),
  annotation_data jsonb NOT NULL,
  position_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_personal_score_annotations_score_page_idx
  ON public.gw_personal_score_annotations (personal_score_id, page_number);

ALTER TABLE public.gw_personal_score_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY gw_personal_score_annotations_select
  ON public.gw_personal_score_annotations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY gw_personal_score_annotations_insert
  ON public.gw_personal_score_annotations FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.gw_personal_scores s
      WHERE s.id = personal_score_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY gw_personal_score_annotations_update
  ON public.gw_personal_score_annotations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY gw_personal_score_annotations_delete
  ON public.gw_personal_score_annotations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: Write the migration assert test**

`supabase/migrations/tests/personal_score_annotations_test.sql` (harness pattern copied from `tests/personal_music_library_test.sql`: `BEGIN;` … one `DO $$ … ASSERT … $$;` … `ROLLBACK;`):

```sql
-- supabase/migrations/tests/personal_score_annotations_test.sql
-- Run against a DB with 20260817120000_personal_score_annotations.sql applied.
BEGIN;
DO $$
BEGIN
  ASSERT (SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'gw_personal_score_annotations'
  )), 'table gw_personal_score_annotations missing';

  ASSERT (SELECT relrowsecurity FROM pg_class
    WHERE oid = 'public.gw_personal_score_annotations'::regclass),
    'RLS not enabled';

  -- Deliberately tenantless — the audit exception must hold structurally.
  ASSERT NOT (SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gw_personal_score_annotations'
      AND column_name = 'tenant_id'
  )), 'tenant_id must NOT exist on gw_personal_score_annotations';

  ASSERT (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'gw_personal_score_annotations'
      AND policyname LIKE 'gw_personal_score_annotations_%') = 4,
    'expected exactly 4 owner policies';

  ASSERT (SELECT EXISTS (
    SELECT 1 FROM information_schema.check_constraints cc
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = cc.constraint_name
    WHERE ccu.table_name = 'gw_personal_score_annotations'
      AND ccu.column_name = 'annotation_type'
  )), 'annotation_type CHECK missing';

  ASSERT (SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'gw_personal_score_annotations'
      AND indexname = 'gw_personal_score_annotations_score_page_idx'
  )), 'score+page index missing';
END $$;
ROLLBACK;
```

- [ ] **Step 3: Syntax-check both files against a scratch transaction locally**

There is no local DB; validate SQL syntax by running both through the prod container **inside a rolled-back transaction** (read-only safe — the migration file is wrapped so nothing commits):

```bash
ssh root@198.211.113.144 "docker exec -i supabase-db psql -U supabase_admin -v ON_ERROR_STOP=1 -c 'BEGIN;' -f - -c 'ROLLBACK;'" < supabase/migrations/20260817120000_personal_score_annotations.sql
```

Expected: no errors (CREATE TABLE / CREATE POLICY output, then rollback discards it). If the one-liner's flag ordering fights you, use: `(echo 'BEGIN;'; cat <file>; echo 'ROLLBACK;') | ssh root@198.211.113.144 "docker exec -i supabase-db psql -U supabase_admin -v ON_ERROR_STOP=1"`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260817120000_personal_score_annotations.sql supabase/migrations/tests/personal_score_annotations_test.sql
git commit -m "feat(my-music): gw_personal_score_annotations table (user-scoped, tenantless by design)"
```

---

### Task 2: Route `useSheetMusicAnnotations` by score-id shape

**Files:**
- Modify: `src/hooks/useSheetMusicAnnotations.ts`
- Test: `src/hooks/useSheetMusicAnnotations.test.ts` (create)

**Interfaces:**
- Consumes: `isPersonalScoreId`, `toTableId` from `@/lib/viewerScoreId`; Task 1's table/columns.
- Produces: the hook's public API is UNCHANGED — `{ annotations, loading, fetchAnnotations, saveAnnotation, updateAnnotation, deleteAnnotation, clearPageAnnotations }`, same signatures. Callers keep passing the viewer id (`personal:<uuid>` or bare uuid); rows returned for personal scores carry `sheet_music_id` = the passed viewer id so render code is untouched.

Routing rules:
- `fetchAnnotations(musicId, page?)`, `saveAnnotation(musicId, …)`, `clearPageAnnotations(musicId, page)` route on their `musicId` argument.
- `updateAnnotation` / `deleteAnnotation` only receive an annotation id → route on the hook's `sheetMusicId` constructor param (PDFViewerWithAnnotations constructs the hook with the same id it passes everywhere; the param is currently unused — this gives it a job).
- Personal branch: table `gw_personal_score_annotations`, id column `personal_score_id`, id value `toTableId(musicId)`, **skip** the `log_sheet_music_analytics` RPC (it FKs gw_sheet_music), never send `annotation_layer_id` (drop it; column doesn't exist on the personal table).

- [ ] **Step 1: Write the failing test**

`src/hooks/useSheetMusicAnnotations.test.ts` (`renderHook` needs a DOM — jsdom docblock required):

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const calls: Array<{ table: string; op: string; args: unknown }> = [];
const rpcMock = vi.fn(async () => ({ data: null, error: null }));

function chain(table: string) {
  const self: any = {
    select: vi.fn(() => self),
    insert: vi.fn((payload: unknown) => {
      calls.push({ table, op: 'insert', args: payload });
      return Promise.resolve({ error: null });
    }),
    eq: vi.fn((col: string, val: unknown) => {
      calls.push({ table, op: `eq:${col}`, args: val });
      return self;
    }),
    order: vi.fn(() => Promise.resolve({ data: [], error: null })),
  };
  return self;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn((t: string) => chain(t)), rpc: (...a: unknown[]) => rpcMock(...a) },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useSheetMusicAnnotations } from './useSheetMusicAnnotations';

beforeEach(() => { calls.length = 0; rpcMock.mockClear(); });

describe('useSheetMusicAnnotations personal routing', () => {
  it('fetches personal annotations from gw_personal_score_annotations with the bare uuid', async () => {
    const { result } = renderHook(() => useSheetMusicAnnotations('personal:abc-123'));
    await act(() => result.current.fetchAnnotations('personal:abc-123'));
    expect(calls).toContainEqual({ table: 'gw_personal_score_annotations', op: 'eq:personal_score_id', args: 'abc-123' });
    expect(calls.some((c) => c.table === 'gw_sheet_music_annotations')).toBe(false);
  });

  it('fetches tenant annotations from gw_sheet_music_annotations unchanged', async () => {
    const { result } = renderHook(() => useSheetMusicAnnotations('score-9'));
    await act(() => result.current.fetchAnnotations('score-9'));
    expect(calls).toContainEqual({ table: 'gw_sheet_music_annotations', op: 'eq:sheet_music_id', args: 'score-9' });
  });

  it('saves personal annotations without layer id and without the analytics RPC', async () => {
    const { result } = renderHook(() => useSheetMusicAnnotations('personal:abc-123'));
    await act(async () => {
      await result.current.saveAnnotation('personal:abc-123', 2, 'drawing', { paths: [] }, { x: 0, y: 0 }, 'layer-7');
    });
    const ins = calls.find((c) => c.op === 'insert');
    expect(ins?.table).toBe('gw_personal_score_annotations');
    expect(ins?.args).toMatchObject({ personal_score_id: 'abc-123', user_id: 'user-1', page_number: 2 });
    expect((ins?.args as Record<string, unknown>)).not.toHaveProperty('annotation_layer_id');
    expect((ins?.args as Record<string, unknown>)).not.toHaveProperty('sheet_music_id');
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('saves tenant annotations with layer id and fires the analytics RPC', async () => {
    const { result } = renderHook(() => useSheetMusicAnnotations('score-9'));
    await act(async () => {
      await result.current.saveAnnotation('score-9', 1, 'drawing', {}, { x: 0, y: 0 }, 'layer-7');
    });
    const ins = calls.find((c) => c.op === 'insert');
    expect(ins?.table).toBe('gw_sheet_music_annotations');
    expect(ins?.args).toMatchObject({ sheet_music_id: 'score-9', annotation_layer_id: 'layer-7' });
    expect(rpcMock).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run it — must fail**

Run: `npx vitest run src/hooks/useSheetMusicAnnotations.test.ts`
Expected: the two personal-routing tests FAIL (insert goes to `gw_sheet_music_annotations` with the prefixed id today).

- [ ] **Step 3: Implement the routing**

In `src/hooks/useSheetMusicAnnotations.ts`, add at the top:

```ts
import { isPersonalScoreId, toTableId } from '@/lib/viewerScoreId';

// gw_personal_score_annotations is the personal-score twin of
// gw_sheet_music_annotations (that one FKs gw_sheet_music). Both are
// addressed here through the viewer id: `personal:`-prefixed ids route to
// the personal table with the bare uuid; anything else is a tenant score.
const routeFor = (musicId: string) =>
  isPersonalScoreId(musicId)
    ? { table: 'gw_personal_score_annotations', idColumn: 'personal_score_id', idValue: toTableId(musicId), personal: true as const }
    : { table: 'gw_sheet_music_annotations', idColumn: 'sheet_music_id', idValue: musicId, personal: false as const };
```

Then in each operation (the personal table is absent from generated types, so route through `(supabase as any).from(route.table)` — same cast pattern as `usePersonalScores.ts`):
- `fetchAnnotations`: build the query with `.eq(route.idColumn, route.idValue)`; map results so callers see the id they asked with: `setAnnotations((data || []).map((r: any) => route.personal ? { ...r, sheet_music_id: musicId, annotation_layer_id: null } : r) as Annotation[]);`
- `saveAnnotation`: insert `{ [route.idColumn]: route.idValue, user_id, page_number, annotation_type, annotation_data, position_data }` and only spread `annotation_layer_id: annotationLayerId ?? null` when `!route.personal`; guard the analytics RPC with `if (!route.personal) { await supabase.rpc('log_sheet_music_analytics', …); }`
- `clearPageAnnotations`: same `.eq(route.idColumn, route.idValue)` swap.
- `updateAnnotation` / `deleteAnnotation`: compute `const route = routeFor(sheetMusicId ?? '');` from the hook param (falls back to the tenant table when the param is empty, which preserves today's behavior for legacy callers that never passed it).

- [ ] **Step 4: Run the test file — all green; then the hook's neighbors**

Run: `npx vitest run src/hooks/useSheetMusicAnnotations.test.ts src/components/music-library/MyMusicTab.test.tsx src/components/music-library/my-music/MyMusicCard.test.tsx src/lib/__tests__/viewerScoreId.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSheetMusicAnnotations.ts src/hooks/useSheetMusicAnnotations.test.ts
git commit -m "feat(my-music): annotations persist on personal scores via id-routed hook"
```

---

### Task 3: Viewer + My Music wiring for personal annotations

**Files:**
- Modify: `src/components/PDFViewerWithAnnotations.tsx` (lines ~131–148, ~2320–2333)
- Modify: `src/components/viewer/ViewerReader.tsx` (BookmarksMenu ~627, JumpsOverlay ~818, RearrangePagesDialog ~971)
- Modify: `src/components/music-library/MyMusicTab.tsx` (`openScore` ~L174, comment L34–38)
- Modify: `src/lib/viewerScoreId.ts` (header comment lines 14–18)
- Delete: `src/lib/viewer/scoreIds.ts` (dead duplicate with a conflicting `p_` prefix, zero importers)

**Interfaces:**
- Consumes: Task 2's routed hook; `isPersonalScoreId` from `@/lib/viewerScoreId`; `toViewerScoreId` for MyMusicTab.
- Produces: annotate works on personal scores in the full viewer, half-page mode, AND the My Music quick-view dialog; tenant-only affordances (bookmarks, jumps, page-rearrange, layers, audio/tracks) are hidden for personal ids instead of 400-erroring.

- [ ] **Step 1: Gate tenant-only data hooks in PDFViewerWithAnnotations**

At the top of the component body (near line 131):

```ts
const isPersonal = isPersonalScoreId(musicId);
// Layers, audio, tracks and bookmarks all FK gw_sheet_music — feed them
// undefined for personal scores so their queries never fire.
const tenantMusicId = isPersonal ? undefined : musicId;
```

Then change:
- `useAnnotationLayers(musicId)` → `useAnnotationLayers(tenantMusicId)` (line ~140)
- `useSheetMusicAudio(musicId)` / `useSheetMusicTracks(musicId)` → pass `tenantMusicId` (lines ~146–147)
- `{musicId && (<BookmarksMenu sheetMusicId={musicId} …/>)}` (line ~2328) → `{tenantMusicId && (<BookmarksMenu sheetMusicId={tenantMusicId} …/>)}`
- Any layer-picker/add-layer UI: render only when `!isPersonal` (search the file for `addLayer` / `annotationLayers` render sites; annotations save with `currentLayerId` — force it to `null` when `isPersonal` before it reaches `saveAnnotation`).

Import `isPersonalScoreId` from `@/lib/viewerScoreId`.

- [ ] **Step 2: Gate tenant-only overlays in ViewerReader**

In `src/components/viewer/ViewerReader.tsx` (it already imports `isPersonalScoreId` at line 21): compute once near the top `const personalScore = isPersonalScoreId(scoreId);` then:
- BookmarksMenu call site (~627): render only when `!personalScore`.
- `JumpsOverlay` (~818): render only when `!personalScore` (its `useSheetMusicJumps` hits a gw_sheet_music-FK'd table).
- `RearrangePagesDialog` (~971) and whatever menu item opens it: render only when `!personalScore` (`useSheetMusicPageOrder` is tenant-backed).
- Do NOT gate `HalfPageView` — it uses `useSheetMusicAnnotations`, which Task 2 routes correctly.

- [ ] **Step 3: Let My Music quick-view annotate**

In `src/components/music-library/MyMusicTab.tsx`:
- `openScore` (~L174): change `setViewing({ title: s.title, pdfUrl: url })` → `setViewing({ id: toViewerScoreId(s.id, true), title: s.title, pdfUrl: url })` and add the import `import { toViewerScoreId } from '@/lib/viewerScoreId';`
- Rewrite the L34–38 comment: the id is now passed because annotations route to `gw_personal_score_annotations`; audio/bookmarks affordances stay hidden by the viewer's own `isPersonalScoreId` gates.

- [ ] **Step 4: Update the constraint comment + delete dead module**

- `src/lib/viewerScoreId.ts` lines 14–18: replace the "cannot carry annotations or linked audio" paragraph with: annotations now route to `gw_personal_score_annotations` (see `useSheetMusicAnnotations`); audio, bookmarks, jumps, page-order and layers remain tenant-only and are hidden via `isPersonalScoreId()`.
- `git rm src/lib/viewer/scoreIds.ts` (zero importers; conflicting `p_` prefix is a foot-gun).

- [ ] **Step 5: Typecheck + affected tests**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | tail -20` (ignore pre-existing baseline errors in audio libs — compare against a pre-change run if unsure) and `npx vitest run src/components/music-library src/hooks/useSheetMusicAnnotations.test.ts src/lib/__tests__/viewerScoreId.test.ts`
Expected: no NEW type errors; tests PASS.

- [ ] **Step 6: Commit**

```bash
git add -A src/components/PDFViewerWithAnnotations.tsx src/components/viewer/ViewerReader.tsx src/components/music-library/MyMusicTab.tsx src/lib/viewerScoreId.ts src/lib/viewer
git commit -m "feat(viewer): personal scores annotate everywhere; tenant-only affordances hidden not erroring"
```

---

### Task 4: `pd-add-to-library` gains `target: 'personal'`

**Files:**
- Modify: `supabase/functions/pd-add-to-library/index.ts`

**Interfaces:**
- Consumes: existing cache flow (bucket `sheet-music`, key `pd-cache/{source}/{source_id}{ext}`, `STORAGE_BUCKET`/`STORAGE_PREFIX` consts, `adminSupabase` service-role client, `supabase` JWT-scoped client).
- Produces: request body `{ pd_work_id: string, target?: 'tenant' | 'personal' }` (default `'tenant'`, existing behavior byte-identical). Personal success response: `{ ok: true, already_in_my_music: boolean, personal_score_id: string, title: string, cached: boolean }`. New error code: `no_cached_pdf` (502). Task 5's UI consumes exactly these fields.

- [ ] **Step 1: Parse the target + resolve the caller's user id**

Extend the body type and parsing (near L102):

```ts
interface ReqBody { pd_work_id?: string; target?: 'tenant' | 'personal' }
// …
const target: 'tenant' | 'personal' = body.target === 'personal' ? 'personal' : 'tenant';
```

Right after the JWT is validated (reuse the existing auth section — if it already calls `supabase.auth.getUser(jwt)`, reuse that result; do not fetch twice):

```ts
const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
const userId = userData?.user?.id ?? null;
if (target === 'personal' && (!userId || userErr)) {
  return new Response(JSON.stringify({ error: 'unauthorized' }), {
    status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

- [ ] **Step 2: Insert the personal branch after the cache-ensure block (after `publicUrl` is settled, before the tenant insert)**

```ts
if (target === 'personal') {
  // Personal saves need a real cached object to copy.
  if (!storageKey) {
    return new Response(JSON.stringify({ error: 'no_cached_pdf' }), {
      status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Re-save: RLS scopes this select to the caller's own rows.
  const { data: mine } = await supabase
    .from('gw_personal_scores')
    .select('id, storage_path')
    .eq('pd_work_id', work.id)
    .maybeSingle();

  if (mine?.storage_path) {
    return new Response(JSON.stringify({
      ok: true, already_in_my_music: true, personal_score_id: mine.id,
      title: work.title, cached: true,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Copy the shared pd-cache object into the caller's private folder so
  // gw_personal_scores.storage_path always means "object in personal-scores"
  // (viewer, RLS and the offline vault all assume that).
  const { data: pdfBlob, error: dlErr } = await adminSupabase.storage
    .from(STORAGE_BUCKET).download(storageKey);
  if (dlErr || !pdfBlob) throw new Error(`pd-cache download: ${dlErr?.message ?? 'empty'}`);

  const personalPath = `${userId}/cpdl/${work.id}.pdf`;
  const { error: upErr } = await adminSupabase.storage
    .from('personal-scores')
    .upload(personalPath, pdfBlob, { contentType: 'application/pdf', upsert: true });
  if (upErr) throw new Error(`personal upload: ${upErr.message}`);

  if (mine) {
    // Upgrade a metadata-only row (saved earlier via Repertoire search).
    const { data: upd, error: updErr } = await supabase
      .from('gw_personal_scores')
      .update({ storage_path: personalPath })
      .eq('id', mine.id)
      .select('id')
      .maybeSingle();
    if (updErr || !upd) throw new Error(`personal upgrade: ${updErr?.message ?? 'no row updated'}`);
    return new Response(JSON.stringify({
      ok: true, already_in_my_music: true, personal_score_id: mine.id,
      title: work.title, cached: Boolean(work.storage_key),
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { data: insertedPersonal, error: insPErr } = await supabase
    .from('gw_personal_scores')
    .insert({
      user_id: userId,
      title: work.title,
      composer: work.composer,
      voicing: work.voicing,
      source: 'cpdl',
      pd_work_id: work.id,
      storage_path: personalPath,
      external_url: work.source_page_url,
    })
    .select('id')
    .single();
  if (insPErr) {
    if ((insPErr as { code?: string }).code === '23505') {
      return new Response(JSON.stringify({
        ok: true, already_in_my_music: true, personal_score_id: null,
        title: work.title, cached: true,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    throw new Error(`personal insert: ${insPErr.message}`);
  }

  return new Response(JSON.stringify({
    ok: true, already_in_my_music: false, personal_score_id: insertedPersonal.id,
    title: work.title, cached: Boolean(work.storage_key),
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
```

Notes for the implementer: `work`, `storageKey`, `STORAGE_BUCKET`, `adminSupabase`, `corsHeaders` all already exist in scope at that point (see current L128–213). The tenant path below the new branch must remain byte-identical.

- [ ] **Step 3: Deno syntax check**

Run: `deno check supabase/functions/pd-add-to-library/index.ts 2>&1 | tail -5` (if `deno` is unavailable locally, `npx tsc --noEmit` will not cover this file — fall back to `node --input-type=module -e "0"` plus careful re-read, and rely on the deploy-time check in Task 10).
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/pd-add-to-library/index.ts
git commit -m "feat(pd): pd-add-to-library target:'personal' copies cached PDF into My Music"
```

---

### Task 5: "Save to My Music" button on Public Domain results

**Files:**
- Modify: `src/components/music-library/PublicDomainSearch.tsx` (PdResultCard, L187–286)
- Test: `src/components/music-library/PublicDomainSearch.test.tsx` (create)

**Interfaces:**
- Consumes: Task 4's request/response contract; `supabase.functions.invoke('pd-add-to-library', { body })`; sonner toasts; react-query `useQueryClient`.
- Produces: every signed-in user sees a second button, "Save to My Music", on each CPDL result card. The existing tenant "Add to library" button is untouched.

- [ ] **Step 1: Write the failing test**

`src/components/music-library/PublicDomainSearch.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render as rtlRender, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';

const invokeMock = vi.fn(async () => ({ data: { ok: true, already_in_my_music: false, personal_score_id: 'ps-1', title: 'Sicut Cervus', cached: true }, error: null }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(async () => ({
      data: [{
        id: 'pd-1', source: 'cpdl', source_id: '123', title: 'Sicut Cervus',
        composer: 'Palestrina', voicing: 'SATB', language: 'Latin',
        source_page_url: 'https://cpdl.org/x', license_type: 'public_domain',
        attribution: null, has_cached_pdf: true, rank: 1,
      }],
      error: null,
    })),
    functions: { invoke: (...a: unknown[]) => invokeMock(...a) },
  },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { PublicDomainSearch } from './PublicDomainSearch';

const render = (ui: ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('PublicDomainSearch — Save to My Music', () => {
  it('saves a result to My Music via the personal target', async () => {
    render(<PublicDomainSearch />);
    const input = screen.queryByRole('searchbox') ?? screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: 'sicut' } });
    const saveBtn = await screen.findByRole('button', { name: /save to my music/i }, { timeout: 3000 });
    fireEvent.click(saveBtn);
    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith('pd-add-to-library', {
      body: { pd_work_id: 'pd-1', target: 'personal' },
    }));
    await screen.findByRole('button', { name: /saved/i });
  });
});
```

(If the search input has no `role="searchbox"`, use whatever accessible query matches the actual input — adjust while keeping the assertion intact. The 300 ms debounce means `findByRole` needs the generous timeout.)

- [ ] **Step 2: Run it — must fail**

Run: `npx vitest run src/components/music-library/PublicDomainSearch.test.tsx`
Expected: FAIL — no "Save to My Music" button exists.

- [ ] **Step 3: Implement the button**

In `PdResultCard` (mirror the existing `adding`/`added` state pair):

```tsx
const [saving, setSaving] = useState(false);
const [saved, setSaved] = useState(false);

const handleSaveToMyMusic = async () => {
  setSaving(true);
  try {
    const { data, error } = await supabase.functions.invoke('pd-add-to-library', {
      body: { pd_work_id: row.id, target: 'personal' },
    });
    if (error) throw error;
    if (data?.already_in_my_music) {
      toast.success('Already in My Music', { description: `"${row.title}" is in your personal library.` });
    } else {
      toast.success('Saved to My Music', { description: `"${row.title}" is in your personal library — open it from the My Music tab.` });
    }
    setSaved(true);
    queryClient.invalidateQueries({ queryKey: ['personal-scores'] });
  } catch (e: unknown) {
    toast.error('Could not save to My Music', {
      description: e instanceof Error ? e.message : 'Try again, or contact support if it persists.',
    });
  } finally {
    setSaving(false);
  }
};
```

Button, directly under the existing "Add to library" button in the right-hand column (same sizing conventions):

```tsx
<Button
  size="sm"
  variant="outline"
  onClick={handleSaveToMyMusic}
  disabled={saving || saved}
  className="h-8 text-xs"
>
  {saving ? (
    <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Saving…</>
  ) : saved ? (
    <><Check className="w-3.5 h-3.5 mr-1" /> Saved</>
  ) : (
    <><Download className="w-3.5 h-3.5 mr-1" /> Save to My Music</>
  )}
</Button>
```

Add `Download` to the existing `lucide-react` import.

- [ ] **Step 4: Run the test — green**

Run: `npx vitest run src/components/music-library/PublicDomainSearch.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/music-library/PublicDomainSearch.tsx src/components/music-library/PublicDomainSearch.test.tsx
git commit -m "feat(pd): Save to My Music button on Public Domain results"
```

---

### Task 6: Offline vault library

**Files:**
- Create: `src/lib/offlineVault.ts`
- Test: `src/lib/offlineVault.test.ts` (create)
- Modify: `package.json` (add `fake-indexeddb` devDependency)

**Interfaces:**
- Consumes: `PersonalScore` type from `@/hooks/usePersonalScores`.
- Produces (Tasks 7–8 rely on these exact signatures):

```ts
export interface VaultEntry {
  id: string;            // gw_personal_scores.id (bare uuid)
  title: string;
  composer: string | null;
  voicing: string | null;
  source: PersonalScore['source'];
  size: number;          // blob bytes
  savedAt: string;       // ISO timestamp
}
export function isVaultSupported(): boolean;
export async function saveToVault(score: PersonalScore, blob: Blob): Promise<void>;
export async function removeFromVault(id: string): Promise<void>;
export async function listVault(): Promise<VaultEntry[]>;   // verifies blob presence; prunes manifest orphans
export async function getVaultBlob(id: string): Promise<Blob | null>;
export async function vaultUsage(): Promise<{ count: number; bytes: number }>;
export async function requestPersistence(): Promise<boolean>; // navigator.storage.persist(), best-effort
```

- [ ] **Step 1: Add the dev dependency**

```bash
npm i -D fake-indexeddb --legacy-peer-deps --no-audit --no-fund
```

- [ ] **Step 2: Write the failing test**

`src/lib/offlineVault.test.ts`:

```ts
// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { saveToVault, removeFromVault, listVault, getVaultBlob, vaultUsage, isVaultSupported } from './offlineVault';
import type { PersonalScore } from '@/hooks/usePersonalScores';

const score = (over: Partial<PersonalScore> = {}): PersonalScore => ({
  id: 's1', user_id: 'u1', title: 'Ave Verum', composer: 'Byrd', voicing: 'SATB',
  source: 'upload', pd_work_id: null, entitlement_id: null,
  storage_path: 'u1/uploads/x.pdf', thumbnail_path: null, ext_catalog_item_id: null,
  external_url: null, tags: [], is_favorite: false, created_at: '2026-08-17T00:00:00Z',
  ...over,
});

beforeEach(async () => {
  for (const e of await listVault()) await removeFromVault(e.id);
});

describe('offlineVault', () => {
  it('is supported under fake-indexeddb', () => {
    expect(isVaultSupported()).toBe(true);
  });

  it('round-trips a score blob', async () => {
    const blob = new Blob(['%PDF-fake'], { type: 'application/pdf' });
    await saveToVault(score(), blob);
    const entries = await listVault();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ id: 's1', title: 'Ave Verum', source: 'upload' });
    const back = await getVaultBlob('s1');
    expect(back).not.toBeNull();
    expect(await back!.text()).toBe('%PDF-fake');
  });

  it('reports usage and removes cleanly', async () => {
    await saveToVault(score(), new Blob(['12345']));
    const { count, bytes } = await vaultUsage();
    expect(count).toBe(1);
    expect(bytes).toBeGreaterThan(0);
    await removeFromVault('s1');
    expect(await listVault()).toHaveLength(0);
    expect(await getVaultBlob('s1')).toBeNull();
  });

  it('prunes manifest entries whose blob is missing', async () => {
    await saveToVault(score(), new Blob(['x']));
    // simulate a partially-evicted vault: delete the blob record directly
    const req = indexedDB.open('gw-offline-vault');
    const db: IDBDatabase = await new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
    await new Promise<void>((res, rej) => {
      const tx = db.transaction('files', 'readwrite');
      tx.objectStore('files').delete('s1');
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
    });
    db.close();
    expect(await listVault()).toHaveLength(0); // manifest orphan pruned, not shown
  });
});
```

- [ ] **Step 3: Run it — must fail**

Run: `npx vitest run src/lib/offlineVault.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 4: Implement `src/lib/offlineVault.ts`**

Follow the repo's raw-IDB pattern (module-level cached `dbPromise`, promise-wrapped `indexedDB.open`, `typeof indexedDB === 'undefined'` guard — see `src/lib/studio/engine/exportRender.ts:505`):

```ts
// Offline vault for My Music: PDFs saved to THIS DEVICE so they open with
// no network and no sign-in (/my-music). Raw IndexedDB on purpose — the
// repo bans service-worker caching (public/sw.js is a self-uninstall stub)
// and avoids wrapper libs (see exportRender.ts, fontPathCache.ts).
//
// Two stores keyed by gw_personal_scores.id:
//   files    — { blob }                 (the PDF bytes)
//   manifest — VaultEntry               (list/render metadata)
// listVault() only reports entries whose blob is actually present, and
// prunes manifest orphans — "Saved" must never lie about offline readiness.
import type { PersonalScore } from '@/hooks/usePersonalScores';

const DB_NAME = 'gw-offline-vault';
const DB_VERSION = 1;
const FILES = 'files';
const MANIFEST = 'manifest';

export interface VaultEntry {
  id: string;
  title: string;
  composer: string | null;
  voicing: string | null;
  source: PersonalScore['source'];
  size: number;
  savedAt: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function isVaultSupported(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openVaultDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES);
      if (!db.objectStoreNames.contains(MANIFEST)) db.createObjectStore(MANIFEST);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

function tx<T>(storeNames: string[], mode: IDBTransactionMode, run: (t: IDBTransaction) => IDBRequest<T> | void): Promise<T> {
  return openVaultDb().then((db) => new Promise<T>((resolve, reject) => {
    const t = db.transaction(storeNames, mode);
    let out: IDBRequest<T> | void;
    t.oncomplete = () => resolve(out ? (out as IDBRequest<T>).result : (undefined as T));
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
    out = run(t);
  }));
}

export async function saveToVault(score: PersonalScore, blob: Blob): Promise<void> {
  const entry: VaultEntry = {
    id: score.id,
    title: score.title,
    composer: score.composer,
    voicing: score.voicing,
    source: score.source,
    size: blob.size,
    savedAt: new Date().toISOString(),
  };
  await tx([FILES, MANIFEST], 'readwrite', (t) => {
    t.objectStore(FILES).put({ blob }, score.id);
    t.objectStore(MANIFEST).put(entry, score.id);
  });
}

export async function removeFromVault(id: string): Promise<void> {
  await tx([FILES, MANIFEST], 'readwrite', (t) => {
    t.objectStore(FILES).delete(id);
    t.objectStore(MANIFEST).delete(id);
  });
}

export async function getVaultBlob(id: string): Promise<Blob | null> {
  const rec = await tx<{ blob: Blob } | undefined>([FILES], 'readonly', (t) => t.objectStore(FILES).get(id));
  return rec?.blob ?? null;
}

export async function listVault(): Promise<VaultEntry[]> {
  if (!isVaultSupported()) return [];
  const entries = await tx<VaultEntry[]>([MANIFEST], 'readonly', (t) => t.objectStore(MANIFEST).getAll());
  const fileKeys = await tx<IDBValidKey[]>([FILES], 'readonly', (t) => t.objectStore(FILES).getAllKeys());
  const present = new Set(fileKeys.map(String));
  const ok: VaultEntry[] = [];
  const orphans: string[] = [];
  for (const e of entries) {
    if (present.has(e.id)) ok.push(e);
    else orphans.push(e.id);
  }
  for (const id of orphans) await removeFromVault(id);
  return ok.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function vaultUsage(): Promise<{ count: number; bytes: number }> {
  const entries = await listVault();
  return { count: entries.length, bytes: entries.reduce((n, e) => n + e.size, 0) };
}

export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch { /* best-effort */ }
  return false;
}
```

(The `orphans` line above is deliberately explicit in the plan; implementer may write it as a plain `if/else` push — behavior, not style, is the contract.)

- [ ] **Step 5: Run — green**

Run: `npx vitest run src/lib/offlineVault.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/offlineVault.ts src/lib/offlineVault.test.ts package.json package-lock.json
git commit -m "feat(my-music): IndexedDB offline vault (files+manifest, presence-verified)"
```

---

### Task 7: `useOfflineVault` hook + save-to-device actions in My Music

**Files:**
- Create: `src/hooks/useOfflineVault.ts`
- Modify: `src/components/music-library/MyMusicTab.tsx`
- Modify: `src/components/music-library/my-music/MyMusicCard.tsx`
- Modify: `src/components/music-library/my-music/MyMusicListRow.tsx`
- Test: extend `src/components/music-library/my-music/MyMusicCard.test.tsx`

**Interfaces:**
- Consumes: Task 6's vault API; `getSignedUrl` from `@/utils/storage`; `PERSONAL_SCORES_BUCKET` from `@/lib/personalLibrary`.
- Produces:

```ts
// src/hooks/useOfflineVault.ts
export function useOfflineVault(): {
  supported: boolean;
  savedIds: Set<string>;            // ids present in the vault (blob-verified)
  usage: { count: number; bytes: number };
  saving: string | null;            // score id mid-download, else null
  saveScore: (score: PersonalScore) => Promise<void>;
  removeScore: (id: string) => Promise<void>;
}
```

- Card/Row gain optional props: `savedOnDevice?: boolean; onToggleDevice?: () => void;` — button hidden when `onToggleDevice` is undefined (external-only rows, unsupported browsers).

- [ ] **Step 1: Write the failing card test**

Append to `src/components/music-library/my-music/MyMusicCard.test.tsx` (existing file uses plain RTL render, no providers):

```tsx
it('renders a save-to-device action and fires it', () => {
  const onToggleDevice = vi.fn();
  render(<MyMusicCard score={score()} opening={false} onOpen={vi.fn()} onEdit={vi.fn()} onRemove={vi.fn()} onToggleFavorite={vi.fn()} onToggleDevice={onToggleDevice} savedOnDevice={false} />);
  const btn = screen.getByRole('button', { name: /save .* to this device/i });
  fireEvent.click(btn);
  expect(onToggleDevice).toHaveBeenCalledOnce();
});

it('labels the action as remove when already saved on device', () => {
  render(<MyMusicCard score={score()} opening={false} onOpen={vi.fn()} onEdit={vi.fn()} onRemove={vi.fn()} onToggleFavorite={vi.fn()} onToggleDevice={vi.fn()} savedOnDevice />);
  expect(screen.getByRole('button', { name: /remove .* from this device/i })).toBeInTheDocument();
});
```

(Match the existing test file's `score()` factory and imports; add `fireEvent` to the RTL import if missing.)

- [ ] **Step 2: Run — must fail**

Run: `npx vitest run src/components/music-library/my-music/MyMusicCard.test.tsx`
Expected: FAIL — unknown prop / no button.

- [ ] **Step 3: Implement the hook**

`src/hooks/useOfflineVault.ts`:

```ts
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSignedUrl } from '@/utils/storage';
import { PERSONAL_SCORES_BUCKET } from '@/lib/personalLibrary';
import { isVaultSupported, listVault, saveToVault, removeFromVault, requestPersistence } from '@/lib/offlineVault';
import type { PersonalScore } from '@/hooks/usePersonalScores';

export function useOfflineVault() {
  const supported = isVaultSupported();
  const qc = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);

  const { data: entries = [] } = useQuery({
    queryKey: ['offline-vault'],
    queryFn: listVault,
    enabled: supported,
    staleTime: 30_000,
  });

  const saveScore = async (score: PersonalScore) => {
    if (!score.storage_path) { toast.error(`"${score.title}" has no file to save.`); return; }
    setSaving(score.id);
    try {
      const url = await getSignedUrl(PERSONAL_SCORES_BUCKET, score.storage_path, 3600, false);
      if (!url) throw new Error('could not sign the file URL');
      const res = await fetch(url);
      if (!res.ok) throw new Error(`download failed (${res.status})`);
      await saveToVault(score, await res.blob());
      await requestPersistence();
      qc.invalidateQueries({ queryKey: ['offline-vault'] });
      toast.success('Saved to this device', { description: `"${score.title}" opens offline at /my-music.` });
    } catch (e: unknown) {
      toast.error('Could not save to this device', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(null);
    }
  };

  const removeScore = async (id: string) => {
    await removeFromVault(id);
    qc.invalidateQueries({ queryKey: ['offline-vault'] });
  };

  return {
    supported,
    savedIds: new Set(entries.map((e) => e.id)),
    usage: { count: entries.length, bytes: entries.reduce((n, e) => n + e.size, 0) },
    saving,
    saveScore,
    removeScore,
  };
}
```

- [ ] **Step 4: Wire the card and row**

`MyMusicCard.tsx`: add to props `savedOnDevice?: boolean; onToggleDevice?: () => void;`. Bump the padding math (L31–34):

```ts
const actionCount = 3 + (onTogglePublish ? 1 : 0) + (onToggleDevice ? 1 : 0);
const titlePadding = actionCount >= 5 ? 'pr-36' : actionCount === 4 ? 'pr-28' : 'pr-20';
```

Insert this button in the absolute action cluster right before the favorite star, matching the cluster's classes exactly:

```tsx
{onToggleDevice && (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onToggleDevice(); }}
    className={`p-1 rounded transition-colors ${
      savedOnDevice
        ? 'text-primary hover:text-primary/70'
        : 'text-muted-foreground/50 hover:text-foreground opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100'
    }`}
    aria-label={savedOnDevice ? `Remove ${score.title} from this device` : `Save ${score.title} to this device`}
    aria-pressed={savedOnDevice}
    title={savedOnDevice ? 'Remove from this device' : 'Save to this device (works offline)'}
  >
    <HardDriveDownload className="w-4 h-4" />
  </button>
)}
```

Add `HardDriveDownload` to the `lucide-react` import. `MyMusicListRow.tsx`: same two props; add a ghost `<Button variant="ghost" size="sm">` with the same aria-labels next to the favorite button, `e.stopPropagation()` like its neighbors.

`MyMusicTab.tsx`: instantiate `const vault = useOfflineVault();` and pass to both card and row:

```tsx
savedOnDevice={vault.savedIds.has(s.id)}
onToggleDevice={
  vault.supported && s.storage_path
    ? () => (vault.savedIds.has(s.id) ? vault.removeScore(s.id) : vault.saveScore(s))
    : undefined
}
```

- [ ] **Step 5: Run the music-library tests — green**

Run: `npx vitest run src/components/music-library`
Expected: PASS, including the two new card tests and all pre-existing ones.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useOfflineVault.ts src/components/music-library/MyMusicTab.tsx src/components/music-library/my-music/MyMusicCard.tsx src/components/music-library/my-music/MyMusicCard.test.tsx src/components/music-library/my-music/MyMusicListRow.tsx
git commit -m "feat(my-music): save-to-device actions backed by the offline vault"
```

---

### Task 8: Public `/my-music` offline page

**Files:**
- Create: `src/pages/MyMusicOfflinePage.tsx`
- Modify: `src/App.tsx` (lazy import + one `PublicRoute` route)
- Modify: `index.html` (only if `blob:` is missing from CSP `connect-src` — verify first)
- Test: `src/pages/MyMusicOfflinePage.test.tsx` (create)

**Interfaces:**
- Consumes: `listVault`, `getVaultBlob`, `removeFromVault`, `vaultUsage`, `isVaultSupported` from `@/lib/offlineVault`; `ScoreViewerDialog` from `@/components/music-library/ScoreViewerDialog` (`viewing = { title, pdfUrl }`, id omitted → no annotation affordances offline); `useAuth` (page renders inside `AuthProvider`; `user` may be null).
- Produces: route `/my-music` that renders entirely from the vault — no supabase queries on the render path.

- [ ] **Step 1: Check CSP for blob:**

Run: `grep -o 'connect-src[^;]*' index.html`
If `blob:` is absent from `connect-src`, add it (pdf.js fetches the object URL). Per repo memory, the CSP lives in the `index.html` meta tag and every new source must be added there.

- [ ] **Step 2: Write the failing page test**

`src/pages/MyMusicOfflinePage.test.tsx`:

```tsx
// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render as rtlRender, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { saveToVault, listVault, removeFromVault } from '@/lib/offlineVault';
import type { PersonalScore } from '@/hooks/usePersonalScores';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock('@/components/music-library/ScoreViewerDialog', () => ({ ScoreViewerDialog: () => null }));

import MyMusicOfflinePage from './MyMusicOfflinePage';

const score: PersonalScore = {
  id: 's1', user_id: 'u1', title: 'Ave Verum', composer: 'Byrd', voicing: 'SATB',
  source: 'upload', pd_work_id: null, entitlement_id: null,
  storage_path: 'u1/uploads/x.pdf', thumbnail_path: null, ext_catalog_item_id: null,
  external_url: null, tags: [], is_favorite: false, created_at: '2026-08-17T00:00:00Z',
};

const render = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(
    <QueryClientProvider client={client}>
      <MemoryRouter><MyMusicOfflinePage /></MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(async () => { for (const e of await listVault()) await removeFromVault(e.id); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('MyMusicOfflinePage', () => {
  it('shows the empty state when the vault is empty', async () => {
    render();
    expect(await screen.findByText(/no scores saved to this device/i)).toBeInTheDocument();
  });

  it('lists vault entries without touching the network', async () => {
    await saveToVault(score, new Blob(['%PDF-fake'], { type: 'application/pdf' }));
    render();
    expect(await screen.findByText('Ave Verum')).toBeInTheDocument();
    expect(screen.getByText(/byrd/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run — must fail**

Run: `npx vitest run src/pages/MyMusicOfflinePage.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 4: Implement the page**

`src/pages/MyMusicOfflinePage.tsx` — default export. Requirements (shadcn Card/Button, light-theme tokens only, text-sm/text-xs sizing, tenant-neutral copy):

```tsx
// Logged-out/offline My Music: renders ONLY from the IndexedDB vault.
// No supabase call may sit on this page's render path — it must work in
// airplane mode once the app shell is loaded, signed in or not.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HardDrive, Music, Trash2, ExternalLink } from 'lucide-react';
import { ScoreViewerDialog } from '@/components/music-library/ScoreViewerDialog';
import { listVault, getVaultBlob, removeFromVault, isVaultSupported, type VaultEntry } from '@/lib/offlineVault';
import { useAuth } from '@/contexts/AuthContext';

const fmtBytes = (n: number) => n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

export default function MyMusicOfflinePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [viewing, setViewing] = useState<{ title: string; pdfUrl: string } | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['offline-vault'],
    queryFn: listVault,
    enabled: isVaultSupported(),
  });
  const bytes = entries.reduce((n, e) => n + e.size, 0);

  const open = async (e: VaultEntry) => {
    const blob = await getVaultBlob(e.id);
    if (!blob) { qc.invalidateQueries({ queryKey: ['offline-vault'] }); return; }
    setViewing({ title: e.title, pdfUrl: URL.createObjectURL(blob) });
  };
  const close = () => {
    if (viewing) URL.revokeObjectURL(viewing.pdfUrl);
    setViewing(null);
  };
  const remove = async (id: string) => {
    await removeFromVault(id);
    qc.invalidateQueries({ queryKey: ['offline-vault'] });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <HardDrive className="w-5 h-5" /> My Music on this device
          </h1>
          {user && (
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link to="/dashboard/music-library">Full library <ExternalLink className="w-3.5 h-3.5 ml-1" /></Link>
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          {entries.length > 0
            ? `${entries.length} score${entries.length === 1 ? '' : 's'} · ${fmtBytes(bytes)} — available offline, no sign-in needed.`
            : 'Scores you save to this device open here — offline, no sign-in needed.'}
        </p>

        {!isVaultSupported() && (
          <Card><CardContent className="py-8 text-sm text-muted-foreground">This browser does not support on-device storage.</CardContent></Card>
        )}

        {isVaultSupported() && !isLoading && entries.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center space-y-2">
              <Music className="w-8 h-8 mx-auto text-muted-foreground/50" />
              <p className="text-sm font-medium">No scores saved to this device</p>
              <p className="text-xs text-muted-foreground">
                Sign in, open My Music in the Music Library, and tap “Save to this device” on any score.
              </p>
            </CardContent>
          </Card>
        )}

        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.id}>
              <Card className="hover:bg-accent/40 transition-colors">
                <CardContent className="py-3 flex items-center gap-3">
                  <button type="button" className="flex-1 text-left min-w-0" onClick={() => open(e)} aria-label={`Open ${e.title}`}>
                    <p className="text-sm font-medium truncate">{e.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[e.composer, e.voicing, fmtBytes(e.size)].filter(Boolean).join(' · ')}
                    </p>
                  </button>
                  <Button
                    variant="ghost" size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => remove(e.id)}
                    aria-label={`Remove ${e.title} from this device`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>

      <ScoreViewerDialog viewing={viewing} onClose={close} />
    </div>
  );
}
```

(Adjust the `ScoreViewerDialog` prop names to its actual signature — `viewing`/`onClose` per `ScoreViewerDialog.tsx` L19–29; check whether `viewing: null` is accepted or the dialog should be conditionally rendered.)

- [ ] **Step 5: Register the route**

In `src/App.tsx`, add the lazy import beside its neighbors and the route near the other `PublicRoute` pages (~L593):

```tsx
const MyMusicOfflinePage = lazy(() => import('./pages/MyMusicOfflinePage'));
// …
<Route path="/my-music" element={<PublicRoute><MyMusicOfflinePage /></PublicRoute>} />
```

Match the file's existing lazy-import pattern (check how neighbors are imported — some pages are eager; follow the nearest lazy example and its `Suspense` wrapper if one is required at the route level).

- [ ] **Step 6: Run — green**

Run: `npx vitest run src/pages/MyMusicOfflinePage.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add src/pages/MyMusicOfflinePage.tsx src/pages/MyMusicOfflinePage.test.tsx src/App.tsx index.html
git commit -m "feat(my-music): public /my-music page renders the offline vault"
```

---

### Task 9: Full verification + PR

**Files:** none new.

- [ ] **Step 1: Full test run vs baseline**

```bash
npx vitest run 2>&1 | tail -8 > /tmp/vitest-after.txt; diff /tmp/vitest-baseline.txt /tmp/vitest-after.txt
```

Expected: failure counts identical or lower; every difference must be a NEW PASSING suite you added. Any new failure gets fixed before proceeding.

- [ ] **Step 2: Typecheck + build**

```bash
npx tsc --noEmit 2>&1 | tail -10   # compare against pre-existing baseline drift only
npx vite build 2>&1 | tail -5      # must end with "built in …"
```

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin fix/music-library-limits
gh pr create --repo kevinskey/gleeworld --title "Music Library: personal-score annotations, CPDL Save to My Music, offline vault" --body "$(cat <<'EOF'
Closes the three Music Library v1 limits Kevin picked on 2026-08-17:

## 1. Annotations persist on personal scores
- New `gw_personal_score_annotations` (user-scoped, deliberately tenantless like `gw_personal_scores`; migration + assert test).
- `useSheetMusicAnnotations` routes by id shape (`personal:` prefix → personal table, analytics RPC skipped, layers not offered). Full viewer, half-page mode, and the My Music quick-view dialog (which now passes the prefixed id) all annotate.
- Tenant-only affordances (bookmarks, jumps, page rearrange, layers, audio/tracks) are hidden for personal scores instead of erroring with `22P02` toasts.
- Deleted dead `src/lib/viewer/scoreIds.ts` (conflicting `p_` prefix, zero importers).

## 2. CPDL → Save to My Music (spec phase 4)
- `pd-add-to-library` accepts `target: 'personal'`: reuses the shared pd-cache, then copies the PDF into `personal-scores/<uid>/cpdl/<pd_work_id>.pdf` and inserts a `source:'cpdl'` row (upgrades metadata-only rows previously saved via Repertoire search; idempotent re-saves).
- "Save to My Music" button on every Public Domain result card, all roles.

## 3. Offline vault + logged-out /my-music (spec phase 3)
- Raw-IndexedDB vault (`gw-offline-vault`: files + manifest, blob-presence-verified listing, `navigator.storage.persist()` best-effort).
- "Save to this device" on My Music cards/rows.
- Public `/my-music` route renders purely from the vault — works logged out and offline once the app shell is loaded (no service worker by policy, so a cold offline load is out of scope).

## Spec deviations (deliberate)
- Raw IndexedDB, not the `idb` lib (repo convention).
- Offline annotation sync cut from v1 (view-only offline).
- Spec phase 2 (publisher store + watermarking) not re-implemented — already live via the Partner Marketplace.

## Deploy order
1. Migration `20260817120000` via single-transaction psql as supabase_admin
2. `pd-add-to-library` to /opt/supabase/volumes/functions/
3. Frontend via scripts/deploy-frontend.sh

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

### Task 10: Deploy + verify

**Files:** none (operational).

- [ ] **Step 1: Merge the PR** (after review passes)

```bash
gh pr merge --repo kevinskey/gleeworld --squash --delete-branch
```

- [ ] **Step 2: Apply the migration (single transaction, supabase_admin)**

```bash
ssh root@198.211.113.144 "docker exec -i supabase-db psql -U supabase_admin -v ON_ERROR_STOP=1 --single-transaction" < supabase/migrations/20260817120000_personal_score_annotations.sql
```

Then verify by objects (no schema_migrations on self-hosted):

```bash
ssh root@198.211.113.144 "docker exec -i supabase-db psql -U postgres -Atc \"select count(*) from pg_policies where tablename='gw_personal_score_annotations'\""
# expect: 4
```

Run the assert test file the same way (it self-rolls-back).

- [ ] **Step 3: Deploy the edge function**

Copy per the edge-fn deploy memory (`/opt/supabase/volumes/functions/`; check that dir's existing layout first and restart the functions container the way the runbook/memory prescribes):

```bash
scp supabase/functions/pd-add-to-library/index.ts root@198.211.113.144:/opt/supabase/volumes/functions/pd-add-to-library/index.ts
# then restart the functions service per /opt/supabase compose setup — verify container name before restarting; NEVER `docker compose down`.
```

Probe: an OPTIONS request returns CORS 200; a POST without JWT returns 401.

- [ ] **Step 4: Deploy the frontend**

```bash
git fetch origin && git checkout main && git pull
./scripts/deploy-frontend.sh
```

Verify live `CACHE_VERSION` equals the new main tip (per the stale-build memory: fetch the live bundle and grep the signature).

- [ ] **Step 5: Post-deploy probes**

- `https://gleeworld.org/my-music` loads logged out (empty state, no console errors).
- Signed in on the demo tenant: My Music → open a personal score → Annotate → draw → Save → reopen → annotation is back.
- Public Domain tab → any "PDF ready" result → Save to My Music → appears in My Music and opens in the viewer.
- My Music card → Save to this device → `/my-music` lists it; DevTools offline → still opens.

- [ ] **Step 6: Update memory + report to Kevin**

Update `project_music_library_overhaul.md` / `project_personal_music_library.md` memories: limits closed, what shipped, QA owed (device/offline pass on iPad + phone, CPDL save on a real work, annotation roundtrip).
