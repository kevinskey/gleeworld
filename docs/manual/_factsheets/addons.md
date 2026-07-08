# GleeWorld Add-ons — Ground-Truth Fact Sheet

Covers the six add-ons (Box Office, Glee Academy, Concert Planner, Studio/Part Tracks, Landing Pages, Template Courses), plus the shared entitlement system that turns each on. Every claim is anchored to a file:line in the repo.

---

## 0. How entitlement / "turning on an add-on" works (shared plumbing)

This is the machinery every tenant-level add-on rides on. Read this first — the per-add-on sections reference it.

### Module catalog and the tenant's active set
- Modules live in DB table `gw_billing_modules`, each row carrying a `tier` of `starter` | `addon` | `enterprise`, plus `name`, `description`, `category`, `icon`, `is_active`, `sort_order`, `monthly_price_cents`, `stripe_price_id` (`src/hooks/useModuleAccess.ts:4`, seed example `supabase/migrations/20260620140000_box_office_schema.sql:166`).
- The DB view `v_tenant_active_modules` returns "starter modules + any active/trial add-ons," scoped to the current tenant by RLS (`src/hooks/useModuleAccess.ts:17`).
- `useTenantModules()` reads that view; `useModuleAccess(moduleId)` returns `{ hasAccess, status, isTrial, trialEndsAt }` for one module (`src/hooks/useModuleAccess.ts:21`, `:40`).
- Tier meaning, stated in migration comments: `tier='starter'` = "available to every tenant … not billed separately, just toggleable per tenant"; `tier='addon'` = purchasable, listed under add-ons (`supabase/migrations/20260617120000_concert_planner.sql:99`, `supabase/migrations/20260616050000_viewer_module.sql:6`, `supabase/migrations/20260620140000_box_office_schema.sql:161`).

### Where a tenant enables add-ons (the UI)
- The activation surface is **Workspace Settings → "Add-ons" tab** at `/dashboard/workspace?tab=modules` (`src/pages/dashboard/WorkspaceSettingsPage.tsx:65`, panel `ModulesTabPanel` at `:232`). The tab is literally labeled "Add-ons" (`:65`).
- Legacy route `/settings/modules` permanently redirects to `/dashboard/workspace?tab=modules` (`src/pages/admin/ModulesSettings.tsx:11`,`:16`).
- The Add-ons panel lists every active `gw_billing_modules` row with `tier='addon'` (`src/pages/dashboard/WorkspaceSettingsPage.tsx:336`,`:343`). Starter modules are NOT listed there (they're always on).
- Only tenant admins / super-admins can change settings; others see a read-only badge (`src/pages/dashboard/WorkspaceSettingsPage.tsx:37`,`:55`, and per-action `canManage` gating `:397`).

### Three activation paths, chosen per card (`ModulesTabPanel`)
1. **Demo tenant (sandbox):** toggles call the `gw-demo-toggle-addon` edge function — no Stripe, no billing, changes apply immediately (`src/pages/dashboard/WorkspaceSettingsPage.tsx:271`,`:421`; sandbox banner `:362`).
2. **Free ($0) or already-active add-on for a real tenant:** a direct DB upsert into `gw_tenant_subscriptions` with `status:'active'`, `metadata:{comped:true}` (activate) or `status:'cancelled'` (deactivate) (`src/pages/dashboard/WorkspaceSettingsPage.tsx:290`,`:303`,`:316`). Button reads "Activate"/"Deactivate" (`:455`).
3. **Priced add-on not yet active for a real tenant:** Stripe Checkout via `create-module-checkout` edge function; button reads "Activate" (`src/pages/dashboard/WorkspaceSettingsPage.tsx:349`,`:434`).

### The Stripe activation edge function
- `create-module-checkout` verifies the caller's JWT, requires `tenant_role` in admin/super-admin (403 otherwise), looks up the module, and **refuses** if `tier==='starter'` ("included — no activation needed") or if `stripe_price_id` is null ("Module has no Stripe price configured") (`supabase/functions/create-module-checkout/index.ts:51`,`:65`,`:66`).
- It opens a `mode: subscription` Checkout Session with `client_reference_id = tenant_id`; on success Stripe redirects to `/settings/modules?activated=<module_id>` (`supabase/functions/create-module-checkout/index.ts:77`,`:86`).
- `gw_tenant_subscriptions` is described as "the canonical activation table — written by stripe-webhook on customer.subscription.created/updated/deleted events" (`src/pages/dashboard/WorkspaceSettingsPage.tsx:242`).

### Billing/subscription views for the tenant
- Workspace Settings → **Billing tab** lists active paid add-ons from `gw_tenant_active_addons` with per-item `$/mo` and a computed monthly total, plus a Stripe customer-portal button (`create-customer-portal-session`) (`src/pages/dashboard/WorkspaceSettingsPage.tsx:778`,`:844`).

### How add-ons surface in navigation (gating)
- `NAV_CATALOG` entries carry a `gate` (`module`, `moduleAny`, `adminOnly`, etc.); `resolveNav()` hides an entry unless its gate passes (`src/lib/navigation/navCatalog.ts:49`,`:107`,`:119`). Missing/false context can only under-show, never leak (`:117`).
- `toModuleFlags()` maps the active-module set to booleans: `hasBoxOffice`←`box_office`, `hasConcertPlanner`←`concert_planner`, `hasPartTracks`←`part_tracks`, `hasStudio`←`studio`; **`hasAcademy` is hardcoded `true` — "Academy is core, not a gated add-on"** (`src/lib/navigation/moduleFlags.ts:11`,`:20`).

### Plan tiers (separate from add-ons)
- Subscription plan tiers are defined in `src/lib/planTiers.ts:34`: `personal` ($8.99/mo, user-scoped), `director_60` ($39/mo, 60 students), `director_150` ($69/mo, 150), `institution` ($199/mo, unlimited). The Institution tier's feature list includes **"Box Office included"** (`src/lib/planTiers.ts:104`). Plan checkout is a separate flow (`create-plan-checkout`, `WorkspaceSettingsPage.tsx:121`).

---

## 1. Box Office (module id `box_office`)

**What it does:** Sell general-admission tickets to concerts with QR check-in at the door. Ticket revenue goes to the tenant's own Stripe (Connect) account; GleeWorld takes 0% of ticket revenue (`supabase/migrations/20260620140000_box_office_schema.sql:169`; `src/pages/dashboard/BoxOfficePage.tsx:97`).

**Entitlement:** `tier='addon'`, `category='revenue'` in `gw_billing_modules` (`supabase/migrations/20260620140000_box_office_schema.sql:168`). Enabled from Workspace Settings → Add-ons (§0). Nav gate `module: 'box_office', adminOnly: true` (`src/lib/navigation/navCatalog.ts:82`). Also listed as "included" in the Institution plan tier (`src/lib/planTiers.ts:104`).

**Access rules:** Admin route `/dashboard/box-office` (`src/App.tsx:1437`). Non-admins are redirected to the public page `/box-office` (`src/pages/dashboard/BoxOfficePage.tsx:69`). If the add-on isn't active, the page shows a gate with an "Open Modules" link (`:88`).

**Required setup — Stripe Connect:** Box Office runs on Stripe Connect (Standard). The Payments card walks the tenant through connecting via the `box-office-connect-onboarding` edge function (full-page redirect to Stripe) (`src/pages/dashboard/BoxOfficePage.tsx:46`,`:226`). States: not connected → "Connect Stripe"; connected but charges not enabled → "Finish onboarding"; ready → "Ready to sell tickets" (`:198`,`:220`,`:172`).

**Main user actions:**
- **Create a ticketed event:** "New event" dialog captures title, venue, date/time, capacity, description; created as a `draft` (`src/pages/dashboard/BoxOfficePage.tsx:266`,`:321`,`:333`). Data lands in `gw_events` with `box_office_status='draft'`, `is_public=true`, `box_office_slug` derived from title; a ticketed event also lands on the tenant calendar (`src/lib/boxOffice/api.ts:139`,`:157`; note "also land on your tenant calendar" `BoxOfficePage.tsx:263`). Public URL pattern is `/concert-tickets/<slug>` (`BoxOfficePage.tsx:372`).
- **Manage ticket tiers:** each event has one or more price tiers (e.g. Student $5 / General $15 / Patron $50), stored in `gw_ticket_tiers` with `name`, `price_cents`, `quantity_total`, `quantity_sold` (`src/lib/boxOffice/api.ts:31`,`:208`; TiersCard `src/pages/dashboard/BoxOfficeEventPage.tsx:175`).
- **Publish:** the event detail page has a PublishCard; publishing requires the event public AND ≥1 tier with quantity, and blocks over-capacity (`src/pages/dashboard/BoxOfficeEventPage.tsx:1` header comment,`:163`). Status pill shows draft/published/closed (`:144`,`BoxOfficePage.tsx:299`).
- **Door operations (published only):** "Scan" (QR check-in) at `/dashboard/box-office/event/:id/checkin` and "Will-call" at `/…/willcall` (`src/pages/dashboard/BoxOfficeEventPage.tsx:132`,`:137`; routes `src/App.tsx:1457`,`:1467`).
- **Ticket requests, orders, comps, refunds:** the event page includes a RequestsQueueCard (approve/deny requests), OrdersCard, and SummaryCard (`BoxOfficeEventPage.tsx:185`,`:187`,`:189`); comp tickets are counted from orders with `status='comp'` (`:70`). Supporting edge functions exist: `box-office-checkout`, `box-office-checkin`, `box-office-issue-comp`, `box-office-refund-order`, `box-office-submit-request`, `box-office-decide-request`, `box-office-order-status` (directory listing under `supabase/functions/`).

---

## 2. Glee Academy (module id `glee-academy`; Academy is treated as core)

**What it does:** The LMS for a program — "Classes, lessons, assignments, attendance" (`src/config/unified-modules.ts:422`). The public Glee Academy page renders a grid of course badges from `academy_course_badges`; clicking a badge navigates to its `link_url` (`src/pages/GleeAcademy.tsx:38`,`:71`,`:101`). It also reads the signed-in user's enrollments from `gw_course_enrollments` (`:61`).

**Entitlement:** Academy is **core, not a gated add-on** — `toModuleFlags()` hardcodes `hasAcademy: true` and `toModuleSet()` always adds `'academy'` (`src/lib/navigation/moduleFlags.ts:20`,`:27`). The Academy nav entry has no module gate (`src/lib/navigation/navCatalog.ts:62`). It is registered in `UNIFIED_MODULES` as `glee-academy`, category `education`, `isActive: true` (`src/config/unified-modules.ts:421`). (Note: this is the manual's "add-on" only in the documentation sense; in code its features are always available. Its sub-features — Course Store / Template Courses (§6) and per-course add-ons (below) — are what get toggled.)

**Per-course add-ons (distinct from tenant add-ons):** Inside a course, the instructor toggles feature tabs at `/academy/c/:code/addons` (`src/pages/academy/CourseAddonsPage.tsx:50`). Catalog: Tour Manager, QR Attendance, Polls, Sight Reading, Practice, Wardrobe, AI Grading Assist, AI Hub (`src/pages/academy/CourseAddonsPage.tsx:39`). Toggles upsert into `gw_course_addons(course_id, addon_slug, is_enabled, …)` (`:83`,`:88`). Only the course instructor/creator can change them (`canManage`, `:128`,`:146`). Enabled slugs render as tabs via `useEnabledAddonTabs` (`src/hooks/useCourseAddons.ts:57`).

---

## 3. Concert Planner (module id `concert_planner`)

**What it does:** Build and print concert programs from the library, and publish a public web page from the same data. "One data set drives both the printout and the published page" (`src/pages/dashboard/ConcertPlannerPage.tsx:43`). Includes a Canva export for advanced design (`supabase/migrations/20260617120000_concert_planner.sql:106`).

**Entitlement:** `tier='starter'` in `gw_billing_modules` — "available to every tenant … not billed separately, just toggleable" (`supabase/migrations/20260617120000_concert_planner.sql:100`,`:107`). Nav gate `module: 'concert_planner'` (`src/lib/navigation/navCatalog.ts:70`). Route `/dashboard/concert-planner` and `/…/:id` (`src/App.tsx:1501`,`:1513`).

**Data model:** `gw_concert_programs` (header: title, subtitle, event_date, venue, conductor, performer_group, cover_image_url, notes, `template_kind`, `design_state`, `canva_design_id`, `setlist_id`) and `gw_concert_program_pieces` (ordered pieces, each optionally linked to `gw_sheet_music`) (`supabase/migrations/20260617120000_concert_planner.sql:15`,`:39`). RLS: RESTRICTIVE tenant isolation + BEFORE-INSERT tenant trigger (`:80`,`:83`,`:71`). Also has a roster (`gw_concert_roster_sections` / `gw_concert_roster_members`) (`src/hooks/useConcertPrograms.ts:168`).

**Main user actions:**
- **New program from a template:** "New program" opens a template picker — Choral Concert, Classical Recital, Multi-Section Festival, Student Recital (`src/pages/dashboard/ConcertPlannerPage.tsx:21`,`:47`,`:118`). Creating inserts a row (default `template_kind='choral'`) and routes to the editor (`src/hooks/useConcertPrograms.ts:273`; `ConcertPlannerPage.tsx:107`).
- **Edit program:** update header fields; add/update/delete/reorder pieces; manage roster sections/members — all via mutations in `useConcertProgram` (`src/hooks/useConcertPrograms.ts:107`,`:119`,`:131`,`:142`,`:153`,`:197`,`:231`).
- **Publish/print/Canva:** program carries `published_at`, `published_by`, `published_slug` and `canva_design_id` fields; visual theme + print_format + card_layout are stored on the program (`src/hooks/useConcertPrograms.ts:32`,`:37`).
- **Delete:** trash button with confirm on each card (`ConcertPlannerPage.tsx:86`).

---

## 4. Studio / Part Tracks

These are two related but **separate** modules with separate routes.

### 4a. Part Tracks (module id `part_tracks`)
**What it does:** Build accompaniment and voice-part practice recordings **linked to a score**. "Every project starts from your Music Library" — there is no path to create a recording divorced from a score (`src/pages/dashboard/PartTracksLandingPage.tsx:1`,`:82`). Registered module description: "Upload MP3 practice tracks per voice part on each piece" (`src/config/unified-modules.ts:101`).

**Entitlement:** Nav gate `module: 'part_tracks'` at `/dashboard/part-tracks` (`src/lib/navigation/navCatalog.ts:58`; route `src/App.tsx:1477`,`:1489`). (See VERIFY — no `gw_billing_modules` seed row for `part_tracks` was found in-repo.)

**Main user actions:**
- **New project:** pick a score from the Music Library (`gw_sheet_music`), set title + voicing; the chosen voicing seeds the track list (SATB→S/A/T/B, SSA→S1/S2/A) (`src/pages/dashboard/PartTracksLandingPage.tsx:185`,`:221`,`:319`; templates `VOICING_TEMPLATES` from `usePartTracksProject`).
- **Browse/search/delete projects:** list of `gw_part_tracks_projects` with score title/composer, voicing, tempo, key badges; search box; per-card delete (`:48`,`:120`,`:146`).
- **Open the Studio editor:** opening a project renders `PartTracksStudio` (`src/pages/dashboard/PartTracksLandingPage.tsx:36`; component `src/components/partTracks/PartTracksStudio.tsx`, ~2595 lines — full record/track/score editor).

### 4b. Studio (module id `studio`)
**What it does:** "Multi-track composition + recording. Sessions sync across your devices" (`src/pages/studio/StudioHome.tsx:60`). It's a general DAW distinct from Part Tracks (not tied to a score).

**Entitlement:** Nav gate `module: 'studio'` at `/studio` (`src/lib/navigation/navCatalog.ts:66`; routes `/studio` and `/studio/sessions/:id` in `src/App.tsx:901`,`:902`).

**Data/storage:** sessions in `gw_studio_sessions` (owner-scoped RLS — insert/update/delete restricted to `owner_user_id = auth.uid()`) and a private `studio` storage bucket holding `manifest.json` + audio, path `studio/<tenant_id>/sessions/<session_id>/…` (`supabase/migrations/20260624010000_studio_sessions.sql:102`,`:113`,`:119`).

**Main user actions:** list "my sessions", create a session (title → routes to `/studio/sessions/:id`), delete a session (`src/pages/studio/StudioHome.tsx:22`,`:30`,`:38`).

> Note: `supabase/migrations/20260624010000_studio_sessions.sql:120` inserts `('studio','studio', false)` — this is a **storage.buckets** row (bucket id/name/public), NOT a `gw_billing_modules` row.

---

## 5. Landing Pages (tenant public website builder)

**What it does:** A block-based public website for the tenant/choir — "events, story, contact info — built from blocks you arrange" (`src/pages/admin/PublicPageEditor.tsx:426`). Lives at **`/admin/public-page`** (`PublicPageEditor`); the old `/admin/landing-editor` permanently redirects here (`src/pages/admin/LandingEditor.tsx:5`). (The `LandingPageModal` component is unrelated — it just previews the GleeWorld marketing landing page: `src/components/landing/LandingPageModal.tsx:28`.)

**Data model:** draft blocks in `gw_site_blocks`; Publish snapshots them into `gw_public_sites.published_blocks`, "the only thing anonymous visitors can read via `get_public_site()`" (`src/pages/admin/PublicPageEditor.tsx:1`,`:355`).

**Setup / main user actions:**
- **Create the page:** if none exists, "Create my page" calls `gw_activate_public_site` RPC, which seeds a **7-block starter template** (Header, Hero, Events, About, Music Player, Videos, Contact & Footer) from branding (`src/pages/admin/PublicPageEditor.tsx:226`,`:418`,`:466`).
- **Add/arrange/edit blocks:** drag-reorder (locked header stays at top), toggle visibility, delete, and edit config per block; auto-saves with debounce (`PublicPageEditor.tsx:249`,`:282`,`:288`,`:295`,`:264`). Block picker groups blocks as "Your essentials" / "GleeWorld extras" / "Add-ons" (`:558`).
- **Block catalog:** ~21 block types registered — header, hero, events, about, media-gallery, music-player, video-gallery, ensembles, staff, press, support, fan-signup, liturgical-calendar, contact, donations, merch, concert-tickets, alumni-spotlight, spotlight, scholarship, appointment-booking (`src/components/public-site/registry.ts:26`).
- **Add-on-gated blocks:** a block renders publicly only if `tier==='free'` or its `requiredAddon` is in the tenant's active add-ons; gated blocks show a "Lock / Add-on" badge with an "Activate" link to `/settings/modules` (`src/components/public-site/registry.ts:61`; `PublicPageEditor.tsx:185`,`:571`,`:604`). Active add-ons are read from `gw_tenant_subscriptions` where `status='active'` (`PublicPageEditor.tsx:185`,`:193`).
- **Theme:** primary/accent color, font, letter-spacing, applied live to preview and debounced to `gw_public_sites.theme` (`PublicPageEditor.tsx:341`).
- **Page address (slug):** editable `/sites/<slug>` with availability check via `public_site_slug_available` RPC (`PublicPageEditor.tsx:315`,`:326`,`:621`).
- **Publish / Republish / Unpublish / View site / Reset to template:** buttons at the top; live page opens at `/sites/<slug>` (`PublicPageEditor.tsx:355`,`:374`,`:387`,`:479`,`:497`).

---

## 6. Template Courses (Course Store)

**What it does:** A catalog of pre-built courses a teacher can **adopt** (clone) into their own tenant, then edit. "Adopt a pre-built course into your tenant. You can edit everything after" (`src/pages/academy/CourseStorePage.tsx:81`).

**Where:** Course Store at **`/academy/store`** (`src/App.tsx:750`; `CourseStorePage`). A read-only template course view is at `/academy/templates/:courseId` (`src/App.tsx:554`; `TemplateCoursePage`).

**Catalog + entitlement model (two tables observed):**
- `CourseStorePage` (the wired store) reads templates via the SECURITY DEFINER RPC `list_course_templates` (which returns `gw_courses` rows where `is_template=true AND is_active=true`, across any tenant) and adopts via `adopt_course_template(p_template_id)` (`src/pages/academy/CourseStorePage.tsx:29`,`:37`,`:39`; RPC `supabase/migrations/20260615180000_templates_via_rpc.sql:24`,`:37`). Templates live on the `main` platform tenant; strict tenant isolation is restored on `gw_courses` and the RPC is the only cross-tenant read path (`CourseStorePage.tsx:26`; migration `:14`,`:20`).
- A parallel hook layer (`useCourseStore.ts`) models templates on `gw_academy_courses` (`is_template=true`) with adopt RPC `adopt_template_course`, plus a purchasable-products layer: `gw_course_product` (sku, `price_cents`, `stripe_price_id`, `template_course_id`, `bundle_key`), `gw_tenant_entitlement` (owned products per tenant), and Stripe checkout via `create-course-checkout` (`src/hooks/useCourseStore.ts:4`,`:34`,`:51`,`:106`,`:110`,`:120`). See VERIFY — two template systems coexist.

**Adopt access rules (enforced server-side, surfaced as errors):** demo-viewer accounts can't adopt (`demo_viewer_cannot_adopt`), and adopting requires an admin (`admin_required_to_adopt`) (`src/pages/academy/CourseStorePage.tsx:62`,`:64`). In the store UI every template is shown with a "Free" badge and an "Adopt" button (`:119`,`:120`); on success the teacher is routed into the new course at `/academy/c/<course_code>` (`:47`).

**Editing a template/course (TemplateCoursePage):** hierarchical Unit → Lesson → Exercise view of `gw_academy_courses` (`src/pages/academy/TemplateCoursePage.tsx:29`,`:36`). Edit rights: for a template, super-admin only; for a normal course, admin/director (`:91`). Instructors can add lessons (`add_academy_lesson` RPC), and edit lesson title/content/objectives/listening (`update_academy_lesson` RPC), including attaching audio from the Media Library (`gw_media_library`) (`:143`,`:303`,`:215`).

---

## Quick reference: module ids and where they live

| Add-on | module id / gate | tier | primary route | activation |
|---|---|---|---|---|
| Box Office | `box_office` (adminOnly) | addon | `/dashboard/box-office` | Settings→Add-ons (Stripe) + Connect onboarding |
| Glee Academy | `glee-academy` / core (`hasAcademy=true`) | n/a (always on) | `/dashboard/academy` | none — core |
| Concert Planner | `concert_planner` | starter | `/dashboard/concert-planner` | on for every tenant; toggleable |
| Part Tracks | `part_tracks` | (see verify) | `/dashboard/part-tracks` | module gate |
| Studio | `studio` | (see verify) | `/studio` | module gate |
| Landing Pages | (no module gate on nav) | n/a | `/admin/public-page` | "Create my page"; blocks may need add-ons |
| Template Courses | Academy sub-feature | free/adopt | `/academy/store` | Adopt RPC (admin), paid path via SKU |

Refs: `src/lib/navigation/navCatalog.ts:56`–`:84`; `src/lib/navigation/moduleFlags.ts:11`–`:22`.
