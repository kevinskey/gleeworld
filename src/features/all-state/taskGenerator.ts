// Derive a student's All-State checklist from Layer 1 data.
//
// THE WHOLE POINT: there is no state name anywhere in this file, and there
// never may be. A hardcoded eight-item Georgia checklist guarantees custom
// work for state number two — and there are now 49 states loaded, running
// everything from South Dakota's SATB *quartet* as the unit of entry to New
// York's no-audition-event model. The generator reads requirements and dates
// and produces tasks; adding a state is data entry.
//
// Pure functions, no I/O, so the rules are unit-testable without a database.

export interface GenRequirement {
  id: string;
  category: string;
  title: string;
  description?: string | null;
  structured_data?: Record<string, unknown> | null;
  sort_order?: number | null;
}

export interface GenDate {
  id: string;
  date_type: string;
  title: string;
  start_at?: string | null;
  all_day?: boolean;
  sort_order?: number | null;
}

/** A director's own deadline, which may be pegged N days before a state date. */
export interface GenCohortDate {
  id: string;
  title: string;
  date_type: string;
  due_at?: string | null;
  lead_days?: number | null;
  source_date_id?: string | null;
  is_override?: boolean;
}

export interface GenRepertoire {
  id: string;
  title: string;
  composer?: string | null;
  voicing?: string | null;
  purpose?: string | null;
  notes?: string | null;
  sort_order?: number | null;
}

export interface GeneratedTask {
  title: string;
  description: string | null;
  task_type: string;
  source_requirement_id: string | null;
  source_date_id: string | null;
  source_cohort_date_id: string | null;
  source_repertoire_id: string | null;
  due_at: string | null;
  sort_order: number;
}

/**
 * Which requirement categories become a student task at all.
 *
 * Deliberately a denylist rather than an allowlist: an unrecognised category
 * from a state we have not seen yet should still produce a task. Silently
 * dropping it would mean a student misses a requirement because our
 * vocabulary was incomplete, which is the worse failure.
 *
 * These four describe the PROGRAM rather than anything a student does:
 *  - membership: a rule about the director's association dues
 *  - format:     "auditions are in person" — context, not an action
 *  - rubric:     how judges score, not what to prepare
 *  - eligibility: a fact about who may enter, checked once by the director
 */
const NON_ACTIONABLE_CATEGORIES = new Set(['membership', 'format', 'rubric', 'eligibility']);

/** Date types that are a deadline a student must act before. */
const ACTIONABLE_DATE_TYPES = new Set([
  'registration_deadline',
  'acceptance_deadline',
  'audition_round',
]);

/** Verb that reads naturally in a checklist for each requirement category. */
const CATEGORY_VERB: Record<string, string> = {
  materials: 'Prepare',
  scales: 'Practise',
  sight_reading: 'Practise',
  repertoire: 'Prepare',
  recording: 'Record',
};

function verbFor(category: string): string {
  return CATEGORY_VERB[category] ?? 'Complete';
}

/** Subtract days from an ISO timestamp, preserving the instant otherwise. */
export function minusDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

/**
 * Resolve a cohort date to an actual instant.
 *
 * A director sets "recordings due to me 10 days before the state deadline".
 * Storing lead_days rather than only the computed date is what lets the derived
 * deadline move when the STATE moves its date — otherwise it silently goes
 * stale and a director trusts a date that no longer means anything.
 */
export function resolveCohortDate(
  cd: GenCohortDate,
  stateDates: GenDate[],
): string | null {
  if (cd.lead_days != null && cd.source_date_id) {
    const src = stateDates.find((d) => d.id === cd.source_date_id);
    if (src?.start_at) return minusDays(src.start_at, cd.lead_days);
  }
  return cd.due_at ?? null;
}

export interface GenerateInput {
  requirements: GenRequirement[];
  dates: GenDate[];
  cohortDates?: GenCohortDate[];
  repertoire?: GenRepertoire[];
}

/**
 * Build the checklist for one participation.
 *
 * Ordering is by due date first (a student cares what is next, not what the
 * state listed first), with undated preparation tasks after the dated ones.
 */
export function generateTasks(input: GenerateInput): GeneratedTask[] {
  const { requirements, dates, cohortDates = [], repertoire = [] } = input;
  const tasks: GeneratedTask[] = [];

  // 1. One task per actionable requirement. Undated — these are "prepare"
  //    work, and pinning them to a deadline the state didn't state would be
  //    inventing precision.
  for (const r of requirements) {
    if (NON_ACTIONABLE_CATEGORIES.has(r.category)) continue;
    tasks.push({
      title: `${verbFor(r.category)}: ${r.title}`,
      description: r.description ?? null,
      task_type: r.category,
      source_requirement_id: r.id,
      source_date_id: null,
      source_cohort_date_id: null,
      source_repertoire_id: null,
      due_at: null,
      sort_order: r.sort_order ?? 100,
    });
  }

  // 2. One task per state deadline the student must act before.
  for (const d of dates) {
    if (!ACTIONABLE_DATE_TYPES.has(d.date_type)) continue;
    tasks.push({
      title: d.title,
      description: null,
      task_type: d.date_type,
      source_requirement_id: null,
      source_date_id: d.id,
      source_cohort_date_id: null,
      source_repertoire_id: null,
      due_at: d.start_at ?? null,
      sort_order: d.sort_order ?? 100,
    });
  }

  // 3. The director's own deadlines. These come LAST in construction but sort
  //    by date like everything else — a director's internal deadline is
  //    usually the one that actually matters to a student.
  for (const cd of cohortDates) {
    const due = resolveCohortDate(cd, dates);
    tasks.push({
      title: cd.title,
      description: cd.lead_days != null && cd.source_date_id
        ? `Set by your director, ${cd.lead_days} days before the state deadline.`
        : 'Set by your director.',
      task_type: cd.date_type,
      source_requirement_id: null,
      source_date_id: cd.source_date_id ?? null,
      source_cohort_date_id: cd.id,
      source_repertoire_id: null,
      due_at: due,
      sort_order: 50,   // director deadlines outrank state ones at equal dates
    });
  }

  // 4. One task per audition piece. Without these a student gets "Prepare one
  //    solo from the two published options" and no idea which pieces those
  //    are — and there is nothing concrete for a practice link to point at.
  //    Performance repertoire is skipped: it is sung AFTER selection, so it is
  //    not audition preparation.
  for (const piece of repertoire) {
    if (piece.purpose && piece.purpose !== 'audition') continue;
    const attribution = [piece.composer, piece.voicing].filter(Boolean).join(' · ');
    tasks.push({
      title: `Prepare: ${piece.title}`,
      description: [attribution || null, piece.notes || null].filter(Boolean).join(' — ') || null,
      task_type: 'repertoire',
      source_requirement_id: null,
      source_date_id: null,
      source_cohort_date_id: null,
      source_repertoire_id: piece.id,
      due_at: null,
      sort_order: (piece.sort_order ?? 100) + 200,  // after requirements
    });
  }

  return sortTasks(tasks);
}

/** Dated tasks first in date order; undated preparation work after. */
export function sortTasks(tasks: GeneratedTask[]): GeneratedTask[] {
  return [...tasks].sort((a, b) => {
    if (a.due_at && b.due_at) {
      const diff = new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      if (diff !== 0) return diff;
      return a.sort_order - b.sort_order;
    }
    if (a.due_at) return -1;
    if (b.due_at) return 1;
    return a.sort_order - b.sort_order || a.title.localeCompare(b.title);
  });
}

/**
 * Readiness for one student: completed over total, plus what is overdue.
 * `now` is injected rather than read from the clock so this is testable.
 */
export interface Readiness {
  total: number;
  completed: number;
  overdue: number;
  nextDue: { title: string; due_at: string } | null;
  percent: number;
}

export function computeReadiness(
  tasks: Array<{ title: string; due_at: string | null; completed_at: string | null }>,
  now: Date,
): Readiness {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed_at).length;
  const open = tasks.filter((t) => !t.completed_at);
  const overdue = open.filter((t) => t.due_at && new Date(t.due_at) < now).length;

  const upcoming = open
    .filter((t) => t.due_at && new Date(t.due_at) >= now)
    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())[0];

  return {
    total,
    completed,
    overdue,
    nextDue: upcoming ? { title: upcoming.title, due_at: upcoming.due_at! } : null,
    // 100% for an empty checklist would read as "ready" when we simply have no
    // requirements for that state yet — which is the opposite of the truth.
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}
