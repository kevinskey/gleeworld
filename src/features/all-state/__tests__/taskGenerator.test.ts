// The acceptance criterion for Phase 2 was: adding a student generates a
// checklist derived from a state's actual published requirements, with no
// state-specific code in the generator.
//
// So these tests feed it REAL shapes from two states that work completely
// differently — Georgia (two rounds, titles-only repertoire, no published
// fees) and Texas (four rounds, two classification tracks, published fee
// amounts) — and assert the output is sensible for both without the generator
// knowing which is which.

import { describe, it, expect } from 'vitest';
import {
  generateTasks, computeReadiness, resolveCohortDate, minusDays,
  type GenRequirement, type GenDate, type GenRepertoire,
} from '../taskGenerator';

// Shapes taken from the real seeded rows.
const GEORGIA_REQS: GenRequirement[] = [
  { id: 'r1', category: 'scales', title: 'Required scales', description: 'Major, harmonic minor, and chromatic.', sort_order: 20 },
  { id: 'r2', category: 'membership', title: 'Director must be a current GMEA/NAfME member', sort_order: 10 },
  { id: 'r3', category: 'materials', title: 'Prepare one solo from the two published options', sort_order: 30 },
  { id: 'r4', category: 'sight_reading', title: 'Sight-reading — three examples', sort_order: 40 },
  { id: 'r5', category: 'rubric', title: 'Solo scored on six criteria', sort_order: 50 },
  { id: 'r6', category: 'format', title: 'Auditions are in person, not recorded', sort_order: 60 },
];

const GEORGIA_DATES: GenDate[] = [
  { id: 'd1', date_type: 'registration_deadline', title: 'Registration and payment due', start_at: '2026-09-15T04:00:00.000Z', sort_order: 10 },
  { id: 'd2', date_type: 'audition_round', title: 'Region auditions (first audition)', start_at: '2026-11-07T05:00:00.000Z', sort_order: 20 },
  { id: 'd3', date_type: 'acceptance_deadline', title: 'Acceptance form and payment due', start_at: '2026-12-15T05:00:00.000Z', sort_order: 30 },
  { id: 'd4', date_type: 'audition_round', title: 'Final auditions (second audition)', start_at: '2027-01-20T05:00:00.000Z', sort_order: 40 },
  { id: 'd5', date_type: 'event', title: 'All-State Chorus', start_at: '2027-02-18T05:00:00.000Z', sort_order: 50 },
];

const TEXAS_REQS: GenRequirement[] = [
  { id: 't1', category: 'eligibility', title: 'Full-time Texas student, certified by a TMEA Active Member director', sort_order: 10 },
  { id: 't2', category: 'membership', title: 'Director must hold current TMEA Active or Life membership', sort_order: 20 },
  { id: 't3', category: 'materials', title: 'Audition cuts are reduced by each Region', sort_order: 60 },
  { id: 't4', category: 'sight_reading', title: 'Sight-reading is part of the audition', sort_order: 80 },
  // A category the generator has never seen — must still produce a task.
  { id: 't5', category: 'divisi_assignment', title: 'Divisi assignment for 2026-27', sort_order: 90 },
];

const TEXAS_DATES: GenDate[] = [
  { id: 'x1', date_type: 'other', title: 'Errata deadline', start_at: '2026-08-30T05:00:00.000Z', sort_order: 10 },
  { id: 'x2', date_type: 'registration_deadline', title: 'Area Declaration Form due', start_at: '2026-12-14T06:00:00.000Z', sort_order: 20 },
  { id: 'x3', date_type: 'audition_round', title: 'Area auditions (final round)', start_at: '2027-01-09T06:00:00.000Z', sort_order: 40 },
  { id: 'x4', date_type: 'event', title: 'TMEA Clinic/Convention', start_at: '2027-02-10T06:00:00.000Z', sort_order: 50 },
];

describe('generateTasks', () => {
  it('turns Georgia requirements and deadlines into a checklist', () => {
    const tasks = generateTasks({ requirements: GEORGIA_REQS, dates: GEORGIA_DATES });

    // 3 actionable requirements (scales, materials, sight_reading) +
    // 4 actionable dates (2 audition rounds, registration, acceptance).
    expect(tasks).toHaveLength(7);

    const titles = tasks.map((t) => t.title);
    expect(titles).toContain('Practise: Required scales');
    expect(titles).toContain('Prepare: Prepare one solo from the two published options');
    expect(titles).toContain('Registration and payment due');
  });

  it('drops requirements that describe the program rather than the student', () => {
    const tasks = generateTasks({ requirements: GEORGIA_REQS, dates: [] });
    const titles = tasks.map((t) => t.title).join(' | ');

    // A director's membership dues, the judging rubric, and "auditions are in
    // person" are not things a student does.
    expect(titles).not.toContain('GMEA/NAfME member');
    expect(titles).not.toContain('six criteria');
    expect(titles).not.toContain('in person');
    expect(tasks).toHaveLength(3);
  });

  it('does NOT create a task for the event itself', () => {
    // Attending All-State is the reward, not a checklist item.
    const tasks = generateTasks({ requirements: [], dates: GEORGIA_DATES });
    expect(tasks.map((t) => t.title)).not.toContain('All-State Chorus');
    expect(tasks).toHaveLength(4);
  });

  it('handles Texas — different rounds, different categories — unchanged', () => {
    const tasks = generateTasks({ requirements: TEXAS_REQS, dates: TEXAS_DATES });

    // eligibility + membership dropped; materials, sight_reading and the
    // UNKNOWN category survive. Plus 2 actionable dates.
    expect(tasks).toHaveLength(5);
    const titles = tasks.map((t) => t.title).join(' | ');
    expect(titles).not.toContain('Full-time Texas student');
    expect(titles).not.toContain('Active or Life membership');
  });

  it('keeps a category it has never seen rather than silently dropping it', () => {
    // An unrecognised category from state 50 must still reach the student.
    // Dropping it means a missed requirement because OUR vocabulary was short.
    const tasks = generateTasks({
      requirements: [{ id: 'z', category: 'quartet_formation', title: 'Form an SATB quartet' }],
      dates: [],
    });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Complete: Form an SATB quartet');
    expect(tasks[0].task_type).toBe('quartet_formation');
  });

  it('carries provenance back to Layer 1 on every task', () => {
    const tasks = generateTasks({ requirements: GEORGIA_REQS, dates: GEORGIA_DATES });
    for (const t of tasks) {
      const linked = t.source_requirement_id ?? t.source_date_id ?? t.source_cohort_date_id;
      expect(linked).toBeTruthy();
    }
  });

  it('orders dated work first, chronologically, then undated preparation', () => {
    const tasks = generateTasks({ requirements: GEORGIA_REQS, dates: GEORGIA_DATES });
    const dated = tasks.filter((t) => t.due_at);
    const undated = tasks.filter((t) => !t.due_at);

    expect(tasks.slice(0, dated.length).every((t) => t.due_at)).toBe(true);
    const times = dated.map((t) => new Date(t.due_at!).getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(undated).toHaveLength(3);
  });
});

const GEORGIA_REP: GenRepertoire[] = [
  { id: 'p1', title: 'Se Florindo è fedele', purpose: 'audition', sort_order: 10 },
  { id: 'p2', title: 'Lasciatemi morire', purpose: 'audition', sort_order: 20 },
];

const TEXAS_REP: GenRepertoire[] = [
  { id: 'q1', title: 'Cedit, Hyems', composer: 'Abbie Betinis', voicing: 'SATB',
    purpose: 'audition', notes: 'Designated for Area audition', sort_order: 50 },
  { id: 'q2', title: 'A concert piece', purpose: 'performance', sort_order: 60 },
];

describe('repertoire tasks', () => {
  it('creates one task per audition piece so a student knows WHICH pieces', () => {
    const tasks = generateTasks({ requirements: [], dates: [], repertoire: GEORGIA_REP });
    expect(tasks.map((t) => t.title)).toEqual([
      'Prepare: Se Florindo è fedele',
      'Prepare: Lasciatemi morire',
    ]);
    expect(tasks.every((t) => t.source_repertoire_id)).toBe(true);
  });

  it('skips performance repertoire — that is sung AFTER selection', () => {
    const tasks = generateTasks({ requirements: [], dates: [], repertoire: TEXAS_REP });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Prepare: Cedit, Hyems');
  });

  it('puts composer and voicing in the description when published', () => {
    const tasks = generateTasks({ requirements: [], dates: [], repertoire: TEXAS_REP });
    expect(tasks[0].description).toContain('Abbie Betinis');
    expect(tasks[0].description).toContain('SATB');
  });

  it('leaves description null when the state published no metadata', () => {
    // Georgia publishes titles only — inventing a composer would be worse.
    const tasks = generateTasks({ requirements: [], dates: [], repertoire: GEORGIA_REP });
    expect(tasks[0].description).toBeNull();
  });
});

describe('director deadlines', () => {
  it('pegs a derived deadline N days before the state date', () => {
    const tasks = generateTasks({
      requirements: [],
      dates: GEORGIA_DATES,
      cohortDates: [{
        id: 'c1', title: 'Recordings due to me', date_type: 'other',
        lead_days: 10, source_date_id: 'd2', is_override: true,
      }],
    });
    const mine = tasks.find((t) => t.title === 'Recordings due to me')!;
    // Region auditions are 2026-11-07; ten days earlier is 2026-10-28.
    expect(mine.due_at!.slice(0, 10)).toBe('2026-10-28');
    expect(mine.source_date_id).toBe('d2');
  });

  it('recomputes when the state moves its date — the reason lead_days is stored', () => {
    const moved = GEORGIA_DATES.map((d) =>
      d.id === 'd2' ? { ...d, start_at: '2026-11-21T05:00:00.000Z' } : d);
    const cd = {
      id: 'c1', title: 'Recordings due to me', date_type: 'other',
      lead_days: 10, source_date_id: 'd2',
    };
    expect(resolveCohortDate(cd, GEORGIA_DATES)!.slice(0, 10)).toBe('2026-10-28');
    expect(resolveCohortDate(cd, moved)!.slice(0, 10)).toBe('2026-11-11');
  });

  it('falls back to an explicit date when no lead is set', () => {
    const cd = { id: 'c2', title: 'Parent meeting', date_type: 'other', due_at: '2026-10-01T12:00:00.000Z' };
    expect(resolveCohortDate(cd, GEORGIA_DATES)).toBe('2026-10-01T12:00:00.000Z');
  });

  it('minusDays crosses a month boundary correctly', () => {
    expect(minusDays('2027-01-05T00:00:00.000Z', 10).slice(0, 10)).toBe('2026-12-26');
  });
});

describe('computeReadiness', () => {
  const now = new Date('2026-10-01T00:00:00.000Z');

  it('counts completion and flags overdue work', () => {
    const r = computeReadiness([
      { title: 'a', due_at: '2026-09-01T00:00:00.000Z', completed_at: '2026-08-20T00:00:00.000Z' },
      { title: 'b', due_at: '2026-09-15T00:00:00.000Z', completed_at: null },   // overdue
      { title: 'c', due_at: '2026-11-01T00:00:00.000Z', completed_at: null },
      { title: 'd', due_at: null, completed_at: null },
    ], now);

    expect(r.total).toBe(4);
    expect(r.completed).toBe(1);
    expect(r.overdue).toBe(1);
    expect(r.percent).toBe(25);
    expect(r.nextDue?.title).toBe('c');
  });

  it('reports 0% for an empty checklist, not 100%', () => {
    // An empty list means we have no requirements for that state yet. Showing
    // a student as "100% ready" would be the exact opposite of the truth.
    expect(computeReadiness([], now).percent).toBe(0);
  });

  it('has no next-due once everything dated is done', () => {
    const r = computeReadiness([
      { title: 'a', due_at: '2026-11-01T00:00:00.000Z', completed_at: '2026-09-01T00:00:00.000Z' },
    ], now);
    expect(r.nextDue).toBeNull();
    expect(r.percent).toBe(100);
  });
});
