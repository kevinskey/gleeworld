# Welcome Registration (minimal invited-student signup)

**Date:** 2026-08-11 · **Status:** approved by Kevin

## Problem

Teachers enroll students by email (Academy → People → Enroll students). The
invite email's magic link already signs the student in and routes them to
`/auth/callback?next=/onboarding?next=/academy/c/<slug>` — but `/onboarding`
is the full 5-step stepper (Account → Profile → Uniform & Media → Agreements
→ Review) whose Next button gates on uniform measurements and agreements.
Invited students should register with just **name, phone, email** and land
directly on their class page. The full profile happens later (as a class
assignment).

## Design

New lightweight page at `/welcome`; the existing onboarding stepper is left
untouched for every other flow.

### `/welcome` page (`src/pages/WelcomeRegistration.tsx`)

- Reads `?next=` (sanitized: must start with `/`, not `//`; default `/academy`).
- Requires a session (`ProtectedRoute skipProfileCheck`, same as
  `/profile/setup`) — the magic link establishes it.
- **Skip logic:** loads the user's `gw_profiles` row; if a phone is already on
  file (`phone_number` or `phone`), redirects straight to `next`. Re-clicking
  the invite email never nags a registered student.
- **Form (react-hook-form + zod, same conventions as ProfileSetup):**
  - Name — required. Prefilled from `full_name` unless it is the
    email-derived placeholder the `handle_new_user_profile` trigger invents
    (normalized comparison with the email local part → left blank).
  - Phone — required, `/^[+()\-\s\d]{7,20}$/` (matches ProfileSetup).
  - Email — read-only display of the session email (it is the login identity).
- **Submit:** updates `gw_profiles` with `full_name`, `first_name`/`last_name`
  (split on first space), and **both** `phone` and `phone_number` (the table
  has two duplicate phone columns; existing forms disagree — write both).
  `.eq('user_id', …).select('id')` with the ProfileSetup insert-fallback if
  zero rows come back. Then `navigate(next, { replace: true })`.
- Tenant-branded: token-based styling only (Button default variant =
  `var(--tint)`), tenant-neutral copy, light-theme card.

### Edge functions (one-line changes)

`gw-invite-student` and `gw-course-enroll` change the baked-in hop from
`/onboarding?next=<class>` to `/welcome?next=<class>`. Everything else
(user creation, enrollment, magic link, email) is untouched.

### Routing

`/welcome` registered in `App.tsx` as a lazy import wrapped in
`<ProtectedRoute skipProfileCheck>` (bypasses ProfileCompletionGuard, which
would otherwise be a no-op anyway since the trigger backfills `full_name`).

## Out of scope

- Marking `gw_student_invites.accepted_at` — students can't update that table
  under current RLS (admin-only writes); needs an edge-function change later
  if the teacher UI ever wants "accepted" state.
- Consolidating the duplicate `phone`/`phone_number` columns.
- The "profile as class assignment" — nothing to build now; existing profile
  pages serve it.

## Verification

- `tsc --noEmit` + `npm run build` clean.
- Unit tests for the placeholder-name heuristic and next-param sanitizer.
- Manual: invite a fresh email from a course People tab, click the emailed
  link, complete the 3-field form, confirm landing on `/academy/c/<slug>`;
  click the link again, confirm the form is skipped.
- Deploy note: edge functions ship separately (droplet
  `/opt/supabase/volumes/functions/`), frontend via
  `scripts/deploy-frontend.sh`.
