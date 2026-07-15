// Pure TS — imported by both the Deno edge function and Vitest tests.
// Validation is the model-facing gate: errors must say exactly what to fix,
// because they are fed back into the tool loop for self-correction.
// The SQL RPC re-checks structural invariants; session expansion in SQL is
// the source of truth — countSessions here exists only to enforce the cap.

export interface CourseSpecAssignment {
  title: string;
  description?: string;
  instructions?: string;
  points: number;
  due_at: string; // ISO datetime
  assignment_type?: string;
  category?: string;
}

export interface CourseSpecModule {
  title: string;
  description?: string;
  week_number: number;
  learning_objectives?: string[];
  assignments: CourseSpecAssignment[];
}

export interface CourseSpec {
  title: string;
  course_code?: string;
  description?: string;
  semester?: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  meeting_patterns: Array<{ weekday: number; start_time: string; end_time: string; location?: string }>;
  breaks?: Array<{ from: string; to: string; name?: string }>;
  modules: CourseSpecModule[];
  rubric?: {
    title: string;
    description?: string;
    criteria: Array<{ name: string; description?: string; max_points: number; weight_percentage: number }>;
  };
  repertoire?: Array<{ library_item_id?: string; title: string }>;
  roster?: Array<{ user_id?: string; name: string }>;
  quizzes?: Array<{
    title: string;
    description?: string;
    module_week?: number;
    questions: Array<
      | { type: 'multiple_choice'; prompt: string; choices: string[]; correct_index: number; points?: number; explanation?: string }
      | { type: 'true_false'; prompt: string; correct_answer: boolean; points?: number; explanation?: string }
    >;
  }>;
}

const MAX_TEXT = 2000;
const MAX_MODULES = 16;
const MAX_ASSIGNMENTS_PER_MODULE = 8;
const MAX_CRITERIA = 12;
const MAX_ROSTER = 200;
const MAX_REPERTOIRE = 50;
const MAX_QUIZZES = 6;
const MAX_QUESTIONS_PER_QUIZ = 8;
const MAX_CHOICES = 5;
const MAX_SESSIONS = 120;
const MAX_SPEC_BYTES = 64 * 1024;
const MAX_TERM_DAYS = 366;

type Ok = { ok: true; spec: CourseSpec; sessionCount: number };
type Err = { ok: false; error: string };

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isDateStr = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

const isTimeStr = (v: unknown): v is string => typeof v === 'string' && /^\d{2}:\d{2}$/.test(v);

function tooLong(label: string, v: unknown): string | null {
  if (typeof v === 'string' && v.length > MAX_TEXT) {
    return `${label} is too long (${v.length} chars, max ${MAX_TEXT}) — trim it or split the course.`;
  }
  return null;
}

export function countSessions(spec: CourseSpec): number {
  const start = Date.parse(`${spec.start_date}T00:00:00Z`);
  const end = Date.parse(`${spec.end_date}T00:00:00Z`);
  const breaks = (spec.breaks ?? []).map((b) => ({
    from: Date.parse(`${b.from}T00:00:00Z`),
    to: Date.parse(`${b.to}T00:00:00Z`),
  }));
  const weekdays = new Set(spec.meeting_patterns.map((p) => p.weekday));
  let count = 0;
  const DAY = 24 * 60 * 60 * 1000;
  for (let t = start; t <= end; t += DAY) {
    if (!weekdays.has(new Date(t).getUTCDay())) continue;
    if (breaks.some((b) => t >= b.from && t <= b.to)) continue;
    // one session per matching pattern on this weekday (e.g. AM + PM meetings)
    count += spec.meeting_patterns.filter((p) => p.weekday === new Date(t).getUTCDay()).length;
  }
  return count;
}

export function validateCourseSpec(raw: unknown): Ok | Err {
  if (!isObj(raw)) return { ok: false, error: 'spec must be a JSON object.' };
  if (new TextEncoder().encode(JSON.stringify(raw)).length > MAX_SPEC_BYTES) {
    return { ok: false, error: 'spec is too large (max 64 KB) — split into two smaller courses or trim module descriptions.' };
  }
  if (typeof raw.title !== 'string' || raw.title.trim().length === 0) {
    return { ok: false, error: 'title is required.' };
  }
  {
    const e = tooLong('title', raw.title)
      ?? tooLong('course_code', raw.course_code)
      ?? tooLong('semester', raw.semester)
      ?? tooLong('description', raw.description);
    if (e) return { ok: false, error: e };
  }
  if (!isDateStr(raw.start_date)) return { ok: false, error: 'start_date must be YYYY-MM-DD.' };
  if (!isDateStr(raw.end_date)) return { ok: false, error: 'end_date must be YYYY-MM-DD.' };
  const startMs = Date.parse(`${raw.start_date}T00:00:00Z`);
  const endMs = Date.parse(`${raw.end_date}T00:00:00Z`);
  if (endMs <= startMs) return { ok: false, error: 'end_date must be after start_date.' };
  if ((endMs - startMs) / 86400000 > MAX_TERM_DAYS) {
    return { ok: false, error: `term is longer than ${MAX_TERM_DAYS} days — check the dates.` };
  }

  if (!Array.isArray(raw.meeting_patterns)) return { ok: false, error: 'meeting_patterns must be an array (may be empty).' };
  for (const p of raw.meeting_patterns) {
    if (!isObj(p) || typeof p.weekday !== 'number' || p.weekday < 0 || p.weekday > 6
      || !isTimeStr(p.start_time) || !isTimeStr(p.end_time)) {
      return { ok: false, error: 'each meeting_pattern needs weekday (0=Sunday..6), start_time and end_time as HH:MM.' };
    }
  }

  for (const b of (Array.isArray(raw.breaks) ? raw.breaks : [])) {
    if (!isObj(b) || !isDateStr(b.from) || !isDateStr(b.to)) {
      return { ok: false, error: 'each break needs from/to as YYYY-MM-DD.' };
    }
  }

  if (!Array.isArray(raw.modules) || raw.modules.length === 0) {
    return { ok: false, error: 'modules is required — at least one module.' };
  }
  if (raw.modules.length > MAX_MODULES) {
    return { ok: false, error: `too many modules (${raw.modules.length}, max ${MAX_MODULES}).` };
  }
  for (const [i, m] of raw.modules.entries()) {
    if (!isObj(m) || typeof m.title !== 'string' || m.title.trim().length === 0 || typeof m.week_number !== 'number') {
      return { ok: false, error: `module ${i + 1} needs a title and a numeric week_number.` };
    }
    const err = tooLong(`module ${i + 1} title`, m.title)
      ?? tooLong(`module ${i + 1} description`, m.description);
    if (err) return { ok: false, error: err };
    for (const [k, o] of (Array.isArray(m.learning_objectives) ? m.learning_objectives : []).entries()) {
      const oe = tooLong(`module ${i + 1} learning objective ${k + 1}`, o);
      if (oe) return { ok: false, error: oe };
    }
    if (!Array.isArray(m.assignments)) return { ok: false, error: `module ${i + 1} needs an assignments array (may be empty).` };
    if (m.assignments.length > MAX_ASSIGNMENTS_PER_MODULE) {
      return { ok: false, error: `module ${i + 1} has ${m.assignments.length} assignments (max ${MAX_ASSIGNMENTS_PER_MODULE}).` };
    }
    for (const [j, a] of m.assignments.entries()) {
      if (!isObj(a) || typeof a.title !== 'string' || a.title.trim().length === 0
        || typeof a.points !== 'number' || typeof a.due_at !== 'string' || Number.isNaN(Date.parse(a.due_at))) {
        return { ok: false, error: `assignment ${j + 1} in module ${i + 1} needs title, numeric points, and an ISO due_at.` };
      }
      const e = tooLong(`assignment ${j + 1} in module ${i + 1} title`, a.title)
        ?? tooLong(`assignment "${a.title}" instructions`, a.instructions)
        ?? tooLong(`assignment "${a.title}" description`, a.description);
      if (e) return { ok: false, error: e };
    }
  }

  if (raw.rubric !== undefined) {
    const r = raw.rubric;
    if (!isObj(r) || typeof r.title !== 'string' || !Array.isArray(r.criteria)) {
      return { ok: false, error: 'rubric needs a title and a criteria array.' };
    }
    const re = tooLong('rubric title', r.title) ?? tooLong('rubric description', r.description);
    if (re) return { ok: false, error: re };
    if (r.criteria.length > MAX_CRITERIA) {
      return { ok: false, error: `too many rubric criteria (${r.criteria.length}, max ${MAX_CRITERIA}).` };
    }
    for (const [i, c] of r.criteria.entries()) {
      if (!isObj(c) || typeof c.name !== 'string' || typeof c.max_points !== 'number' || typeof c.weight_percentage !== 'number') {
        return { ok: false, error: 'each rubric criterion needs name, max_points, weight_percentage.' };
      }
      const ce = tooLong(`rubric criterion ${i + 1} name`, c.name)
        ?? tooLong(`rubric criterion ${i + 1} description`, c.description);
      if (ce) return { ok: false, error: ce };
    }
  }

  if (raw.roster !== undefined) {
    if (!Array.isArray(raw.roster)) return { ok: false, error: 'roster must be an array.' };
    if (raw.roster.length > MAX_ROSTER) {
      return { ok: false, error: `roster too large (${raw.roster.length} entries, max ${MAX_ROSTER}).` };
    }
    for (const [i, s] of raw.roster.entries()) {
      if (!isObj(s) || typeof s.name !== 'string' || s.name.trim().length === 0
        || (s.user_id !== undefined && typeof s.user_id !== 'string')) {
        return { ok: false, error: `roster entry ${i + 1} needs a string name (and user_id, when present, must be a string).` };
      }
      const se = tooLong(`roster entry ${i + 1} name`, s.name);
      if (se) return { ok: false, error: se };
    }
  }
  if (raw.repertoire !== undefined) {
    if (!Array.isArray(raw.repertoire)) return { ok: false, error: 'repertoire must be an array.' };
    if (raw.repertoire.length > MAX_REPERTOIRE) {
      return { ok: false, error: `repertoire too large (${raw.repertoire.length} entries, max ${MAX_REPERTOIRE}).` };
    }
    for (const [i, w] of raw.repertoire.entries()) {
      if (!isObj(w) || typeof w.title !== 'string' || w.title.trim().length === 0
        || (w.library_item_id !== undefined && typeof w.library_item_id !== 'string')) {
        return { ok: false, error: `repertoire item ${i + 1} needs a string title (and library_item_id, when present, must be a string).` };
      }
      const we = tooLong(`repertoire item ${i + 1} title`, w.title);
      if (we) return { ok: false, error: we };
    }
  }

  if (raw.quizzes !== undefined) {
    if (!Array.isArray(raw.quizzes)) return { ok: false, error: 'quizzes must be an array.' };
    if (raw.quizzes.length > MAX_QUIZZES) return { ok: false, error: `too many quizzes (${raw.quizzes.length}, max ${MAX_QUIZZES}).` };
    for (const [qi, qz] of raw.quizzes.entries()) {
      if (!isObj(qz) || typeof qz.title !== 'string' || qz.title.trim() === '') {
        return { ok: false, error: `quiz ${qi + 1} needs a title.` };
      }
      const te = tooLong(`quiz ${qi + 1} title`, qz.title) ?? tooLong(`quiz ${qi + 1} description`, qz.description);
      if (te) return { ok: false, error: te };
      if (!Array.isArray(qz.questions) || qz.questions.length === 0) {
        return { ok: false, error: `quiz ${qi + 1} needs at least one question.` };
      }
      if (qz.questions.length > MAX_QUESTIONS_PER_QUIZ) {
        return { ok: false, error: `quiz ${qi + 1} has ${qz.questions.length} questions (max ${MAX_QUESTIONS_PER_QUIZ}).` };
      }
      for (const [xi, q] of qz.questions.entries()) {
        const where = `quiz ${qi + 1} question ${xi + 1}`;
        if (!isObj(q) || typeof q.prompt !== 'string' || q.prompt.trim() === '') {
          return { ok: false, error: `${where} needs a prompt.` };
        }
        const pe = tooLong(`${where} prompt`, q.prompt);
        if (pe) return { ok: false, error: pe };
        if (q.type === 'multiple_choice') {
          if (!Array.isArray(q.choices) || q.choices.length < 2 || q.choices.length > MAX_CHOICES
            || !q.choices.every((c) => typeof c === 'string' && c.trim() !== '')) {
            return { ok: false, error: `${where} needs 2-${MAX_CHOICES} non-empty choices.` };
          }
          if (typeof q.correct_index !== 'number' || q.correct_index < 0 || q.correct_index >= q.choices.length) {
            return { ok: false, error: `${where} correct_index is out of range.` };
          }
        } else if (q.type === 'true_false') {
          if (typeof q.correct_answer !== 'boolean') {
            return { ok: false, error: `${where} (true_false) needs a boolean correct_answer.` };
          }
        } else {
          return { ok: false, error: `${where} has an unsupported type (only multiple_choice and true_false are allowed).` };
        }
        if (q.points !== undefined && (typeof q.points !== 'number' || q.points < 0)) {
          return { ok: false, error: `${where} points must be a non-negative number.` };
        }
      }
    }
  }

  const spec = raw as unknown as CourseSpec;
  const sessionCount = countSessions(spec);
  if (sessionCount > MAX_SESSIONS) {
    return { ok: false, error: `the meeting schedule expands to ${sessionCount} class sessions (max 120) — check the dates or meeting days.` };
  }
  return { ok: true, spec, sessionCount };
}
