# Attendance-Linked Stipends — Design

**Date:** 2026-08-06
**Status:** Approved for Round One
**Area:** Finance module (`/dashboard/finance`), Attendance

## Problem

Students receive a stipend per semester. Full attendance earns the full stipend;
missed services reduce it. Today the two halves are disconnected:

- Attendance is captured well — `gw_event_attendance` rows arrive from QR, PIN,
  and roll-call flows, with an excuse-approval workflow on top.
- Stipends are a flat number derived from `contracts_v2.stipend_amount` and
  surfaced by `StipendManagement.tsx`. Nothing about attendance touches it.

The missing layer is the agreement itself: how much, over how many services,
and what a miss costs.

## Decisions

**Reduction model: per-service share (pro-rata).** One service is worth
`stipend_amount ÷ required_services`. The admin enters the amount and the
service count; everything else is computed. No second set of penalty numbers
to keep in sync with the first.

**Status credit is a configurable weight**, not a hardcoded rule. Each
attendance status carries a credit weight the tenant sets. Defaults:

| Status | Weight |
|---|---|
| `present` | 1.0 |
| `late` / `tardy` | 0.5 |
| `excused` | 1.0 |
| `absent` | 0.0 |

Both `late` and `tardy` appear in existing data and map to the same weight.

**The contract-driven stipend flow is superseded.** A signed contract may seed
an award's base amount, but the period model is the single source of truth for
what a student has earned. Running both would produce two different answers for
the same student.

**Earned amounts are derived, never stored** — until a period closes, at which
point they are snapshotted so paid history cannot be silently rewritten by a
later attendance edit.

## The Calculation

```
per_service_value = stipend_amount ÷ required_services
credited_services = Σ weight(attendance_status) over countable events
earned            = clamp(stipend_amount × credited_services ÷ required_services,
                          0, stipend_amount)
forfeited         = stipend_amount − earned
```

`required_services` is the number the admin **types**, not a count of calendar
rows. That number is the agreement with the student. If the countable event set
drifts away from it, the UI surfaces the discrepancy but the math still honors
the agreed figure.

Attending more than the required count clamps at the full stipend — over-
attendance never pays a bonus.

## Data Model

Three new tables plus one view. All carry the standard tenant boilerplate:
`tenant_id UUID NOT NULL DEFAULT public.current_tenant_id()`, a
`BEFORE INSERT` coalesce trigger, RLS enabled, and a `RESTRICTIVE`
`tenant_isolation_restrict` policy.

### `gw_stipend_policies`

The status→weight map, versioned. Closing a period pins the policy version it
was judged under, so re-reading a closed period reproduces the original
numbers even after the tenant edits their weights.

- `weights JSONB` — `{"present":1.0,"late":0.5,"tardy":0.5,"excused":1.0,"absent":0.0}`
- `rounding TEXT` — `cent` (default) | `dollar`
- `version INT`, `is_active BOOLEAN`

Unknown statuses not present in the map contribute zero credit and are counted
separately as `unmapped` so an admin can see and fix a typo'd status rather
than having it silently cost a student money.

### `gw_stipend_periods`

- `name TEXT` — "Fall 2026"
- `starts_on DATE`, `ends_on DATE`
- `default_amount NUMERIC(10,2)` — seeds each award
- `required_services INT` — the typed denominator
- `event_filter JSONB` — which events count (see below)
- `policy_id UUID`, `policy_version INT`
- `status TEXT` — `draft` | `active` | `closed` | `paid`

### `gw_stipend_awards`

One row per student per period.

- `period_id`, `user_id`
- `base_amount NUMERIC(10,2)` — defaults from the period, overridable per student
- `required_services_override INT NULL` — for mid-period joiners
- `enrolled_on DATE NULL`
- `final_amount NUMERIC(10,2) NULL` — written only at close
- `override_amount NUMERIC(10,2) NULL`, `override_reason TEXT NULL`
- `status TEXT` — `active` | `closed` | `paid`

An override requires a reason. This is the appeal path for a late-approved
excuse or a director's judgment call, and it must leave a record.

### `v_stipend_standing` (view)

Joins awards → countable events → `gw_event_attendance` → policy weights.
Returns per student: `credited_services`, `required_services`, `absences`,
`unmapped_count`, `earned`, `forfeited`, `per_service_value`.

A view rather than a materialized table: at this scale (hundreds of students ×
dozens of events per tenant) the query is cheap, and it cannot drift out of
sync with attendance the way a trigger-maintained column would.

## Which Events Count

`event_filter` selects from `gw_events` within the period's date range. Round
one supports filtering on `event_type` / `category` and requires
`attendance_required = true`.

Three exclusions matter more than the filter itself, because getting them wrong
is how this feature loses the room:

1. **Attendance must actually have been taken.** An event with zero
   `gw_event_attendance` rows is excluded from both numerator and denominator.
   If nobody ran roll call, every student is not absent.
2. **Cancelled events drop out** — `gw_events.status = 'cancelled'` is never
   countable.
3. **Mid-period joiners** are only measured against events on or after
   `enrolled_on`, with `required_services` prorated accordingly.

## Lifecycle

`draft` — period configured, roster assembled, nothing visible to students.

`active` — standing recomputes live on every attendance write. Students see
their running total.

`closed` — the view's output is snapshotted into `final_amount`. Overrides can
still be applied with a reason; attendance edits no longer move the number.

`paid` — out of scope for round one (see below).

## Student View

A "My Stipend" card: potential amount, currently earned, absence count, and
what the next service is worth. This running number is the actual behavior
change mechanism; the finance ledger is only the settlement.

## Round One Scope

**In:** policies, periods, awards, the standing view, the admin configuration
and roster screen, and the student card. `StipendManagement.tsx` is rebuilt
around periods.

**Out:** payout. Writing to `gw_stipend_payments` and posting to
`gw_running_ledger` moves money and deserves its own review pass. Round one
ends at a closed period with authoritative final amounts, ready to pay.

## Testing

- Unit tests for the calculation: exact division, rounding at cent boundaries,
  the over-attendance clamp, zero required services (guard against divide by
  zero), all-absent, unmapped status.
- A `supabase/migrations/tests/` assertion file following the existing
  convention: tenant defaults present, coalesce trigger bound, RLS enabled,
  RESTRICTIVE policy present on all three tables.
- Cross-tenant isolation: a period in tenant A is invisible to tenant B.
- The "no attendance taken" exclusion, asserted directly — it is the highest
  consequence rule in the design.
