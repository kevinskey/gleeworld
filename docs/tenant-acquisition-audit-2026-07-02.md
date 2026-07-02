# Tenant Acquisition Audit — 2026-07-02

Multi-agent audit (security, code, UI/UX, database) of the tenant acquisition
pipeline: provisioning, tenant sites, master→tenant updates, subscriber
tiers/pricing, custom URLs, welcome email/SMS, and logo/color branding UX.

Findings were verified against **live droplet state** (not just repo), which
reclassified several "CRITICAL" findings as dead code.

---

## Ground-truth verification (live droplet)

- **Live provisioning webhook** (`/opt/gleeworld-provision-webhook/server.js`)
  DOES verify Stripe signatures (`constructEvent`, regular + Connect) and DOES
  require `metadata.gleeworld_tier` before provisioning. It calls the superadmin
  API, never `provision-tenant.sh`.
- **`scripts/provision-tenant.sh` + `scripts/stripe-provision-webhook/`** = the
  abandoned per-tenant-Docker architecture. Unreferenced everywhere; NOT
  deployed. **Removed** (commit 90eed1a4e). The SQL/JS/JSON-injection findings
  against them were against dead code.
- **Edge-functions container runs `VERIFY_JWT=false`** — the gateway does NOT
  verify token signatures, so the checkout functions' manual `atob()` claim
  reads were a real live auth bypass (now fixed in source).
- Deployed edge functions include `create-module-checkout`, `create-plan-checkout`,
  `create-course-checkout`. `stripe-webhook` is NOT deployed (source fixed anyway).

---

## FIXED & committed (not yet deployed)

| # | Finding | File | Fix | Commit |
|---|---------|------|-----|--------|
| 1 | Checkout edge fns trust unverified JWT claims (VERIFY_JWT=false) | `create-plan/module/course-checkout` | Verify via `getUser()` before trusting `tenant_id`/`tenant_role` | 90eed1a4e |
| 2 | `create-plan-checkout` missing tenant-admin role gate | `create-plan-checkout/index.ts` | Added `['admin','super-admin','super_admin']` gate | 90eed1a4e |
| 3 | `stripe-webhook` falls back to unsigned `JSON.parse` when header absent | `stripe-webhook/index.ts` | Require secret + valid signature; `constructEventAsync` (Deno) | 90eed1a4e |
| 4 | Dead injection-prone provisioning scripts | `scripts/…` | Removed | 90eed1a4e |
| 5 | Tenant brand color never reaches shared guest header | `PublicHeader.tsx` | Use `branding.primary_color` + luminance-readable text | b84a5e269 |
| 6 | Plan-tier vocabulary mismatch across 3 surfaces | `lib/planTiers.ts`, `CreateTenantDialog.tsx` | Canonical tier constant (ensemble/studio/conservatory/university) | b84a5e269 |
| 7 | Contract-sign redirect bounces tenant users to gleeworld.org | `CompletionStatus.tsx` | Redirect to `window.location.origin` | b84a5e269 |
| 8 | Conservatory CTA implies self-serve checkout (no Stripe link) | `GleeWorldLanding.tsx` | Show "Talk to us" when no Stripe link | b84a5e269 |
| 9 | "Alumni" in consent copy | `AgreementsForm.tsx` | → "Graduate" | b84a5e269 |

Full `npm run build` passes with all fixes applied.

---

## NEEDS PRODUCTION DB VERIFICATION before fixing (P0)

These are the most severe findings but come **only from migration files**; the
DB was hand-managed, so production may differ. **Verify with the read-only
queries below before applying any migration** — a wrong RLS change could break
all ~50 tenants (esp. anon subdomain bootstrap reads).

### Verify first (read-only)
```sql
SELECT relname, relrowsecurity FROM pg_class
 WHERE relname IN ('gw_tenants','gw_tenant_members','gw_profiles',
                   'gw_branding_settings','gw_tenant_subscriptions','gw_tenant_plans');
SELECT tablename, policyname, cmd, permissive, qual, with_check
 FROM pg_policies
 WHERE tablename IN ('gw_profiles','gw_tenants','gw_tenant_members',
                     'gw_tenant_subscriptions','gw_tenant_plans','gw_branding_settings')
 ORDER BY tablename, policyname;
SELECT conname, conrelid::regclass FROM pg_constraint
 WHERE conname LIKE '%branding%singleton%';
```

### If confirmed, candidate fixes (review before applying)
- **gw_profiles `Allow all … USING(true)`** (migration `20250804124823`): if still
  present, `DROP POLICY "Allow all for gw_profiles"` and protect
  `role/is_admin/is_super_admin` from self-write (trigger or column grants).
- **gw_tenant_members / gw_tenants RLS**: if RLS is disabled, self-insert of an
  admin membership = cross-tenant takeover. Enable RLS + narrow policies; route
  membership writes through a SECURITY DEFINER invite-accept RPC.
- **Signup trigger role from client metadata** (`20260610130000`): hardcode role
  to `fan`/member; require invite/RPC for elevation.
- **gw_branding_settings singleton** (`id=1` CHECK): if the table is physically a
  singleton in prod, every tenant overwrites one shared branding row. Drop the
  singleton constraint, add `UNIQUE(tenant_id)`, backfill per tenant.
- **gw_tenant_subscriptions / gw_tenant_plans self-upgrade**: tenant-admin
  `FOR ALL` RLS lets a tenant PATCH `status='active'` without paying. Make
  tenant policy SELECT-only; writes via service-role (webhook) only.
- Add `CHECK` constraints: `gw_tenants.slug` DNS format; `role` enums.

---

## NEEDS DROPLET DEPLOY (server-side, gitignored `server-files/`)

- **Module seeding ignores selected plan** — provisioning always seeds
  `tier='starter'` modules regardless of chosen plan (`server.js:701`).
- **Welcome email** is plain-text with cleartext temp password — rebuild on the
  branded HTML template used by `tenant-intake`.
- **Spelman placeholders** in `superadmin-new.html`/`superadmin-index.html` →
  fictional org (tenant-neutral rule).
- **Provisioning has no rollback** on partial failure — half-built tenant strands
  the slug permanently. Wrap in a provisioning RPC or add compensating delete.
- **Stale `superadmin-server.js`** duplicate lacks the platform-tenant-scope
  security check — delete to prevent accidental redeploy.
- `nextBrandingId()` / branding-id-by-epoch-second can collide (silently swallowed).

---

## PRODUCT DECISIONS (await owner)

- **Force branding onboarding**: `setup_completed` is pre-set `true` at
  provisioning, intentionally disabling the guided logo/color redirect. Re-enable?
- **Dedicated Branding panel**: logo+colors are buried in the Header block
  accordion (~7 steps for a non-technical director).
- **SMS welcome**: none today (email only). Add optional Twilio welcome SMS?

---

## P2 BACKLOG (cleanup)

- Four different hardcoded "default navy" hex values — collapse into one token.
- `gw_tenant_addons` is a dead, never-written table backing a UI section that
  always shows zero; repoint to `gw_tenant_subscriptions`.
- Root `migrations/phase*.sql` live outside `supabase/migrations/` — a fresh DB
  build fails. Fold them in as ordered, idempotent files.
- Add `AS RESTRICTIVE` defense-in-depth policies on the billing tables.
- Orphaned `SiteSetup.tsx` (525 lines) is unreachable (route redirects away) yet
  self-references its own URL — delete or restore as the real route.
- Pricing cards use per-tier pastel fills vs the unified white-card system.

---

## Verdict per domain (pre-remediation)

| Domain | Verdict | After committed fixes |
|--------|---------|----------------------|
| Security | FAIL | Edge-fn auth + webhook signature fixed; **DB RLS P0s still open** |
| Code | FAIL | Dead code removed, redirect fixed; provisioning rollback still open |
| UI/UX | FAIL | Brand color + tiers + copy fixed; onboarding/panel are product calls |
| Database | FAIL | **Unchanged — needs prod verification + migrations** |
