## GleeWorld — Platform Fact Sheet

### What GleeWorld is
- Product name **GleeWorld**; marketing tagline **"Run your music program. Beautifully."** (`index.html:6`). Meta description: "The all-in-one platform for choirs, bands, and music classrooms. Your branded site, set up in ten minutes." (`index.html:7`).
- PWA manifest describes it as "The all-in-one platform for choirs, bands, and music classrooms." categories `["music","education","social"]`, `display: standalone` (`public/manifest.json:4,6,`).
- It is a **multi-tenant SaaS**: one static build powers many tenants. On the web, a per-subdomain `tenant-bootstrap.js` sets `window.__TENANT_CONFIG__` (supabaseUrl, anon key, org, tenant slug) before React loads; the default/main domain serves an empty no-op file (`index.html:170-174`). Native app has no subdomain, so `native-boot.js` restores a cached tenant choice (`index.html:175-176`).
- Marketing site copy also frames it as "Run your choir or band on GleeWorld." (`src/pages/GleeWorldLanding.tsx:317`).

### The `/` root route (what a visitor first sees)
Handled by `HomeRoute` (`src/App.tsx:523`, component `src/components/routing/HomeRoute.tsx`):
- Auth loading → spinner (`HomeRoute.tsx:24-30`).
- Main tenant (`tenant` slug absent or `'main'`) → **`GleeWorldLanding`** marketing site (`HomeRoute.tsx:32`).
- Any other tenant slug → **`TenantLanding`** (that tenant's own public landing page) (`HomeRoute.tsx:33`).
- Authenticated users hitting `/` are auto-redirected to their role home by `useRoleBasedRedirect` (landing renders meanwhile to avoid flash) (`HomeRoute.tsx:20`).

### Marketing landing page (GleeWorldLanding)
- Sticky nav with links: Pricing (`#pricing`), Sign in (`/auth`), and a "Get started" button that opens a **Request Workspace** dialog (`src/pages/GleeWorldLanding.tsx:664-677,517`).
- Hero: "Run your music program. Beautifully." with "Get started" CTA (`GleeWorldLanding.tsx:720,734`).
- Sales CTA / "Get started" only appears on the main marketing site, never on tenant clones (`isTenantClone` guard, `GleeWorldLanding.tsx:99`).
- Includes a pricing section (`ApplePricing`, id `#pricing`) and footer links: Pricing, Terms, Privacy, Trust Center, DPA (Schools), and mailto kevin@gleeworld.org (`GleeWorldLanding.tsx:1719-1734`).

### Pricing / plan tiers (source of truth `src/lib/planTiers.ts`)
Four tiers (`planTiers.ts:34-109`). Prices are monthly:
- **Personal** — $8.99/mo (annual $79), scope=user, 1 student, 25 GB. Features: Practice studio, own score library, personal calendar + Tonight mode (`planTiers.ts:35-52`).
- **Director** (`director_60`, the DEFAULT and "MOST POPULAR" tier) — $39/mo (annual $390), tenant, up to 60 students, 50 GB. Roster, attendance, scheduling; scores + part tracks + Studio; Tonight mode + stage viewer (`planTiers.ts:53-71`, `GleeWorldLanding.tsx:1600,1623`, `DEFAULT_PLAN_TIER` `planTiers.ts:116`).
- **Director+** (`director_150`) — $69/mo (annual $690), tenant, up to 150 students, 150 GB (`planTiers.ts:72-88`).
- **Institution** — from $199/mo (annual $1,990), tenant, unlimited students, 1 TB. Multi-ensemble + SSO + Canvas, broadcast texts included, Box Office included. Quote-based ("Talk to us") (`planTiers.ts:89-108`).
- Pricing page note: "Educational institutions get 20% off all tiers. All plans include hosting, SSL, automatic backups, and ongoing platform updates." (`GleeWorldLanding.tsx:1678-1679`).
- **Self-serve checkout does NOT exist yet:** `PLAN_CHECKOUT_LINKS` are all `null`, so non-quote tiers render "Coming soon — talk to us" and Institution renders "Talk to us" (`GleeWorldLanding.tsx` PLAN_CHECKOUT_LINKS block, comment at 1656-1668).

### Add-on modules (à la carte, priced on landing page)
Listed in `ADDON_MODULES` (`GleeWorldLanding.tsx:1565`), same price at every tier:
- Concert Planner $19 · Part Tracks $29 · Practice Studio $29 · Sight Reading $15 · Tour Manager $25 · Box Office $39 (you keep 100% of ticket sales) · Contracts & Finance $25.
- **All-Access Bundle $129/mo** — all 7 add-on modules ("Saves ~$52/mo vs à la carte") (`GleeWorldLanding.tsx:1705-1711`).
- Copy states every base tier includes "the 9 core features" and add-ons plug in at any time (`GleeWorldLanding.tsx:1692`).

### Entitlement / module gating
- `ModuleGate` (`src/components/auth/ModuleGate.tsx`) wraps paid-module content. If the tenant lacks the module it shows an upgrade panel ("This feature is an add-on … Activate this module to unlock…") with a **"View available add-ons"** button → `/settings/modules` (`ModuleGate.tsx:36-49`). `silent` mode hides nav items entirely.
- **Super admins bypass module gating** — they can open any add-on without Stripe (`ModuleGate.tsx:28-29`).
- Access resolved via `useModuleAccess(moduleId)` (`ModuleGate.tsx:23`). Known module IDs (`src/lib/navigation/moduleFlags.ts:11-27`): `viewer, part_tracks, studio, sight_reading, box_office, concert_planner, merch, store, finance, academy` (plus nav-level `liturgy_planner, tour, auditions, pr_hub, librarian, feeds, alumni` referenced in navCatalog).
- Add-on activation catalog page is `/settings/modules` (`ModulesSettings`, `App.tsx:1122-1131`).

### Role-based post-login routing (`src/hooks/useRoleBasedRedirect.ts`)
`pickDestination` maps role → home (`useRoleBasedRedirect.ts:101-132`):
- platform super-admin (super-admin on `main` tenant) → `/control-center` (which itself redirects to `/dashboard`, see below)
- tenant super-admin / admin / instructor / member / student → `/dashboard` (Command Center)
- alumni/graduate → `/alumni`
- auditioner → `/auditioner`
- fan/vip → `/fan`
- No profile row yet → `/onboarding` (unless on a public surface) (`useRoleBasedRedirect.ts:60-66`).
- Users can stay on the public home via header "View as public" (`sessionStorage force-public-view`) or `?preview=1` (`useRoleBasedRedirect.ts:69-78`).

### The dashboard = "Command Center"
- `/dashboard` renders `HouseHome` inside `UniversalLayout` (header/footer suppressed) (`App.tsx:1314-1323`).
- Most `/dashboard/*` sub-pages render inside `DashboardShell` — a sidebar + topbar wrapper scoped to the dashboard (`src/components/dashboard/DashboardShell.tsx:1-13`). Topbar has search, quick-compose (+), notifications bell, avatar.
- Sidebar nav is centralized in `src/lib/navigation/navCatalog.ts`, grouped into sections (`NAV_SECTION_LABELS`): Today, Music, Teach, Make, Plan, Reach, Money, People, Admin (`navCatalog.ts:20-22`). Entries and their gating module (from `navCatalog.ts:51-92`):
  - Today: Command Center `/dashboard`, Messenger `/dashboard/messenger`, Calendar `/dashboard/calendar`
  - Music: Music Library `/dashboard/music-library`, Viewer `/dashboard/viewer` (module `viewer`), Sight Reading (`sight_reading`), Part Tracks (`part_tracks`), Media Library, Librarian (`librarian`)
  - Teach: Academy `/dashboard/academy`, Office Hours, Practice (`/dashboard/practice-recordings`)
  - Make: Studio `/studio` (`studio`), Video `/video`, Music Tools
  - Plan: Concert Planner (`concert_planner`), Liturgy Planner (`liturgy_planner`), Tour Manager (`tour`), Auditions (`auditions`)
  - Reach: PR Hub (`pr_hub`), Fan Page `/admin/fan-page`, Feeds (`feeds`), Store `/dashboard/shop`, Graduates (`alumni`), Merch (`merch`)
  - Money: Box Office (`box_office`), Finance (`finance`), Tickets `/box-office` (`box_office`)
  - People: People `/dashboard/users`, Attendance `/attendance`
  - Admin: Site Setup `/admin/public-page`, Analytics, Settings `/dashboard/workspace`, Tenants `/admin/tenants`
- **`/control-center` is retired** — it redirects to `/dashboard`; every tenant uses the Command Center now (`App.tsx:987-993`).

### Top-level / notable public routes (no auth; `PublicRoute` in `src/App.tsx`)
- `/auth` sign in/up (AuthPage) (`App.tsx:561`)
- `/try` — one-click read-only Director demo session (`TryDemo`) (`App.tsx:573`)
- `/onboarding`, `/join` (member registration), `/enroll`, `/audition-application`, `/academy-student-registration`
- `/glee-academy`, `/contact`, `/about`, `/press-kit`, `/directory`, `/search`
- `/shop`, `/checkout`, `/shop/success`, `/order-confirmation` (public store)
- `/box-office` & `/concert-tickets` (index), `/concert-tickets/:slug`, `/tickets/:token` (public ticketing)
- `/program/:slug` public concert program (server-gated to published) (`App.tsx:1551-1558`)
- `/sites/:slug` published tenant public sites (`App.tsx:1042`)
- `/public-calendar`, `/glee-cam/:categorySlug`, `/shared-annotation/:shareToken`, `/contract-signing/:contractId`, `/w9-form`
- Legal: `/terms`, `/privacy`, `/copyright-policy`, `/security` (Trust Center), `/dpa` (`App.tsx:527-535`)
- Many course marketing routes (`/mus-100`, `/grand-staves`, `/grand-staff-classroom`, `/writing-grader`, etc.) and legacy redirects to `/academy/...`.
- Catch-all `*` → `NotFound` (`App.tsx:3190`).

### Auth-gated route wrappers (`src/App.tsx`)
- `ProtectedRoute` (`App.tsx:408-452`): redirects unauthenticated users to `/auth` (remembering intended path in `redirectAfterAuth`), forces `/force-password-change` if `must_change_password` metadata is set, and otherwise applies `ProfileCompletionGuard`.
- `AdminOnlyRoute`, `Mus240EnrollmentRoute`, `FanRoute`, `GraduatesRoute` gate specific areas.

### Mobile / iOS app (Capacitor)
- Capacitor config: `appId: org.gleeworld.app`, `appName: GleeWorld`, `webDir: dist` (`capacitor.config.ts:4-6`). It's a **WKWebView wrapper of the same web app** (bundles `dist/`).
- Plugins configured: SplashScreen (500ms, bg `#1e3a8a`), PushNotifications (badge/sound/alert), StatusBar (`capacitor.config.ts:13-25`).
- iOS bundle id `org.gleeworld.app`; **MARKETING_VERSION 1.0.3, build (CURRENT_PROJECT_VERSION) 130** (`ios/App/App.xcodeproj/project.pbxproj:459,466,468`). Display name "GleeWorld" (`ios/App/App/Info.plist:8`).
- Apple Smart App Banner in web head points at App Store id **6779189993** (`index.html:42`).
- iOS permission strings (`Info.plist:27-32`): Apple Music ("play backing tracks during sight-singing and rehearsals"), Camera ("video meetings and profile photos"), Microphone ("instrument tuner and music practice tools").
- Three custom native plugins registered explicitly in `MainViewController.capacitorDidLoad` (auto-discovery is dead-stripped in release builds): **AudioSessionConfigPlugin, NativeMusicKitPlugin, StudioEnginePlugin**. RecordingLiveActivityPlugin is present but disabled (`ios/App/App/MainViewController.swift:15-23`).
- Native Studio audio engine is a substantial Swift/AVAudioEngine subsystem under `ios/App/App/Studio/` (Engine, Recorder, Mixdown, Instruments, Fx, ClipStreamer, etc.) plus `StudioEnginePlugin.swift`.
- Native tenant selection: on first launch (no subdomain) the user picks their organization via `NativeTenantGate`; it queries `gw_tenants` (active), offers a Demo tenant (one-click read-only Director session) and org list, caches the choice, and `syncNativeTenant()` corrects it after login (`src/components/native/NativeTenantGate.tsx:22-77`).
- Push: native APN device token bridged into Capacitor (`ios/App/App/AppDelegate.swift:72-73`); `NativePushBridge` mounted only for authenticated users (`src/App.tsx:475`).
- Web app deliberately has **no service worker** — it unregisters any existing SW and clears caches on load; `/sw.js` is a self-uninstall stub (`index.html:193-212`).

### Demo / "Try it" flow
- `/try` mints a read-only Director session (`TryDemo`, `App.tsx:572-573`). A `DemoBar` is globally mounted (`App.tsx:509`) and a demo write-interceptor converts read-only RLS rejections into a friendly toast (`App.tsx:24-28`).
