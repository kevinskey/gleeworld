# GleeWorld iPad — Implementation Plan

_Prioritized, safe fixes. Ordered for minimum blast radius per unit of value._

## Shared-Primitive Fixes (largest surface area)

### PL-001 · Toast primitive: safe-area + visible close (GW-001, GW-002)
**File**: `src/components/ui/toast.tsx`
**Changes**:
* Line 17 viewport: `pb-20` → `pb-[calc(5rem+env(safe-area-inset-bottom))]`; `max-h-screen` → `max-h-[100dvh]`.
* Line 78 close: replace `opacity-0` with `opacity-70`; keep `hover:opacity-100 focus:opacity-100`; keep `group-hover:opacity-100`.
* Bump icon target: wrap in min-44 touch area or add `min-h-[44px] min-w-[44px]`? Radix Close root receives className, so add `min-h-[44px] min-w-[44px]` — but this expands the visual hitbox potentially past the toast footprint. Instead: keep visual `p-1` but add larger touch expansion via `after:` pseudo (safer). Simpler: keep current size but ensure visibility.
**Regression risk**: Visual — close button now always visible; sighted users will see a subtle "X" always. This is the intended fix. **Test**: Trigger toast on iPad, tap close, dismiss. Confirm phone still works.

### PL-002 · Dialog primitive: iPad landscape width + safe close (GW-003, GW-027)
**File**: `src/components/ui/dialog.tsx`
**Changes**:
* Line 20 content: add `md:max-w-2xl` — `max-w-lg md:max-w-2xl`.  ← *Actually, most consumers rely on `max-w-lg` default; changing default width could break page layouts. **Safer**: add className-friendly convention — leave the primitive default and let consumers who want wider explicitly opt in via `className="md:max-w-2xl"`.*
* Decision: Do NOT change the default. Document the recommended pattern in the primitive.
* Line 22 close button: `h-8 w-8` → `h-10 w-10 md:h-9 md:w-9` (40 mobile, 36 pointer). Provides more touchable area without shrinking on desktop.
**Regression risk**: Minimal — close button slightly larger. No layout collisions.

### PL-003 · Sheet primitive: iPad-appropriate widths + 44px close (GW-004, GW-005)
**File**: `src/components/ui/sheet.tsx`
**Changes**:
* Lines 39-41 left/right side variants: `w-[85vw] max-w-sm` → `w-[85vw] max-w-sm md:max-w-md lg:max-w-lg`.
* Line 80 close button: `h-10 w-10 sm:h-8 sm:w-8` → `h-11 w-11 sm:h-10 sm:w-10 lg:h-8 lg:w-8` — 44 mobile, 40 tablet, 32 desktop-precise.
**Regression risk**: Left/right sheets now wider on md+. All existing consumers should tolerate — content inside is width-flexible. No consumer relies on the 384px cap for layout.

### PL-004 · Card-overlay helper class for hover reveals (GW-019)
**File**: `src/index.css`
**Add**: A utility class `.gw-card-overlay` that is visible on touch, hidden on hover-capable pointers. Sweep the top ~15 highest-traffic components to adopt it via find/replace.
```css
.gw-card-overlay { opacity: 1; }
@media (hover: hover) and (pointer: fine) {
  .gw-card-overlay { opacity: 0; }
  .group:hover .gw-card-overlay { opacity: 1; }
}
```
Adopt in: `FeaturedMusic.tsx:260`, `FeaturedProducts.tsx:280`, `CourseVideoLibrary.tsx:393`, `PhotoGallery.tsx:401`.
**Regression risk**: Low — desktop hover behavior unchanged; touch tier now sees the overlay. Some designers may find always-visible overlays busy — but this matches iOS conventions.

### PL-005 · rich-text-editor toolbar coarse-pointer sizing (GW-018)
**File**: `src/components/ui/rich-text-editor.tsx`
**Changes**: `h-7` toolbar buttons → `h-8 md:h-7` (32px touch / 28px desktop). Keep icons `h-4 w-4`.
**Regression risk**: Toolbar 4px taller on iPad. No layout breakage inside dialogs.

### PL-006 · date-time-picker calendar nav touch targets (GW-017)
**File**: `src/components/ui/date-time-picker.tsx`
**Changes**: Nav buttons `h-7 w-7` → `h-9 w-9 md:h-7 md:w-7`. Icons unchanged.
**Regression risk**: Calendar picker 8px taller on iPad/mobile.

## Component-Scoped Fixes

### PL-007 · GlobalMusicPlayer safe area (GW-010)
**File**: `src/components/music/GlobalMusicPlayer.tsx:57`
**Changes**: Add `pb-[env(safe-area-inset-bottom)]` to the fixed container.

### PL-008 · PointOfSale bottom bar safe area (GW-011)
**File**: `src/pages/PointOfSale.tsx:772`
**Changes**: Add `pb-[env(safe-area-inset-bottom)]` and adjust min-height.

### PL-009 · AuditionPage phone submit bar safe area (GW-012)
**File**: `src/pages/AuditionPage.tsx:361`
**Changes**: Add `pb-[env(safe-area-inset-bottom)]`.

### PL-010 · AttendanceMobileCards safe area (GW-025)
**File**: `src/components/attendance/AttendanceMobileCards.tsx:170`
**Changes**: Add `pb-[env(safe-area-inset-bottom)]` to sticky bar.

### PL-011 · Amazon product carousel arrows visible on touch (GW-006)
**File**: `src/components/shared/AmazonProductSlider.tsx:110, 156`
**Changes**: `opacity-0 group-hover:opacity-100` → `opacity-70 md:opacity-0 md:group-hover:opacity-100` (touch tier always visible, desktop keeps hover reveal).

### PL-012 · FeaturedMusic + FeaturedProducts play overlay (GW-007)
**Files**: `src/components/music/FeaturedMusic.tsx:260`, `src/components/products/FeaturedProducts.tsx:280`
**Changes**: Replace with `gw-card-overlay` helper (from PL-004).

### PL-013 · Admin ProductManager delete visible (GW-008)
**Files**: `src/components/admin/products/ProductManager.tsx:958`, `src/components/admin/ProductManager.tsx` (if same class exists)
**Changes**: `opacity-0 group-hover:opacity-100` → `opacity-70 hover:opacity-100`.

### PL-014 · DiscussionModule delete icon (GW-009)
**File**: `src/components/discussion-groups/DiscussionModule.tsx:281`
**Changes**: Convert raw `<button className="h-6 w-6">` to `<Button variant="ghost" size="icon-sm">` and set `opacity-70` at rest.

### PL-015 · MyAttendance month nav (GW-015)
**File**: `src/components/attendance/MyAttendance.tsx:254, 260`
**Changes**: Convert to `<Button size="icon-sm">` (44px enforced).

### PL-016 · PersistentMeetingOverlay controls (GW-016)
**File**: `src/components/messenger/PersistentMeetingOverlay.tsx:20, 23`
**Changes**: `h-7 w-7` → `h-11 w-11 md:h-9 md:w-9`. End-meeting button gets destructive intent tint but stays reachable.

### PL-017 · DashboardShell dynamic viewport (GW-014)
**File**: `src/components/dashboard/DashboardShell.tsx:1034, 368`
**Changes**: `h-screen` → `h-[100dvh]`; `min-h-screen` → `min-h-[100dvh]`. `100dvh` equals `100vh` under WKWebView, so native untouched; Safari gains keyboard/chrome resilience.
**Regression risk**: `dvh` supported since iOS 15.4 — GleeWorld's iPad audience is safe. Older Android may still need `vh` fallback, but Android is Capacitor 7 (Chromium 100+) — supported.

### PL-018 · `100vh` → `100dvh` in scroll containers (GW-013, GW-022)
**Files**: `src/features/docs/DocsApp.tsx:25`, `src/features/read-music/ReadMusic.tsx:273`, `src/components/calendar/CalendarDayDetail.tsx:88`, `src/pages/admin/AdminOfficeHoursDashboard.tsx:336`, `src/components/booking/BookingFormWizard.tsx:257`, `src/pages/UnifiedCoursePage.tsx:368`, `src/pages/tour-manager/TourManagerDashboard.tsx:344`, `src/components/discussion-groups/DiscussionModule.tsx:255`, `src/components/gallery/PhotoGallery.tsx:638`, `src/components/music/VirtualPiano.tsx:585`.
**Changes**: `100vh` → `100dvh` (only where a scroll container caps its height on the viewport).

## Order of Implementation

1. Shared primitives (Toast, Dialog, Sheet, rich-text, date-picker) — PL-001, PL-002, PL-003, PL-005, PL-006.
2. Card-overlay helper + adoption in top-traffic components — PL-004, PL-012.
3. Safe-area on fixed bottom bars — PL-007, PL-008, PL-009, PL-010.
4. Hover-only affordances in workflow-critical spots — PL-011, PL-013, PL-014, PL-016.
5. Touch target upgrades — PL-015.
6. Viewport-height correctness — PL-017 (DashboardShell first, verify no visual regression), then PL-018 batch.

## Regression Test Matrix

| Fix | Test |
|---|---|
| PL-001 | Trigger toast on iPad Safari + Capacitor; tap close; check position above home indicator |
| PL-002 | Open any dialog on iPad landscape; verify close button reachable |
| PL-003 | Open filters sheet on iPad; verify width is not phone-sized; close button 44px |
| PL-004 | Load home marketing page; hover on desktop, tap on iPad — overlays behave differently by pointer |
| PL-005 | Open composer in an announcement dialog; toolbar comfortable on iPad |
| PL-006 | Open date-time picker in an event form; iPad nav taps land |
| PL-007 | Play music on iPad landscape; controls above home indicator |
| PL-008 | Enter POS on iPad; charge bar clear of home indicator |
| PL-009 | Open `/auditions` on iPad portrait phone-sized; submit bar clear |
| PL-011 | Load public shop; carousel arrows visible on iPad |
| PL-013 | `/admin/products` on iPad; delete button visible |
| PL-014 | Open discussion thread on iPad; verify delete icon 44px and visible |
| PL-016 | Start a meeting; overlay controls tappable on iPad |
| PL-017 | Navigate DashboardShell on iPad Safari; open keyboard; no clipping |
| PL-018 | Open each flagged page; open soft keyboard where applicable; verify no overflow |

Automated: `npm run typecheck:guard`, `npm run lint`, `npm run test`, `npm run build`. Manual: Xcode Simulator iPad Pro 12.9" once available; developer can spot-check on physical iPad after deploy.

## Files that will be modified

Shared primitives:
* `src/components/ui/toast.tsx`
* `src/components/ui/dialog.tsx`
* `src/components/ui/sheet.tsx`
* `src/components/ui/rich-text-editor.tsx`
* `src/components/ui/date-time-picker.tsx`
* `src/index.css`

Layout / shell:
* `src/components/dashboard/DashboardShell.tsx`

Components:
* `src/components/music/GlobalMusicPlayer.tsx`
* `src/pages/PointOfSale.tsx`
* `src/pages/AuditionPage.tsx`
* `src/components/attendance/AttendanceMobileCards.tsx`
* `src/components/shared/AmazonProductSlider.tsx`
* `src/components/music/FeaturedMusic.tsx`
* `src/components/products/FeaturedProducts.tsx`
* `src/components/admin/products/ProductManager.tsx`
* `src/components/discussion-groups/DiscussionModule.tsx`
* `src/components/attendance/MyAttendance.tsx`
* `src/components/messenger/PersistentMeetingOverlay.tsx`

`100vh` → `100dvh` batch:
* `src/features/docs/DocsApp.tsx`
* `src/features/read-music/ReadMusic.tsx`
* `src/components/calendar/CalendarDayDetail.tsx`
* `src/pages/admin/AdminOfficeHoursDashboard.tsx`
* `src/components/booking/BookingFormWizard.tsx`
* `src/pages/UnifiedCoursePage.tsx`
* `src/pages/tour-manager/TourManagerDashboard.tsx`
* `src/components/discussion-groups/DiscussionModule.tsx`
* `src/components/gallery/PhotoGallery.tsx`
* `src/components/music/VirtualPiano.tsx`

Total: ~22 files.

## Deferred (documented, not implemented)

* **GW-021**: z-index refactor. Needs visual regression tests before touching.
* **GW-023**: `prefers-color-scheme` fallback. Belongs in ThemeProvider audit.
* **GW-024**: Extending immersive shell to more Studios. Needs product decision.
* Full sweep of remaining ~50 files with hover-only overlays — highest-traffic 4-6 are updated to use the helper class; the rest can adopt the class incrementally.

## Risk / rollback

* All changes are additive CSS class edits + primitive prop tweaks. No API breakage.
* Rollback: `git revert` the audit commit.
* Preserved: routes, guards, Supabase queries, tenant logic, native audio engine.
