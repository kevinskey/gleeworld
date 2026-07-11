# GleeWorld Planner — Design Spec (First Release: Phases 1–3 Vertical Slice)

Date: 2026-07-11
Status: Approved scope per user directive ("implement after audit; Phases 1–3 first build")

## What this is

A NotePlan-inspired notes + tasks + calendar-planning add-on module for GleeWorld, built
for ensemble directors, educators, staff, and students. Original product — no NotePlan
code, branding, or layout copied.

Naming: the product is **GleeWorld Planner**; module id `planner`; the dashboard nav item
is labeled **Notes** (user's explicit request), route `/planner`. Renaming the label later
is a one-line change in `navCatalog.ts`.

## Release boundary

**This build (v1):** private-workspace vertical slice of Phases 1–3.

- Notes CRUD with TipTap editor (Markdown-portable), autosave, save-state indicator
- Calendar/period notes (day, week, month, quarter, year) created lazily by stable date key
- Folders (nested), favorites, trash (soft delete), note revisions
- Inline tasks inside notes, synchronized with a relational task table
- Task scheduling (natural-language date parsing), simple recurrence, carry-forward,
  task list views (Today / Upcoming / Overdue / All / By note), kanban by status
- Wiki links `[[...]]` with autocomplete, backlinks panel, links to GleeWorld entities
- Tags (`#tag`, inline text[] per repo convention), tag filter views
- Server-side search (trigram GIN on title + content_text)
- Templates (system-seeded + user-created) with safe `{{placeholder}}` substitution
- Today view: gw_events for the date + daily note + tasks due
- Module gating via `gw_billing_modules` row `planner` ($0 while add-on billing is
  disengaged, per 2026-07-10 policy), toggleable from Workspace Settings

**Deferred (documented, interfaces left clean):** shared spaces/collaboration, publishing/
share links, comments, AI actions, voice transcription, external calendar sync (Google/
Outlook/ICS), time-blocking timeline, offline queue, import/export beyond Markdown copy,
notifications for mentions/assignments. Deferral markers live in docs/gleeworld-planner.md.

## Architecture (repo-mapped)

Vite + React 18 SPA + self-hosted Supabase. No Next.js server actions — the repo pattern
is: typed API modules in `src/lib/<module>/` calling Supabase with RLS as the enforcement
layer; edge functions only where secrets/metering are involved (none needed in v1).

### Module registration (songwriting recipe)

1. Migration inserts `gw_billing_modules` row `id='planner'`, tier `addon`,
   `monthly_price_cents=0` (billing disengaged), icon `NotebookPen`.
2. `src/lib/navigation/navCatalog.ts`: entry `{ key:'planner', to:'/planner',
   label:'Notes', icon: NotebookPen, section:'plan', gate:{ module:'planner' } }`.
3. `DashboardShell.tsx` MODULE_KEYS (both occurrences) + `moduleFlags.ts` +
   `appDestinations.ts` ModuleFlags gain `planner`.
4. `src/App.tsx`: lazy route `/planner` (+ `/planner/:noteId`) wrapped
   `ProtectedRoute > UniversalLayout > DashboardShell > ModuleGate moduleId="planner"`.

### Database (migration `20260711120000_planner_module.sql`)

Tables (all follow the sight-reading-takes template: `tenant_id uuid NOT NULL DEFAULT
public.current_tenant_id()` + `set_tenant_id_default()` BEFORE INSERT trigger +
RESTRICTIVE `*_isolation` policy + PERMISSIVE owner policy; `(tenant_id)` and
`(user_id, ...)` indexes):

- `gw_planner_folders` — id, tenant_id, user_id, parent_id (self-FK, ON DELETE CASCADE),
  name, position, created_at, updated_at
- `gw_planner_notes` — id, tenant_id, user_id, folder_id (FK SET NULL), note_type
  CHECK ('note','daily','weekly','monthly','quarterly','yearly'), date_key text
  (e.g. 2026-10-17 / 2026-W42 / 2026-10 / 2026-Q4 / 2026), title, content jsonb
  (TipTap doc), content_text text (plain-text projection for search), content_md text
  (portable Markdown projection), tags text[], properties jsonb, is_favorite bool,
  entity_type text NULL, entity_id uuid NULL (typed GleeWorld entity link),
  deleted_at timestamptz NULL, version int, created_at, updated_at.
  UNIQUE (tenant_id, user_id, note_type, date_key) WHERE note_type <> 'note'.
  Trigram GIN on title and content_text; GIN on tags.
- `gw_planner_note_revisions` — id, tenant_id, note_id FK CASCADE, user_id, content jsonb,
  content_md, title, version, created_at. Written on save when content changed
  meaningfully; retention pruned to last 50 per note by the save API.
- `gw_planner_note_links` — id, tenant_id, note_id FK CASCADE, target_note_id FK CASCADE
  NULL, target_entity_type text NULL, target_entity_id uuid NULL, link_text,
  created_at. Rebuilt on save. Backlinks = query by target_note_id.
- `gw_planner_tasks` — id, tenant_id, user_id, note_id FK SET NULL, block_id text
  (stable id of the taskItem node in the note doc), title, status CHECK
  ('open','done','cancelled'), priority CHECK ('none','low','medium','high','urgent'),
  due_at timestamptz, scheduled_date date, completed_at, recurrence jsonb NULL
  (simple RRULE subset: freq, interval, byweekday, until, count), recurrence_parent_id
  uuid NULL, tags text[], position, deleted_at, created_at, updated_at.
  Indexes on (tenant_id), (user_id, scheduled_date), (user_id, status), (note_id).
- `gw_planner_templates` — id, tenant_id NULL for system rows, user_id NULL for system,
  is_system bool, name, description, note_type, content jsonb, content_md, is_active,
  created_at, updated_at. System templates readable by all authenticated; tenant/user
  templates follow standard isolation. Seed: daily plan, weekly review, rehearsal plan,
  concert production plan, meeting minutes, sectional rehearsal.
- `gw_planner_saved_filters` — id, tenant_id, user_id, name, query jsonb, position.

Admin read policies are intentionally **omitted** in v1 — planner content is private to
its owner (unlike attendance data). Shared spaces arrive in Phase 4 with their own
membership tables and policies.

Companion test SQL: `supabase/migrations/tests/planner_module_test.sql` asserting
tenant defaults, RESTRICTIVE policies, unique period-note key, and CHECK constraints.

### Task ↔ note synchronization (the load-bearing design)

Tasks are relational rows; notes embed them as TipTap `taskItem` nodes carrying a
`data-task-id` attribute (custom TaskItem extension). One source of truth per field:

- Note save → `syncTasksFromDoc(note)`: walk the doc, upsert tasks by block_id
  (title, checked→status, position, note_id), soft-delete tasks whose block vanished
  (unless scheduled — then detach note_id so the task survives in lists).
- Task mutation from any list/kanban → update row, and if note_id present, patch the
  note's jsonb (checked attr / text) via a single `update_planner_task_in_note` flow in
  the API layer (read-modify-write with version check to avoid clobbering).
- Completing a recurring task spawns the next occurrence row (recurrence_parent_id).

### Client code layout

- `src/lib/planner/` — `types.ts`, `dateKeys.ts` (period key math), `nlDates.ts`
  (natural-language parsing on date-fns), `recurrence.ts`, `wikiLinks.ts` (parse +
  serialize), `markdown.ts` (TipTap JSON → Markdown/plain-text projections),
  `templates.ts` (safe {{var}} substitution, allowlisted vars), `notesApi.ts`,
  `tasksApi.ts`, `foldersApi.ts`, `templatesApi.ts`, `searchApi.ts`, `__tests__/`.
- `src/pages/planner/` — `PlannerPage.tsx` (three-panel shell on ui/resizable, mobile
  sheet for sidebar), `components/` — `PlannerSidebar`, `NoteEditor` (TipTap +
  TaskItem/TaskList from @tiptap/extension-list, wiki-link suggestion, slash menu),
  `PeriodNoteHeader` (prev/next/today/date picker), `TodayView`, `TasksView`,
  `KanbanView`, `BacklinksPanel` (right panel: backlinks, note properties, day events),
  `TemplatePicker`, `SearchView`.
- React Query throughout; query keys `['planner-notes', ...]` etc.; date-fns v4.

### Types

`src/integrations/supabase/types.ts` is generated (32k lines). v1 adds the new tables'
Row/Insert/Update types via hand-authored augmentation kept in the same style, or the
API layer types the rows locally — whichever matches how songwriting handled it
(checked during implementation). Regeneration happens at deploy time per repo practice.

### Search

`searchApi.search(q, filters)`: server-side `.or(ilike title/content_text)` leveraging
trigram indexes, plus tag/status/type/date-range filters as query params. No client-side
full scans. Saved filters persist the filter object.

### Testing

Vitest unit tests for dateKeys, nlDates, recurrence, wikiLinks, templates, markdown
projection, task-sync doc walker (pure function over TipTap JSON). SQL assertions in the
migrations tests folder. Repo has no integration/E2E harness wired for CI; the E2E recipe
(Playwright) is documented as a follow-up per reference_gleeworld_e2e_harness.

### Accessibility & visual

Existing shadcn primitives (keyboard-navigable), semantic tokens (`bg-card`,
`text-foreground`), light-first surfaces, text-xs/text-sm minimums, no bare-heading color
rules. Kanban and rescheduling get menu-based alternatives to drag-and-drop.

## Definition of done for v1

A tenant member with the planner module active can: open Notes from the dashboard nav;
see Today (events + daily note + due tasks); write/format notes; create inline tasks;
schedule/reschedule (incl. natural language); create simple recurring tasks; complete
tasks from note, list, or kanban and see it reflected everywhere; create project/
rehearsal/meeting/concert notes from templates; wiki-link notes and see backlinks; tag,
favorite, folder, search, and save filters; recover trashed notes and prior revisions;
use it on mobile widths. Tenant B never sees tenant A's planner rows (RLS-enforced).
