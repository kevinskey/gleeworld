# Usage-tracking tenant isolation — revision report

**Status:** complete. Nothing applied; no DB connection was made; no DDL was run.

Files:
- `supabase/migrations/20260809060000_usage_tracking_tenant_isolation.sql` (rewritten)
- `supabase/migrations/20260809070000_activity_logs_tenant_isolation.sql` (new)
- `src/hooks/useUsageTracking.ts` (one-line constant change + comment)

---

## C1 — the no-upsert finding, verified

**The file's closing note was false, and the false note was the dangerous part.**

Verified against the repo, not the brief:

- `src/hooks/useUsageTracking.ts:160-192` is a read-then-branch, not an upsert:
  `select('id, page_views, modules_visited').eq('user_id').eq('date').single()` →
  `update().eq('id', existing.id)` if found, `insert()` if not.
- `grep -rn "user_engagement_daily"` across `src/` and `supabase/` returns exactly
  four non-migration hits: `types.ts`, `UsageAnalyticsModule.tsx`,
  `useUsageTracking.ts`, and the two migrations. **No `.upsert()` and no
  `onConflict` on this table exists anywhere in the repo.** The claimed 42P10
  risk cannot occur because there is no conflict target to invalidate.
- The constraint is real and is what the brief described: `20260120063345`
  creates `user_engagement_daily` with an inline `UNIQUE(user_id, date)`.

So the failure the old note protected against was imaginary, and the failure it
caused was not: once the SELECT is tenant-filtered, a user active in two tenants
on one day cannot see their earlier row, takes the INSERT branch, and collides
with a constraint that is not RLS-aware — 23505 on every navigation, forever,
swallowed by the `catch` at line 204.

**Fix.** The constraint is located by its *column set*, not by a guessed name
(a restored or hand-patched table can carry a different name for the same
shape), dropped, and replaced:

```sql
-- inside the transaction, after ADD COLUMN tenant_id, before COMMIT
DO $$ ... find pg_constraint where contype='u' and the ordered attname set
       = ARRAY['date','user_id'] ... EXECUTE format('ALTER TABLE ... DROP CONSTRAINT %I', v_con); END $$;

CREATE UNIQUE INDEX IF NOT EXISTS user_engagement_daily_tenant_user_date_key
  ON public.user_engagement_daily (tenant_id, user_id, date);

DO $$ ... re-check; RAISE EXCEPTION if a UNIQUE(user_id, date) survives ... END $$;
```

The post-check exists so a partial apply fails loudly instead of shipping the
23505 loop. Legacy rows keep `tenant_id = NULL`; NULLs are distinct in a unique
index, so they cannot collide.

---

## Gates

| Gate | Result |
| --- | --- |
| `npm run test` | 7 files / 6 tests failing — **identical at base `63419a752`** (verified by stashing the code change and re-running). Pre-existing; none touch usage tracking. |
| `npm run typecheck:guard` | OK — 150 errors, all pre-existing (baseline 170). No new errors. |
| `npm run lint` | 4115 pre-existing repo-wide problems; **zero in `useUsageTracking.ts`**. |
| `npm run build` | Built in 16.78s. |

---

## Change list

### CRITICAL

**C1** — above.

### IMPORTANT

**I1 — cross-tenant read closed.** `current_user_is_admin()`'s first branch
checks `gw_profiles` admin flags with no tenant predicate, so a profile-flag
admin of tenant A who holds a `gw_tenant_members` row in tenant B *in any role*
gets `current_tenant_id() = B` on B's subdomain (confirmed against
`current_tenant_id()`, `20260718020000`: a member of the header tenant is
returned that tenant) and still returns true.

The shared helper is **not** changed. A new, separately-named helper is added
and used only by these three tables and by `activity_logs`:

```sql
CREATE OR REPLACE FUNCTION public.current_user_is_tenant_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
      AND p.tenant_id = public.current_tenant_id()
      AND (p.is_admin = true OR p.is_super_admin = true
           OR p.role IN ('admin','super-admin','super_admin'))
  )
  OR EXISTS (
    SELECT 1 FROM public.gw_tenant_members m
    WHERE m.user_id = auth.uid()
      AND m.tenant_id = public.current_tenant_id()
      AND m.role IN ('admin','director','owner','super-admin','super_admin')
  )
  OR public.is_platform_owner();
$function$;
```

Every branch anchors to `current_tenant_id()`. Membership role list matches
`20260808200100`; role spellings follow the house rule (accept `super_admin` and
legacy `super-admin`). `gw_profiles.tenant_id` verified to exist (used by
`current_tenant_id()` itself and by `20260729210000`, `20260613170000`).

**I2 — header now states both directions.** Narrows: `instructor` dropped
entirely; the grant becomes tenant-scoped. Widens: the old policy tested the
`gw_profiles.role` *text column only*; the new predicate also admits `is_admin`,
`is_super_admin`, and current-tenant membership `admin/director/owner`. Per
`20260808200100` ("All five demo tenants' admins are in this state"),
membership- and flag-based admins are the common case live, so this is a real
behavioural change, recorded as one.

**I3 — recursion rationale corrected + guard added.** The old text credited
`SECURITY DEFINER` with skipping the caller's RLS. It does not: RLS is skipped
only for superuser / `BYPASSRLS` / owner-without-`FORCE`, and `gw_profiles` has
`FORCE ROW LEVEL SECURITY`, which closes the owner route. The conclusion holds
only because the helpers are owned by a `BYPASSRLS` role — which makes correct
ownership load-bearing, so both migrations open with:

```sql
DO $$ BEGIN
  IF NOT (SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = current_user) THEN
    RAISE EXCEPTION 'apply as supabase_admin/postgres: helper functions must be owned by a BYPASSRLS role';
  END IF;
END $$;
```

Placed inside the transaction so a bad apply aborts everything.

**I4 — `NOTIFY pgrst, 'reload schema';` after `COMMIT`** on both files (47
sibling migrations do this; a new column without it leaves PostgREST stale).

**I5 — indexes match the real queries.** `UsageAnalyticsModule.tsx` has **no
`user_id` predicate** on any of the three tables — it filters and orders on the
timestamp alone (`:80-95`, `:114-118`, `:129-134`), so
`(tenant_id, user_id, created_at DESC)` degenerates to a tenant scan. Added:

```sql
CREATE INDEX IF NOT EXISTS idx_user_page_views_tenant_created
  ON public.user_page_views (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_tenant_start
  ON public.user_sessions (tenant_id, session_start DESC);
CREATE INDEX IF NOT EXISTS idx_user_engagement_daily_tenant_date
  ON public.user_engagement_daily (tenant_id, date DESC);
```

The third is beyond the brief but the identical reasoning applies to
`:114-118` and the new unique index (leading `tenant_id, user_id`) does not
serve a date-only filter. The per-user composite on `user_page_views` is kept.

**I6 — code change ships with the migration.**

```ts
const SESSION_DB_ID_KEY = 'gw_session_db_id_v2';
```

`user_sessions` UPDATEs at `:99-105` and `:196-202` use an id restored from
`sessionStorage`; that row becomes NULL-tenant and invisible, so the UPDATE
matches zero rows and returns 204 with no error — and `initSession()` returns
early when `sessionDbIdRef` is set, so the tab never creates a replacement and
silently stops recording. The bump discards stale ids. The reason is commented at
the constant and cross-referenced from the migration header.

### Header corrections folded in

- **NULL tenant fails closed but goes quiet.** `current_tenant_id()` NULL →
  trigger sets NULL → `WITH CHECK` is `NULL = NULL` → NULL, not true → INSERT
  rejected with 42501. Correct direction, but tracking stops for those users and
  the hook swallows the error at line 204, so it stops silently. Called out as
  the first thing to check if analytics goes quiet.
- **The BEFORE UPDATE arm was theatre, and is dropped.** For UPDATE the
  RESTRICTIVE `USING` qual is evaluated against the OLD row before any BEFORE
  trigger fires, so a NULL-tenant row can never be selected for update and the
  trigger never runs on it. It could not repair one legacy row.
- **Because the UPDATE arm is gone, the near-duplicate function is gone too.**
  The triggers now call the shared `public.set_tenant_id_default()`
  (created conditionally in `20260710120000`, used by `20260808140000`),
  BEFORE INSERT only. Both migrations create it only if absent, with the
  identical body, so a rebuild from an earlier point still applies.
  `usage_tracking_fill_tenant()` is not created at all.
- **`TO PUBLIC` is deliberate.** The omitted `TO` clause makes the RESTRICTIVE
  policies `TO PUBLIC`, which is *stricter* than the house
  `TO authenticated` + `TO anon` pair (`20260808140000`) — it fences every
  non-exempt role, including any future grant nobody thought about. These
  tables have no legitimate anon writer, so there is nothing to accommodate.

### Pre-flight note added at the top

Operator runs, against production, before applying:

```sql
SELECT policyname, permissive, cmd, qual FROM pg_policies
WHERE tablename IN ('user_page_views','user_sessions','user_engagement_daily');
```

and confirms the seven policies from `20260120063345` (enumerated by name and
cmd in the file). Rationale stated: a hand-patched, differently-named admin
policy would survive every `DROP POLICY IF EXISTS` here, stay permissive, and
keep the `instructor` / role-only grant alive — the RESTRICTIVE policy would
still fence it to one tenant, so it is not catastrophic, but it is silent.

### Backfill section rewritten

Kept: the home-tenant-misattribution caveat. Removed: the false constraint
caveat. Added, in order of how badly each can mislead:

1. Attributes by current home tenant — wrong for anyone who has moved tenants.
2. **Must run as a BYPASSRLS role or it lies.** As `authenticated` the
   RESTRICTIVE policy hides every NULL-tenant row from the UPDATE's own scan;
   it matches zero rows and *reports success*. The old "inspect the count" step
   would show `UPDATE 0` and read as "nothing needed fixing". `UPDATE 0` is now
   documented as a red flag, not a green one.
3. **Platform owner is the worst case, not an edge case.** Their
   `gw_profiles.tenant_id` is `main` and they browse every subdomain, so this
   relabels their entire cross-tenant history as `main` — the same bug class as
   `20260718020000_current_tenant_id_platform_owner_sync.sql` (where Lyke
   House's real content was written under `main` and lost).
4. Covers `user_page_views` only; `user_sessions` and `user_engagement_daily`
   stay NULL and invisible, so pre-migration analytics shows page views with no
   sessions or rollups behind them. Says what to do if you want them.
5. Unbatched over a table written on every navigation since January — the
   example statement now carries a `created_at` window, with instructions to
   commit between windows or take a maintenance window.
6. Rows whose author has a NULL `gw_profiles.tenant_id`, or whose profile row is
   gone, stay NULL forever — so do not follow this with `SET NOT NULL` blind.

---

## Second migration — `activity_logs` (written, not applied)

`supabase/migrations/20260809070000_activity_logs_tenant_isolation.sql`.
Same structure: `tenant_id` + BEFORE INSERT trigger + RESTRICTIVE isolation +
tenant-scoped admin read + `(tenant_id, created_at DESC)` index + pre-flight
note + `NOTIFY`. It asserts `current_user_is_tenant_admin()` already exists
rather than redefining it, so the two files cannot drift.

Verified about this table:

- No `tenant_id` (confirmed against `20250623162531` DDL and `types.ts`).
- Written by the same hook — `useUsageTracking.ts:214` (login) and `:292`
  (module exit) via `rpc('log_activity')` — plus `utils/activityLogger.ts:36`
  and `supabase/functions/bulk-w9-email/index.ts:208`.
- Current read policy (`20260213214220`) admits
  `is_admin OR is_super_admin OR is_exec_board`, unscoped. **`is_exec_board` is a
  student officer flag** — strictly worse than the `instructor` grant removed
  from the usage tables. It is dropped outright.
- The policy has held **four different names** across five years
  (`20250623162531`, `20250801040039`, `20250804150211`, `20250804150257`,
  `20260213214220`); the migration drops every name the repo has used, and the
  pre-flight note explains why a fifth, out-of-band name would survive.

One behaviour worth flagging, documented in the file header:

**`log_activity()` is `SECURITY DEFINER`, so this table fails OPEN where
`user_page_views` fails CLOSED.** Its INSERT bypasses RLS entirely, so the
RESTRICTIVE `WITH CHECK` is never evaluated for it. Tenant attribution still
works (triggers and DEFAULTs fire regardless of RLS, and `current_tenant_id()`
reads session GUCs that `SECURITY DEFINER` does not disturb), but where
`user_page_views` would reject a NULL-tenant write with 42501, this writes a
NULL-tenant row that is then invisible to every reader. The audit trail would
keep accepting writes and quietly stop showing them. Post-deploy check
documented: `SELECT count(*) FROM activity_logs WHERE tenant_id IS NULL AND
created_at > <apply time>` should be zero. `log_activity()` itself is not
modified — that has five callers and is a separate decision.

---

## Constraints honoured

- Nothing applied; no database connection; no DDL executed.
- `public.current_user_is_admin()` untouched.
- Every constraint, policy, column and line number above was checked against the
  repo. Two brief claims were confirmed by inspection rather than assumed: the
  constraint name `user_engagement_daily_user_id_date_key` (correct — inline
  `UNIQUE(user_id, date)`, though the migration finds it by column set anyway),
  and the seven-policy pre-flight expectation (correct — 3 + 2 + 2).
