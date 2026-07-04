# House & Stage — GleeWorld mobile-first design direction

**Date:** 2026-07-04 · **Status:** Approved direction, pre-implementation
**Visual pitch:** https://claude.ai/code/artifact/3067d127-040c-4fda-856d-78d473033ade

## 1. Summary

One instrument, two rooms. By day ("House") GleeWorld reads like a printed concert
program: cream canvas, paper plates, square corners, tenant color used surgically as
ink. In performance context ("Stage") the app flips into fixed near-black rooms where
tenant color becomes light. The home screen stops being a card dashboard and becomes a
role-shaped hub; ninety minutes before any performance or service, the house lights dim
and the home becomes the call sheet ("Tonight mode").

The soul of the bet: **dark is not a preference — it's a place.** The app knows when
it's showtime.

## 2. Goals / Non-goals

**Goals**
- Mobile-first home for students and faculty that answers "what do I do next," not
  "what's the status."
- A design language distinctive enough to screenshot, disciplined enough to survive
  50 arbitrary tenant palettes.
- Contacts & Groups as first-class objects (the roster is load-bearing; the home
  renders on top of it).
- Broadcast messaging (SMS + email out, replies into Messenger) as the Phase-2
  revenue feature.

**Non-goals (kill list)**
- ❌ Global dark-first re-theming or a user-facing theme toggle (v1). Dark exists only
  as scoped Stage rooms.
- ❌ Glassmorphism depth-navigation. Blur allowed on at most 2 fixed chrome elements
  per screen, never inside scroll containers, always with ≥85% opaque token scrim.
- ❌ Building SMS/email *clients*. 1:1 comms hand off natively (`sms:`/`mailto:`/`tel:`);
  broadcast is outbound-only via Twilio/Resend.
- ❌ "Life hub for one person" as a roadmap item. Reframed as persistent personal
  accounts that survive graduation (later, organic).
- ❌ Adaptive/time-aware brand color, colored glass, kinetic animation of tenant fonts.
  Time-aware **neutrals** only; glass stays neutral; tenant fonts render static.

## 3. The House system (default, light)

- **Surfaces:** two elevations only — page (cream `--background`) and plate (paper
  `--card` + 1px `--border` + hairline top highlight `inset 0 1px 0 #fff`). Cards
  become "letterpress plates." No third elevation, no glass on content.
- **Corners:** square system stays (`--radius: 0`); `rounded-full` only for pills/LEDs.
- **Tenant color = ink.** Used only on: the single primary action per screen, active
  tab tick, and the up-next fuse. Everything else neutral. Test: navy/gold + serif
  tenant still looks editorial.
- **Typography:** tenant `fontFamily` (public-site `FONT_OPTIONS`) is promoted to the
  app's *display layer* — oversized headers, up-next strip title, Tonight mode — while
  ALL functional text stays the system sans at the existing `text-xs` floor. Tabular
  numerals (`font-variant-numeric: tabular-nums`) for every time/count.

## 4. The Stage system (scoped dark rooms)

- **Where:** Studio/DAW, score Viewer during performance hours, Tonight mode. Nowhere
  else. Implemented as a scoped class (e.g. `.gw-stage`) carrying its own fixed token
  block (near-black `#0A0A0C`-class surfaces, `#141418` plates, `#26262C` lines) — NOT
  a `prefers-color-scheme` fork, NOT mixed with light chrome on the same screen.
- **`--primary-stage`:** tenant hue/saturation with lightness clamped ≥62%, derived at
  runtime in `src/components/theme/TenantThemeRoot.tsx` beside the existing YIQ logic.
  Guarantees AA on black for every brand. On stage, tenant color is the single luminous
  accent (meters, playhead, call-time numerals, fuse).
- **New status tokens:** `--status-warning-bg/fg/border` (and success/critical pairs)
  added to `src/index.css` to replace the hardcoded amber hexes in
  `CommandCenter.tsx` (`#78350f` etc., lines ~258–306) — the current hardcoding exists
  *because* these tokens are missing.

## 5. Screens

### 5.1 Home (replaces the Command Center bento at `/dashboard`)
Order, top to bottom — nothing else:
1. **Greeting + date** (display font, small; no giant wordmark).
2. **Up-next strip** (56–64px plate): the WHAT — event title, location, dress/bring,
   one-tap chips to scores/part-tracks for that event. Tenant-color fuse underline
   drains toward start time; under 10 minutes, numerals tick per minute.
3. **Two role widgets** (hard cap 2):
   - Student: *Today* (schedule rows) + *Practice ledger* (quarter-note streak row;
     missed day renders a rest).
   - Faculty: *Needs attention* (real tappable job queue: unexcused counts, unreviewed
     practice submissions with inline play, ticket flags) + *Today / run sheet*.
4. **Keycap app grid:** max 8 tiles + "More" sheet. Driven by
   `v_tenant_active_modules` via `useTenantModules()` — reuse the nav-item arrays in
   `DashboardShell.tsx` (dedupe the two copies at ~265–337 and ~514–583 first; remap
   their raw-Tailwind `tone:` colors to tokens).
5. The activity feed is **removed** from home.

### 5.2 Tab bar (role-aware, labeled, module-gated)
- Student: **Home · Messages · Music · Studio · Schedule** ("Music" merges Viewer +
  Toolkit — students want "my music," not two abstractions).
- Faculty: **Home · Messages · Roster · Music · Schedule** (Studio moves to the grid).
- Labels always visible (`text-xs`), 44pt targets, active = tenant-ink top tick.
- Fixes pre-existing bug: `MobileBottomNav.tsx` is not module-gated today.

### 5.3 Tonight mode (Phase 1.5)
- **Trigger control (decided 2026-07-04):** a per-event "Tonight mode" toggle in the
  event editor. Defaults: ON for event types performance/service, OFF for rehearsals;
  the event creator/admin can override either way. Org-level defaults per event type
  configurable in the admin console.
- **Personal scoping (decided):** Tonight mode is per-user, driven by the next
  toggled-on event the user is CALLED to (roster/group membership) — not tenant-wide.
  Members with no such event tonight see the normal home. Two+ events in the window:
  nearest first, with a "Next: <time> <title>" chip to switch. This dependency is a
  primary reason Contacts & Groups ships first.
- **User-created events (decided):** any user with event-creation permission gets the
  same toggle; the call sheet shows only to that event's invitees/group (a section
  leader's sectional, a quartet's gig).
- Activates T−90 → full-screen Stage room. Auto-expires when the event ends.
  Dismissible to normal home; returns via up-next.
- Content: call time (display font ~96pt, `--primary-stage` glow) · dress · location
  with map link · program order with per-piece links to scores/tracks · emergency
  contact button.
- Entrance: "house lights down" — canvas dims top-to-bottom ~700ms, one heavy haptic.
  Gated on `prefers-reduced-motion` (instant swap, no dim).
- Must render fully from cached/preloaded route data — venue Wi-Fi assumed dead; NO
  service worker (standing rule).

### 5.4 Top bar
56px (down from 80px). Search behind an icon; "+" contextual; bell; avatar.

## 6. Signature interactions (all reduced-motion gated; haptics via Capacitor plugin — must register in `MainViewController.capacitorDidLoad`)

1. **House lights down** — Tonight entrance (above).
2. **The fuse** — up-next underline drains; no pulsing.
3. **Detent check-in** — attendance is press-and-hold 400ms; square fills like a stamp;
   one crisp mechanical click. Faculty roster rows stamp "HERE."
4. **Keycap grid** — tiles depress 1px with shadow collapse + light tick.
5. **Practice ledger** — completing practice drops a quarter-note onto the staff with a
   soft thud; a missed day is a rest.

Haptics default OFF outside confirmations.

## 7. Data plan & feasibility anchors

| Need | Source | Status |
|---|---|---|
| App grid tiles | `v_tenant_active_modules` via `src/hooks/useModuleAccess.ts` | ✅ exists |
| Role shaping | `useUserRole()` (`profile.role`, `is_admin`, …) | ✅ exists |
| Up-next / today / announcements | `v_command_center_feed` (migration `20260614120000_command_center_view.sql`) | ✅ exists |
| Faculty unreviewed practice | `gw_practice_recordings` query in CommandCenter.tsx | ✅ reuse |
| Student own-practice widget | same table, filtered to own rows | 🔧 small |
| **Assignments due** | none — assignment tables exist (`assignmentResolver.ts`) but nothing feeds the dashboard | 🔧 new feed arm or client query |
| Tonight trigger | calendar events (type = performance/service) + T−90 check | 🔧 new |
| Contacts & Groups objects | existing rosters/profiles; needs person/group card model | 🔧 Phase 1 |

Do not conflate `useTenantModules` (tenant has module) with `useUnifiedModules`/user
grants (user may open it) — the grid gates on the former, tiles may badge-lock on the
latter.

## 8. Phasing

- **Phase 1 — Roster, then lobby.** Contacts & Groups as first-class objects (person/
  ensemble cards, native 1:1 handoffs) + the House home + role-aware labeled tab bar +
  56px top bar + token debt fixes. Labeled tabs can ship immediately. Instrument taps
  (widget vs grid vs tab) from day one.
- **Phase 1.5 — Tonight mode.** The signature. Fast follow, one scoped Stage surface.
- **Phase 2 — Broadcast.** Director sends call-time changes via Twilio SMS + Resend
  email; replies route into Messenger. Priced per segment; the feature with a price tag.
- Later, organic: persistent personal accounts ("graduates retention"), Stage room for
  Viewer performance hours if not in 1.5.

## 9. Acceptance tests (all five, measured, before merge)

1. **60fps** (no frame >20ms) scrolling a 200-row roster on iPhone 12 in WKWebView with
   all new chrome visible; Instruments trace attached.
2. **AA contrast** (4.5:1 text, 3:1 UI) on every screen under worst-case tenant themes
   (`#FFFF00` primary, `#F8F8F8` primary, navy/gold + serif) — automated axe run per palette.
3. **Call sheet legible at arm's length**: ≥20pt data, ≥7:1 contrast, dark room at
   minimum brightness; separately legible in direct sunlight (House theme).
4. **Network-loss survival**: home → event → call sheet completes with network disabled
   after initial load, without a service worker.
5. **One-handed at 390×844**: 44pt targets, `prefers-reduced-motion` on, iOS
   accessibility text XL — no clipped or truncated labels.

## 10. Open questions

- ~~Tonight mode trigger~~ — resolved 2026-07-04, see §5.3 (per-event toggle,
  per-user roster scoping, user-created events included).
- Whether Viewer-in-performance-hours joins Stage in 1.5 or later.
- Broadcast pricing/packaging (per-segment pass-through vs bundled) — product decision,
  not design.
