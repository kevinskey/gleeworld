// Real-product tour script. Activates each step by calling react-router's
// navigate(path) — purely client-side, no DB writes. The cursor + spotlight
// target the DashboardShell sidebar (which stays mounted across
// navigations), so the animation never desyncs while the inner panel loads
// asynchronously.
//
// Two steps (analytics, settings) target rows that live behind the
// sidebar's All Tools disclosure and are unmounted while it's closed —
// ensureAllToolsOpen below is their beforeMeasure, and it IS a real click
// on the disclosure toggle (not a business action; opens/closes local UI
// state, no data mutation, no navigation, idempotent). See TourEngine's
// header comment for why that's the one DOM interaction a script step gets.

import type { TourStep } from './types';

interface ProductTourContext {
  navigate: (path: string) => void;
}

// The sidebar's All Tools disclosure unmounts everything it doesn't show,
// so a step whose target lives inside it (analytics, settings — neither is
// in the default My Tools shelf) needs the click applied before
// TourEngine measures the target. This does NOT force the resulting state
// update synchronous — flushSync from inside beforeMeasure is a no-op
// there (see TourEngine's step-transition effect comment for why) and an
// earlier version of this file relied on it, which meant the click never
// actually revealed anything. It doesn't need to: TourEngine retries the
// measurement after a requestAnimationFrame if the first attempt comes up
// empty, which is enough time for React to commit this click's state
// update and mount the row. Idempotent — no-ops if already open, or if the
// toggle isn't mounted (e.g. the tour runs against a role/tenant with an
// empty All Tools section, or the mobile drawer isn't open).
function ensureAllToolsOpen() {
  const toggle = document.querySelector('[data-tour="nav-all-tools-toggle"]') as HTMLButtonElement | null;
  if (toggle && toggle.getAttribute('aria-expanded') === 'false') {
    toggle.click();
  }
}

export function buildAdminProductTour(ctx: ProductTourContext): TourStep[] {
  return [
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
      beforeMeasure: ensureAllToolsOpen,
      onActivate: () => ctx.navigate('/dashboard/analytics'),
    },
    {
      id: 'settings',
      targetSelector: '[data-tour="nav-settings"]',
      title: 'Settings',
      description:
        "Workspace branding, billing, and integrations — Google Calendar, Stripe, Resend, Twilio. Also under All Tools if it's not one of your shelf picks.",
      dwellMs: 7500,
      beforeMeasure: ensureAllToolsOpen,
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
}
