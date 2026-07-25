# GleeWorld iPad Audit — Expert Findings

_Independent review, then panel deliberation._ · _Chair: Tablet Product Designer_ · _Implementation lead: Frontend Architecture Expert_

## Severity Legend

* **P0 — Blocking**: workflow cannot be completed
* **P1 — Critical**: major usability / accessibility / data-entry failure
* **P2 — Significant**: works but confusing, inefficient, not tablet-optimized
* **P3 — Refinement**: consistency / polish

## Findings

### GW-001 · Toast close button invisible on touch
**Route**: Global. **Component**: `src/components/ui/toast.tsx:78`. **Viewport**: All iPad.
**Description**: Close button is `opacity-0 group-hover:opacity-100`; touch users have no hover event, so the "X" never appears. Keyboard focus reveals it, but touch users cannot dismiss toasts.
**Impact**: Cannot dismiss toasts on iPad without swipe (Radix swipe works). Accessibility fail.
**Expert**: Apple iPadOS · Accessibility. **Severity**: P1. **Fix**: Make `opacity-70` at rest; keep `hover:opacity-100`. Shared primitive.

### GW-002 · Toast viewport clips home indicator + keyboard
**Route**: Global. **Component**: `src/components/ui/toast.tsx:17`.
**Description**: `pb-20` hardcoded (not safe-area), `max-h-screen` not `max-h-[100dvh]`. On iPad landscape the home indicator overlaps toasts; when soft keyboard is open in messenger/composer, toasts vanish.
**Impact**: Confirmations/errors invisible in critical flows.
**Expert**: iPadOS · Responsive Engineer. **Severity**: P1. **Fix**: `pb-[calc(5rem+env(safe-area-inset-bottom))]`, `max-h-[100dvh]`. Shared primitive.

### GW-003 · Dialog max width caps at 512px on all screens
**Route**: Global. **Component**: `src/components/ui/dialog.tsx:20`.
**Description**: `max-w-lg` fixed — on iPad Pro landscape (1366px) forms and previews are cramped in the center 512px. Studio project settings, event editor, product editor all suffer.
**Impact**: Form fields wrap awkwardly, tables inside dialogs scroll unnecessarily, thumbnails feel undersized.
**Expert**: Tablet Product Designer · Design System. **Severity**: P2. **Fix**: Add `md:max-w-2xl` breakpoint; do NOT touch `max-w-lg` default (avoid regressions on phone). Shared primitive.

### GW-004 · Left/right sheet width feels phone-sized on iPad
**Route**: Global. **Component**: `src/components/ui/sheet.tsx:39-41`.
**Description**: `w-[85vw] max-w-sm` (384px cap) — filter drawers, member detail sheets, product-quick-view all cap at 384px. On 1024px+ iPad this leaves a 640px void.
**Impact**: Sheets feel undersized, users constantly scroll within artificially narrow columns.
**Expert**: Tablet Product Designer. **Severity**: P2. **Fix**: Bump `sm:max-w-md md:max-w-lg` for left/right sides. Keep `max-w-sm` default (phone). Shared.

### GW-005 · Sheet close button 40px on phone, borderline
**Route**: Global. **Component**: `src/components/ui/sheet.tsx:79-83`.
**Description**: Close button is `h-10 w-10 sm:h-8 sm:w-8` — 40px mobile, 32px tablet+. HIG floor is 44.
**Impact**: Minor missed taps, especially in landscape one-handed use.
**Expert**: Accessibility. **Severity**: P3. **Fix**: `h-11 w-11 sm:h-10 sm:w-10` (44 mobile / 40 desktop OK if hover/pointer). Shared.

### GW-006 · Amazon product carousel arrows are hover-only
**Route**: Marketing / shop pages using `AmazonProductSlider`. **Component**: `src/components/shared/AmazonProductSlider.tsx:110, 156`.
**Description**: Prev / next carousel arrows are `opacity-0 group-hover:opacity-100`. Touch users cannot navigate the carousel forward except by side-swipe (may not be implemented).
**Impact**: Product discovery broken on iPad public shop.
**Expert**: iPadOS · Product Designer. **Severity**: P1 (public sales). **Fix**: Make arrows `opacity-100` on `md:opacity-0 md:group-hover:opacity-100` — desktop keeps the reveal, iPad+ tap surface always visible. Page-scoped fix.

### GW-007 · Featured music/product play overlays hover-only
**Route**: `/` (home), fan pages, shop. **Components**: `src/components/music/FeaturedMusic.tsx:260`, `src/components/products/FeaturedProducts.tsx:280`.
**Description**: Dark overlay + play/quick-view button revealed only on hover. Touch users cannot activate.
**Impact**: Cannot play featured tracks or quick-view products on iPad marketing pages.
**Expert**: iPadOS. **Severity**: P1. **Fix**: Show overlay opacity-60 always on `md:` and below (touch tier); keep hover reveal for `lg:` mouse tier. Page-scoped.

### GW-008 · Admin product delete button hidden until hover
**Route**: `/admin/products`. **Component**: `src/components/admin/products/ProductManager.tsx:958`, `src/components/admin/ProductManager.tsx`.
**Description**: Delete button `opacity-0 group-hover:opacity-100`. Admin users on iPad cannot see the delete affordance.
**Impact**: Admin cannot delete products on iPad. Workaround: swipe-actions? None.
**Expert**: iPadOS · Workflow. **Severity**: P1. **Fix**: Show button at reduced emphasis (`opacity-70`) always. Page-scoped.

### GW-009 · Discussion thread delete icon hidden + tiny
**Route**: `/academy/c/:code/discuss/:threadId`. **Component**: `src/components/discussion-groups/DiscussionModule.tsx:281`.
**Description**: Delete icon `h-6 w-6 opacity-0 group-hover:opacity-100`. Two failures: sub-44px touch target, hover-only.
**Impact**: Instructors cannot moderate on iPad.
**Expert**: iPadOS · Accessibility. **Severity**: P1. **Fix**: Move to a `<Button size="icon-sm">` with `opacity-70` at rest. Page-scoped.

### GW-010 · GlobalMusicPlayer overlaps home indicator
**Route**: Any page mounting the global player. **Component**: `src/components/music/GlobalMusicPlayer.tsx:57`.
**Description**: `fixed bottom-0 left-0 right-0` no safe-area padding. iPad Pro landscape shows player controls under the home indicator.
**Impact**: Play/pause / skip buttons partly obscured.
**Expert**: iPadOS. **Severity**: P1. **Fix**: `pb-[env(safe-area-inset-bottom)]` inline or class. Component-scoped.

### GW-011 · PointOfSale bottom action bar without safe area
**Route**: `/pos`. **Component**: `src/pages/PointOfSale.tsx:772`.
**Description**: Payment total + charge button `fixed bottom-0`, no safe area. Home indicator eats bottom pixels.
**Impact**: Sale confirmation partially hidden on iPad in native app.
**Expert**: iPadOS · Workflow. **Severity**: P1. **Fix**: Add `pb-[env(safe-area-inset-bottom)]` and `min-h-[calc(3.5rem+env(safe-area-inset-bottom))]`. Component-scoped.

### GW-012 · AuditionPage submit bar phone-only bottom bar without safe area
**Route**: `/auditions`. **Component**: `src/pages/AuditionPage.tsx:361`.
**Description**: `fixed bottom-0 md:hidden` — but `md:hidden` triggers up to 767px, which includes iPad mini portrait if browser reports narrow. Missing safe area.
**Impact**: Submit button ducked below home indicator on iPad portrait when treated as `md:hidden`.
**Expert**: iPadOS. **Severity**: P2. **Fix**: Add safe-area padding. Component-scoped.

### GW-013 · `calc(100vh - ...)` breaks on soft keyboard
**Routes**: `/docs/*`, `/read-music/*`, `/dashboard/calendar/*`, `/admin/office-hours`, various.
**Components**: `DocsApp.tsx:25`, `ReadMusic.tsx:273`, `CalendarDayDetail.tsx:88`, `AdminOfficeHoursDashboard.tsx:336`, `DiscussionModule.tsx:255`, `BookingFormWizard.tsx:257`, `PhotoGallery.tsx:638`, `UnifiedCoursePage.tsx:368`, `TourManagerDashboard.tsx:344`, `VirtualPiano.tsx:585`.
**Description**: Using `100vh` in dynamic-height contexts. On iPad Safari + Capacitor, `100dvh` is required for keyboard/browser-chrome resilience. 12 files already use `100dvh` correctly, ~10 files still use `100vh`.
**Impact**: Content clipped when keyboard opens; scroll containers exceed viewport.
**Expert**: Responsive Engineer. **Severity**: P2. **Fix**: Replace `100vh` with `100dvh` in flagged files. Multiple files.

### GW-014 · DashboardShell root uses `h-screen` (`100vh`)
**Route**: All authenticated app pages. **Component**: `DashboardShell.tsx:1034`.
**Description**: `flex h-screen w-full bg-background overflow-hidden`. Correct on native (WKWebView) but on iPad Safari the bottom URL bar hide/show shifts content.
**Impact**: 60px viewport jitter on Safari; minor. Native app unaffected.
**Expert**: Responsive Engineer. **Severity**: P3. **Fix**: `h-[100dvh]` — behaves identically to `100vh` on WKWebView (dvh == vh when no dynamic chrome), better on Safari.

### GW-015 · MyAttendance month nav buttons 28px
**Route**: `/attendance`. **Component**: `src/components/attendance/MyAttendance.tsx:254, 260`.
**Description**: Month prev/next buttons `h-7 w-7` = 28px. Well below 44px.
**Impact**: Navigation misses, especially with fingertip in landscape.
**Expert**: Accessibility. **Severity**: P2. **Fix**: Use `<Button size="icon-sm">` (min 44px). Component-scoped.

### GW-016 · Video meeting overlay controls sub-44px
**Route**: Any route with an active meeting. **Component**: `src/components/messenger/PersistentMeetingOverlay.tsx:20, 23`.
**Description**: Minimize + END-meeting buttons `h-7 w-7`. End button especially high-stakes if user misses tap.
**Impact**: Users struggle to end / minimize call.
**Expert**: iPadOS · Accessibility. **Severity**: P1 (destructive-adjacent action too small). **Fix**: 44×44. Component-scoped.

### GW-017 · date-time-picker calendar nav 28px
**Route**: Any dialog with a date field. **Component**: `src/components/ui/date-time-picker.tsx:85`.
**Description**: Calendar month prev/next `h-7 w-7`. Shared primitive → affects many forms.
**Impact**: Date entry error rate rises.
**Expert**: Accessibility. **Severity**: P2. **Fix**: Bump interactive area. Shared primitive.

### GW-018 · rich-text-editor toolbar buttons 28px
**Route**: Any composer (announcement, discussion, message). **Component**: `src/components/ui/rich-text-editor.tsx:716, 728, 731`.
**Description**: Image-alignment and width-preset toolbar buttons `h-7`. Fine on mouse, tight on iPad.
**Impact**: Formatting misfires; users may give up on rich formatting on iPad.
**Expert**: Accessibility. **Severity**: P2. **Fix**: On coarse-pointer / touch media query, expand to 40-44px. Shared primitive.

### GW-019 · Hover-only overlays across many card grids
**Routes**: `/dashboard/media-library`, `/dashboard/quick-cam`, `/dashboard/videos`, admin galleries. **Components**: `PhotoGallery.tsx:401`, `CourseVideoLibrary.tsx:393`, `AdminMusicManagement.tsx:1574`, `MetalHeaderDashboard.tsx`, plus ~60 files.
**Description**: `opacity-0 group-hover:opacity-100` overlays hide action buttons and captions on card grids.
**Impact**: iPad users see silent cards; cannot access play, delete, favorite.
**Expert**: iPadOS. **Severity**: P2 (many pages, cumulative). **Fix**: Use `@media (hover: hover)` gate — Tailwind `group-hover:` already keys hover; add `opacity-0 hover:opacity-100 touch:opacity-100` OR flip default when no hover. Cleanest via a helper class `.gw-card-overlay` in `index.css`.

### GW-020 · Hover-dependent menus without click fallback
**Component**: `src/components/media/HeaderMusicPlayer.tsx:299, 312`, `src/components/ui/header-clock.tsx:89, 175`, `src/components/media/CountdownTimer.tsx:198`.
**Description**: `onMouseEnter`/`onMouseLeave` open/close menus with no click alternative. iPad users must tap-and-hope.
**Impact**: Menus unreliable / inaccessible.
**Expert**: iPadOS. **Severity**: P2. **Fix**: Add `onClick` toggle + focus-within. Component-scoped.

### GW-021 · z-index sprawl risks stack collisions
**Routes**: Global. **Components**: `AdminOfficeHoursDashboard` (`z-[200001]`), `PointOfSale` (`z-[99998]`), Toast (`z-[100]`), Dialog/Sheet (`z-50`), TopBar (`z-30`).
**Description**: Ad-hoc z-values with no scale. Assistant sheet, GlobalMusicPlayer, Toast, Sheet can collide.
**Impact**: Latent — spot bugs, hard to reason about.
**Expert**: Design System. **Severity**: P3. **Fix**: Document a scale in `docs/ipad-ui-audit/existing-design-system.md` (done) — do not refactor now; risk > reward without visual tests.

### GW-022 · `100vh` in mobile-landscape VirtualPiano
**Route**: Music toolkit / virtual piano. **Component**: `src/components/music/VirtualPiano.tsx:585`.
**Description**: `h-[calc(100vh-120px)]` on landscape mobile — keyboard breaks layout.
**Expert**: Responsive Engineer. **Severity**: P2. **Fix**: Bundled with GW-013.

### GW-023 · No `prefers-color-scheme` fallback for dark mode
**Route**: Global. **File**: `src/index.css`.
**Description**: Dark mode class-based (`.dark`), no media-query fallback. iPad users with system dark mode do not auto-flip.
**Expert**: Accessibility. **Severity**: P3. **Fix**: Add `@media (prefers-color-scheme: dark)` block that sets `.dark` variables when ThemeProvider is in "system" mode. Global.

### GW-024 · Studio session immersive good, other studios miss
**Routes**: `/read-music/*`, `/dashboard/sight-reading`, `/dashboard/part-tracks/:projectId`. **Component**: `DashboardShell.tsx:359-365`.
**Description**: DashboardShell hides sidebar on Studio session and Viewer detail. Other full-window studios (Read Music score practice, Sight Reading, Part Tracks) still show the sidebar consuming ~256px of horizontal iPad space.
**Impact**: Studios feel cramped on iPad landscape.
**Expert**: Music Workflow. **Severity**: P2 (team decision required; recommend but do not auto-apply — some directors may prefer nav access during rehearsal). **Fix**: Add opt-in per route via a `useImmersiveShell()` hook; do not force. Flagged for team review, not auto-applied.

### GW-025 · Attendance mobile sticky bottom bar without safe area
**Route**: `/attendance`. **Component**: `src/components/attendance/AttendanceMobileCards.tsx:170`.
**Description**: `sticky bottom-0` action bar; missing safe-area padding.
**Expert**: iPadOS. **Severity**: P2. **Fix**: Add `pb-[env(safe-area-inset-bottom)]`.

### GW-026 · Header phone icon button sizing 24px
**Route**: Global (marketing). **Component**: `src/components/layout/Header.tsx:485`.
**Description**: `h-6 w-6` interactive button (responsive `sm:h-8 sm:w-8` = 32px). Below 44 even on tablet.
**Expert**: Accessibility. **Severity**: P3. **Fix**: `<Button size="icon-sm">` (44px enforced).

### GW-027 · Dialog close button 32px
**Component**: `src/components/ui/dialog.tsx:22` (close `h-8 w-8`).
**Description**: 32px close, borderline for touch.
**Expert**: Accessibility. **Severity**: P3. **Fix**: `h-10 w-10 md:h-9 md:w-9` — 40 on touch, 36 on precise pointer via `lg:`.

## By Expert

### Apple iPadOS Design Expert
Issues raised: GW-001, GW-002, GW-006, GW-007, GW-008, GW-009, GW-010, GW-011, GW-012, GW-016, GW-019, GW-020, GW-025.

### Senior Tablet Product Designer
GW-003, GW-004, GW-024. Cross-cutting: dialogs and sheets waste iPad landscape width.

### Responsive Design Engineer
GW-013, GW-014, GW-022. Multiple `100vh` sites; DashboardShell shell height.

### Accessibility and Inclusive Design Expert
GW-005, GW-015, GW-016, GW-017, GW-018, GW-023, GW-026, GW-027. Touch targets and prefers-color-scheme.

### Music-Education Workflow Expert
GW-007 (featured music broken on public marketing), GW-008 (admin product delete), GW-009 (discussion moderation), GW-016 (meeting controls), GW-024 (studios).

### Professional Music-Software Interface Expert
Studio session already immersive on `/studio/sessions/:id` (good). Native audio engine untouched. No P0/P1 issues in Studio-specific transport/mixer code observed at the shared-primitive level. Studio-specific timeline height (`100px` on coarse pointer) is well-tuned.

### Design-System and Frontend Architecture Expert
Root causes: Toast, Dialog, Sheet primitives (GW-001-005, GW-017, GW-018, GW-027). Fixing these fixes many pages at once. Card-overlay helper class (GW-019) resolves ~60 files with one change.

### iPad Quality-Assurance Engineer
No route entirely broken (P0). GW-006, GW-008, GW-011, GW-016 are workflow-blocking on specific pages (P1). Empty/loading/error states not audited exhaustively — flagged as follow-up.

## Panel Deliberation Notes

* **Chair (Product Designer)**: Prioritize shared primitive fixes first (Toast, Dialog, Sheet, rich-text-editor, date-time-picker). One PR-worth of changes clears the largest number of pages.
* **Implementation Lead (Frontend Architecture)**: Introduce a `.gw-card-overlay` utility to sweep 60+ hover-overlay violations without one-off edits. Add a `@media (hover: hover)` gate at the CSS layer.
* **Studio Expert**: Do not touch native audio path or transport code — only React chrome. Studio session immersive route works.
* **Music Educator**: GW-008 (admin can't delete products on iPad) is embarrassing but low-frequency. Prioritize GW-006/007 (public marketing carousels + featured music on the front door).
* **Accessibility**: Enforce `min-h-[44px]` via existing `<Button size="icon-sm">` — refactor raw `<button className="h-6 w-6">` where found in critical paths (meeting overlay, month nav).
* **QA**: Do not change desktop hover behavior — keep hover reveals where they exist for mouse users; only ensure a touch-friendly rest state.

## What we deliberately do NOT change

* Native audio engine (preserved)
* Route paths, guards, tenant logic (preserved)
* Any Supabase query
* Existing dark-mode class semantics (adding `prefers-color-scheme` as a supplement is P3; deferred)
* Sidebar auto-immersive routes beyond current two (GW-024 needs product decision)
* z-index refactor (GW-021) — too risky without visual regression testing
