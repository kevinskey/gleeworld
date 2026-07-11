# GleeWorld Planner (nav label: "Notes")

NotePlan-inspired notes + tasks + calendar planning for directors, staff, and
students. Module id `planner`; route `/planner`; nav label **Notes** (one-line
change in `src/lib/navigation/navCatalog.ts` if renamed). Design spec:
`docs/superpowers/specs/2026-07-11-gleeworld-planner-design.md`.

**v1 scope (this release): private workspace, Phases 1–3.** Shared spaces,
publishing, AI actions, voice transcription, external calendar sync, and
time-block timelines are deferred (see Limitations).

## Architecture

Vite/React SPA + self-hosted Supabase; RLS is the enforcement layer (no server
middle tier for planner). Layers:

- `src/lib/planner/` — pure libs + API modules (all Supabase access lives here;
  components never call Supabase directly):
  - `dateKeys.ts` — period keys (`2026-10-17`, `2026-W42`, `2026-10`, `2026-Q4`,
    `2026`), navigation, ranges, titles
  - `nlDates.ts` — natural-language scheduling ("friday", "every weekday",
    "October 17 at 7 PM") with an explicit parse preview contract
  - `recurrence.ts` — RRULE subset (freq/interval/byweekday/until/count);
    completing an occurrence spawns the next, history never rewritten
  - `markdown.ts` — TipTap JSON → Markdown (`content_md`) and plain text
    (`content_text`) projections on every save (notes are never trapped in
    editor JSON)
  - `wikiLinks.ts` — `[[target]]`, `#tags`, `gleeworld://entity/{uuid}` parsing
  - `templates.ts` — allowlisted `{{placeholder}}` substitution (no code exec)
  - `taskSync.ts` — the note↔task invariant (see below)
  - `notesApi.ts`, `tasksApi.ts`, `foldersApi.ts`, `templatesApi.ts`,
    `searchApi.ts`, `eventsApi.ts`
- `src/pages/planner/` — `PlannerPage` (URL-addressable workspace state),
  sidebar / period view / tasks / kanban / search / templates / trash /
  context panel components, TipTap editor (`NoteEditor.tsx`)

### The task↔note invariant

A task inside a note is a TipTap `taskItem` node carrying `attrs.blockId`
(rendered as `data-block-id`), mirrored by a `gw_planner_tasks` row keyed on
`(note_id, block_id)` (partial unique index). Note save → `syncNoteTasks`
diffs doc blocks against rows (create/update/detach/soft-delete; scheduled or
recurring tasks whose block vanished are detached, not deleted). List/kanban
mutation → `setTaskStatus` patches the row and mirrors the checkbox back into
the note doc with a version-guarded read-modify-write. Tasks are never
duplicated to appear in multiple views.

### Saves and conflicts

`saveNote` uses optimistic concurrency: `UPDATE … WHERE version = expected`.
Zero rows → `NoteConflictError` → the editor shows a conflict banner with an
explicit reload; nothing is silently clobbered. Each save writes a revision
(kept: last 50/note) and rebuilds `gw_planner_note_links`.

## Database (migration `supabase/migrations/20260711120000_planner_module.sql`)

| Table | Purpose |
|---|---|
| `gw_planner_folders` | nested folders (parent_id, CASCADE) |
| `gw_planner_notes` | notes; period notes unique per (tenant,user,type,date_key); trigram GIN on title/content_text; GIN on tags |
| `gw_planner_note_revisions` | version history (pruned to 50) |
| `gw_planner_note_links` | wiki + entity links, rebuilt on save |
| `gw_planner_tasks` | tasks; partial unique (note_id, block_id); recurrence jsonb |
| `gw_planner_templates` | system rows (tenant NULL) + user templates |
| `gw_planner_saved_filters` | saved search queries |

All tenant tables follow the house pattern: `tenant_id uuid NOT NULL DEFAULT
current_tenant_id()` + `set_tenant_id_default()` BEFORE INSERT trigger +
RESTRICTIVE `*_isolation` policy + PERMISSIVE `*_owner` policy
(`user_id = auth.uid()`). Templates differ: isolation admits system rows
(`is_system AND tenant_id IS NULL`); write policies exclude system rows.
**No admin-read policies in v1** — planner content is private to its owner by
design (shared spaces are a later phase with membership tables).

Migration also seeds 6 system templates (daily plan, weekly review, rehearsal
plan, concert production plan, meeting minutes, sectional rehearsal) and the
`gw_billing_modules` row `planner` ($0 while add-on billing is disengaged per
`20260710190000_addons_free_until_billing_launch.sql`; set a real price there
to re-engage).

DDL assertions: `supabase/migrations/tests/planner_module_test.sql` (run
against a migrated DB; BEGIN…ROLLBACK).

### RLS verification checklist (run after applying to the droplet)

1. Tenant A member: full CRUD on own rows; cannot see another member's notes.
2. Tenant A admin: cannot read members' planner notes (deliberate).
3. Tenant B anyone: zero rows from tenant A (RESTRICTIVE policy).
4. Anonymous: no access (no anon policies).
5. Everyone authenticated: can read system templates; cannot write them.

## Module wiring

- Billing catalog row `planner` (migration) → activate per tenant from
  Workspace Settings → Modules ($0 → direct toggle, no Stripe).
- `navCatalog.ts` entry key `notes` (key `planner` was already Concert
  Planner's), gate `{ module: 'planner' }`.
- `DashboardShell.tsx` MODULE_KEYS ×2, `moduleFlags.ts`/`appDestinations.ts`
  `hasPlanner`.
- `App.tsx`: `/planner` + `/planner/:noteId`, lazy, wrapped in
  `ModuleGate moduleId="planner"`.

## Routes / URL state

`/planner` = Today (daily note + gw_events + day's tasks). Views via params:
`?view=tasks|kanban|notes|search|templates|trash`,
`?view=calendar&ptype=weekly&pkey=2026-W42`, notes at `/planner/:noteId`,
notes list scopes `?folder=` / `?tag=` / `?fav=1`, saved filter `?filter=<id>`.

## Environment variables

None new. No edge functions, no external providers in v1.

## Testing

- `npx vitest run src/lib/planner src/lib/navigation` — 60+ unit tests over
  date keys, NL parsing, recurrence, markdown projection, wiki links,
  templates, task sync, plus the nav-catalog route-parity test.
- Full suite: `npm test`. Typecheck: `npm run typecheck:guard`.
- SQL: `tests/planner_module_test.sql` on a migrated database.

## Deploy notes

1. Apply `20260711120000_planner_module.sql` on the droplet as postgres
   (then run the test SQL).
2. Regenerate `src/integrations/supabase/types.ts` when convenient — planner
   API modules use local row types, so this is hygiene, not a blocker.
3. Build locally + rsync per usual (never `--delete`).
4. Toggle the module on for a pilot tenant in Workspace Settings → Modules.

## Known limitations / deferred (tracked follow-ups)

- **Shared spaces / collaboration / assignments / mentions** — Phase 4.
  Requires `gw_planner_spaces` + membership tables + new policies.
- **Publishing/share links, comments** — Phase 4.
- **AI actions, voice transcription** — Phase 5 (mirror `songwriting-ai`
  entitlement/rate-limit pattern; ElevenLabs Scribe for transcription).
  import/export files, offline queue** — Phase 5.
- **Attachments in notes** — image nodes render but there's no upload UI yet;
  use the tenant-scoped storage pattern from `src/lib/songwriting/recordingsApi.ts`.
- Wiki-link autocomplete is via the toolbar "Link note" picker; typing `[[`
  with live suggestions is a follow-up (TipTap suggestion plugin).
- Command palette (`GlobalCommandPalette`) doesn't list planner commands —
  it only sources `UNIFIED_MODULES` today (songwriting is absent too).
- Realtime sync between two open sessions is not wired; the version guard
  prevents data loss, edits appear on reload.
- Notes-table view (sortable columns) not built; list/kanban/calendar are.
- `parseSchedule` handles English only, and not event-relative phrases
  ("two days before the concert").
