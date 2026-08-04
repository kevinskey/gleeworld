# Merge Kevin's three accounts

**Status:** planned, NOT executed. Needs review before anything runs.
**Date:** 2026-07-18

## Why

User-scoped features (My Music, practice history, planner notes, preferences)
key off `auth.uid()`. Kevin operates under three logins, so those features
fragment: his 279 personal scores live under one account and are invisible from
the other two, which is how this surfaced — Kevin's World showed the music in
Scores (tenant-scoped) but not My Music (user-scoped).

## Accounts

| role | email | user_id | rows |
|---|---|---|---|
| **SURVIVOR** | `kpj64110@gmail.com` | `4e6c2ec0-1f83-449a-a984-8920f6056ab5` | 3,950 |
| merge in | `kevinskey@icloud.com` | `f7b60271-d4dc-4133-8b1a-78f87a60d5d3` | 2,849 |
| merge in | `kevinskey@mac.com` | `39524329-4157-4a80-a1e9-9c48db547fcd` | 354 |

Survivor chosen because it owns the 279 personal scores, holds the most rows,
and is Super Admin.

**Explicitly NOT merged:** `kevin@gleeworld.org` (demo account, must stay
separate — App Store reviewers use it) and `kevinthomasjohnson2024@gmail.com`
(a different person).

**Consequence to accept before starting:** `kevinskey@icloud.com` and
`kevinskey@mac.com` stop working as logins. Any saved session or password
manager entry for them dies.

## Scope

51 tables, 7,153 rows total, discovered by scanning `information_schema` for
uuid columns named `user_id, owner, owner_id, created_by, author_id, member_id,
profile_id, uploaded_by, added_by, assigned_to, recipient_id, sender_id,
student_id, teacher_id`.

Two classes:

**A. Bulk repoint (44 tables).** No per-user uniqueness — just
`UPDATE t SET col = survivor WHERE col IN (losers)`. Includes the large ones:
`gw_course_class_sessions` (71), `user_engagement_daily` (48),
`gw_group_messages` (44), `gw_events` (41), `gw_assignments` (41),
`gw_planner_note_revisions` (39), `gw_planner_notes` (30).

**B. Hard conflicts (7 tables)** — all three accounts hold a row, so a blind
repoint violates a unique constraint. Each needs an explicit rule:

| table | rule |
|---|---|
| `gw_profiles` | Keep survivor's row. Copy any non-null field the survivor is missing (avatar, phone, bio) from the losers, newest first. Delete loser rows. |
| `user_preferences` | Keep survivor's. Losers' preferences are discarded — confirm that is acceptable, it includes `home_tile_layout`. |
| `gw_tenant_members` | Union of memberships. Where both are members of the same tenant, keep the HIGHEST privilege role. Note `mac` has 2 rows — check which tenants before running. |
| `user_roles` / `app_roles` | Union. Survivor is already Super Admin, so this should be a no-op, but assert no privilege is LOST. |
| `gw_push_tokens` | Delete losers' tokens rather than repoint — they belong to device installs that will re-register on next launch. |
| `gw_google_connections` | Keep survivor's. Losers' OAuth grants are dead once the login is gone; delete. |

## Execution

1. **Backup first.** `CREATE TABLE merge_backup_<ts> AS SELECT` for every one of
   the 51 tables, filtered to the three user_ids, plus the full `gw_profiles`,
   `gw_tenant_members`, `user_preferences` rows. Verify row counts match the
   scope query before proceeding.
2. **Dry run.** Same script with `ROLLBACK` instead of `COMMIT`, printing a
   per-table before/after count. Review that output before the real run.
3. **Real run**, single transaction: hard conflicts (class B) FIRST, so the
   bulk repoint can't collide, then class A, then `COMMIT`.
4. **auth.users:** do NOT delete the loser rows initially — disable them
   (`banned_until` far future) so the merge is reversible. Delete only after
   Kevin confirms everything works under the survivor login.
5. **Verify:** survivor sees 280 personal scores (279 + icloud's 1); no rows
   anywhere still reference a loser uuid; Kevin can log in and reach My Music,
   planner notes, and preferences.

## Rollback

Backup tables hold every original row keyed by id. Restoring is
`UPDATE ... FROM merge_backup_<ts>` per table plus re-enabling the auth rows.
Keep the backups for at least 30 days.

## Risks

- **Storage RLS is path-based.** `personal_scores_bucket_read` matches on
  `(storage.foldername(name))[1] = auth.uid()::text`. The 279 objects sit under
  the SURVIVOR's uuid prefix, so they keep working. But icloud's 1 personal
  score sits under ITS uuid — after repointing the row, the owner policy will
  no longer match the path. Either move that object or accept it is reachable
  only via the published-tenant policy. Do not miss this.
- `owner`/`owner_id` on `storage.objects` are NULL for the imported scores, so
  storage ownership is convention-only. Consider setting them during the merge.
- Several tables were skipped by the scanner's exception handler (permission or
  type errors). Re-run the inventory and diff the skip list before executing.
- Concurrent sessions push to this repo and database. Run this when nothing
  else is writing.
