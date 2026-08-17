# Personal Music Library — Finish Phases 1 & 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the last Phase 1 gap (annotations persist on personal My Music scores) and the last Phase 2 gaps (partner-purchase fulfillment actually fires in prod, and fulfillment is idempotent), then verify end-to-end.

**Architecture:** Phase 2's "Lion & Lamb store" from the 07-12 spec was superseded by the live Partner Marketplace / GW Sheet Music Store (PRs #302/#334): catalog = `gw_partner_scores`, checkout = `partner-checkout-create` (Stripe Connect, 50% platform fee), watermarking = `partner-watermark`, delivery lands in `gw_personal_scores`. Do **not** build `gw_publisher_scores` or `score-download` — that design is dead. What remains: (a) a personal-score annotations table + a `personal:`-id-aware annotations hook so the shared viewer persists markup on My Music scores; (b) an idempotency index + insert-error handling in `partner-watermark`; (c) prod ops — the `partner-webhook` Stripe endpoint was never registered, so `STRIPE_WEBHOOK_SECRET_PARTNER` is absent and **no purchase has ever fulfilled** (0 rows in `gw_partner_orders`).

**Tech Stack:** Vite/React/TS, Supabase self-hosted (`supabase.gleeworld.org`), Deno edge functions, pdf-lib, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-12-personal-music-library-design.md` (Phases 1–2; store portion superseded by `docs/superpowers/specs/2026-07-31-gw-sheet-music-store-design.md`, shipped).

## Global Constraints

- Work in worktree `.claude/worktrees/pml-phase2` (branched off origin/main at 296546d50). `npm ci --legacy-peer-deps --no-audit --no-fund` — plain `npm ci` fails on a pre-existing pdfjs-dist peer conflict. Never pipe npm through `tail` (hides failures).
- Gates before PR: `npm run test` (24 failures pre-exist on main — only NEW failures block), `npm run typecheck:guard`, `npm run lint`.
- `gw_personal_scores` and the new annotations table are **deliberately tenant-less** (personal scope) — say so in a migration comment or the multi-tenant audit will flag them.
- `gw_personal_scores` is NOT in generated types; the established pattern is `(supabase as any).from('gw_personal_scores')` with an eslint-disable. Match it for the new table. Full types regen is explicitly out of scope.
- Migrations: new files only, never edit historical ones. Prod apply is `ssh root@198.211.113.144 "docker exec -i supabase-db psql -U postgres ..."` — the self-hosted DB has no `schema_migrations`.
- Edge functions deploy by copying to `/opt/supabase/volumes/functions/<name>/` on the droplet, then `cd /opt/supabase && docker compose up -d --force-recreate functions`. Never `docker compose down`. Relative Deno imports need explicit `.ts`.
- Frontend deploy: `bash scripts/deploy-frontend.sh` only (no bare rsync, never `--delete`).
- User-visible copy is tenant-neutral: "students", "graduates", never "Spelman"/"singers"/"alumnae".
- The Stripe account is LIVE (no test mode configured on this stack). Any API write to Stripe is production. Do not touch `application_fee_amount` anywhere.

## Current-state facts (verified 2026-08-17, prod + origin/main 296546d50)

- Lion & Lamb partner `0a667c32-3243-463f-8224-1964f09cc825`: `status='active'`, charges ✓, payouts ✓. 1 `gw_partner_scores` row `published`. `gw_partner_orders`: **0 rows**.
- `grep -c STRIPE_WEBHOOK_SECRET_PARTNER /opt/supabase/.env` → **0**. `partner-webhook/index.ts:7` reads that env var; unset ⇒ every webhook fails signature check ⇒ purchases never fulfill.
- `gw_personal_scores`: 281 rows, all `source='upload'`. Indexes: pkey, user_idx, pd_uq, entitlement_uq, ext_uq, tags_gin — **no** (user_id, storage_path) uniqueness, so re-invoking `partner-watermark` duplicates the My Music row (its insert result is also silently discarded).
- Viewer id spaces: `src/lib/viewerScoreId.ts` = `personal:` prefix (`toViewerScoreId`, `isPersonalScoreId`, `toTableId`) — used by `ViewerReader.tsx`, which passes the **prefixed** id as `musicId` into `PDFViewerWithAnnotations`. `src/lib/viewer/scoreIds.ts` = `p_` prefix, route-URL space only. Use `viewerScoreId.ts` for all new logic.
- Today, annotating a personal score in the Viewer errors (uuid parse on `personal:...` against `gw_sheet_music_annotations`); My Music's `ScoreViewerDialog` passes no id at all, so annotation UI short-circuits. Both paths get fixed by making the hook id-aware.
- `MyMusicTab` phase-1 ledger items already done on main: dialog renamed (`my-music/MyMusicUploadDialog.tsx`), `openScore` guards external/missing files.

---

### Task 0: Branch + install

**Files:** none (setup)

- [ ] **Step 1:** In `.claude/worktrees/pml-phase2`: `git switch -c pml-finish-phase-1-2`
- [ ] **Step 2:** `npm ci --legacy-peer-deps --no-audit --no-fund > /tmp/npm-ci.log 2>&1; echo exit=$?` — must print `exit=0`.
- [ ] **Step 3:** Baseline: `npm run test 2>&1 | tail -5` and note the pre-existing failure count for later comparison.

---

### Task 1: Migration — personal annotations table + purchase idempotency index

**Files:**
- Create: `supabase/migrations/20260817120000_personal_score_annotations.sql`
- Modify: `supabase/migrations/tests/personal_music_library_test.sql` (append asserts)

**Interfaces:**
- Produces: table `gw_personal_score_annotations` (columns: `id uuid`, `personal_score_id uuid`, `user_id uuid`, `page_number int`, `annotation_type text`, `annotation_data jsonb`, `position_data jsonb`, `created_at`, `updated_at`); unique index `gw_personal_scores_purchase_uq`. Tasks 3 and 5 depend on these exact names.

- [ ] **Step 1: Write the migration**

```sql
-- 20260817120000_personal_score_annotations.sql
-- Personal-score annotations. gw_sheet_music_annotations FKs gw_sheet_music,
-- so My Music scores (gw_personal_scores) could never persist markup — the
-- phase-1 ledger item this closes. DELIBERATELY NO tenant_id: personal scope,
-- same audit exception as gw_personal_scores (20260712120000). No layer
-- column: annotation layers (voice-part markings) are a group-library concept.
create table public.gw_personal_score_annotations (
  id uuid primary key default gen_random_uuid(),
  personal_score_id uuid not null
    references public.gw_personal_scores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  page_number int not null,
  annotation_type text not null
    check (annotation_type in ('drawing','highlight','text_note','stamp')),
  annotation_data jsonb not null,
  position_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gw_personal_score_annotations_score_page_idx
  on public.gw_personal_score_annotations (personal_score_id, page_number);

alter table public.gw_personal_score_annotations enable row level security;

-- Owner-only. The WITH CHECK subquery also stops annotating someone ELSE's
-- personal score (FK checks bypass RLS, so user_id alone is not enough).
-- Scans a DIFFERENT table than the policy's own — no 42P17 recursion risk.
create policy gw_personal_score_annotations_select
  on public.gw_personal_score_annotations for select
  using (user_id = auth.uid());
create policy gw_personal_score_annotations_insert
  on public.gw_personal_score_annotations for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.gw_personal_scores s
                where s.id = personal_score_id and s.user_id = auth.uid())
  );
create policy gw_personal_score_annotations_update
  on public.gw_personal_score_annotations for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy gw_personal_score_annotations_delete
  on public.gw_personal_score_annotations for delete
  using (user_id = auth.uid());

-- Phase-2 fulfillment idempotency: partner-watermark re-invocation must not
-- duplicate the buyer's My Music row. Partial: uploads/cpdl are unconstrained.
-- Safe to create: prod has zero source='purchase' rows (verified 2026-08-17).
create unique index gw_personal_scores_purchase_uq
  on public.gw_personal_scores (user_id, storage_path)
  where source = 'purchase';
```

- [ ] **Step 2: Append asserts to the test file** (inside a new `DO $$` block following the file's existing style, before its final `ROLLBACK;`):

```sql
DO $$
BEGIN
  ASSERT (SELECT count(*) = 1 FROM information_schema.tables
          WHERE table_name = 'gw_personal_score_annotations'),
         'personal annotations table missing';
  ASSERT (SELECT relrowsecurity FROM pg_class
          WHERE relname = 'gw_personal_score_annotations'),
         'personal annotations RLS not enabled';
  ASSERT (SELECT count(*) = 0 FROM information_schema.columns
          WHERE table_name = 'gw_personal_score_annotations'
            AND column_name = 'tenant_id'),
         'personal annotations must NOT have tenant_id';
  ASSERT (SELECT count(*) = 4 FROM pg_policies
          WHERE tablename = 'gw_personal_score_annotations'),
         'personal annotations owner policies missing';
  ASSERT (SELECT count(*) = 1 FROM pg_indexes
          WHERE tablename = 'gw_personal_scores'
            AND indexname = 'gw_personal_scores_purchase_uq'),
         'purchase idempotency index missing';
END $$;
```

- [ ] **Step 3: Verify against a scratch DB if available; otherwise dry-run the SQL for syntax** — `docker run --rm postgres:15 postgres --version` availability check; if no local PG, at minimum `psql`-parse on the droplet against a `BEGIN; ... ROLLBACK;` wrapper of the migration + test asserts (read-only transaction, no commit):
  `ssh root@198.211.113.144 "docker exec -i supabase-db psql -U postgres -v ON_ERROR_STOP=1" < combined.sql` where `combined.sql` = migration + test block + `ROLLBACK;` prepended with `BEGIN;`. Expected: no errors, ends `ROLLBACK`.
- [ ] **Step 4: Commit** — `git add supabase/migrations && git commit -m "feat: personal score annotations table + purchase idempotency index"`

---

### Task 2: `annotationTarget()` helper in viewerScoreId.ts (TDD)

**Files:**
- Modify: `src/lib/viewerScoreId.ts`
- Create: `src/lib/viewerScoreId.test.ts`

**Interfaces:**
- Produces: `annotationTarget(musicId: string): { table: 'gw_sheet_music_annotations' | 'gw_personal_score_annotations'; idColumn: 'sheet_music_id' | 'personal_score_id'; rowId: string }`. Task 3 consumes it.
- Consumes: existing `isPersonalScoreId`, `toTableId` (prefix `personal:`).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/viewerScoreId.test.ts
import { describe, it, expect } from 'vitest';
import { annotationTarget, toViewerScoreId } from './viewerScoreId';

describe('annotationTarget', () => {
  it('routes tenant ids to gw_sheet_music_annotations', () => {
    expect(annotationTarget('abc-123')).toEqual({
      table: 'gw_sheet_music_annotations',
      idColumn: 'sheet_music_id',
      rowId: 'abc-123',
    });
  });
  it('routes personal viewer ids to gw_personal_score_annotations, stripped', () => {
    expect(annotationTarget(toViewerScoreId('abc-123', true))).toEqual({
      table: 'gw_personal_score_annotations',
      idColumn: 'personal_score_id',
      rowId: 'abc-123',
    });
  });
});
```

- [ ] **Step 2:** `npx vitest run src/lib/viewerScoreId.test.ts` — expected FAIL (`annotationTarget` not exported).
- [ ] **Step 3: Implement** (append to `src/lib/viewerScoreId.ts`; also update the stale file-header comment that says a personal score "cannot carry annotations" — it now can, via this target):

```ts
/** Which annotation table a viewer musicId writes to. Personal scores keep
 *  their markup in gw_personal_score_annotations (FK gw_personal_scores);
 *  everything else stays on gw_sheet_music_annotations. */
export function annotationTarget(musicId: string): {
  table: 'gw_sheet_music_annotations' | 'gw_personal_score_annotations';
  idColumn: 'sheet_music_id' | 'personal_score_id';
  rowId: string;
} {
  return isPersonalScoreId(musicId)
    ? { table: 'gw_personal_score_annotations', idColumn: 'personal_score_id', rowId: toTableId(musicId) }
    : { table: 'gw_sheet_music_annotations', idColumn: 'sheet_music_id', rowId: musicId };
}
```

- [ ] **Step 4:** `npx vitest run src/lib/viewerScoreId.test.ts` — expected PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat: annotationTarget() maps viewer ids to their annotation table"`

---

### Task 3: Make `useSheetMusicAnnotations` personal-id-aware

**Files:**
- Modify: `src/hooks/useSheetMusicAnnotations.ts` (196 lines; every query branches via `annotationTarget`)

**Interfaces:**
- Consumes: `annotationTarget` from Task 2.
- Produces: unchanged hook API (`fetchAnnotations`, `saveAnnotation`, `updateAnnotation`, `deleteAnnotation`, `clearPageAnnotations`, `annotations`, `loading`) — viewer internals must not change. Personal rows are mapped back with `sheet_music_id` set to the **prefixed** musicId and `annotation_layer_id: null` so downstream comparisons (`clearPageAnnotations` local filter, layer-visibility filter at PDFViewerWithAnnotations.tsx:1166) keep working.

- [ ] **Step 1:** Add import: `import { annotationTarget, isPersonalScoreId } from '@/lib/viewerScoreId';`
- [ ] **Step 2: Branch `fetchAnnotations`** — replace its query with:

```ts
const t = annotationTarget(musicId);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let query = (supabase as any)
  .from(t.table)
  .select('*')
  .eq(t.idColumn, t.rowId)
  .order('created_at', { ascending: true });
```

and after a successful fetch map rows so the rest of the viewer sees one shape:

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rows = (data || []).map((r: any) => ({
  ...r,
  sheet_music_id: musicId,                       // prefixed id round-trips
  annotation_layer_id: r.annotation_layer_id ?? null, // personal table has no layers
}));
setAnnotations(rows as Annotation[]);
```

- [ ] **Step 3: Branch `saveAnnotation`** — build the insert from the target, and skip the tenant analytics RPC for personal scores (the RPC FKs gw_sheet_music):

```ts
const t = annotationTarget(musicId);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { error } = await (supabase as any)
  .from(t.table)
  .insert({
    [t.idColumn]: t.rowId,
    user_id: user.id,
    page_number: pageNumber,
    annotation_type: type,
    annotation_data: annotationData,
    position_data: positionData,
    ...(t.table === 'gw_sheet_music_annotations'
      ? { annotation_layer_id: annotationLayerId ?? null }
      : {}),
  });
if (error) throw error;
if (!isPersonalScoreId(musicId)) {
  await supabase.rpc('log_sheet_music_analytics', {
    sheet_music_id_param: musicId,
    user_id_param: user.id,
    action_type_param: 'annotate',
    page_number_param: pageNumber,
    device_type_param: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop',
  });
}
```

- [ ] **Step 4: Branch `updateAnnotation` and `deleteAnnotation`** — they only receive `annotationId`, so derive the table from the hook's bound `sheetMusicId`:

```ts
const t = annotationTarget(sheetMusicId ?? '');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { data, error } = await (supabase as any).from(t.table).update(updateData)…
```

(`annotationTarget('')` yields the tenant table — identical to today's behavior when the hook is mounted without an id.) Add `sheetMusicId` to both `useCallback` dependency arrays.
- [ ] **Step 5: Branch `clearPageAnnotations`** the same way as `fetchAnnotations` (target from its `musicId` argument; delete filtered on `t.idColumn = t.rowId`, `page_number`, `user_id`). The local `setAnnotations` filter already compares `annotation.sheet_music_id === musicId`, which still matches because Step 2 maps rows to the prefixed id.
- [ ] **Step 6:** `npx vitest run src/lib/viewerScoreId.test.ts && npm run typecheck:guard` — PASS / no new errors.
- [ ] **Step 7: Commit** — `git commit -am "feat: annotations hook routes personal scores to gw_personal_score_annotations"`

---

### Task 4: Viewer wiring — guard tenant-only features, enable My Music annotation

**Files:**
- Modify: `src/components/PDFViewerWithAnnotations.tsx` (id plumbing near lines 120–150, 1083–1129, 1830/1955/2295, 2328–2330)
- Modify: `src/components/music-library/MyMusicTab.tsx` (`openScore`, ~line 196)
- Modify: `src/components/music-library/ScoreViewerDialog.tsx` (header comment only)

**Interfaces:**
- Consumes: `isPersonalScoreId` from `@/lib/viewerScoreId`; `toViewerScoreId`.
- Produces: `PDFViewerWithAnnotations` accepts a `personal:`-prefixed `musicId` and persists annotations for it while audio/bookmarks/layers stay tenant-only.

- [ ] **Step 1:** In `PDFViewerWithAnnotations.tsx`, next to the hook calls (~line 134), compute the tenant-only id once:

```ts
// Personal (My Music) scores annotate via the id-aware hook below, but
// audio, bookmarks, and layers FK gw_sheet_music — feed them undefined so
// their queries never fire against a `personal:` id.
const tenantMusicId = musicId && !isPersonalScoreId(musicId) ? musicId : undefined;
```

Keep `useSheetMusicAnnotations(musicId)` on the raw id; switch these to `tenantMusicId`: `useAnnotationLayers(...)` (line 140), `useSheetMusicAudio(...)` (146), `useSheetMusicTracks(...)` (147), all three `AudioCompanionControls musicId={...}` (1830/1955/2295), and the `BookmarksMenu` guard+prop (2328–2330: `{tenantMusicId && (<BookmarksMenu sheetMusicId={tenantMusicId} ...`).
- [ ] **Step 2:** In `MyMusicTab.tsx` `openScore`, pass the viewer id so the dialog's annotation UI activates (import `toViewerScoreId` from `@/lib/viewerScoreId`):

```ts
setViewing({ id: toViewerScoreId(s.id, true), title: s.title, pdfUrl: url });
```

Also update the stale comment block at lines ~35–36 ("annotation tables FK to gw_sheet_music, so the viewer's annotation/audio lookups short-circuit") to say annotations now persist via `gw_personal_score_annotations`; audio stays tenant-only.
- [ ] **Step 3:** Update `ScoreViewerDialog.tsx`'s header comment (same stale claim, lines 4–6).
- [ ] **Step 4:** Run the adjacent component tests + guard: `npx vitest run src/components/music-library/MyMusicTab.test.tsx src/components/music-library/my-music/MyMusicCard.test.tsx && npm run typecheck:guard && npm run lint` — PASS / no new errors.
- [ ] **Step 5:** Manual dev-server check (`npm run dev`, sign in, Music Library → My Music → open a score): pencil enters annotation mode, a stroke saves without an error toast, reopening the score shows the stroke; audio companion / bookmarks affordances absent or inert; a tenant Scores-tab score still loads its annotations, layers, and audio. Console shows no failed `gw_sheet_music_annotations` request for the personal score.
- [ ] **Step 6: Commit** — `git commit -am "feat: My Music scores persist annotations; tenant-only viewer features guarded"`

---

### Task 5: `partner-watermark` — idempotent, error-checked fulfillment insert + composer metadata

**Files:**
- Modify: `supabase/functions/partner-watermark/index.ts` (select at ~line 32, insert at ~line 72)

**Interfaces:**
- Consumes: `gw_personal_scores_purchase_uq` from Task 1 (unique violation code `23505` = already fulfilled).
- Produces: fulfillment inserts carry `composer`/`voicing`; failed inserts return 500 (webhook's await-watermark-skip-on-failure contract surfaces it) instead of vanishing.

- [ ] **Step 1:** Widen the score select: `.select("master_storage_path, title, composer, voicing")`.
- [ ] **Step 2:** Replace the fire-and-forget insert:

```ts
// Insert personal library row now that the file exists. 23505 = the
// purchase-idempotency index (re-invocation after a partial failure) —
// the row is already there, which is success, not an error.
const { error: libErr } = await supa.from("gw_personal_scores").insert({
  user_id: order.buyer_user_id,
  title: score.title,
  composer: score.composer ?? null,
  voicing: score.voicing ?? null,
  source: "purchase",
  entitlement_id: null,
  storage_path: path,
});
if (libErr && libErr.code !== "23505") {
  return new Response(JSON.stringify({ error: `library insert failed: ${libErr.message}` }),
    { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });
}
```

- [ ] **Step 3:** `deno check supabase/functions/partner-watermark/index.ts` if deno is installed locally (`deno --version`); otherwise rely on review — the file has no test harness.
- [ ] **Step 4: Commit** — `git commit -am "fix: partner-watermark fulfillment is idempotent and error-checked"`

---

### Task 6: Gates + PR

- [ ] **Step 1:** `npm run test 2>&1 | tail -5` — failure count ≤ Task 0 baseline (no new failures).
- [ ] **Step 2:** `npm run typecheck:guard && npm run lint` — clean.
- [ ] **Step 3:** Push branch, open PR titled "Personal music library: finish phases 1 & 2" with a body covering: personal annotations table+hook, viewer guards, watermark idempotency, and the ops steps (Task 8) that accompany the deploy. End body with the standard Claude Code attribution.
- [ ] **Step 4:** Request review per superpowers:requesting-code-review; merge on approval.

---

### Task 7: Deploy (after merge)

- [ ] **Step 1: Migration first** (frontend depends on the table):
  `ssh root@198.211.113.144 "docker exec -i supabase-db psql -U postgres -v ON_ERROR_STOP=1" < supabase/migrations/20260817120000_personal_score_annotations.sql`
  Verify: `... psql -U postgres -tAc "select count(*) from pg_policies where tablename='gw_personal_score_annotations'"` → `4`.
- [ ] **Step 2: Edge function:** copy `supabase/functions/partner-watermark/index.ts` to `/opt/supabase/volumes/functions/partner-watermark/index.ts` (back up the existing file with `cp -n` first), then `cd /opt/supabase && docker compose up -d --force-recreate functions`.
- [ ] **Step 3: Frontend:** from the merged main checkout, `bash scripts/deploy-frontend.sh`; confirm the script's live-hash verification passes and CACHE_VERSION equals the main tip SHA.

---

### Task 8: Ops — register the partner webhook (unblocks all purchases)

This is the single reason Phase 2 has never fulfilled a purchase. All commands run against the LIVE Stripe account — get Kevin's go-ahead at plan approval, then execute exactly this.

- [ ] **Step 1:** Confirm it is still missing: `ssh root@198.211.113.144 "grep -c STRIPE_WEBHOOK_SECRET_PARTNER /opt/supabase/.env"` → expect `0` (if `1`, skip to Step 5).
- [ ] **Step 2:** Create the endpoint via API (key already on the droplet; the response's `secret` field is shown only once — capture it):

```bash
ssh root@198.211.113.144 'SK=$(grep ^STRIPE_SECRET_KEY= /opt/supabase/.env | cut -d= -f2); \
  curl -s https://api.stripe.com/v1/webhook_endpoints -u "$SK:" \
    -d url="https://supabase.gleeworld.org/functions/v1/partner-webhook" \
    -d "enabled_events[]=checkout.session.completed" \
    -d description="GW Sheet Music Store partner fulfillment"'
```

Expected: JSON with `"id": "we_…"` and `"secret": "whsec_…"`. On error, stop and report — do not retry blindly (each retry that half-succeeds creates a duplicate endpoint; list with `GET /v1/webhook_endpoints` first if unsure).
- [ ] **Step 3:** `cp -n /opt/supabase/.env /opt/supabase/.env.bak.$(date +%Y%m%d)` then append `STRIPE_WEBHOOK_SECRET_PARTNER=whsec_…`.
- [ ] **Step 4:** Check whether `/opt/supabase/docker-compose.yml` enumerates env vars for the `functions` service (pattern from the GW_PLATFORM_TENANT_ID precedent). If it does, add `STRIPE_WEBHOOK_SECRET_PARTNER: ${STRIPE_WEBHOOK_SECRET_PARTNER}` there too. Then `cd /opt/supabase && docker compose up -d --force-recreate functions`.
- [ ] **Step 5:** Verify inside the container: `docker exec supabase-edge-functions printenv STRIPE_WEBHOOK_SECRET_PARTNER | head -c 10` → prints `whsec_…` prefix. Then `curl -s -o /dev/null -w '%{http_code}' -X POST https://supabase.gleeworld.org/functions/v1/partner-webhook -H 'stripe-signature: t=1,v1=bad' -d '{}'` → expect `400` (signature rejected ⇒ verification active), not `500`.

---

### Task 9: Prod fulfillment smoke (synthetic, no card) + cleanup

Exercises webhook-independent machinery: watermark → storage → My Music row → idempotency. Uses Kevin's own user (`kpj64110@gmail.com` auth uid) as buyer so the row lands in a real library and is easy to eyeball.

- [ ] **Step 1:** Insert a synthetic paid order + item against the one published `gw_partner_scores` row. Both tables default `tenant_id` to `current_tenant_id()`, which is NULL in a superuser psql session — set it explicitly to the platform tenant `bb48609d-a1ca-4905-be50-b84afdac187e` (slug `main`). Run via `ssh root@198.211.113.144 "docker exec -i supabase-db psql -U postgres -v ON_ERROR_STOP=1"`:

```sql
with buyer as (select user_id from gw_profiles where email = 'kpj64110@gmail.com' limit 1),
     score as (select id, partner_id, price_cents from gw_partner_scores where status = 'published' limit 1),
     ord as (
       insert into gw_partner_orders
         (buyer_user_id, subtotal_cents, platform_fee_cents, status, paid_at, tenant_id)
       select b.user_id, s.price_cents, s.price_cents / 2, 'paid', now(),
              'bb48609d-a1ca-4905-be50-b84afdac187e'
       from buyer b, score s
       returning id
     )
insert into gw_partner_order_items
  (order_id, partner_score_id, partner_id, price_cents, platform_fee_cents,
   partner_payout_cents, quantity, tenant_id)
select o.id, s.id, s.partner_id, s.price_cents, s.price_cents / 2,
       s.price_cents - s.price_cents / 2, 1,
       'bb48609d-a1ca-4905-be50-b84afdac187e'
from ord o, score s
returning id as order_item_id, order_id;
```

Note both returned ids for the following steps.
- [ ] **Step 2:** Invoke fulfillment twice with the service role key (from `/opt/supabase/.env`):

```bash
curl -s -X POST https://supabase.gleeworld.org/functions/v1/partner-watermark \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" -H "content-type: application/json" \
  -d '{"order_item_id":"<item-id>"}'
```

Expected both times: `{"watermarked_storage_path":"<buyer>/store/<item>.pdf"}`.
- [ ] **Step 3:** Verify exactly ONE `gw_personal_scores` row (`source='purchase'`, that path, composer populated) and that the storage object exists; download via a signed URL and confirm the footer stamp reads `Purchased by … · GleeWorld Order #… · Licensed for 1 student`.
- [ ] **Step 4:** Cleanup: delete the `gw_personal_scores` row, order item, order, and the `personal-scores` storage object (both nested and flattened key forms — the flatten cron may have rewritten it).
- [ ] **Step 5:** Record results in the PR or memory. Remaining human QA (cannot be automated — needs a real card): Kevin buys the published score end-to-end from the GW Sheet Music Store tab, sees it fulfill into My Music, then refunds himself in the Stripe dashboard (`refund_application_fee: true`).

---

## Explicitly out of scope

- Full `src/integrations/supabase/types.ts` regen (phase-1 ledger item): the generated file is far behind 2,377 migrations; regen churn is unbounded and `(supabase as any)` is the repo's working pattern. Do separately if wanted.
- Phase 3 (IndexedDB offline vault, logged-out `/my-music`) and Phase 4 (CPDL save-to-personal).
- Partner sub-plan 3 (admin refund/suspend surface), annotation layers for personal scores, audio companion for personal scores, `partner-watermark` caller-auth hardening (tracked security ticket).
