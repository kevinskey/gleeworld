# Uniform calendar pop-out panels (iPad) — design

Date: 2026-07-06
Status: Approved
Surface: `/dashboard/calendar` (CalendarViews → CommandCenterCalendar)

## Problem

The calendar's three left pop-outs are one-offs at three different widths —
Filters `max-w-sm` (384px), List/Agenda `max-w-md` (448px), Office Hours
`max-w-3xl` (768px) — with the stock shadcn Sheet look (edge-docked, heavy
`bg-black/80` scrim). On iPad they read as three unrelated surfaces.
Reference: Apple Calendar's iPad panels — one width, floating inset,
smooth slide.

## Decisions

- Scope: the three side sheets only. Centered dialogs (Event Detail,
  Create/Edit Event, Settings) stay centered dialogs.
- Style: floating inset ("Apple-style") with GleeWorld's square corners.
- One shared component; no per-call-site width classes ever again.

## 1. `CalendarPopout` component

New `src/components/calendar/command-center/CalendarPopout.tsx`, wrapping
the existing shadcn `Sheet`/`SheetContent`:

```ts
interface CalendarPopoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Adds the hairline border under the header (Office Hours uses it). */
  headerBorder?: boolean;
  children: ReactNode;   // panel body; the component owns scroll
}
```

Standardized styling on `SheetContent` (side="left"):

- **Width:** `w-[min(420px,calc(100vw-24px))]` with `max-w-none` to
  override the sheet variant's `max-w-sm`. 420px matches Apple's iPad
  panel and the calendar's docked day panel max.
- **Floating inset:** `inset-y-3 left-3 h-auto` (12px top/bottom/left),
  square corners (theme zeroes large radii), `border border-border`,
  `shadow-xl`. Body is `flex flex-col`; children scroll in a
  `flex-1 min-h-0 overflow-y-auto` region.
- **Motion:** keep the sheet's `slide-in-from-left`/`slide-out-to-left`
  data-state animation, tuned: `duration-350`,
  `ease-[cubic-bezier(0.32,0.72,0,1)]`, plus fade
  (`fade-in-0`/`fade-out-0`). `motion-reduce:animate-none` on the panel.
- **Scrim:** lighter overlay — `bg-black/30` (vs stock 80%) via the
  Sheet's overlay className, `motion-reduce:animate-none`.
- Header: `SheetHeader`/`SheetTitle` exactly as the call sites render
  today (`px-5 pt-5 pb-2 text-left`, `text-lg font-bold`), border under
  it when `headerBorder`.

Radix/shadcn a11y (focus trap, Esc, aria) comes free from Sheet.

## 2. Migration (three call sites)

- `CalendarFiltersSheet.tsx`: replace its `Sheet`+`SheetContent` shell
  with `CalendarPopout` (title "Filters"); body content unchanged.
- `CommandCenterCalendar.tsx` Office Hours sheet → `CalendarPopout`
  (title "Office Hours", `headerBorder`); body (Suspense +
  AdminOfficeHoursDashboard/StudentBooking) unchanged.
- `CommandCenterCalendar.tsx` List sheet → `CalendarPopout` (title
  "List"); AgendaView body unchanged.

Trade-off accepted: Office Hours admins drop from a 768px panel to the
uniform 420px. The admin dashboard already renders at ~350px on phones
(`w-[92vw]`), so the narrow layout is exercised code.

No other calendar overlays change. `DayViewPanel`'s docked aside and all
Dialogs are out of scope.

## 3. Error handling / edge cases

- Phones: `min(420px, 100vw-24px)` keeps the 12px inset on any screen.
- Very short viewports: `inset-y-3` + internal scroll — no clipped
  content.
- The component never unmounts children on its own; call sites keep
  their existing conditional-render/Suspense behavior.

## 4. Verification

No component-test infra. Playwright at iPad viewport (1024×1366, touch):
open each of the three pop-outs and assert (a) equal
`getBoundingClientRect().width` across all three, (b) `x === 12` and
`top === 12` (floating inset), (c) screenshots for the eye test. Repeat
the width assertion at 390px phone viewport. Existing suite + build must
stay green (no logic changes).
