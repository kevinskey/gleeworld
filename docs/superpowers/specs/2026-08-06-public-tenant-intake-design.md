# Public Tenant Intake — Appointments & Auditions

**Date:** 2026-08-06
**Status:** Approved design, ready for implementation planning
**Branch:** `feat/public-tenant-intake`

## Problem

Interactions offered by public-site blocks on tenant landing pages are supposed to be
public. Two of them are not.

**Appointments — hard login wall.** The `appointment-booking` block's CTA defaults to
`/book-appointment` (`src/components/public-site/blocks/appointment-booking.tsx:64,526`).
`src/App.tsx:1063` redirects that path to `/dashboard/office-hours`, which is wrapped in
`<ProtectedRoute>`. A visitor who clicks "Book now" on a tenant's public page is bounced
to the login screen. No public booking surface exists anywhere in the app.

**Auditions — dead end at the finish line.** `/auditions` is a `PublicRoute` and
`AuditionPage.tsx:298` does branch into a six-page anonymous flow. But account creation is
step *one* (`src/components/audition/pages/RegistrationPage.tsx:40`), calling
`supabase.auth.signUp` from the browser. When email confirmation is enabled — and
`src/pages/AuthPage.tsx:168` indicates it is — `signUp` returns a user but **no session**.
`useAuth().user` stays null, so the visitor completes all six pages and then hits
`AuditionPage.tsx:44`: *"Please log in to submit your audition form."* Every answer they
typed is discarded.

Public RSVP does not exist at all — the `events` block has no CTA or RSVP control. It is
explicitly **out of scope** here and gets its own spec once this engine is proven.

## Goals

- No public interaction requires an existing login.
- Where registration is genuinely required, say so plainly before the visitor invests
  effort, then register them as part of the submission.
- Finishing the audition interview leaves the person registered on the site, with a
  confirmation email and a welcome SMS already sent.
- Every `appointment-booking` block already saved in a tenant's page config starts working
  again without the tenant re-editing it.

## Non-goals

- Public RSVP on the events block (separate spec).
- Reworking the authenticated Studio Hours experience at `/dashboard/office-hours`.
- Removing the audition selfie requirement (`AuditionPage.tsx:50`). It is real friction on
  a public form, but it is existing product behavior and changing it is a product call, not
  a bug fix.

## Architecture

### The shared intake engine

One new anon-callable Supabase Edge Function, `public-intake`, is the only new backend
component. Both flows post to it. It accepts:

```
{ kind: 'appointment' | 'audition',
  account: { email, password, full_name, phone? },
  payload: { …flow-specific… } }
```

Ordering inside the function matters and is fixed:

1. **Pre-flight validation — no side effects.** Rate limit, required fields, and every
   condition that could reject the submission: for auditions, that an active
   `audition_sessions` row exists; for appointments, that the service is active and the
   slot is free. Nothing has been created at this point, so a failure here is clean.
2. **Resolve the account.** Look up `account.email`.
   - **Existing account:** do *not* modify it in any way — no password write, no metadata
     merge. Link the domain record to that `user_id` and return
     `{ account_status: 'existing' }`. The UI tells the visitor they already have an
     account and points them at sign-in. This is what keeps the endpoint from being an
     account-takeover vector.
   - **New account:** provision via the admin API with `email_confirm: true`. Auto-
     confirming is deliberate — confirmation-link limbo is precisely what breaks the
     current flow, and the person proves control of the address by receiving the
     confirmation email in step 4.
3. **Write the domain record** with the resolved `user_id`. **If this write fails and we
   created the account in step 2, delete that account** before returning the error. The
   account must come first because `audition_applications.user_id` is
   `NOT NULL REFERENCES auth.users(id)` — the record cannot exist without it — so the
   no-orphan guarantee is enforced by this compensating delete rather than by ordering.
   An account that existed beforehand is never deleted.
4. **Notify.** Confirmation email, then welcome SMS.

Pre-flight validation plus the compensating delete together mean a failed submission
leaves no orphan account. A failure in step 4 is logged but does not fail the submission —
the record is real whether or not the SMS gateway is up.

**Rate limiting is required, not optional.** `public-intake` accepts a password from an
unauthenticated caller, which makes it an open account-creation endpoint without one.
Limits are 5 submissions per email per hour and 20 per source IP per hour, enforced inside
the function so they cannot be bypassed by calling the underlying RPCs directly.

### Appointments

- New page at `/book`, wrapped in `PublicRoute`: service picker → open slots → name,
  email, phone, password. Section copy states up front that booking creates an account.
- `book_appointment` (`supabase/migrations/20260211155714_*.sql`) is already
  `SECURITY DEFINER` and takes customer identity as parameters rather than reading
  `auth.uid()` — it uses `auth.uid()` only for `created_by`. `public-intake` calls it with
  the service role and then patches `created_by` to the resolved user. It is deliberately
  **not** granted to `anon`: routing every public booking through the edge function is what
  makes the rate limit unbypassable.
- The page does need two anon reads to render: `gw_services` (already permitted by the
  "Anyone can view active services" policy, `20250806024934_*.sql`) and the
  `get_available_time_slots` RPC, which needs `GRANT EXECUTE … TO anon`. Both are
  read-only and expose nothing beyond what the block already advertises publicly.
- `tenant_id` continues to come from the `current_tenant_id()` column default and the
  BEFORE INSERT trigger; anon requests carry `x-tenant-slug`, which `current_tenant_id()`
  is subdomain-aware about. No tenant plumbing changes.
- Block default `bookingUrl` changes `/book-appointment` → `/book` in both places
  (`appointment-booking.tsx:64` fallback and `:526` default config), and the `App.tsx:1063`
  redirect retargets to `/book`. The redirect change is what repairs every block config
  already saved in the wild.

### Auditions

- `RegistrationPage` moves from step 1 to the final step and is renamed to reflect what it
  now does ("Create your account & submit"). It collects email, password, and phone
  alongside profile data the visitor has already supplied.
- It stops calling `supabase.auth.signUp`. The complete payload posts to `public-intake` on
  final submit.
- The `if (!user)` bail at `AuditionPage.tsx:44` is deleted. The two-branch page ordering at
  `AuditionPage.tsx:298` collapses: an already-signed-in user skips the account step, but
  the submit path is identical for both.
- In-progress answers persist to `sessionStorage` so a refresh or an accidental
  back-navigation mid-interview does not wipe the form.

### Confirmation email and welcome SMS

- Email: auditions reuse `supabase/functions/send-audition-confirmation-email`; bookings get
  a sibling function following the same shape.
- SMS: routed through `supabase/functions/gw-send-sms`, which requires an authenticated
  caller (`_shared/auth.ts`); `public-intake` calls it with the service-role key, which
  `authenticateCaller` resolves to `{ internal: true }`.
- **`_shared/branding.ts:getOrgName()` must not be used on this path.** It selects from
  `gw_branding_settings` with `.order("id").limit(1)` and caches the result globally — under
  service role, which bypasses RLS, that returns an arbitrary tenant's name and then pins it
  for 60 seconds. A new tenant-scoped helper resolves branding by slug instead. Fixing
  `getOrgName` itself is out of scope, but its other callers are suspect for the same reason
  and are worth a follow-up.
- **The SMS body is a per-tenant template, not a hardcoded string.** One build serves ~50
  tenants, so "Thank you for coming to Doc's World!" cannot be compiled in. Add a
  `welcome_sms_template` column to `gw_branding_settings`, defaulting to
  `Thanks for joining {org_name}!`, with `{org_name}` and `{first_name}` substituted at
  send time. The Doc's World tenant sets its own copy there.
- Writes to `gw_branding_settings` must use `onConflict: 'tenant_id'` with a
  `getTenantSlug()` pin — a bare upsert has poisoned the main tenant's row twice before.
- SMS sends only when a phone number was supplied and the tenant has SMS configured. A
  missing phone is a no-op, never an error surfaced to the visitor.

## Data flow

```
Visitor (anon, x-tenant-slug header)
  → /book  or  /auditions          [PublicRoute, no session]
  → POST public-intake             [anon-callable edge function, service role inside]
      ├─ pre-flight validate       → rate limit, active session / free slot — no writes
      ├─ resolve account by email  → existing? link, never modify
      │                            → new? create, email_confirm: true
      ├─ write domain record       → book_appointment RPC | audition insert
      │      └─ on failure         → delete the account we just created, return error
      └─ notify                    → confirmation email + welcome SMS (failures logged only)
  → success screen: "You're registered. Check your email."
```

## Error handling

| Condition | Behavior |
|---|---|
| Email already has an account | Record still created and linked. Success screen says the account exists and links to sign-in. No password write. |
| Slot taken between load and submit | Caught in pre-flight. No account created; visitor is returned to slot selection with the taken slot removed. |
| No active audition session | Caught in pre-flight. Rejected with the existing "contact administration" message. No account created. |
| Domain write fails after account creation | The just-created account is deleted before the error returns. A pre-existing account is never touched. |
| Email or SMS send fails | Logged; submission still reported successful. The record is real. |
| Rate limit tripped | Generic "try again shortly" — no disclosure of whether the email is registered. |
| Tenant has no SMS configured, or no phone given | SMS silently skipped. |

## Testing

Testable logic lives in a pure `_shared/publicIntake.ts` module whose I/O is injected, so
vitest can drive it in Node without a Deno runtime — the pattern
`_shared/__tests__/permissionSlipToken.test.ts` already establishes. The
`public-intake/index.ts` entry point stays a thin Deno wrapper that supplies real
dependencies.

- Unit: account resolution — new email, existing email, malformed email; assert an existing
  account is never mutated.
- Unit: no-orphan guarantee — a forced domain-write failure deletes the created account, and
  a forced failure with a *pre-existing* account deletes nothing.
- Unit: pre-flight rejection creates no account and sends nothing.
- Unit: SMS template substitution, including a tenant with no template set (falls back to
  the default) and one with no SMS configured (skips).
- Unit: rate-limit evaluation at, just below, and just above each threshold.
- Integration: anon can read active services and call `get_available_time_slots`, and
  `book_appointment` remains un-callable by anon.
- E2E (Playwright, existing harness): public visitor with no session books an appointment
  end to end; public visitor completes the six-page audition and lands registered.
- Regression: a block config still holding `/book-appointment` reaches the public booking
  page, not the login screen.
