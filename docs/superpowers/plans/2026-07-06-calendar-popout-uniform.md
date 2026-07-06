# Uniform Floating Calendar Pop-outs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** All three calendar pop-outs (Filters, List, Office Hours) render as one uniform 420px floating-inset panel with Apple-style slide motion.

**Architecture:** One `CalendarPopout` component composes the existing shadcn sheet primitives (`Sheet`, `SheetPortal`, `SheetOverlay` + radix `Content` directly, so the scrim and panel classes are fully owned) and the three call sites swap their hand-rolled `SheetContent` shells for it. No logic changes anywhere.

**Tech Stack:** React 18 + TS, shadcn/radix (`@radix-ui/react-dialog` via `src/components/ui/sheet.tsx`), tailwindcss-animate.

**Spec:** `docs/superpowers/specs/2026-07-06-calendar-popout-uniform-design.md`

## Global Constraints

- Width exactly `w-[min(420px,calc(100vw-24px))]`; floating inset `left-3 inset-y-3`; square corners (no rounded-* ≥ md — theme zeroes them anyway); `border border-border shadow-xl`.
- Motion: slide-in-from-left + fade, open `duration-[350ms]`, `ease-[cubic-bezier(0.32,0.72,0,1)]`, scrim `bg-black/30`; `motion-reduce:animate-none` on panel AND overlay.
- Body content of all three pop-outs unchanged — shell-only migration.
- Tests `npm test` (167+ must stay green — no logic changes); `npm run build`; eslint baseline unchanged.
- Repo: `/private/tmp/claude-501/-Users-kevinjohnson/28057dbd-6549-481b-87fa-738700c535f2/scratchpad/gleeworld`, branch `feat/calendar-popout-uniform`.
- Commits end with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: `CalendarPopout` + migrate the three call sites

**Files:**
- Create: `src/components/calendar/command-center/CalendarPopout.tsx`
- Modify: `src/components/calendar/command-center/CalendarFiltersSheet.tsx` (~lines 74–78 shell + imports)
- Modify: `src/components/calendar/command-center/CommandCenterCalendar.tsx` (~lines 417–455, both Sheet blocks + imports)

**Interfaces:**
- Consumes: `Sheet`, `SheetPortal`, `SheetOverlay` from `@/components/ui/sheet`; `* as SheetPrimitive from '@radix-ui/react-dialog'` (same primitive sheet.tsx uses).
- Produces: `CalendarPopout({ open, onOpenChange, title, headerBorder?, children }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; headerBorder?: boolean; children: ReactNode })`.

- [ ] **Step 1: Create the component**

`src/components/calendar/command-center/CalendarPopout.tsx`:

```tsx
// Uniform floating pop-out panel for the calendar surface (Filters, List,
// Office Hours — and any future calendar pop-out). One width, one motion,
// one scrim, so the iPad calendar reads as a single system, Apple
// Calendar-style. Composes the sheet primitives directly (not
// SheetContent) so the overlay tint and panel geometry are owned here.
// Spec: docs/superpowers/specs/2026-07-06-calendar-popout-uniform-design.md
import { type ReactNode } from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Sheet, SheetPortal, SheetOverlay } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface CalendarPopoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Hairline border under the header (Office Hours uses it). */
  headerBorder?: boolean;
  children: ReactNode;
}

export function CalendarPopout({ open, onOpenChange, title, headerBorder, children }: CalendarPopoutProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPortal>
        <SheetOverlay className="bg-black/30 motion-reduce:animate-none" />
        <SheetPrimitive.Content
          className={cn(
            'fixed z-50 left-3 inset-y-3 w-[min(420px,calc(100vw-24px))]',
            'flex flex-col bg-background border border-border shadow-xl p-0',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            'data-[state=open]:duration-[350ms] data-[state=closed]:duration-300',
            'ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:animate-none',
          )}
        >
          <div className={cn('px-5 pt-5 pb-2 text-left', headerBorder && 'border-b border-border')}>
            <SheetPrimitive.Title className="text-lg font-bold">{title}</SheetPrimitive.Title>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">{children}</div>
          <SheetPrimitive.Close className="absolute right-3 top-3 z-50 flex items-center justify-center h-10 w-10 sm:h-8 sm:w-8 rounded-md opacity-70 ring-offset-background transition-opacity hover:opacity-100 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <X className="h-5 w-5 sm:h-4 sm:w-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        </SheetPrimitive.Content>
      </SheetPortal>
    </Sheet>
  );
}
```

- [ ] **Step 2: Migrate CalendarFiltersSheet**

In `src/components/calendar/command-center/CalendarFiltersSheet.tsx`, replace the shell (keep EVERYTHING inside the old scrollable div — the categories/calendars body — verbatim):

```tsx
// old:
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[85vw] max-w-sm p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-2 text-left">
          <SheetTitle className="text-lg font-bold">Calendars</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-2 pb-6">
// new:
    <CalendarPopout open={open} onOpenChange={onOpenChange} title="Calendars">
      <div className="flex-1 overflow-y-auto px-2 pb-6">
```

Close the JSX accordingly (the old `</SheetContent></Sheet>` tail becomes `</CalendarPopout>`). Update imports: drop `Sheet, SheetContent, SheetHeader, SheetTitle` (keep any still used), add `import { CalendarPopout } from './CalendarPopout';`.

- [ ] **Step 3: Migrate the two CommandCenterCalendar sheets**

Office Hours block (~417–434):

```tsx
      <CalendarPopout open={showOfficeHours} onOpenChange={setShowOfficeHours} title="Office Hours" headerBorder>
        <div className="flex-1 overflow-y-auto p-4">
          {showOfficeHours && (
            <Suspense fallback={
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            }>
              {canManageEvents ? <AdminOfficeHoursDashboard /> : <StudentBooking />}
            </Suspense>
          )}
        </div>
      </CalendarPopout>
```

List block (~437–455):

```tsx
      <CalendarPopout open={showAgenda} onOpenChange={setShowAgenda} title="List">
        <div className="flex-1 min-h-0 px-2 pb-3">
          <AgendaView
            events={filteredEvents}
            selectedDate={selectedDate}
            onDateSelect={(d) => { setSelectedDate(d); setCurrentDate(d); }}
            onNavigateDay={navigateDay}
            getCategoryForEvent={getCategoryForEvent}
            categoryConfigs={CATEGORY_CONFIGS}
            onEventDeleted={fetchEvents}
          />
        </div>
      </CalendarPopout>
```

Keep the existing comments above each block. Update imports: add `CalendarPopout`; remove `Sheet, SheetContent, SheetHeader, SheetTitle` ONLY if nothing else in the file still uses them (search first).

- [ ] **Step 4: Verify**

Run: `npm test && npm run build && npx eslint src/components/calendar/command-center/CalendarPopout.tsx src/components/calendar/command-center/CalendarFiltersSheet.tsx src/components/calendar/command-center/CommandCenterCalendar.tsx`
Expected: suite green (unchanged count), build succeeds, no new eslint errors (stash-compare if unsure).

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/command-center/CalendarPopout.tsx src/components/calendar/command-center/CalendarFiltersSheet.tsx src/components/calendar/command-center/CommandCenterCalendar.tsx
git commit -m "feat(calendar): uniform 420px floating pop-out panel (Filters/List/Office Hours)"
```

---

### Task 2: Browser verification (iPad + phone), then merge + deploy

**Files:** none in-repo (harness lives in the scratchpad).

- [ ] **Step 1: Build + preview per the repo verify skill**

`VITE_SUPABASE_URL=https://supabase.gleeworld.org VITE_SUPABASE_PUBLISHABLE_KEY=<anon key> npm run build`, then `npm run preview -- --port 4199 --strictPort`.

- [ ] **Step 2: Playwright pass (read-only)**

iPad viewport `{ width: 1024, height: 1366, isMobile: true, hasTouch: true }`, login `demo@gleeworld.org` / `GleeDemo2026!` at `/auth`, go to `/dashboard/calendar`. The pop-out triggers carry `title` attributes: `button[title="Calendars"]` (or `"Filters"`), `button[title="List"]`, `button[title="Office hours"]`. For each: open, wait 500ms, measure the radix content panel (`[role="dialog"]` visible) `getBoundingClientRect()`; assert all three widths EQUAL and = 420, `x === 12`, `top === 12`, bottom inset 12 (`window.innerHeight - rect.bottom === 12`); screenshot; close via Escape. Repeat width assertion at 390×844 (expect `window.innerWidth - 24`). Check console for errors.

- [ ] **Step 3: Merge + deploy (pre-authorized)**

Push branch, `gh pr create` (base main), `gh pr merge --merge --delete-branch`. Then deploy: pull main, prod-env build, `rsync -az dist/ root@198.211.113.144:/var/www/gleeworld/html/` (NEVER `--delete`), `chown -R gleeuser:gleeuser`, confirm live index hash matches, read-only live smoke of one pop-out.
