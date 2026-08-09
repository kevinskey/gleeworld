// Real-product tour script. Activates each step by calling react-router's
// navigate(path) — purely client-side, no DB writes. The cursor + spotlight
// target the DashboardShell sidebar (which stays mounted across
// navigations), so the animation never desyncs while the inner panel loads
// asynchronously.
//
// EVERY nav-* step's beforeMeasure is derived from its own targetSelector
// via ensureAllToolsOpen (see buildAdminProductTour's `.map` at the bottom —
// there is deliberately no per-step `beforeMeasure` field to keep in sync
// by hand). Which rows live on the shelf and which live only inside the All
// Tools sheet is per-member data (the My Tools set), not a fixed property
// of the script: office-hours isn't in the faculty default at all, and a
// member who has customized their shelf can push any of the others off it
// too. Attaching it only to the steps that happened to need it on a default
// admin shelf is what left step 4 silently no-opping the first time this
// broke (Phase 1's disclosure). It IS a real click on the All Tools button
// (not a business action; opens local UI state, no data mutation, no
// navigation, idempotent) — see TourEngine's header comment for why that's
// the one DOM interaction a script step gets.

import type { TourStep } from './types';

interface ProductTourContext {
  navigate: (path: string) => void;
}

/**
 * Ensures a step's target is actually present in the DOM before TourEngine
 * measures it. Phase 3 replaced the sidebar's inline All Tools disclosure
 * with a searchable sheet (a modal dialog) — this function used to check
 * the toggle's own `aria-expanded` attribute and click it when `'false'`,
 * which broke silently the moment that attribute stopped existing (the new
 * button isn't a disclosure toggle at all; NavShelf.tsx's `onOpenAllTools`
 * unconditionally opens, never toggles).
 *
 * Takes the step's OWN targetSelector and no-ops if that target is already
 * present — the common case, since most of this script's targets (Home,
 * Messenger, Calendar, Academy, Music Library, People) ARE on the default
 * faculty shelf. That guard matters more than it did under the old
 * disclosure: opening the sheet now means popping a modal dialog over the
 * page, which would visually cover an already-on-shelf target instead of
 * harmlessly adding more content below it the way the inline disclosure
 * did. Only office-hours, analytics, and settings — not in
 * DEFAULT_TOOLS_FACULTY (src/lib/navigation/myTools.ts) — actually need the
 * sheet opened to be found; AllToolsSheet.tsx's ToolRow carries the same
 * `data-tour={entry.tourId}` NavShelf's own Row does, so the selector
 * resolves identically whichever surface renders it.
 *
 * The click itself stays idempotent regardless of the above: NavShelf's All
 * Tools button always OPENS the sheet (never toggles it closed), so calling
 * this more than once — or on a step whose sheet a previous step already
 * opened — can never accidentally close it. It also no-ops harmlessly if
 * the toggle isn't mounted at all (e.g. the tour runs against a role/tenant
 * with an empty catalog, or the mobile drawer isn't open).
 *
 * This does NOT force the resulting sheet-open state update synchronous —
 * flushSync from inside beforeMeasure is a no-op there (see TourEngine's
 * step-transition effect comment for why) and an earlier version of this
 * file relied on it, which meant the click never actually revealed
 * anything. It doesn't need to: TourEngine retries the measurement after a
 * requestAnimationFrame if the first attempt comes up empty, which is
 * enough time for React to commit the sheet's mount.
 */
export function ensureAllToolsOpen(targetSelector: string) {
  if (document.querySelector(targetSelector)) return;
  const toggle = document.querySelector('[data-tour="nav-all-tools-toggle"]') as HTMLButtonElement | null;
  toggle?.click();
}

export function buildAdminProductTour(ctx: ProductTourContext): TourStep[] {
  const steps: TourStep[] = [
    {
      id: 'cc',
      targetSelector: '[data-tour="nav-command-center"]',
      title: 'Welcome to your Command Center',
      description:
        "Your admin home base — one screen, ten nav items, every part of your music program. The Command Center panel is your daily overview: four metric tiles over a six-card grid (schedule, announcements, what needs you, upcoming events, quick actions, activity feed).",
      dwellMs: 12000,
      onActivate: () => ctx.navigate('/dashboard'),
    },
    {
      id: 'messenger',
      targetSelector: '[data-tour="nav-messenger"]',
      title: 'Messenger',
      description:
        "Every conversation across the program — directors, parents, sections, boosters. Class-scoped threads, delivery receipts, and SMS/email/push under one inbox.",
      dwellMs: 8500,
      onActivate: () => ctx.navigate('/dashboard/messenger'),
    },
    {
      id: 'calendar',
      targetSelector: '[data-tour="nav-calendar"]',
      title: 'Calendar',
      description:
        "Every rehearsal, sectional, performance, and booster meeting. Recurring schedules with one-tap excuse approval. Syncs to Google Calendar both ways.",
      dwellMs: 8500,
      onActivate: () => ctx.navigate('/dashboard/calendar'),
    },
    {
      id: 'office-hours',
      targetSelector: '[data-tour="nav-office-hours"]',
      title: 'Office Hours',
      description:
        "Calendly-style bookings for voice lessons, section help, audition prep, and parent meetings. You set the availability; students self-book.",
      dwellMs: 8500,
      onActivate: () => ctx.navigate('/dashboard/office-hours'),
    },
    {
      id: 'academy',
      targetSelector: '[data-tour="nav-academy"]',
      title: 'Academy',
      description:
        "The LMS side — courses, syllabi, gradebooks, assignments, sight-singing assessments. Each course is its own classroom with its own enrollments.",
      dwellMs: 8500,
      onActivate: () => ctx.navigate('/dashboard/academy'),
    },
    {
      id: 'music-library',
      targetSelector: '[data-tour="nav-music-library"]',
      title: 'Music Library',
      description:
        "Your whole repertoire — PDFs, recordings, part tracks, setlists. Tag by voicing, season, or programme; searchable in one click.",
      dwellMs: 8500,
      onActivate: () => ctx.navigate('/dashboard/music-library'),
    },
    {
      id: 'people',
      targetSelector: '[data-tour="nav-people"]',
      title: 'People',
      description:
        "Your full roster — students, parents, staff, alumni, donors. Filter by role, import via CSV, send a targeted email in two clicks.",
      dwellMs: 8500,
      onActivate: () => ctx.navigate('/dashboard/users'),
    },
    {
      id: 'analytics',
      targetSelector: '[data-tour="nav-analytics"]',
      title: 'Analytics',
      description:
        "Program-wide numbers: attendance trends, engagement, dues collection, email open rates. It's not on your shelf by default — open All Tools in the sidebar any time to reach it.",
      dwellMs: 8500,
      onActivate: () => ctx.navigate('/dashboard/analytics'),
    },
    {
      id: 'settings',
      targetSelector: '[data-tour="nav-settings"]',
      title: 'Settings',
      description:
        "Workspace branding, billing, and integrations — Google Calendar, Stripe, Resend, Twilio. Also under All Tools if it's not one of your shelf picks.",
      dwellMs: 7500,
      onActivate: () => ctx.navigate('/dashboard/workspace'),
    },
    {
      id: 'outro',
      title: "That's the tour.",
      description:
        "Ten nav items, one workspace, every part of your program. Members, money, music, and the public site — all in one place. Ready to set this up for your own program? Talk to Kevin via the Get Started button.",
      dwellMs: 11000,
    },
  ];

  // Every step that declares a targetSelector gets ensureAllToolsOpen bound
  // to THAT SAME selector — derived, not hand-copied, so a step's target
  // and the selector its own reveal-check queries can never drift apart
  // (they're now structurally the same string, read once). Only 'outro'
  // above has no targetSelector, and is correctly skipped.
  return steps.map((step) =>
    step.targetSelector
      ? { ...step, beforeMeasure: () => ensureAllToolsOpen(step.targetSelector!) }
      : step,
  );
}
