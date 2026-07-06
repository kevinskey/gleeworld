# Demo & Prospect Onboarding Redesign

**Date:** 2026-07-06
**Status:** Approved design, pre-implementation
**Owner:** Kevin Johnson

## Problem

The current demo experience confuses prospects:

- Two different demo accounts with different credentials that drift independently: the web popup (`DemoCredsPopup.tsx`) hands out `demo-admin@gleeworld.org / GleeDemo2026` (a **writable admin** account) while claiming "read-only sandbox"; the native app (`NativeTenantGate.tsx`) uses `demo@gleeworld.org / GleeDemo2026!` (the actual read-only `is_demo_viewer` account).
- The popup's sign-in link only prefills the email, so prospects land on `/auth` with an empty password field and must go back to copy the password.
- Marketing CTAs are inconsistent: "Watch a demo" opens demo.gleeworld.org, the nav "Demo" link is a `mailto:`, "Get started" opens `InquiryDialog`, and legacy `MAILTO_DEMO`/`MAILTO_PERSONAL` constants plus a raw prefilled mailto remain in `GleeWorldLanding.tsx`.
- Prospects land in the full admin Command Center with no welcome, no tour, and no way to see the student, graduate, or fan experience.
- Demo detection exists three different ways in code: slug check (`__TENANT_CONFIG__.tenant === 'demo'`), a hardcoded tenant UUID in `WorkspaceSettingsPage.tsx`, and the `demo_viewer` JWT claim.
- The in-demo conversion path ("Become a tenant") and the marketing lead form are separate flows feeding the same manual queue.

## Decisions (made with Kevin, 2026-07-06)

1. **Entry:** one-click, no credentials. Credentials never shown to prospects; the App Review account keeps its password.
2. **Landing:** guided welcome overlay + persistent demo bar with a role switcher (Director / Student / Fan).
3. **Writes:** demo stays read-only via existing `is_demo_viewer` RLS, with friendly "try it" intercepts instead of raw errors. No nightly reset needed.
4. **Conversion:** one unified concierge CTA — "Request your workspace" — feeding `gw_tenant_leads`. Kevin provisions manually via the superadmin API. All mailtos die.
5. **Scope:** web demo flow, marketing CTA cleanup, native app demo entry, and demo data refresh are all in scope.
6. **Architecture:** `demo-login` edge function + three seeded read-only demo accounts. No changes to `custom_access_token_hook`.

## The prospect journey

1. Prospect visits gleeworld.org. The marketing site has exactly two CTAs: **Try the demo** and **Request your workspace**.
2. **Try the demo** opens `https://demo.gleeworld.org/try`. The `/try` route calls the `demo-login` edge function (default role `director`), receives session tokens, calls `supabase.auth.setSession`, and routes the prospect to the Director home (Command Center). No login screen.
3. A **welcome overlay** appears once per session (sessionStorage flag): "Welcome to the Harmony Hall Choir — a fictional program running on GleeWorld. Look around freely; nothing you click can break anything." Single button: "Start exploring."
4. A **persistent demo bar** renders at the top of every page while the session is a demo session: "You're exploring GleeWorld as **Director** ▾" with role options Director / Student / Fan, plus a **Request your workspace** button. Switching roles silently re-mints a session for the corresponding account and navigates to that role's home (`useRoleBasedRedirect` paths: Command Center / student dashboard / fan page).
5. **Try-it moments:** primary create/edit actions in headline features (Calendar events, Studio, Box Office, Academy, roster) are wrapped so a demo session sees a friendly popover — "This is a preview — in your GleeWorld this would create the event" — with a link to Request your workspace. A global fallback converts any unguarded RLS write rejection into the same friendly message.
6. **Request your workspace** opens one dialog (merger of `InquiryDialog` and `BecomeTenantDialog`): name, email, school/organization, program size, modules of interest. Submits to `gw_tenant_leads` (via the existing `tenant-intake` edge function, extended as needed) and confirms: "We'll have your workspace live within 2 business days."

## Components

### Backend

- **`demo-login` edge function** (new): accepts `{ role: 'director' | 'student' | 'fan' }`, validates the role, uses the service role key to mint a session for the matching demo account, returns `{ access_token, refresh_token }`. Rate-limited per IP. Demo account passwords are stored server-side only (function secrets) and rotated after the client stops shipping credentials.
- **Three seeded accounts:** `demo-director@gleeworld.org`, `demo-student@gleeworld.org`, `demo-fan@gleeworld.org`. All have `gw_profiles.is_demo_viewer = true` and membership in the demo tenant with `tenant_role` of admin/director, student, and fan respectively. Existing read-only RESTRICTIVE RLS and the JWT claim pipeline apply unchanged.
- **Unchanged:** `custom_access_token_hook`, `demo@gleeworld.org` (App Review), `demo-admin@gleeworld.org` (Kevin's writable curator account — never shown to prospects).

### Frontend (web)

- **`/try` route** on the demo subdomain: calls `demo-login`, sets session, redirects. Shows a spinner state; on failure falls back to `/auth` with a friendly message.
- **`DemoBar`**: renders when `isDemoSession()` is true. Role switcher + Request your workspace.
- **`WelcomeOverlay`**: once per session.
- **`useDemoGuard` hook + write-guard wrapper** for headline-feature primary actions; global RLS-error interceptor as fallback.
- **`RequestWorkspaceDialog`**: unified lead form replacing `InquiryDialog` and `BecomeTenantDialog` call sites.
- **Consolidated demo detection:** single helper (slug `'demo'` for tenant-level concerns; `demo_viewer` JWT claim for session-level concerns). Remove the hardcoded `DEMO_TENANT_ID` UUID from `WorkspaceSettingsPage.tsx`; key its sandbox behavior off the slug, and show the sandbox add-on toggles only to writable demo users (no `demo_viewer` claim) — prospects get the read-only try-it treatment there like everywhere else.
- **Signup on the demo subdomain** redirects to Request your workspace instead of enrolling strangers in the demo tenant.

### Marketing site cleanup (`GleeWorldLanding.tsx`)

- Remove `DemoCredsPopup` entirely.
- Nav "Demo" mailto → "Try the demo" → `https://demo.gleeworld.org/try`.
- Hero "Watch a demo" → "Try the demo" (same target).
- All "Get started" CTAs → `RequestWorkspaceDialog`.
- Delete `MAILTO_DEMO`, `MAILTO_PERSONAL`, and the raw prefilled mailto.

### Native (Capacitor)

- `NativeTenantGate` "Try the demo choir" calls `demo-login` (default Director) instead of `signInWithPassword` with hardcoded credentials; remove `DEMO_EMAIL`/`DEMO_PASSWORD` constants from the bundle. Same welcome overlay + demo bar render in the webview. `demo@gleeworld.org` credentials remain only in App Review notes. iOS build/submission requires Kevin's explicit go-ahead (standing rule).

### Demo data refresh

- Seed script (run as `demo-admin@`/superuser against the demo tenant) populating the fictional **Harmony Hall Choir** — tenant-neutral, no Spelman references, terminology per platform standards ("students", "graduates"):
  - a season of calendar events (rehearsals, concerts, tour dates),
  - student roster with profiles,
  - setlists/repertoire,
  - a Glee Academy course with enrollment/progress,
  - a Box Office event with realistic sales,
  - a polished tenant landing page.
- Ongoing curation happens through `demo-admin@`.

## Data flow

```
Visitor → demo.gleeworld.org/try
  → POST demo-login { role: 'director' }
  → edge fn mints session for demo-director@ (service role)
  → client setSession(tokens) → JWT carries tenant_id=demo, tenant_role, demo_viewer=true
  → RESTRICTIVE RLS: reads allowed, writes blocked
  → useRoleBasedRedirect → role home

Role switch → POST demo-login { role: 'student' } → setSession → navigate
```

## Error handling

- `demo-login` failure → redirect to `/auth` with "The demo hit a snag — you can sign in manually or try again."
- Rate limit (429) → "The demo is busy — try again in a minute."
- Unguarded write attempts → global interceptor shows the friendly try-it message, never a raw Supabase error.

## Security

- No credentials in any client bundle after this ships; rotate all demo account passwords at cutover.
- `demo-login` is rate-limited per IP and only ever returns sessions for the three fixed demo accounts in the demo tenant.
- Demo accounts are `is_demo_viewer` → server-enforced read-only regardless of client behavior.

## Testing

- E2E on local preview (prod write E2E is gated): `/try` lands authenticated as Director; role switch to Student and Fan lands on correct homes; create-event attempt shows the friendly intercept (no raw error); Request your workspace writes a row to `gw_tenant_leads`; marketing page contains no mailto CTAs and no credentials popup.
- Native: simulator + on-device verification of the tap-to-demo flow.
- Verify `demo@gleeworld.org` (App Review) still signs in after password rotations of the other accounts.

## Out of scope

- Self-serve tenant provisioning / trial automation.
- Nightly demo reset (unnecessary — demo is read-only for prospects).
- Database table/column renames (e.g., alumnae → graduates migrations).

## Rollout order

1. Backend: seed three demo accounts + `demo-login` edge function.
2. Web: `/try`, `DemoBar`, `WelcomeOverlay`, demo-detection consolidation, write guards.
3. Conversion: `RequestWorkspaceDialog`, wire all CTAs, retire old dialogs/popup/mailtos.
4. Demo data refresh (Harmony Hall Choir seed).
5. Native entry alignment (build/submit only with Kevin's approval).
6. Rotate demo passwords; verify App Review account.
