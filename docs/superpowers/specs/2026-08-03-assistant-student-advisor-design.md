# Assistant as Student Advisor — Design

**Date:** 2026-08-03
**Status:** Approved design, not yet planned or implemented
**Component:** `supabase/functions/assistant-chat` + new SQL view layer + alert engine

## Goal

Turn the GleeWorld Assistant from a tool-runner into an advisor that knows the
person she is talking to: what is due, how their grades are moving, whether
their attendance is becoming a problem, and what they owe.

She must serve two audiences from one brain. A student asks about themselves. A
director asks about their roster. The answer shape differs; the tools do not.

She also speaks first. When something crosses a line, she raises it rather than
waiting to be asked.

## What already exists

`assistant-chat` builds its Supabase client from the **caller's JWT**
(`index.ts:56-59`), so every query it runs is already RLS-scoped. This is the
load-bearing fact of the whole design: a student cannot read another student's
grades through the assistant, and that guarantee comes from the database, not
from prompt discipline.

The prompt already injects live identity each turn — name, tenant role, voice
part, class year — plus the last 20 thread messages and cross-thread
preferences (`prompt.ts:69-88`).

The tool catalog already gates by `minRole: 'member' | 'admin'` via
`toolsForRole()` (`toolCatalog.ts:426`).

`security_invoker = on` is established house practice (5 migrations use it, with
the caller-rights rationale documented). The `v_` view prefix is convention
(`v_cohort_attendance`, `v_command_center_feed`).

`pg_cron` is in use. `gw_notifications` exists with `metadata jsonb`, `category`,
`priority`, `action_url`/`action_label`, and `expires_at`.

**What is missing is data reach, not plumbing.** None of her 24 tools touch
academics or money.

## The problem: fragmentation

The data exists but is scattered across roughly 30 tables with inconsistent
column names and status vocabularies. Assignments live in at least
`gw_course_assignments`, `gw_assignments`, `gw_module_assignments`,
`gw_sight_reading_assignments`, `gw_parttrack_assignments`,
`music_fundamentals_assignments`, and the test tables. Grades and submissions
span `gw_course_submissions`, `assignment_submissions`,
`gw_assignment_submissions`, `test_submissions`, `discussion_grades`,
`gw_performance_grades`, `gw_final_grades`, `gw_semester_grades`,
`external_grades`. Attendance spans `gw_attendance_records`,
`gw_attendance_sessions`, `gw_event_attendance`, `gw_course_attendance`,
`gw_attendance_excuses`. Money spans `gw_student_fees`, `gw_fee_payment_plans`,
`gw_invoices`, `user_payments`, `gw_payments`, `finance_records`.

Note that several similarly-named tables are **not** in scope: `gw_personal_scores`,
`gw_study_scores`, `gw_marked_scores`, and `gw_partner_scores` are musical
scores, not grades. `gw_room_assignments`, `gw_uniform_assignments`,
`gw_seating_chart_assignments`, and `contract_user_assignments` are logistics,
not coursework.

**Scope decision: cover all live academic and financial sources.** Not a curated
subset. Sources found to be empty or missing in production are reported, not
silently dropped.

## Architecture

Chosen approach: **normalized SQL views + thin RPCs.**

Rejected alternatives:

- *Edge-function aggregator.* Easier to write in TypeScript, but the alert
  engine would have to invoke it per student — slow and expensive at roster
  scale — or duplicate its logic in SQL, reintroducing exactly the drift the
  view layer prevents.
- *Nightly denormalized snapshot.* Fast reads, but up to 24h stale. "You just
  crossed 3 absences" arriving a day late defeats the purpose. Also unnecessary:
  grade trend needs no stored history, because each submission already carries a
  score and a graded-at date.

### Schemas

Adapters live in a new `student_picture` schema, **not exposed to PostgREST**.
Public `v_student_*` views sit on top and are exposed. This gives ~30 small,
individually readable adapters without polluting the API surface, and isolates a
broken source to one small object.

### The four public views

All `security_invoker = on`, so existing RLS decides who sees what. Student gets
self, director gets roster, **no new policies required**.

```
v_student_assignments  user_id, tenant_id, source, source_id, title, course_id,
                       course_name, due_at, points_possible, status, submitted_at

v_student_grades       user_id, tenant_id, source, source_id, title, course_id,
                       course_name, points_earned, points_possible, percent,
                       letter, graded_at, category, is_final

v_student_attendance   user_id, tenant_id, source, session_id, occurred_at,
                       status, title, course_id, excuse_status

v_student_ledger       user_id, tenant_id, source, source_id, description,
                       amount_cents, direction, due_at, paid_at, status, plan_id
```

Each is a `UNION ALL` over its adapters.

### Adapters

One adapter per source table. Its entire job is normalization onto the contract
above — mapping that source's status vocabulary (`'complete'`, a boolean
`submitted`, an inferred null `graded_at`) onto the shared one, and nothing
else.

This is what makes "all sources" tractable: thirty small mappings rather than
one enormous query.

Normalized status vocabularies:

- **assignments:** `not_started`, `submitted`, `graded`, `missing`, `excused`
- **attendance:** `present`, `absent`, `late`, `excused`
- **ledger:** `outstanding`, `paid`, `overdue`, `partial`, `waived`
- **ledger direction:** `charge`, `credit`

### Grade trend

An RPC over `v_student_grades`, computed on read, not stored. It compares the
average of the last **5** graded items against the 5 before that and returns
both numbers plus the delta. The window is an RPC argument defaulting to 5, and
matches the `grade_drop` rule's trailing-5 so the assistant and the alert engine
never describe the same trend differently.

A student with fewer than 10 graded items has no prior window to compare
against. The RPC returns `has_trend: false` with whatever partial average
exists, and she says she does not have enough graded work yet rather than
inventing a direction from three data points.

Human-explainable by design: "78 over your last five, 89 over the five before"
is something a student can act on. A regression slope is not.

### Known risks in this layer

1. **A view cannot reference a table that does not exist.** Each of the ~30
   sources is verified against production before its adapter is written. Missing
   or empty tables are reported back, not quietly skipped.
2. **Roster queries touch every adapter branch.** "Who's failing?" fans out
   across the whole union. Each adapter needs `(tenant_id, user_id)` covered,
   plus partial indexes on the due/graded date columns. This is the primary
   performance risk of the approach and is addressed during build, not after
   launch.
3. **`gw_notifications` has no `tenant_id` column**, unlike most tenant-scoped
   tables. It is scoped by `user_id` alone. Its RLS must be verified before the
   alert engine relies on it.

## Assistant tools

Six new tools, all `execution: 'server'`, all read-only.

| Tool | minRole | Purpose |
|---|---|---|
| `get_assignments` | member | Upcoming and overdue work. Args: `window` (`week`/`overdue`/`all`), optional `course_id`, optional `user_id` |
| `get_grades` | member | Per-course averages, or fully itemized. Args: `detail` (`summary`/`all`), optional `course_id`, optional `user_id` |
| `get_grade_trend` | member | Two-window comparison, per course or overall |
| `get_attendance` | member | Counts by status, recent misses, distance from tenant threshold |
| `get_balance` | member | Outstanding total, line items, due dates, payment-plan state |
| `get_roster_flags` | **admin** | Students crossing a threshold. Args: `flag` (`failing`/`absences`/`missing_work`/`owes`) |

The five member tools take an optional `user_id`; blank means the caller. A
director may pass one, resolved by name through the existing `find_user`.

**`minRole` is not the security boundary — RLS is.** If a member's client ever
called `get_roster_flags`, the security-invoker view returns their own row and
nothing else. The role gate exists to keep irrelevant tools out of the model's
choice set. Two independent layers; the one that matters lives in the database.

## Prompt changes

A new advising block, in the style of the existing `newsNote` / `projectNote`
sections in `prompt.ts`:

- **Always cite the number and the date.** "You're at 4 absences; the last was
  Oct 12" — never "you've missed a few." She has exact data; vagueness is a bug.
- **Never compute what a tool can return.** No mental arithmetic on averages, no
  inferring a letter grade from a percentage the tool did not supply.
- **Lead with the actionable one.** Three concerns at once means opening with the
  nearest deadline, not reciting all three.
- **Connect the dots; hedge the causation.** "Your quiz average dropped and you
  missed the two sectionals before it" is useful. "You're failing because you
  skip" is not hers to say.
- **Money is a different register.** Factual, non-shaming, and it names the path
  (`open_page` to fees).
- **Voice-mode discretion.** Grades and balances get read aloud in rooms with
  other people in them. Headline aloud, detail on request — never an itemized
  ledger recited to a rehearsal hall.

## Alert engine

Deterministic SQL rules fire alerts; the assistant supplies the wording.

### `gw_alert_rules`

`(tenant_id, kind, config jsonb, enabled, severity)`. Seeded with defaults per
tenant, editable by the director.

| Kind | Default |
|---|---|
| `assignment_due_soon` | 48h before due, unsubmitted and ungraded |
| `assignment_overdue` | past due, no submission |
| `grade_drop` | trailing-5 average fell ≥10 points vs prior 5 |
| `grade_below` | course average under 70 |
| `attendance_threshold` | 3 unexcused absences in the current term |
| `balance_overdue` | outstanding ≥7 days past due |

"Current term" means the active row in `gw_semesters` for that tenant. If the
tenant has no active semester, attendance rules evaluate over a rolling 90 days
rather than silently matching nothing.

`severity` is one of `info`, `warning`, `urgent`, and maps to the existing
`gw_notifications.priority` integer on write.

### `gw_alert_state`

`(tenant_id, user_id, kind, subject_id)` unique, plus `last_fired_at`,
`last_value`, `resolved_at`.

This is what prevents nagging. An alert re-fires only when the **situation
changes** — a fourth absence, a further drop, a newly overdue item — not every
night because the condition remains technically true.

### `run_student_alerts()`

A SQL function on `pg_cron`, nightly, evaluating rules over the same four views
the assistant reads. Same rows, same truth — it is structurally impossible for
her to contradict the bell badge.

It stamps `last_run_at` so a silently dead cron job is visible rather than
looking like a quiet week.

### Structured storage, speak-time phrasing

**The cron job stores structured data; the assistant phrases it when you talk.**

The job writes `metadata` such as:

```json
{"kind": "attendance_threshold", "count": 4, "threshold": 3,
 "last_absence": "2026-10-12", "course_id": "..."}
```

plus a plain `message` for the bell UI. She generates the spoken sentence at
conversation time from that payload.

Three consequences:

1. No model call in cron — a nightly run across a full roster costs nothing.
2. A stored alert can never contain a hallucinated number.
3. Her wording adapts to context — brief in voice mode, fuller on screen — from
   a single stored row.

### Delivery

**In-app only.** Alerts write to `gw_notifications` (bell badge) and she leads
with them next time you talk. No push, SMS, or email in this scope — which
removes consent, per-message cost, delivery-failure handling, and quiet-hours
scheduling from the design entirely.

`schedule-fee-reminders` already exists and nags about money. It is **absorbed**
by `balance_overdue`, not run alongside it, so students do not get told twice.

### Briefing

`get_my_briefing` — unread alerts ordered by nearest deadline, plus the compact
picture. She calls it when a session opens with no specific question. This is
what turns "she has tools" into "she noticed."

### Director settings

A thresholds page under admin: six rules, a number and a toggle each.

## Error handling

**The failure case that matters most is silence.** Zero rows from
`get_assignments` means one of three unrelated things: genuinely caught up, no
work was ever posted, or RLS declined to show it. Collapsing these into "you're
all set!" would congratulate someone on a clean record she could not actually
read.

Every tool therefore returns two fields alongside its rows:

- `has_data: boolean` — whether any rows came back
- `scope: 'self' | 'other'` — whose picture this is. `'other'` means a director
  passed a `user_id`; it is set from the request, not from the result, so an
  empty result still carries the fact that someone specific was asked about.

The prompt maps them explicitly:

- no records → "I don't have any assignments on record for you"
- a director asking about a student who resolves to nothing → "I can't see any
  records for Maya" — **not** "Maya has no assignments"

Other paths follow existing convention: tool errors surface plainly under the
current rule (`prompt.ts:146`).

## Testing

- **One test per adapter.** Seed a row in the source, assert it surfaces in the
  union with correctly normalized status. ~30 small tests. This is the only
  thing keeping "all sources" honest — a mis-mapped status silently makes
  someone look caught-up when they are not.
- **Rule tests at the boundary.** A student exactly at threshold, one under, one
  over. Plus run the job twice and assert one alert — that is the dedupe
  contract.
- **Trend math gets its own test.** Window slicing is where the off-by-one lives.
- **Executors** via the existing `assistant-chat/__tests__/` vitest setup with a
  mocked client.

## Rollout

Five phases, each independently shippable.

1. **View layer.** Adapters, views, RPCs. Invisible to users. Ends with a report
   on which of the ~30 sources are live, empty, or missing.
2. **Member tools + prompt.** She can answer. This phase alone satisfies the
   original request.
3. **Director scope.** `get_roster_flags` and cross-student lookups.
4. **Alert engine in dry-run.** Rules, settings UI, cron writing to a log table
   instead of `gw_notifications`.
5. **Go live.** Read the dry-run output, tune thresholds, flip it on, enable the
   briefing.

**Dry-run is not optional.** Thresholds are guesses until they meet a real
roster. The failure mode is 200 students waking up to twelve notifications
each on day one, which costs their trust permanently. It is cheap to build and
is the difference between a launch and an incident.

## Out of scope

**Guardians.** `gw_guardians` exists, and parents seeing grades and balances is a
reasonable next ask — but it is a different recipient model with a real FERPA
posture, and folding it in here would double the design. Separate spec.

**Push / SMS / email delivery.** Deliberately excluded per the delivery decision
above. The alert engine writes structured rows; adding a channel later means
reading those rows, not rebuilding the engine.

## Operational notes

- Migrations are applied by Kevin via `!` as `supabase_admin`. The self-hosted
  instance has no `schema_migrations` table — verify by object, not by stamp.
- Edge functions deploy through `scripts/deploy-functions.sh`.
- Frontend (settings page) deploys through `scripts/deploy-frontend.sh`.
