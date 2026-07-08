## GleeWorld — Tenant Admin / Director Fact Sheet

Scope: what a tenant admin/director does — site/program setup, branding/theme, landing pages, roster & student sub-accounts, content, calendar/events, QR attendance, billing. Every claim below is confirmed against the repo at `docs/gleeworld-manual` branch. Gating terms: "admin" = `is_admin`/`is_super_admin` or `role` in {admin, super-admin}; "can take attendance" = super-admin OR exec-board OR secretary (defined per section).

### Navigation / route facts (confirmed)
- `/control-center` is retired — it redirects to `/dashboard` (`src/App.tsx:990-993`). The dashboard/Command Center is the tenant home.
- `/admin/site-setup` is a legacy route that **redirects** to `/admin/public-page` (`src/App.tsx:1005-1007`). The standalone SiteSetup page component (`src/pages/admin/SiteSetup.tsx`) is **dead code** — not mounted anywhere (only self-reference in grep). Do NOT document it as a live screen.
- `/admin/landing-editor` also redirects to `/admin/public-page` (`src/pages/admin/LandingEditor.tsx:5-7`).
- `/calendar` redirects to `/dashboard/calendar` (`src/App.tsx:1985-1988`).

### Workspace Settings — `/dashboard/workspace` (`src/pages/dashboard/WorkspaceSettingsPage.tsx`)
Slack-style settings hub with 6 tabs (`:63-70`): **Plan, Add-ons, Navigation, Branding, Billing, General**. Tab is in `?tab=` query param, default `plan`.
- Only admins can change anything; non-admins see a read-only amber "Read-only — only workspace admins can change settings" badge (`:36-59`).
- **Plan tab** (`:85-228`): reads plan catalog from `gw_billing_plans` (name, tagline, `student_cap`, monthly/annual price cents, features). Current plan from `gw_tenant_plans`; if none, shows "No paid plan yet — running on free tier" (`:150-152`). Usage (current students vs cap) from RPC `gw_tenant_plan_usage_self`; shows "At cap — upgrade to add more" when at cap (`:164-166`). Monthly/Annual toggle; annual labeled "save 2 months" (`:176`). "Choose plan"/"Switch to this plan" calls edge function `create-plan-checkout` → redirects to Stripe (`:121-131`). Button disabled if no Stripe price configured (`:213, 219-221`).
- **Add-ons tab** (`:232-468`): catalog from `gw_billing_modules` where `tier='addon'` and active. Active add-ons from `gw_tenant_subscriptions` (status active/trial). Three activation paths (`:397-457`): (1) **demo tenant** = free sandbox toggle via `gw-demo-toggle-addon` (no Stripe, `:271-283`, shows "Sandbox mode" banner); (2) **free ($0) or already-active** add-ons toggle directly against DB, marked comped (`:290-329`); (3) **priced, not-yet-active** add-ons → "Activate" → `create-module-checkout` → Stripe (`:349-358`).
- **Navigation tab** (`:473-683`): per-role control over which sidebar items each user type sees. Stored in `gw_tenant_nav_prefs` (role, hidden_items). "Editing view for:" role selector; "Preview my sidebar as:" lets a super-admin preview a role's nav live. Super-admins always see everything (`:575-576`). Items grouped by section from the shared nav catalog.
- **Branding tab** (`:687-773`): fields = Organization name, Short name, Primary color (color picker + hex), Logo URL (text URL, with preview). Saves via upsert to `gw_branding_settings`. (Note: this tab takes a logo **URL**, not a file upload.)
- **Billing tab** (`:778-872`): active add-ons from `gw_tenant_active_addons` with monthly total; "Open customer portal" → edge function `create-customer-portal-session` → Stripe portal (update card, invoices, cancel). If no Stripe customer yet: "No Stripe customer yet — activate an add-on first" (`:855`).
- **General tab** (`:895-1047`): Localization = Time zone (IANA shortlist), Default locale (8 options), Week starts on (Sunday/Monday), Contact email — saved to `gw_branding_settings` (`:916-931`). Also read-only workspace identity display, and a **Data export** button that currently only fires an info toast ("A super-admin will receive the export bundle by email within 24h") — the `gw-tenant-export` edge function is noted as **not yet wired** (`:933-939`).

### Branding data model (confirmed)
- Branding lives in `gw_branding_settings`, **scoped by `tenant_id`** (unique per tenant). Fields seen: `org_name`, `short_name`, `tagline`, `show_enroll_cta`, `logo_url`, `primary_color`, `timezone`, `locale`, `week_start`, `contact_email` (`SiteSetup.tsx:141-149`, `WorkspaceSettingsPage.tsx:709-718, 916-925`).
- The dead SiteSetup page (not the live path, for reference only) uploaded logos to the `site-branding` storage bucket, max 5MB, PNG/JPG/SVG/WebP (`SiteSetup.tsx:88-110`).

### Public landing-page builder — `/admin/public-page` (`src/pages/admin/PublicPageEditor.tsx`)
- Draft blocks in `gw_site_blocks`; **Publish** snapshots them into `gw_public_sites.published_blocks`, which is the only thing anonymous visitors read (via RPC `get_public_site()`) (`:1-3`).
- First visit shows "Create your public page" → "Create my page" runs RPC `gw_activate_public_site`, seeding starter blocks from branding (`:226-239, 418-438`).
- **Starter template = 7 blocks**: Header, Hero, Events, About, Music Player, Videos, Contact & Footer (`:463-469`).
- Left panel: draggable block list (dnd-kit). Header block is **locked** to position 0 and cannot be hidden/deleted; nothing can be dragged above locked blocks (`:112-118, 254-258`). Each block row: click to expand its editor form (accordion), eye icon = toggle visibility, trash = delete (`:124-133`).
- **Add block** dialog groups blocks into "Your essentials" (core), "GleeWorld extras" (gleeworld), "Add-ons" (`:558-562`). Add-on blocks that lack the required active subscription show a "Add-on" lock badge and an "Activate" link to `/settings/modules` instead of adding (`:591-608`). Already-added blocks show an "Added" badge.
- **Page address**: slug edited under `/sites/`, lowercased/`[a-z0-9-]` only; "Check availability" via RPC `public_site_slug_available`; Save updates `gw_public_sites.slug` (`:315-336, 621-651`).
- **Publish controls** (top bar): Draft/Published badge; "Reset to template" (deletes all blocks, reseeds the 7-block starter — keeps theme/colors/media, cannot be undone) (`:387-408, 455-478`); "View site" (opens `/sites/<slug>`), "Unpublish", "Publish"/"Republish changes" (`:355-383, 479-499`).
- Live preview pane renders visible + available blocks with theme applied (`:656-688`).

### Theme controls (confirmed) — `src/components/public-site/types.ts`
Stored in `gw_public_sites.theme`. Fields (`:5-14`): `primaryColor` (default #0f172a), `accentColor` (default #9333ea), `fontFamily`, `letterSpacing` (em, range −0.05 to 0.3). Font picker offers **17 curated fonts** (`FONT_OPTIONS`, `:20-38`): Sans/Serif system, Lato, Open Sans, Roboto, Montserrat, Poppins, Raleway, Oswald, Bebas Neue, Playfair Display, Merriweather, Cormorant Garamond, Libre Baskerville, Cinzel, Dancing Script, Great Vibes. Theme edits debounce-save to the DB and update the preview instantly (`PublicPageEditor.tsx:341-353`).

### Full public-site block catalog (confirmed) — `src/components/public-site/registry.ts:26-51`
header, hero, events, about, media-gallery, music-player, video-gallery, ensembles, staff, press, support, fan-signup, liturgical-calendar, contact, donations, merch, concert-tickets, alumni-spotlight, spotlight, scholarship, appointment-booking. A block renders publicly only if it is `tier: 'free'` or its `requiredAddon` subscription is active (`:61-63`).

### Fan page + public view
- `/admin/fan-page` → `FanPageEditor` — a separate landing-page builder for signed-in fans; published version shows at `/fan` (`src/App.tsx:1019-1029`).
- `/sites/:slug` → `PublicSitePage`, no auth — the published tenant public site (`src/App.tsx:1042`).

### Roster & student sub-accounts
- **`/admin/students`** (`src/pages/admin/StudentsList.tsx`): searchable roster from view `gw_profiles_directory` filtered to `role='student'`; shows full_name, email, voice_part, phone. Row → `/admin/students/:id` (StudentDetail). "Onboard students" button → `/admin/students/onboard`. Subtitle lists it as roster + parent contacts, notes, uniforms, instruments, permission slips (`:40`).
- **`/admin/students/onboard`** (`src/pages/admin/StudentOnboarding.tsx`): 3 tabs.
  - **Single invite** (`:74-135`): email (required) + full name + optional class → edge function `gw-invite-student` → recipient gets a one-tap magic sign-in link (no password).
  - **Upload roster (CSV)** (`:138-246`): CSV with `email` + `name` columns (header optional); one `gw-invite-student` invite per row, sent sequentially with progress + failed-list tracking; optional "enroll all in class".
  - **Join code** (`:248-310`): per-course code (6 chars, ambiguous I/O/0/1 excluded, `:305-310`) stored on `gw_courses.join_code`; share URL `/join/<code>`; generate/regenerate/copy URL/copy code. Classes come from `gw_courses` (active); "No active classes. Create one in Academy first" if none.
- **People hub** (`src/pages/dashboard/PeopleHub.tsx`): roster grouped into "Directors & staff", voice sections, "Other", plus a **Groups** tab (messaging groups). Search by name/email/section. Faculty see a "Take attendance" link to `/attendance` (`:275-282`). Empty state: "No members yet — invite your roster from People settings" (`:305-307`). Groups come from Messenger.

### Content management (media)
- **`/admin/media`** → `MediaLibrary` (`src/pages/admin/MediaLibrary.tsx`, `App.tsx:2340`) and **`/dashboard/media-library`** → newer `MediaLibraryPage` (`App.tsx:1598`). MediaLibrary has filter tabs: All, Images, Audio, Video, PDF (`:629-633`), folder navigation (breadcrumbs), and drag-and-drop upload (`react-dropzone`). Also separate Music Library / Music Toolkit pages under `/dashboard`.

### Calendar & events
- **`/dashboard/calendar`** → `CalendarViews` (also reached from `/calendar` redirect) (`src/App.tsx:1346-1355`, `Calendar.tsx`).
- **`CreateEventDialog`** (`src/components/calendar/CreateEventDialog.tsx`): fields title (required), `event_type` (default `meeting`), start date/time, location, and **recurrence** (repeat every N days/weeks, repeat-on days, ends after N). Has an **AI-generated description** action (edge function, `:295-319`). Inserts into `gw_events` (`:387-393`).
- Public calendar at **`/public-calendar`** → `PublicCalendar` (`App.tsx:1997-2003`).
- **`/admin/events`** → `EventManagement` (`App.tsx:2320-2323`) is a **static placeholder** — hardcoded counts (8 events, 92% attendance) and a non-wired "Create Event" button (`src/pages/admin/EventManagement.tsx`). Do NOT document as functional.

### QR attendance & attendance hub
- **`/attendance`** → `AttendancePage` → `AttendanceDashboard` (`src/pages/AttendancePage.tsx`, `App.tsx:2117-2124`).
- Dashboard tabs (`AttendanceDashboard.tsx:281-306`): **Overview** (everyone), **Check-In** (QR; requires take-attendance perm), **Manual** (requires perm), **Schedule** (everyone), **Reports** (admin only), **Excuses** (admin → `ExcuseRequestApproval`; perm-but-not-admin → `ExcuseRequestManager`, `:553-560`).
- **Permission to take attendance** = `is_super_admin` OR `is_exec_board` OR exec_board_role `secretary` OR `special_roles` includes `secretary` (`:84-88`). `isAdmin` (for Reports/Excuses) additionally includes `is_admin` and role admin/super-admin (`:67`).
- **QR generator** (Check-In tab → `QRAttendanceGenerator.tsx`): select an upcoming event (future `gw_events`, `:88-99`), set expiration minutes (5–180, default 30, `:322-332`), generate a token via RPC `generate_qr_attendance_token`, QR encodes `<origin>/attendance-scan?token=…` (`:110-143`). Actions: Download PNG, Copy, Share (Web Share/clipboard fallback). Same permission gate as above (admin/super-admin/exec-board/secretary, `:64-86`).
- Students **scan** → `/attendance-scan` or `/attendance/scan` → `AttendanceScanPage` (no auth wrapper) (`App.tsx:2125-2132`).
- **PIN entry** attendance at `/attendance/pin` (`App.tsx:633`).
- Standalone QR pages: `/qr-generator` (public), `/qr-analytics` (protected), `/qr-scanner` (protected) (`App.tsx:1969-1987, 2133-2139`).
- Manual attendance = `TakeAttendance`; Schedule = `ClassScheduleManager`; Reports = `AttendanceReports` (`AttendanceDashboard.tsx:487-540`).

### Billing tables referenced (for writers' glossary)
`gw_billing_plans` (plan catalog), `gw_tenant_plans` (current plan/cycle/status/period), `gw_billing_modules` (add-on catalog), `gw_tenant_subscriptions` (activation, written by stripe-webhook), `gw_tenant_active_addons` (billing view), plus edge functions `create-plan-checkout`, `create-module-checkout`, `create-customer-portal-session`, `gw-demo-toggle-addon`.
