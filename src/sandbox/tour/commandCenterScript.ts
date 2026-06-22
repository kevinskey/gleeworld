// Two separate tour arcs sharing the same 10-item nav (matches the real
// DashboardShell exactly). Admin runs first; on completion the sandbox
// shows a yes/no prompt; yes restarts from a fresh student intro with the
// same nav but role-filtered data behind each panel.
//
// Each step's onActivate is a pure call back into mock state — no DOM
// clicks, no URL changes.

import type { TourStep } from '@/components/tour/types';
import type { SandboxTourContext } from './types';

/* ───────────────────────── ADMIN TOUR ───────────────────────── */

export function buildAdminScript(ctx: SandboxTourContext): TourStep[] {
  return [
    {
      id: 'admin-nav-cc',
      targetSelector: '[data-tour="nav-command-center"]',
      title: 'Welcome to your Command Center',
      description:
        "Your admin home base — one screen, ten nav items, every part of your music program. The Command Center panel itself is your daily overview: four metric tiles over a six-card grid (schedule, announcements, what needs you, upcoming events, quick actions, activity feed).",
      dwellMs: 12000,
      onActivate: () => ctx.setPanel('command-center'),
    },
    {
      id: 'admin-nav-messenger',
      targetSelector: '[data-tour="nav-messenger"]',
      title: 'Messenger',
      description:
        "Every conversation across the program — directors, parents, sections, boosters. Class-scoped threads, delivery receipts, and SMS/email/push under one inbox.",
      dwellMs: 8500,
      onActivate: () => ctx.setPanel('messenger'),
    },
    {
      id: 'admin-nav-calendar',
      targetSelector: '[data-tour="nav-calendar"]',
      title: 'Calendar',
      description:
        "Every rehearsal, sectional, performance, and booster meeting. Recurring schedules with one-tap excuse approval. Syncs to Google Calendar both ways.",
      dwellMs: 8500,
      onActivate: () => ctx.setPanel('calendar'),
    },
    {
      id: 'admin-nav-office-hours',
      targetSelector: '[data-tour="nav-office-hours"]',
      title: 'Office Hours',
      description:
        "Calendly-style bookings for voice lessons, section help, audition prep, and parent meetings. You set the availability and the slots; students self-book.",
      dwellMs: 8500,
      onActivate: () => ctx.setPanel('office-hours'),
    },
    {
      id: 'admin-nav-academy',
      targetSelector: '[data-tour="nav-academy"]',
      title: 'Academy',
      description:
        "The LMS side — courses, syllabi, gradebooks, assignments, sight-singing assessments. Each course is its own classroom with its own enrollments.",
      dwellMs: 8500,
      onActivate: () => ctx.setPanel('academy'),
    },
    {
      id: 'admin-nav-music-library',
      targetSelector: '[data-tour="nav-music-library"]',
      title: 'Music Library',
      description:
        "Your whole repertoire — PDFs, recordings, part tracks, setlists. Tag by voicing, season, or programme; searchable in one click.",
      dwellMs: 8500,
      onActivate: () => ctx.setPanel('music-library'),
    },
    {
      id: 'admin-nav-quick-cam',
      targetSelector: '[data-tour="nav-quick-cam"]',
      title: 'Quick Cam',
      description:
        "Practice recordings and sight-singing videos from your students, sorted by class. Listen on your phone between rehearsals — no email attachments, no AirDrop chains.",
      dwellMs: 8500,
      onActivate: () => ctx.setPanel('quick-cam'),
    },
    {
      id: 'admin-nav-people',
      targetSelector: '[data-tour="nav-people"]',
      title: 'People',
      description:
        "Your full roster — students, parents, staff, alumni, donors. Filter by role, import via CSV, send a targeted email in two clicks.",
      dwellMs: 8500,
      onActivate: () => ctx.setPanel('people'),
    },
    {
      id: 'admin-nav-analytics',
      targetSelector: '[data-tour="nav-analytics"]',
      title: 'Analytics',
      description:
        "Program-wide numbers: attendance trends, engagement, dues collection, email open rates. The dashboard your board chair has been asking for.",
      dwellMs: 8500,
      onActivate: () => ctx.setPanel('analytics'),
    },
    {
      id: 'admin-nav-settings',
      targetSelector: '[data-tour="nav-settings"]',
      title: 'Settings',
      description:
        "Workspace branding, billing, and integrations — Google Calendar, Stripe, Resend, Twilio. The bookkeeping for the whole tenant.",
      dwellMs: 7500,
      onActivate: () => ctx.setPanel('settings'),
    },
    {
      id: 'admin-outro',
      title: "That's the admin tour.",
      description:
        "Ten nav items, one workspace, every part of your program. Members, money, music, and the public site — all in one place.",
      dwellMs: 8500,
    },
  ];
}

/* ───────────────────────── STUDENT TOUR ───────────────────────── */

export function buildStudentScript(ctx: SandboxTourContext): TourStep[] {
  return [
    {
      id: 'student-nav-cc',
      targetSelector: '[data-tour="nav-command-center"]',
      title: 'Same workspace, student view',
      description:
        "Meet Aaliyah, Soprano 1 in Concert Choir. Same Command Center layout as her director — but every card reads role-filtered data: her attendance, her events, her assignments, her messages. Row-level security does the work.",
      dwellMs: 12000,
      onActivate: () => ctx.setPanel('command-center'),
    },
    {
      id: 'student-nav-messenger',
      targetSelector: '[data-tour="nav-messenger"]',
      title: 'Messenger',
      description:
        "Only the threads she's part of — her director, her section, her theory teacher. She can't see the booster officer thread or other students' DMs.",
      dwellMs: 8500,
      onActivate: () => ctx.setPanel('messenger'),
    },
    {
      id: 'student-nav-calendar',
      targetSelector: '[data-tour="nav-calendar"]',
      title: 'Calendar',
      description:
        "Just her enrolled classes and the concerts she performs in — no all-program clutter. Syncs to her phone's calendar in one tap.",
      dwellMs: 10000,
      onActivate: () => ctx.setPanel('calendar'),
    },
    {
      id: 'student-nav-office-hours',
      targetSelector: '[data-tour="nav-office-hours"]',
      title: 'Office Hours',
      description:
        "From her side, this is the booking page. She picks a voice-lesson slot from her director's published availability and gets a confirmation text.",
      dwellMs: 8500,
      onActivate: () => ctx.setPanel('office-hours'),
    },
    {
      id: 'student-nav-academy',
      targetSelector: '[data-tour="nav-academy"]',
      title: 'Academy',
      description:
        "Only her four enrolled courses, with her grade in each. She can't see other students' grades or roster management — those rows simply don't exist for her session.",
      dwellMs: 8500,
      onActivate: () => ctx.setPanel('academy'),
    },
    {
      id: 'student-nav-music-library',
      targetSelector: '[data-tour="nav-music-library"]',
      title: 'Music Library',
      description:
        "Same repertoire — but the recordings highlight her voice part. She can drill the Soprano 1 line on the bus.",
      dwellMs: 8500,
      onActivate: () => ctx.setPanel('music-library'),
    },
    {
      id: 'student-nav-quick-cam',
      targetSelector: '[data-tour="nav-quick-cam"]',
      title: 'Quick Cam',
      description:
        "On her side, Quick Cam is the camera. Practice recordings shoot straight into the right assignment — no uploads, no emails, no AirDrop chains.",
      dwellMs: 9000,
      onActivate: () => ctx.setPanel('quick-cam'),
    },
    {
      id: 'student-nav-people',
      targetSelector: '[data-tour="nav-people"]',
      title: 'People',
      description:
        "She sees a section directory — her own classmates — not the parents, staff, or donor list. Row-level security is doing the work invisibly.",
      dwellMs: 10000,
      onActivate: () => ctx.setPanel('people'),
    },
    {
      id: 'student-nav-analytics',
      targetSelector: '[data-tour="nav-analytics"]',
      title: 'Analytics',
      description:
        "Her own progress — attendance, practice time, GPA, assignment completion. No program-wide numbers; this view is hers alone.",
      dwellMs: 8500,
      onActivate: () => ctx.setPanel('analytics'),
    },
    {
      id: 'student-nav-settings',
      targetSelector: '[data-tour="nav-settings"]',
      title: 'Settings',
      description:
        "Profile and notification preferences. No billing, no integrations — those belong to the workspace, not the student.",
      dwellMs: 7000,
      onActivate: () => ctx.setPanel('settings'),
    },
    {
      id: 'student-outro',
      title: 'One product, every role.',
      description:
        "Director, student, parent, section leader, alumna, donor — each sees a perspective designed for them, all gated by row-level security. That's how GleeWorld serves a whole music program from one workspace.",
      dwellMs: 11000,
    },
  ];
}
