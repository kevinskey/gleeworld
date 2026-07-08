# Per-Tenant Branding — Tiered Feature Plan

**Status:** Design / for review · **Date:** 2026-07-08 · **Author:** Kevin + Claude

## 1. Goal

Turn "how branded is your app" into a **tiered upsell ladder** for GleeWorld's
50-tenant SaaS, and replace the generic "Welcome to GleeWorld / choose your
organization" screen that greets every native-app user today. Branding depth
becomes a plan-level feature (marketed + priced, though everything stays free
for now).

Three questions drove this:
1. *"I don't want the org-picker to be the login."* → fix the native entry.
2. *"Can tenants get their own App Store icon?"* → yes, but it means a separate
   app (with real cost). Covered by the top tier.
3. *"Can I clone a tenant and submit it to Apple separately?"* → answered in §7.

## 2. The branding ladder

| Tier | What the tenant gets | Mechanism | Rebuild / review? | Sell to |
|---|---|---|---|---|
| **Base** (all plans) | GleeWorld app + icon; email-first / branded login still applies once tenant known | — | no | everyone |
| **Branded** (Model A) | Their logo, colors, name, auth background on the login + in-app theme | 100% server data (`gw_branding_settings`) | **no** | most paid tenants |
| **Signature** (Model B) | Everything in Branded **+** their icon can become the iOS **home-screen icon** | iOS alternate icons — pre-bundled in the binary | yes (new build + review to add a tenant's icon) | premium |
| **Dedicated** (Model C) | Fully separate white-label app: own name, icon, App Store/ABM listing, opens straight into their login | separate bundle id + build target + fastlane; distributed as an **Apple Business Manager Custom App** | yes (own review cycle per release) | enterprise / flagship |

**Design rule:** Branded is the universal default for paid tiers because it's
free to operate (pure data). Signature and Dedicated are premium because each
reintroduces an Apple review cycle and build work — they are **fulfilled with
lead time**, not instant.

## 3. What already exists (reuse — do NOT rebuild)

The research found most of the Branded tier is already built:

| Capability | Where | Notes |
|---|---|---|
| Per-tenant branding record | `gw_branding_settings` (`logo_url, short_name, tagline, primary_color, auth_background_url`) | Born a **singleton** (`CHECK id=1`, 2026-06-02) but now written per-tenant with `tenant_id`; needs a cleanup migration (§6). |
| Logo/asset storage | `site-branding` public bucket (5 MB; png/jpeg/svg/webp) | admin-write RLS |
| Theme/tint engine | `src/components/theme/TenantThemeRoot.tsx` + `src/styles/tenant-theme.css` | reads branding + `get_tenant_public_site` RPC, writes `--site-primary`/`--primary` CSS vars on `<html>` |
| Branded login page | `src/pages/AuthPage.tsx` (via `src/hooks/useBrandingSettings.ts`) | already renders logo, `tenantAuthGradient(primary_color)`, `auth_background_url` |
| Tier ladder w/ branding language | `gw_billing_plans.features` jsonb | seeds already say "Branded logo + colors" → "+ tagline" → "Custom branding" |
| A `branding` module | `gw_billing_modules` starter row `('branding','Branding',...)` | exists but ungated |
| Entitlement-check pattern | `src/hooks/useModuleAccess.ts` + view `v_tenant_active_modules` + SQL `tenant_has_billing_module()` | mirror this for a branding-tier hook |
| Stripe activation | webhook :3030 (`deploy/onboarding-fixes-20260703/webhook-server.js`) routes `metadata.gleeworld_plan` / `module_id` | already upserts `gw_tenant_plans` / `gw_tenant_subscriptions` |
| Tenant provisioning | superadmin :3035 `POST /tenants` (`superadmin-server.js:582`) | already inserts a `gw_branding_settings` row per tenant |
| Tenant resolution | JWT `tenant_id`/`tenant_slug` claim (`phase3_jwt_hook.sql`); web subdomain `__TENANT_CONFIG__`; native `gw_native_tenant` localStorage | 3 mechanisms |
| Pricing source of truth | `src/lib/planTiers.ts` (mirrored in `20260704231000_tier_restructure.sql` + `scripts/stripe-setup-tiers.mjs`) | 4 tiers: Personal $8.99 / Director $39 / Director+ $69 / Institution $199 |
| Marketing pricing UI | `src/pages/GleeWorldLanding.tsx` (`ApplePricing()`, `ADDON_MODULES` grid) | native-app copy already at ~line 614 |

## 4. What must be built (the gaps)

### Tier 1 — Branded (Phase 1)
- **New native entry flow.** Today `src/components/native/NativeTenantGate.tsx` shows a **hardcoded GleeWorld** picker listing all tenants. Replace picker-first with:
  - **Email-first login:** user types email → resolve their tenant (via a lookup of `gw_tenant_members`/profile by email) → boot straight into *that tenant's* branded login. There is **no** email→tenant resolution today; this is net-new (a small RPC + UI).
  - Picker demoted to an explicit "switch organization" fallback.
  - **Brand the gate itself** for known/seeded tenants: extend `NativeTenantGate` to read `gw_branding_settings` (logo_url, primary_color, auth_background_url) instead of the hardcoded GleeWorld logo — the data plumbing (`useBrandingSettings`) already exists.
- **`branding_tier` entitlement** (see §6) so a tenant without the tier falls back to GleeWorld branding.
- **Marketing/pricing copy** (see §8).

### Tier 2 — Signature (Phase 2)
- `CFBundleIcons → CFBundleAlternateIcons` dictionary added to `ios/App/App/Info.plist` (absent today).
- Pre-bundled alternate icon image sets in the binary (one per participating tenant — **fixed at build time**, cannot be downloaded at runtime).
- A **native Capacitor plugin bridge** to `UIApplication.shared.setAlternateIconName(...)` — none exists; follow the existing custom-plugin pattern **and register it in `MainViewController.capacitorDidLoad`** (release builds dead-strip auto-discovered plugins — known GleeWorld gotcha).
- In-app "Use my choir's icon" toggle, gated by entitlement + only shown when that tenant's icon is compiled in.
- UX note: iOS shows a **non-suppressible system alert** on every icon switch — design around one interruption.
- **Fulfillment:** adding a new tenant's icon = new app build + review. Needs a queue/flag (§6).

### Tier 3 — Dedicated (Phase 3)
- **iOS build matrix** (net-new; the project has only **one** native target today):
  - Introduce a user **`.xcconfig` layer** for `PRODUCT_BUNDLE_IDENTIFIER` (`org.gleeworld.<tenant>`), `APP_DISPLAY_NAME` (convert the currently-literal `CFBundleDisplayName`), `ASSETCATALOG_COMPILER_APPICON_NAME` (`AppIcon-<tenant>`).
  - Per-tenant **scheme/target** (Capacitor uses scheme name as target identifier — requires separate targets, not just configs).
  - Per-tenant `capacitor.config` override (currently static `appId`/`appName`) + splash bg/imageset.
  - **Force single-tenant entry** by seeding `localStorage['gw_native_tenant']` / injecting `window.__TENANT_CONFIG__` in the bundled `public/native-boot.js` at build time — the gate checks `__TENANT_CONFIG__?.tenant` and skips the picker entirely.
- **fastlane lane** `ship_tenant(tenant:)`: `produce` (ASC record + bundle id) → `match` (append bundle id to shared cert/profile repo) → `cap sync` → `gym --scheme App-<tenant>` → `deliver` to that tenant's record.
- **Distribution:** prefer **Apple Business Manager Custom Apps** (private, per-org) over public App Store listings — see §5.
- **Persisted fulfillment flag/queue** (§6) — today `deployment_path` is a transient request param, not stored.

## 5. Apple compliance (critical constraint)

**You cannot publish ~50 near-identical white-label apps under your one developer
account.** App Store Review **Guideline 4.3 (Spam)** explicitly names re-skinned
apps for "universities, sports teams" as rejectable, and repeat offenses risk
Developer Program removal. Compliant routes for Dedicated:

- **Best: Apple Business Manager (or School Manager) Custom Apps** — private,
  org-specific builds distributed by MDM/redemption code to *specified
  organizations only*. They're **outside the public 4.3 spam surface** entirely,
  can be priced $0, but are still individually reviewed. Trade-off: recipient
  orgs need Apple Business/School Manager (many small choirs won't).
- **Alternative: publish under the tenant's OWN Apple Developer account** (their
  DUNS/Team ID), with us added as a member — the tolerated white-label
  "provider" model, since each app is then a distinct legal entity.
- **Fee reality:** Apple's $99/yr is **per developer account, not per app** — 50
  apps under one account is still $99 in fees. The real cost is **N review
  cycles per release** + N metadata sets, which is why Dedicated is enterprise-only.

Data-driven Branded theming (Tier 1) is fully allowed with **no review** — just
keep remote config to *appearance* (logo/colors/copy), never dormant
functionality that lights up remotely (Guideline 2.3.1).

## 6. Data model & entitlement changes

1. **`branding_tier` on the plan ladder.** Add a `branding_tier` column to
   `gw_billing_plans` with values `none | branded | signature | dedicated`,
   derived per tenant via `gw_tenant_plans.plan_id`. (Preferred over a column on
   `gw_branding_settings` because richness scales with *plan*, and the plan
   `features` already carry branding language.) Suggested mapping:
   - Personal → `branded` (their own logo/colors on a personal account)
   - Director / Director+ → `branded`
   - Institution → `signature` (and `dedicated` available as quote add-on)
2. **`useBrandingTier()` hook** mirroring `useModuleAccess` — reads the tenant's
   plan → returns the tier; UI + native gate consult it.
3. **`gw_branding_settings` cleanup migration** — formally drop the legacy
   `CHECK (id = 1)` singleton constraint (already violated in practice) and fix
   the `id: 1` hardcode in `useBrandingSettings` fallback.
4. **Dedicated-app fulfillment** — add a persisted `deployment_path` column on
   `gw_tenants` **or** a small `gw_app_fulfillment` queue table
   (`tenant_id, tier, bundle_id, status, submitted_at, live_at`) so the
   build/submit pipeline and billing UI can track state ("your custom icon ships
   with the next release" / "your dedicated app is in Apple review").

## 7. "Can I clone a tenant and submit it to Apple separately?"

**You clone the app *shell*, not the tenant.** The tenant's data stays in the
shared multi-tenant Supabase backend (RLS keeps it isolated). A "Dedicated" build
is just the normal GleeWorld binary with four things swapped at build time — bundle
id, display name, app icon, and a **baked-in default tenant slug** (seeded into
`native-boot.js` so it skips the picker). That binary is then submitted to Apple:

- **Preferred:** as an **Apple Business Manager Custom App** (private to that org), or
- under the **tenant's own Apple Developer account**.

So: no data is duplicated, one `fastlane ship_tenant(tenant: <slug>)` produces the
branded binary, and Apple sees a distinct app. This is the Tier-3 pipeline in §4.

## 8. Marketing & pricing changes (free-for-now)

- **`src/lib/planTiers.ts`** — append branding strings to each tier's `features[]`
  (e.g. Director+: `"Branded login (your logo & colors)"`, Institution:
  `"Custom app icon"`, `"Dedicated app (talk to us)"`). **Mirror in all three
  places in one commit:** `planTiers.ts`, the `features` jsonb in
  `20260704231000_tier_restructure.sql`, and `scripts/stripe-setup-tiers.mjs`;
  update `src/lib/__tests__/planTiers.test.ts` (asserts exact feature strings).
- **`src/pages/GleeWorldLanding.tsx`** — features auto-render in `ApplePricing()`;
  optionally add a "Branding" card to the `ADDON_MODULES` grid and extend the
  native-app narrative row (~line 614) with "Your icon on every student's phone."
- **Keep checkout free for now** — `PLAN_CHECKOUT_LINKS` stays `null` (CTAs fall
  back to "talk to us"); no live Stripe price needed yet.
- **Copy rules:** stay tenant-neutral (never a specific school), say **"students"**
  (not singers/members). Existing pricing copy already complies.

## 9. Phasing

- **Phase 1 — Branded entry (web + next iOS build).** Email-first login +
  branded native gate; `branding_tier` column + `useBrandingTier` hook;
  `gw_branding_settings` singleton cleanup; pricing/marketing copy. *Biggest
  visible win, benefits all paid tenants, no Apple review.*
- **Phase 2 — Signature icons.** Alternate-icon plist + native bridge + toggle;
  onboard 1 pilot tenant's icon; fulfillment flag.
- **Phase 3 — Dedicated app.** xcconfig/target matrix + fastlane lane; one
  flagship pilot via Apple Business Manager Custom App.

## 10. Test plan

- **Branded:** seed a test tenant's `gw_branding_settings`; verify login shows its
  logo/colors/background on device (TestFlight, since iOS bundles `dist/`); verify
  a tenant *without* `branding_tier` falls back to GleeWorld.
- **Email-first:** verify email → tenant resolution routes to the right branded login;
  verify unknown email still offers the picker.
- **Signature:** pilot the icon switch on a physical device; confirm the system
  alert UX; confirm the toggle hides for non-entitled tenants.
- **Dedicated:** produce one pilot binary (`ship_tenant`), confirm it boots straight
  into the seeded tenant, distribute via ABM to a test org.

## 11. Open items to confirm before coding

- Reconcile the two plan catalogs: `planTiers.ts` (Personal/Director/Director+/
  Institution, Jul 4 restructure) vs. the older `gw_billing_plans` seed
  (ensemble/studio/conservatory/university w/ branding language). Confirm which
  ids are live and where `branding_tier` attaches.
- Confirm the `CHECK (id=1)` on `gw_branding_settings` is actually dropped in the
  live DB (provisioning inserts many rows, so it must be — verify + formalize).
- Decide Branded scope: bundled into plans (recommended) vs. the standalone
  `branding` add-on module that already exists.
