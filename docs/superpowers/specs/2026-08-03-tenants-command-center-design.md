# Tenants Command Center — unify /admin/tenants and /superadmin/

**Date:** 2026-08-03
**Status:** Approved by Kevin

## Problem

Platform tenant management is split across two surfaces:

- **`/admin/tenants`** (`src/pages/admin/PlatformTenantsPortal.tsx`) — the React
  "Platform Home" inside the command center. Tenant cards with Site / Enter /
  Pages actions, search, refresh, and `CreateTenantDialog`.
- **`/superadmin/`** (`public/superadmin/index.html`) — the static landlord
  console. Has three functions the React page lacks: platform stats, staged
  provisioning (hold the welcome email + show-once temp password), and a
  per-tenant "Resend welcome" button.

Both talk to the same superadmin API (nginx proxies `/superadmin/api/*` →
`127.0.0.1:3035`), authenticated with the SPA's Supabase session JWT and gated
server-side to main-tenant super-admins. Kevin wants one page — "Tenants" in
his command center — with all of it.

## Approach

Enhance the existing React page in place. Frontend-only: the API already
supports `staged`, `temp_password`, and `POST /tenants/:id/resend-welcome`
(shipped with the Aug 2 staged-setup work, commit `36893e604`). The sidebar
already has the "Tenants" nav entry gated `platformAdminOnly`
(`src/lib/navigation/navCatalog.ts:119`), and `pickDestination()` already lands
the platform owner on `/admin/tenants` after login. No new routes, no server
changes, no migrations.

## Changes

### 1. Platform stats strip (`PlatformTenantsPortal.tsx`)

- New query against `GET /superadmin/api/stats` using the same
  `Bearer <session.access_token>` pattern as the tenant-list query.
- Rendered above the search box as a row of compact stat tiles: big number,
  small muted label (underscores in keys become spaces). Only render entries
  whose value is a number or string, mirroring the static console.
- Failure mode: a quiet muted "Stats unavailable" line. The strip must never
  block or delay the tenant list.
- Styling follows the light-theme tokens and compact studio sizing rules
  (white cards, `text-xs`/`text-sm` labels).

### 2. Staged provisioning in `CreateTenantDialog.tsx`

- Add a "Staged setup — don't email the admin yet" checkbox, **default ON**
  (matches the static console's default).
- Pass `staged` in the existing POST `/superadmin/api/tenants` body alongside
  the current fields (plan tiers, deployment path, custom domain all stay).
- Success screen handles the staged response:
  - `resp.staged && resp.temp_password` → highlighted show-once panel with the
    temp password (`select-all` so it copies in one click), and a warning that
    it is shown only once.
  - `resp.staged` without a password → "admin already had an account; their
    existing password is unchanged."
  - Toast copy switches: staged → "provisioned STAGED — no email sent. Press
    Resend welcome at handoff." / instant → current "admin invite sent" copy.

### 3. Resend welcome on tenant cards (`PlatformTenantsPortal.tsx`)

- Card actions become a 2×2 grid: Site / Enter / Pages / **Welcome** (Mail
  icon). Hidden on the `main` platform card.
- Click → confirm dialog (AlertDialog): "Email a fresh temp password to this
  tenant's admin? This invalidates any staged password." → on confirm,
  `POST /superadmin/api/tenants/:id/resend-welcome` → success/destructive
  toast. Button disabled while the request is in flight.

### 4. Static console becomes break-glass (`public/superadmin/index.html`)

- Keep the page fully functional — it deliberately ships in `public/` so every
  deploy carries it, after the June 2026 rsync wipe of the server-only console.
- Add one muted line under the `<h1>`: day-to-day console now lives at
  `gleeworld.org/admin/tenants`; this page is the emergency fallback.

## Error handling

Reuse existing patterns: destructive toasts for failed create/resend, muted
inline text for failed stats/tenant loads. The `openTenantAdmin` popup-blocker
dance is untouched.

## Testing & verification

- `npm run lint`, `npm run typecheck:guard`, `npm run build`.
- Existing `navCatalog` tests already cover the Tenants entry gating; extend
  only if a test breaks.
- Manual after deploy (`scripts/deploy-frontend.sh`): stats render on
  /admin/tenants, staged create shows a temp password once, Resend welcome
  fires (verify against a demo tenant), /superadmin/ still loads with the new
  note.

## Out of scope

- Any superadmin server (`:3035`) changes.
- Suspend/delete tenant actions (future — the 2×2 grid leaves no room; they
  would go in an overflow menu later).
- Retiring `/superadmin/` (kept intentionally as SPA-independent fallback).
