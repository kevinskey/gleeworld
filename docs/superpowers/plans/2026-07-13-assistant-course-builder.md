# Assistant Course Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The GleeWorld Assistant interviews a teacher, then creates a complete draft course (modules, assignments, rubric, class sessions, playlist shell, pending roster) in the native Academy (`gw_courses` + CourseShell), which the teacher reviews, edits, and publishes.

**Architecture:** A new confirm-gated client tool `create_course_draft(spec)` in the assistant tool catalog. The edge function validates the spec server-side *before* queueing the confirm card (invalid specs bounce back to the model as structured errors). On user confirmation, the browser calls a SECURITY INVOKER Postgres RPC `assistant_create_course(spec)` under the caller's own JWT (RLS applies) that writes everything in one transaction, then navigates to the draft course page. A `status` column on `gw_courses` plus one RLS predicate keeps drafts invisible to students; CourseShell gets a draft banner with a Publish button.

**Tech Stack:** Deno/TS Supabase edge function (`assistant-chat`), DeepSeek via OpenAI-format tool calling, plpgsql RPC, React (CourseShell), vitest, SQL migration tests via psql on a scratch DB.

**Spec deviations (forced by codebase reality — the approved spec assumed table names that don't match the live UI):**
1. Assignments go in **`gw_assignments`** (flat per-course, no module linkage), NOT `gw_course_assignments` — CourseShell's Assignments tab reads/writes `gw_assignments` only (see `src/pages/academy/CourseShell.tsx:818` "Pivoted from gw_course_assignments → gw_assignments"). Module grouping exists only in the generated due-date ordering and module descriptions.
2. The review/edit surface is **CourseShell at `/academy/c/:code`** (course_code slug), not `/academy/courses/:id`. Navigation after creation happens via the client action's `navigateTo` result — no new `open_page` key needed.
3. `/academy/canvas/*` is an external Canvas LMS proxy (no `gw_*` tables) — untouched by this feature.
4. Confirm cards only exist for client-executed tools, so `create_course_draft` is `execution: 'client'` with server-side pre-validation in the edge fn loop (spec wanted executor validation + confirm; this delivers both within the existing machinery).
5. No playlist-tracks table exists; the playlist shell row carries repertoire (resolved ids + raw titles) in its `description`, per the spec's fallback.

## Global Constraints

- Tenant-neutral copy: never "Spelman"; students are "students" (never "singers"/"members" in user-visible copy).
- Light theme: white cards / dark text; use theme tokens; never set `color` on bare h1–h6.
- Every Supabase write must be `.select()`-checked (demo-tenant writes fail silently).
- New RLS/role policies must accept BOTH `'super_admin'` and `'super-admin'` spellings.
- Deno relative imports need the `.ts` extension.
- rsync deploys never use `--delete`; edge fn real path is `/opt/supabase/volumes/functions/`.
- Shared checkout: run `git branch --show-current` (expect `assistant-course-builder`) before EVERY commit.
- Unit tests: `npx vitest run <path>` (root package.json, script `test` = `vitest run`).
- Migration tests: psql against a local scratch DB, never prod:
  `/opt/homebrew/opt/postgresql@16/bin/psql -d course_builder_scratch -v ON_ERROR_STOP=1 -f <file>`

---

### Task 1: CourseSpec types + validator (pure TS, shared by edge fn)

**Files:**
- Create: `supabase/functions/assistant-chat/courseSpec.ts`
- Test: `supabase/functions/assistant-chat/__tests__/courseSpec.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `interface CourseSpec` and `validateCourseSpec(raw: unknown): { ok: true; spec: CourseSpec; sessionCount: number } | { ok: false; error: string }`. Also `countSessions(spec: CourseSpec): number`. Task 3 (index.ts) calls `validateCourseSpec`; Task 2's tool description references the spec shape.

- [ ] **Step 1: Write the failing test**

Create `supabase/functions/assistant-chat/__tests__/courseSpec.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateCourseSpec, type CourseSpec } from '../courseSpec';

const valid = (): Record<string, unknown> => ({
  title: 'Choral Conducting I',
  course_code: 'MUS-240',
  description: 'Fundamentals of choral conducting.',
  semester: 'FALL 2026',
  start_date: '2026-08-24',
  end_date: '2026-12-11',
  meeting_patterns: [
    { weekday: 1, start_time: '10:00', end_time: '10:50' },
    { weekday: 3, start_time: '10:00', end_time: '10:50', location: 'Room 12' },
  ],
  breaks: [{ from: '2026-11-23', to: '2026-11-27', name: 'Fall break' }],
  modules: [
    {
      title: 'Week 1: Posture and Baton Grip',
      description: 'Foundations of the conducting stance.',
      week_number: 1,
      learning_objectives: ['Demonstrate neutral stance'],
      assignments: [
        {
          title: 'Reflection: your conducting heroes',
          instructions: 'Write 300 words on two conductors you admire.',
          points: 10,
          due_at: '2026-08-31T23:59:00-04:00',
        },
      ],
    },
  ],
  rubric: {
    title: 'Conducting rubric',
    criteria: [{ name: 'Beat clarity', max_points: 10, weight_percentage: 25 }],
  },
  repertoire: [{ title: 'Lift Every Voice and Sing' }],
  roster: [{ name: 'Ada Lovelace' }],
});

describe('validateCourseSpec', () => {
  it('accepts a complete valid spec and counts sessions', () => {
    const r = validateCourseSpec(valid());
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Mon+Wed from 2026-08-24 to 2026-12-11 minus the Mon/Wed inside 11-23..11-27
      expect(r.sessionCount).toBeGreaterThan(20);
      expect(r.sessionCount).toBeLessThanOrEqual(40);
      expect(r.spec.title).toBe('Choral Conducting I');
    }
  });

  it('rejects non-object input', () => {
    const r = validateCourseSpec('nope');
    expect(r.ok).toBe(false);
  });

  it('requires title, dates, and at least one module', () => {
    for (const key of ['title', 'start_date', 'end_date', 'modules']) {
      const bad = valid();
      delete bad[key];
      const r = validateCourseSpec(bad);
      expect(r.ok, `missing ${key} should fail`).toBe(false);
      if (!r.ok) expect(r.error).toContain(key);
    }
  });

  it('rejects end_date before start_date and terms over 366 days', () => {
    const swapped = { ...valid(), start_date: '2026-12-11', end_date: '2026-08-24' };
    expect(validateCourseSpec(swapped).ok).toBe(false);
    const tooLong = { ...valid(), end_date: '2028-01-01' };
    expect(validateCourseSpec(tooLong).ok).toBe(false);
  });

  it('enforces caps: 16 modules, 8 assignments/module, 12 criteria, 200 roster, 50 repertoire', () => {
    const mod = (valid().modules as unknown[])[0] as Record<string, unknown>;
    const overModules = { ...valid(), modules: Array.from({ length: 17 }, () => ({ ...mod })) };
    expect(validateCourseSpec(overModules).ok).toBe(false);
    const a = (mod.assignments as unknown[])[0];
    const overAssignments = {
      ...valid(),
      modules: [{ ...mod, assignments: Array.from({ length: 9 }, () => ({ ...(a as object) })) }],
    };
    expect(validateCourseSpec(overAssignments).ok).toBe(false);
    const overRoster = { ...valid(), roster: Array.from({ length: 201 }, (_, i) => ({ name: `S${i}` })) };
    expect(validateCourseSpec(overRoster).ok).toBe(false);
  });

  it('rejects text fields over 2000 chars with an actionable error', () => {
    const mod = (valid().modules as unknown[])[0] as Record<string, unknown>;
    const bad = { ...valid(), modules: [{ ...mod, description: 'x'.repeat(2001) }] };
    const r = validateCourseSpec(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.toLowerCase()).toContain('too long');
  });

  it('rejects when expanded sessions exceed 120', () => {
    // AM + PM meetings every day of the week: ~110 term days × 2 ≈ 210 sessions
    const daily = {
      ...valid(),
      meeting_patterns: [0, 1, 2, 3, 4, 5, 6].flatMap((weekday) => [
        { weekday, start_time: '09:00', end_time: '10:00' },
        { weekday, start_time: '14:00', end_time: '15:00' },
      ]),
    };
    const r = validateCourseSpec(daily);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('120');
  });

  it('rejects specs over 64 KB', () => {
    const mod = (valid().modules as unknown[])[0] as Record<string, unknown>;
    const fat = {
      ...valid(),
      modules: Array.from({ length: 16 }, (_, i) => ({
        ...mod, title: `M${i}`, description: 'y'.repeat(2000),
        assignments: Array.from({ length: 8 }, (_, j) => ({
          title: `A${j}`, instructions: 'z'.repeat(2000), points: 10,
          due_at: '2026-09-01T23:59:00-04:00',
        })),
      })),
    };
    const r = validateCourseSpec(fat);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.toLowerCase()).toContain('too large');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/functions/assistant-chat/__tests__/courseSpec.test.ts`
Expected: FAIL — cannot resolve `../courseSpec`.

- [ ] **Step 3: Write the implementation**

Create `supabase/functions/assistant-chat/courseSpec.ts` (pure TS — no Deno/browser APIs, imported by the edge fn and vitest):

```ts
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
}

const MAX_TEXT = 2000;
const MAX_MODULES = 16;
const MAX_ASSIGNMENTS_PER_MODULE = 8;
const MAX_CRITERIA = 12;
const MAX_ROSTER = 200;
const MAX_REPERTOIRE = 50;
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
  if (JSON.stringify(raw).length > MAX_SPEC_BYTES) {
    return { ok: false, error: 'spec is too large (max 64 KB) — split into two smaller courses or trim module descriptions.' };
  }
  if (typeof raw.title !== 'string' || raw.title.trim().length === 0) {
    return { ok: false, error: 'title is required.' };
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
    const err = tooLong(`module ${i + 1} description`, m.description);
    if (err) return { ok: false, error: err };
    if (!Array.isArray(m.assignments)) return { ok: false, error: `module ${i + 1} needs an assignments array (may be empty).` };
    if (m.assignments.length > MAX_ASSIGNMENTS_PER_MODULE) {
      return { ok: false, error: `module ${i + 1} has ${m.assignments.length} assignments (max ${MAX_ASSIGNMENTS_PER_MODULE}).` };
    }
    for (const [j, a] of m.assignments.entries()) {
      if (!isObj(a) || typeof a.title !== 'string' || a.title.trim().length === 0
        || typeof a.points !== 'number' || typeof a.due_at !== 'string' || Number.isNaN(Date.parse(a.due_at))) {
        return { ok: false, error: `assignment ${j + 1} in module ${i + 1} needs title, numeric points, and an ISO due_at.` };
      }
      const e = tooLong(`assignment "${a.title}" instructions`, a.instructions)
        ?? tooLong(`assignment "${a.title}" description`, a.description);
      if (e) return { ok: false, error: e };
    }
  }

  if (raw.rubric !== undefined) {
    const r = raw.rubric;
    if (!isObj(r) || typeof r.title !== 'string' || !Array.isArray(r.criteria)) {
      return { ok: false, error: 'rubric needs a title and a criteria array.' };
    }
    if (r.criteria.length > MAX_CRITERIA) return { ok: false, error: `too many rubric criteria (max ${MAX_CRITERIA}).` };
    for (const c of r.criteria) {
      if (!isObj(c) || typeof c.name !== 'string' || typeof c.max_points !== 'number' || typeof c.weight_percentage !== 'number') {
        return { ok: false, error: 'each rubric criterion needs name, max_points, weight_percentage.' };
      }
    }
  }

  if (Array.isArray(raw.roster) && raw.roster.length > MAX_ROSTER) {
    return { ok: false, error: `roster too large (max ${MAX_ROSTER}).` };
  }
  if (Array.isArray(raw.repertoire) && raw.repertoire.length > MAX_REPERTOIRE) {
    return { ok: false, error: `repertoire too large (max ${MAX_REPERTOIRE}).` };
  }

  const spec = raw as unknown as CourseSpec;
  const sessionCount = countSessions(spec);
  if (sessionCount > MAX_SESSIONS) {
    return { ok: false, error: `the meeting schedule expands to ${sessionCount} class sessions (max 120) — check the dates or meeting days.` };
  }
  return { ok: true, spec, sessionCount };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/functions/assistant-chat/__tests__/courseSpec.test.ts`
Expected: PASS (all 8 tests).

- [ ] **Step 5: Commit**

```bash
git branch --show-current   # must print: assistant-course-builder
git add supabase/functions/assistant-chat/courseSpec.ts supabase/functions/assistant-chat/__tests__/courseSpec.test.ts
git commit -m "feat(assistant): CourseSpec types + validator for course builder"
```

---

### Task 2: Tool catalog entry + interview prompt section

**Files:**
- Modify: `supabase/functions/assistant-chat/toolCatalog.ts` (append to `TOOL_CATALOG`, before the closing `];` at line 176)
- Modify: `supabase/functions/assistant-chat/prompt.ts`
- Test: `supabase/functions/assistant-chat/__tests__/toolCatalog.test.ts`, `supabase/functions/assistant-chat/__tests__/prompt.test.ts`

**Interfaces:**
- Consumes: `ToolDef` shape from toolCatalog.ts (`minRole`, `execution`, `confirm`).
- Produces: tool named `create_course_draft` with a single `spec` object parameter; prompt text mentioning "course" for admins. Task 3 matches on the exact name `'create_course_draft'`; Task 5's client action switch uses the same name.

- [ ] **Step 1: Write the failing tests**

Append to `supabase/functions/assistant-chat/__tests__/toolCatalog.test.ts` inside the existing `describe`:

```ts
  it('create_course_draft is admin-only, client-executed, confirm-gated', () => {
    const def = TOOL_CATALOG.find((t) => t.name === 'create_course_draft');
    expect(def).toBeDefined();
    expect(def!.minRole).toBe('admin');
    expect(def!.execution).toBe('client');
    expect(def!.confirm).toBe(true);
    expect(toolsForRole('member').map((t) => t.name)).not.toContain('create_course_draft');
  });
```

Append to `supabase/functions/assistant-chat/__tests__/prompt.test.ts` inside the existing `describe` (match its existing style of building a context object — reuse the file's existing helper/fixture if one exists):

```ts
  it('admins get the course-builder interview section; members do not', () => {
    const base = {
      firstName: 'Kevin', tenantName: 'GleeWorld', activeModules: [],
      nowIso: '2026-07-13T12:00:00Z', timezone: 'America/New_York',
    };
    const admin = buildSystemPrompt({ ...base, role: 'admin' as const });
    const member = buildSystemPrompt({ ...base, role: 'member' as const });
    expect(admin).toContain('create_course_draft');
    expect(admin).toContain('draft course');
    expect(member).not.toContain('create_course_draft');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run supabase/functions/assistant-chat/__tests__/toolCatalog.test.ts supabase/functions/assistant-chat/__tests__/prompt.test.ts`
Expected: FAIL — `def` undefined; prompt does not contain `create_course_draft`.

- [ ] **Step 3: Implement**

In `toolCatalog.ts`, append this entry to `TOOL_CATALOG` (after the `add_video` entry, before `];`):

```ts
  {
    name: 'create_course_draft',
    description: 'Create a complete DRAFT course in the Academy from your interview with the teacher: modules, assignments with prompts, a rubric, class sessions expanded from the meeting schedule, a repertoire playlist shell, and a pending roster. Students cannot see drafts. Interview first (see the course-builder rules in your instructions), summarize, get a verbal yes, then call ONCE with the full spec. REQUIRES user confirmation.',
    parameters: {
      type: 'object',
      properties: {
        spec: {
          type: 'object',
          description: 'The full CourseSpec',
          properties: {
            title: str('Course title'),
            course_code: str('Short code like MUS-240 (suggest one if the teacher has none)'),
            description: str('1-3 sentence course description'),
            semester: str('e.g. FALL 2026'),
            start_date: str('Term start, YYYY-MM-DD'),
            end_date: str('Term end, YYYY-MM-DD'),
            meeting_patterns: {
              type: 'array',
              description: 'Weekly meeting times',
              items: {
                type: 'object',
                properties: {
                  weekday: { type: 'number', description: '0=Sunday .. 6=Saturday' },
                  start_time: str('HH:MM 24h'),
                  end_time: str('HH:MM 24h'),
                  location: str('Room (optional)'),
                },
                required: ['weekday', 'start_time', 'end_time'],
              },
            },
            breaks: {
              type: 'array',
              description: 'Date ranges with no class',
              items: {
                type: 'object',
                properties: { from: str('YYYY-MM-DD'), to: str('YYYY-MM-DD'), name: str('e.g. Fall break') },
                required: ['from', 'to'],
              },
            },
            modules: {
              type: 'array',
              description: 'Max 16. Each with full descriptions, not stubs.',
              items: {
                type: 'object',
                properties: {
                  title: str('Module title, e.g. "Week 3: Legato gesture"'),
                  description: str('2-5 sentence module description'),
                  week_number: { type: 'number', description: 'Week of term, 1-based' },
                  learning_objectives: { type: 'array', items: { type: 'string' } },
                  assignments: {
                    type: 'array',
                    description: 'Max 8 per module, with authored prompts',
                    items: {
                      type: 'object',
                      properties: {
                        title: str('Assignment title'),
                        description: str('Short summary'),
                        instructions: str('Full authored prompt the student reads'),
                        points: { type: 'number', description: 'Point value' },
                        due_at: str('ISO datetime with timezone'),
                        assignment_type: str('standard|performance|reflection (optional)'),
                        category: str('Grading category (optional)'),
                      },
                      required: ['title', 'points', 'due_at'],
                    },
                  },
                },
                required: ['title', 'week_number', 'assignments'],
              },
            },
            rubric: {
              type: 'object',
              properties: {
                title: str('Rubric title'),
                description: str('Optional'),
                criteria: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: str('Criterion'),
                      description: str('Optional'),
                      max_points: { type: 'number', description: 'Max points' },
                      weight_percentage: { type: 'number', description: 'Weight 0-100' },
                    },
                    required: ['name', 'max_points', 'weight_percentage'],
                  },
                },
              },
              required: ['title', 'criteria'],
            },
            repertoire: {
              type: 'array',
              description: 'Pieces for the course playlist. Resolve ids with search_music first; keep raw titles when unmatched.',
              items: {
                type: 'object',
                properties: { library_item_id: str('gw_sheet_music id if resolved'), title: str('Piece title') },
                required: ['title'],
              },
            },
            roster: {
              type: 'array',
              description: 'Who to enroll AT PUBLISH (not at draft). Resolve user_id via find_user when possible.',
              items: {
                type: 'object',
                properties: { user_id: str('gw_profiles user id if resolved'), name: str('Display name') },
                required: ['name'],
              },
            },
          },
          required: ['title', 'start_date', 'end_date', 'meeting_patterns', 'modules'],
        },
      },
      required: ['spec'],
    },
    minRole: 'admin', execution: 'client', confirm: true,
  },
```

In `prompt.ts`, extend `buildSystemPrompt` — after the `memberNote` const, add:

```ts
  const courseBuilderNote = ctx.role === 'admin'
    ? [
        'Course builder (create_course_draft):',
        '- When the user wants to build a course, interview them FIRST, 2-3 questions per turn: subject and level; title + course code; term dates; meeting days/times and breaks; learning goals; grading policy (becomes the rubric); assignment cadence; repertoire; who is in the class.',
        '- Resolve repertoire with search_music and people with find_user as you go; keep raw titles/names when unmatched.',
        '- Before calling the tool, restate a one-paragraph summary and get a verbal yes.',
        '- Then call create_course_draft ONCE with the complete spec — full module descriptions and authored assignment prompts, not stubs. It creates a draft course only students cannot see; the teacher reviews, edits, and publishes on the course page.',
      ].join('\n')
    : '';
```

and include it in the returned array after `memberNote`:

```ts
    memberNote,
    ...(courseBuilderNote ? [courseBuilderNote] : []),
```

Note: the existing "Keep replies to 1-3 short sentences" rule stays — the interview batches are still short.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run supabase/functions/assistant-chat/__tests__/`
Expected: PASS, including the pre-existing `admins get every tool` test (it compares against `TOOL_CATALOG.length`, so it self-adjusts).

- [ ] **Step 5: Commit**

```bash
git branch --show-current   # must print: assistant-course-builder
git add supabase/functions/assistant-chat/toolCatalog.ts supabase/functions/assistant-chat/prompt.ts supabase/functions/assistant-chat/__tests__/toolCatalog.test.ts supabase/functions/assistant-chat/__tests__/prompt.test.ts
git commit -m "feat(assistant): create_course_draft tool + course-builder interview prompt"
```

---

### Task 3: Pre-queue validation in the edge fn loop

**Files:**
- Modify: `supabase/functions/assistant-chat/index.ts:85-93` (the client-execution branch)
- Test: `supabase/functions/assistant-chat/__tests__/courseSpec.test.ts` (already covers the validator; this task adds the thin wiring)

**Interfaces:**
- Consumes: `validateCourseSpec` from Task 1 (`../courseSpec.ts` — note `.ts` extension, Deno requires it).
- Produces: invalid `create_course_draft` calls return `{ error }` to the model instead of queueing a confirm card; valid calls queue as before.

- [ ] **Step 1: Implement (wiring is 10 lines; validator behavior is already unit-tested)**

In `index.ts`, add the import at the top with the other local imports:

```ts
import { validateCourseSpec } from './courseSpec.ts';
```

Replace the client-execution `else` branch (currently lines 85-93):

```ts
        } else {
          // Client-executed: queue it for the browser and tell the model it's underway.
          if (def.name === 'create_course_draft') {
            const v = validateCourseSpec(args.spec);
            if (!v.ok) {
              // Feed the structured error back so the model can fix the spec —
              // never queue a confirm card for a spec the RPC would reject.
              messages.push({ role: 'tool', content: JSON.stringify({ error: v.error }), tool_call_id: tc.id });
              continue;
            }
          }
          actions.push({ tool: def.name, args, confirm: def.confirm });
          result = JSON.stringify(
            def.confirm
              ? { status: 'pending_user_confirmation', note: 'Tell the user you have prepared this and they must confirm the card to send it.' }
              : { status: 'queued_on_client', note: 'Tell the user this is being done now.' },
          );
        }
```

(The `continue` skips the shared `messages.push` at the bottom of the loop for the error case, since it already pushed its own tool message. Check the loop structure when editing: the shared push is `messages.push({ role: 'tool', content: result, tool_call_id: tc.id });` at line 94.)

- [ ] **Step 2: Verify types + full test suite**

Run: `npx vitest run supabase/functions/assistant-chat/`
Expected: PASS. (No dedicated index.ts test harness exists; the validator is covered, and the wiring is exercised in droplet integration testing in Task 7.)

- [ ] **Step 3: Commit**

```bash
git branch --show-current   # must print: assistant-course-builder
git add supabase/functions/assistant-chat/index.ts
git commit -m "feat(assistant): validate course specs before queueing the confirm card"
```

---

### Task 4: Migration — status column, RLS, policy normalization, expand fn, RPC

**Files:**
- Create: `supabase/migrations/20260713220000_assistant_course_builder.sql`
- Test: `supabase/migrations/tests/assistant_course_builder_test.sql`

**Interfaces:**
- Consumes: existing tables `gw_courses`, `gw_course_modules`, `gw_assignments`, `gw_course_rubrics`, `gw_rubric_criteria`, `gw_course_class_sessions`, `gw_course_playlists`; `current_tenant_id()`.
- Produces: `gw_courses.status` ('draft'|'published', default 'published'), `gw_courses.pending_enrollments jsonb`, `expand_class_sessions(p_patterns jsonb, p_start date, p_end date, p_breaks jsonb) returns table(session_date date, start_time time, end_time time, location text)`, and `assistant_create_course(spec jsonb) returns jsonb` → `{course_id, course_code, title, module_count, assignment_count, session_count}`. Task 5's client action calls the RPC and reads exactly those keys; Task 6 reads `status` and `pending_enrollments`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260713220000_assistant_course_builder.sql`:

```sql
-- Assistant Course Builder: draft status on gw_courses + one-shot draft-course RPC.
-- Spec: docs/superpowers/specs/2026-07-13-assistant-course-builder-design.md

-- 1) Draft status + pending roster ------------------------------------------
ALTER TABLE public.gw_courses
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS pending_enrollments jsonb;

ALTER TABLE public.gw_courses DROP CONSTRAINT IF EXISTS gw_courses_status_check;
ALTER TABLE public.gw_courses
  ADD CONSTRAINT gw_courses_status_check CHECK (status IN ('draft','published'));

-- 2) Hide drafts from everyone except admins and the course owner -----------
-- (Admins keep access through the separate permissive "Admins can manage courses"
-- policy; the tenant RESTRICTIVE policies are untouched.)
DROP POLICY IF EXISTS "Anyone can view active courses" ON public.gw_courses;
CREATE POLICY "Anyone can view active courses" ON public.gw_courses
  FOR SELECT USING (
    (is_active = true OR is_active IS NULL)
    AND (status = 'published' OR created_by = auth.uid() OR instructor_id = auth.uid())
  );

-- 3) Normalize course-satellite write policies -------------------------------
-- assistant_create_course is SECURITY INVOKER: the whole transaction fails if
-- ANY satellite insert is blocked by RLS. The legacy policies disagree on role
-- spellings ('super-admin' vs 'super_admin') and on flag-vs-role checks, so an
-- is_admin-flagged caller could pass gw_assignments but fail gw_course_modules.
-- One shared predicate, both spellings accepted (canonical repo rule).
CREATE OR REPLACE FUNCTION public.is_course_editor()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM gw_profiles
    WHERE user_id = auth.uid()
      AND (is_admin = true OR is_super_admin = true
           OR role IN ('admin','super_admin','super-admin','instructor'))
  );
$$;
REVOKE ALL ON FUNCTION public.is_course_editor() FROM public;
GRANT EXECUTE ON FUNCTION public.is_course_editor() TO authenticated;

DROP POLICY IF EXISTS "Instructors can manage modules" ON public.gw_course_modules;
CREATE POLICY "Instructors can manage modules" ON public.gw_course_modules
  FOR ALL USING (public.is_course_editor()) WITH CHECK (public.is_course_editor());

DROP POLICY IF EXISTS "Admins can manage rubrics" ON public.gw_course_rubrics;
CREATE POLICY "Admins can manage rubrics" ON public.gw_course_rubrics
  FOR ALL USING (public.is_course_editor()) WITH CHECK (public.is_course_editor());

DROP POLICY IF EXISTS "Admins can manage rubric criteria" ON public.gw_rubric_criteria;
CREATE POLICY "Admins can manage rubric criteria" ON public.gw_rubric_criteria
  FOR ALL USING (public.is_course_editor()) WITH CHECK (public.is_course_editor());

DROP POLICY IF EXISTS "Admins manage playlists" ON public.gw_course_playlists;
CREATE POLICY "Admins manage playlists" ON public.gw_course_playlists
  FOR ALL USING (public.is_course_editor()) WITH CHECK (public.is_course_editor());

-- gw_assignments write policies already cover instructor/admin/super_admin by
-- role; add the editor predicate as an additional permissive INSERT policy so
-- is_admin-flagged users without those role strings can also insert.
DROP POLICY IF EXISTS "Course editors can insert assignments" ON public.gw_assignments;
CREATE POLICY "Course editors can insert assignments" ON public.gw_assignments
  FOR INSERT WITH CHECK (public.is_course_editor());

-- 4) Deterministic session expansion (testable in isolation) -----------------
CREATE OR REPLACE FUNCTION public.expand_class_sessions(
  p_patterns jsonb, p_start date, p_end date, p_breaks jsonb DEFAULT '[]'::jsonb
) RETURNS TABLE (session_date date, start_time time, end_time time, location text)
LANGUAGE sql IMMUTABLE AS $$
  SELECT d::date,
         (p->>'start_time')::time,
         (p->>'end_time')::time,
         p->>'location'
  FROM generate_series(p_start::timestamp, p_end::timestamp, interval '1 day') AS d
  JOIN jsonb_array_elements(coalesce(p_patterns, '[]'::jsonb)) AS p
    ON (p->>'weekday')::int = extract(dow FROM d)::int
  WHERE NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(coalesce(p_breaks, '[]'::jsonb)) b
    WHERE d::date BETWEEN (b->>'from')::date AND (b->>'to')::date
  )
  ORDER BY 1, 2;
$$;
GRANT EXECUTE ON FUNCTION public.expand_class_sessions(jsonb, date, date, jsonb) TO authenticated;

-- 5) One-shot draft-course RPC (SECURITY INVOKER — RLS applies) ---------------
CREATE OR REPLACE FUNCTION public.assistant_create_course(spec jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_course_id uuid;
  v_title text := trim(coalesce(spec->>'title', ''));
  v_start date;
  v_end date;
  v_code_base text;
  v_code text;
  v_instructor_name text;
  v_rubric_id uuid;
  v_module_count int := 0;
  v_assignment_count int := 0;
  v_session_count int := 0;
  v_repertoire text;
  m record;
  a record;
  c record;
  i int := 1;
BEGIN
  -- Structural re-checks (the edge fn validated; never trust a single layer).
  IF v_title = '' THEN RAISE EXCEPTION 'spec.title is required'; END IF;
  v_start := (spec->>'start_date')::date;
  v_end := (spec->>'end_date')::date;
  IF v_end <= v_start THEN RAISE EXCEPTION 'end_date must be after start_date'; END IF;
  IF jsonb_typeof(spec->'modules') <> 'array' OR jsonb_array_length(spec->'modules') < 1 THEN
    RAISE EXCEPTION 'at least one module is required';
  END IF;
  IF jsonb_array_length(spec->'modules') > 16 THEN RAISE EXCEPTION 'too many modules (max 16)'; END IF;

  v_code_base := upper(coalesce(nullif(trim(spec->>'course_code'), ''),
                                'GW-' || substr(md5(v_title || clock_timestamp()::text), 1, 6)));
  v_code := v_code_base;
  WHILE EXISTS (SELECT 1 FROM gw_courses
                WHERE tenant_id = current_tenant_id() AND course_code = v_code) LOOP
    IF i > 9 THEN RAISE EXCEPTION 'could not find a free course code near %', v_code_base; END IF;
    v_code := v_code_base || '-' || i;
    i := i + 1;
  END LOOP;

  SELECT full_name INTO v_instructor_name FROM gw_profiles WHERE user_id = auth.uid();

  INSERT INTO gw_courses
    (course_code, code, title, description, semester, instructor_id, instructor_name,
     is_active, is_template, is_free, status, pending_enrollments, created_by, tenant_id)
  VALUES
    (v_code, v_code, v_title, spec->>'description', coalesce(spec->>'semester', ''),
     auth.uid(), v_instructor_name,
     true, false, true, 'draft',
     CASE WHEN jsonb_typeof(spec->'roster') = 'array' AND jsonb_array_length(spec->'roster') > 0
          THEN spec->'roster' ELSE NULL END,
     auth.uid(), current_tenant_id())
  RETURNING id INTO v_course_id;

  FOR m IN
    SELECT value AS mod, ordinality AS ord
    FROM jsonb_array_elements(spec->'modules') WITH ORDINALITY
  LOOP
    INSERT INTO gw_course_modules
      (course_id, module_id, title, description, week_number, is_active, is_locked,
       display_order, learning_objectives)
    VALUES
      (v_course_id, 'mod-' || m.ord, m.mod->>'title', m.mod->>'description',
       coalesce((m.mod->>'week_number')::int, m.ord::int), true, false,
       m.ord::int, coalesce(m.mod->'learning_objectives', '[]'::jsonb));
    v_module_count := v_module_count + 1;

    FOR a IN
      SELECT value AS asg FROM jsonb_array_elements(coalesce(m.mod->'assignments', '[]'::jsonb))
    LOOP
      IF trim(coalesce(a.asg->>'title','')) = '' THEN RAISE EXCEPTION 'assignment title missing in module %', m.ord; END IF;
      INSERT INTO gw_assignments
        (course_id, title, description, instructions, assignment_type, category,
         points, due_at, is_active, created_by, tenant_id)
      VALUES
        (v_course_id, a.asg->>'title', a.asg->>'description', a.asg->>'instructions',
         coalesce(nullif(a.asg->>'assignment_type',''), 'standard'),
         coalesce(nullif(a.asg->>'category',''), 'general'),
         coalesce((a.asg->>'points')::int, 100), (a.asg->>'due_at')::timestamptz,
         true, auth.uid(), current_tenant_id());
      v_assignment_count := v_assignment_count + 1;
    END LOOP;
  END LOOP;

  IF jsonb_typeof(spec->'rubric') = 'object' THEN
    INSERT INTO gw_course_rubrics (course_id, title, description, is_default, created_by)
    VALUES (v_course_id, spec->'rubric'->>'title', spec->'rubric'->>'description', true, auth.uid())
    RETURNING id INTO v_rubric_id;
    FOR c IN
      SELECT value AS cri, ordinality AS ord
      FROM jsonb_array_elements(coalesce(spec->'rubric'->'criteria', '[]'::jsonb)) WITH ORDINALITY
    LOOP
      INSERT INTO gw_rubric_criteria
        (rubric_id, criterion_name, description, max_points, weight_percentage, display_order)
      VALUES
        (v_rubric_id, c.cri->>'name', c.cri->>'description',
         coalesce((c.cri->>'max_points')::int, 10),
         coalesce((c.cri->>'weight_percentage')::numeric, 0), c.ord::int);
    END LOOP;
  END IF;

  INSERT INTO gw_course_class_sessions
    (course_id, title, session_date, start_time, end_time, location, session_type,
     attendance_required, created_by)
  SELECT v_course_id, v_title || ' — Class', s.session_date, s.start_time, s.end_time,
         s.location, 'class', true, auth.uid()
  FROM public.expand_class_sessions(
    spec->'meeting_patterns', v_start, v_end, coalesce(spec->'breaks', '[]'::jsonb)) s;
  GET DIAGNOSTICS v_session_count = ROW_COUNT;
  IF v_session_count > 120 THEN RAISE EXCEPTION 'expanded to % sessions (max 120)', v_session_count; END IF;

  IF jsonb_typeof(spec->'repertoire') = 'array' AND jsonb_array_length(spec->'repertoire') > 0 THEN
    SELECT string_agg(
             CASE WHEN r->>'library_item_id' IS NOT NULL
                  THEN '• ' || (r->>'title') || ' [library:' || (r->>'library_item_id') || ']'
                  ELSE '• ' || (r->>'title') END, E'\n')
      INTO v_repertoire
      FROM jsonb_array_elements(spec->'repertoire') r;
    INSERT INTO gw_course_playlists
      (course_id, title, description, is_public, is_featured, display_order, created_by)
    VALUES
      (v_course_id, 'Repertoire',
       'Draft repertoire from the Assistant interview:' || E'\n' || v_repertoire,
       false, false, 0, auth.uid());
  END IF;

  RETURN jsonb_build_object(
    'course_id', v_course_id,
    'course_code', v_code,
    'title', v_title,
    'module_count', v_module_count,
    'assignment_count', v_assignment_count,
    'session_count', v_session_count
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.assistant_create_course(jsonb) TO authenticated;
```

- [ ] **Step 2: Write the migration test**

Create `supabase/migrations/tests/assistant_course_builder_test.sql`:

```sql
-- Run against a scratch DB with all migrations through
-- 20260713220000_assistant_course_builder.sql applied. Never prod.
BEGIN;

-- Columns + constraint
DO $$ BEGIN
  ASSERT (SELECT column_default FROM information_schema.columns
          WHERE table_name = 'gw_courses' AND column_name = 'status') LIKE '%published%',
    'gw_courses.status default must be published';
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'gw_courses' AND column_name = 'pending_enrollments'),
    'gw_courses.pending_enrollments missing';
  ASSERT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gw_courses_status_check'),
    'status check constraint missing';
END $$;

-- Draft-hiding SELECT policy predicate
DO $$ DECLARE q text; BEGIN
  SELECT qual INTO q FROM pg_policies
  WHERE tablename = 'gw_courses' AND policyname = 'Anyone can view active courses';
  ASSERT q ILIKE '%status%published%', 'select policy must gate on status';
  ASSERT q ILIKE '%instructor_id%', 'select policy must carve out the course owner';
END $$;

-- Normalized satellite policies accept both super_admin spellings
DO $$ DECLARE fn text; BEGIN
  SELECT prosrc INTO fn FROM pg_proc WHERE proname = 'is_course_editor';
  ASSERT fn ILIKE '%super_admin%' AND fn ILIKE '%super-admin%',
    'is_course_editor must accept both super_admin spellings';
END $$;

-- Functions exist
DO $$ BEGIN
  ASSERT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'expand_class_sessions'), 'expand fn missing';
  ASSERT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'assistant_create_course'), 'rpc missing';
  ASSERT (SELECT prosecdef FROM pg_proc WHERE proname = 'assistant_create_course') = false,
    'assistant_create_course must be SECURITY INVOKER';
END $$;

-- expand_class_sessions is deterministic and correct:
-- Mon/Wed 2026-08-24..2026-09-11 = M24 W26 M31 W2 M7 W9 = 6 sessions
DO $$ BEGIN
  ASSERT (SELECT count(*) FROM expand_class_sessions(
    '[{"weekday":1,"start_time":"10:00","end_time":"10:50"},
      {"weekday":3,"start_time":"10:00","end_time":"10:50"}]'::jsonb,
    '2026-08-24', '2026-09-11', '[]'::jsonb)) = 6, 'weekday expansion wrong';
  -- Break removes Mon 9/7 and Wed 9/9
  ASSERT (SELECT count(*) FROM expand_class_sessions(
    '[{"weekday":1,"start_time":"10:00","end_time":"10:50"},
      {"weekday":3,"start_time":"10:00","end_time":"10:50"}]'::jsonb,
    '2026-08-24', '2026-09-11', '[{"from":"2026-09-07","to":"2026-09-11"}]'::jsonb)) = 4,
    'break exclusion wrong';
  -- Empty patterns → zero sessions, no error
  ASSERT (SELECT count(*) FROM expand_class_sessions('[]'::jsonb, '2026-08-24', '2026-09-11')) = 0,
    'empty patterns should expand to zero';
END $$;

ROLLBACK;
```

- [ ] **Step 3: Run the migration + test on a scratch DB**

```bash
/opt/homebrew/opt/postgresql@16/bin/createdb course_builder_scratch 2>/dev/null || true
# Bootstrap the minimal preexisting schema the migration touches (gw_courses etc.
# predate the migrations dir). Apply the repo's scratch-bootstrap if one exists;
# otherwise create the referenced tables minimally, then:
/opt/homebrew/opt/postgresql@16/bin/psql -d course_builder_scratch -v ON_ERROR_STOP=1 \
  -f supabase/migrations/20260713220000_assistant_course_builder.sql
/opt/homebrew/opt/postgresql@16/bin/psql -d course_builder_scratch -v ON_ERROR_STOP=1 \
  -f supabase/migrations/tests/assistant_course_builder_test.sql
```

Bootstrap note: `gw_courses`, `gw_assignments`, `gw_profiles` predate the migrations dir, so apply this exact stand-in SQL to the scratch DB FIRST (save it as `supabase/migrations/tests/assistant_course_builder_bootstrap.sql` so the scratch run is reproducible; it is test scaffolding, not a migration — the `tests/` dir is not auto-applied):

```sql
CREATE TABLE IF NOT EXISTS gw_profiles (user_id uuid PRIMARY KEY, full_name text, email text,
  phone text, phone_number text, role text, is_admin boolean DEFAULT false, is_super_admin boolean DEFAULT false);
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid LANGUAGE sql AS $$ SELECT gen_random_uuid() $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT gen_random_uuid() $$;
CREATE TABLE IF NOT EXISTS gw_courses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code text, code text, title text, description text, semester text,
  instructor_id uuid, instructor_name text, is_active boolean DEFAULT true,
  is_template boolean DEFAULT false, is_free boolean DEFAULT true,
  created_by uuid, tenant_id uuid);
ALTER TABLE gw_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage courses" ON gw_courses FOR ALL USING (true);
CREATE TABLE IF NOT EXISTS gw_course_modules (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid, module_id text, title text, description text, week_number int,
  is_active boolean, is_locked boolean, display_order int, learning_objectives jsonb);
CREATE TABLE IF NOT EXISTS gw_assignments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid, title text, description text, instructions text, assignment_type text,
  category text, points int, due_at timestamptz, is_active boolean, created_by uuid, tenant_id uuid);
CREATE TABLE IF NOT EXISTS gw_course_rubrics (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid, title text, description text, is_default boolean, created_by uuid);
CREATE TABLE IF NOT EXISTS gw_rubric_criteria (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id uuid, criterion_name text, description text, max_points int,
  weight_percentage numeric, display_order int);
CREATE TABLE IF NOT EXISTS gw_course_class_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid, title text, session_date date, start_time time, end_time time,
  location text, session_type text, attendance_required boolean, created_by uuid);
CREATE TABLE IF NOT EXISTS gw_course_playlists (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid, title text, description text, is_public boolean, is_featured boolean,
  display_order int, created_by uuid);
```

Then also smoke-test the RPC end-to-end on scratch:

```sql
DO $$ DECLARE r jsonb; BEGIN
  r := assistant_create_course('{
    "title":"Scratch Course","start_date":"2026-08-24","end_date":"2026-09-11",
    "meeting_patterns":[{"weekday":1,"start_time":"10:00","end_time":"10:50"}],
    "modules":[{"title":"Week 1","week_number":1,"assignments":[
      {"title":"Hello","points":10,"due_at":"2026-08-31T23:59:00-04:00"}]}],
    "rubric":{"title":"R","criteria":[{"name":"C","max_points":10,"weight_percentage":100}]},
    "repertoire":[{"title":"Lift Every Voice and Sing"}]
  }'::jsonb);
  ASSERT (r->>'module_count')::int = 1, 'module count';
  ASSERT (r->>'assignment_count')::int = 1, 'assignment count';
  ASSERT (r->>'session_count')::int = 3, 'session count (Mon 8/24, 8/31, 9/7)';
  ASSERT (SELECT status FROM gw_courses WHERE id = (r->>'course_id')::uuid) = 'draft', 'status draft';
END $$;
```

Expected: all ASSERTs pass; `ON_ERROR_STOP` exits 0.

- [ ] **Step 4: Commit**

```bash
git branch --show-current   # must print: assistant-course-builder
git add supabase/migrations/20260713220000_assistant_course_builder.sql supabase/migrations/tests/assistant_course_builder_test.sql
git commit -m "feat(academy): draft status + assistant_create_course RPC with session expansion"
```

---

### Task 5: Client action — execute the confirmed RPC and navigate

**Files:**
- Modify: `src/lib/assistant/clientActions.ts` (ActionDeps + new switch case)
- Test: `src/lib/assistant/__tests__/clientActions.test.ts`

**Interfaces:**
- Consumes: RPC contract from Task 4 (`assistant_create_course`, arg `{ spec }`, returns `{course_id, course_code, title, module_count, assignment_count, session_count}`).
- Produces: `case 'create_course_draft'` returning `{ ok, navigateTo: '/academy/c/<code>', message }`. Requires `deps.supabase.rpc` — added to the `ActionDeps['supabase']` type and wired in `defaultDeps`.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/assistant/__tests__/clientActions.test.ts` (follow the file's existing mock-deps pattern — it builds a `deps` object per test; extend that helper with an `rpc` mock):

```ts
describe('create_course_draft', () => {
  const spec = { title: 'Choral Conducting I' };

  it('calls the RPC and navigates to the draft course page', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        course_id: 'c-1', course_code: 'MUS-240', title: 'Choral Conducting I',
        module_count: 4, assignment_count: 9, session_count: 28,
      },
      error: null,
    });
    const deps = makeDeps({ rpc });
    const r = await executeClientAction(
      { tool: 'create_course_draft', args: { spec }, confirm: true }, deps,
    );
    expect(rpc).toHaveBeenCalledWith('assistant_create_course', { spec });
    expect(r.ok).toBe(true);
    expect(r.navigateTo).toBe('/academy/c/mus-240');
    expect(r.message).toContain('4 modules');
    expect(r.message).toContain('9 assignments');
  });

  it('surfaces RPC errors', async () => {
    const deps = makeDeps({ rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }) });
    const r = await executeClientAction(
      { tool: 'create_course_draft', args: { spec }, confirm: true }, deps,
    );
    expect(r.ok).toBe(false);
    expect(r.message).toContain('boom');
  });

  it('treats a null RPC result as failure (silent-write guard)', async () => {
    const deps = makeDeps({ rpc: vi.fn().mockResolvedValue({ data: null, error: null }) });
    const r = await executeClientAction(
      { tool: 'create_course_draft', args: { spec }, confirm: true }, deps,
    );
    expect(r.ok).toBe(false);
  });

  it('rejects a missing spec without calling the RPC', async () => {
    const rpc = vi.fn();
    const deps = makeDeps({ rpc });
    const r = await executeClientAction(
      { tool: 'create_course_draft', args: {}, confirm: true }, deps,
    );
    expect(r.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
});
```

(If the existing test file has no `makeDeps` helper, add one that returns the same stub deps object the existing tests construct inline, spread with overrides.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/assistant/__tests__/clientActions.test.ts`
Expected: FAIL — unknown tool `create_course_draft` (or type error on `rpc`).

- [ ] **Step 3: Implement**

In `src/lib/assistant/clientActions.ts`:

1. Extend the `ActionDeps` supabase type (currently `{ from; functions }`):

```ts
  supabase: {
    from: (table: string) => any;
    functions: { invoke: (name: string, opts: { body: unknown }) => Promise<{ data: any; error: any }> };
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: any; error: any }>;
  };
```

`defaultDeps` already returns the real supabase client for `supabase`, which has `.rpc` — verify no explicit object literal strips it (if `defaultDeps` builds `{ from, functions }` manually, add `rpc: supabase.rpc.bind(supabase)`).

2. Add the switch case (alongside `send_sms`/`send_email`):

```ts
      case 'create_course_draft': {
        const spec = a.spec;
        if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
          return { ok: false, message: 'Missing the course spec.' };
        }
        const { data, error } = await deps.supabase.rpc('assistant_create_course', { spec });
        if (error) return { ok: false, message: `Couldn't create the course: ${error.message ?? 'unknown error'}` };
        // Silent-write guard: the RPC returns a summary object; anything else means no rows landed.
        if (!data?.course_id) {
          return { ok: false, message: "Couldn't create the course (no confirmation returned — check permissions)." };
        }
        const code = String(data.course_code ?? '').toLowerCase();
        return {
          ok: true,
          navigateTo: code ? `/academy/c/${code}` : undefined,
          message: `Draft "${String(data.title ?? '')}" created — ${data.module_count} modules, ${data.assignment_count} assignments, ${data.session_count} class sessions. Review it and publish when ready.`,
        };
      }
```

(`a` is the `args` record in this file's existing destructuring — match the local variable name used by the neighboring cases.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/assistant/__tests__/`
Expected: PASS, including pre-existing clientActions/confirmQueue tests.

- [ ] **Step 5: Commit**

```bash
git branch --show-current   # must print: assistant-course-builder
git add src/lib/assistant/clientActions.ts src/lib/assistant/__tests__/clientActions.test.ts
git commit -m "feat(assistant): execute confirmed create_course_draft via assistant_create_course RPC"
```

---

### Task 6: Confirm card for course drafts + CourseShell draft banner/Publish

**Files:**
- Modify: `src/components/assistant/AssistantThread.tsx:34-67` (confirm card)
- Create: `src/lib/academy/publishCourse.ts`
- Test: `src/lib/academy/__tests__/publishCourse.test.ts`
- Modify: `src/pages/academy/CourseShell.tsx` (~line 145 select; header ~lines 196-220)
- Modify: `src/components/grading/admin/CourseManagementTable.tsx` (Draft chip)

**Interfaces:**
- Consumes: `AssistantAction` (`{ tool, args, confirm }`), CourseShell's `course` object and `canEdit` flag; `gw_courses.status`/`pending_enrollments` from Task 4.
- Produces: `publishCourse(supabase, course: { id: string; pending_enrollments: Array<{user_id?: string; name: string}> | null }): Promise<{ ok: boolean; unresolvedNames: string[]; message: string }>` — publishes the course and applies resolved enrollments.

- [ ] **Step 1: Write the failing test for publishCourse**

Create `src/lib/academy/__tests__/publishCourse.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { publishCourse } from '../publishCourse';

function makeSupabase(overrides: { updateData?: unknown; upsertError?: unknown } = {}) {
  const upsert = vi.fn().mockReturnValue({
    select: vi.fn().mockResolvedValue({ data: [{}], error: overrides.upsertError ?? null }),
  });
  const update = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: overrides.updateData === undefined ? [{ id: 'c-1', status: 'published' }] : overrides.updateData,
        error: null,
      }),
    }),
  });
  const from = vi.fn().mockImplementation(() => ({ update, upsert }));
  return { client: { from } as any, update, upsert };
}

describe('publishCourse', () => {
  it('flips status, enrolls resolved users, reports unresolved names', async () => {
    const { client, update, upsert } = makeSupabase();
    const r = await publishCourse(client, {
      id: 'c-1',
      pending_enrollments: [{ user_id: 'u-1', name: 'Ada' }, { name: 'Grace (no account yet)' }],
    });
    expect(r.ok).toBe(true);
    expect(update).toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledWith(
      [{ course_id: 'c-1', user_id: 'u-1', role: 'student', enrollment_status: 'enrolled' }],
      { onConflict: 'course_id,user_id', ignoreDuplicates: true },
    );
    expect(r.unresolvedNames).toEqual(['Grace (no account yet)']);
  });

  it('fails when the status update returns zero rows (silent-write guard)', async () => {
    const { client } = makeSupabase({ updateData: [] });
    const r = await publishCourse(client, { id: 'c-1', pending_enrollments: null });
    expect(r.ok).toBe(false);
  });

  it('publishes cleanly with no pending enrollments', async () => {
    const { client, upsert } = makeSupabase();
    const r = await publishCourse(client, { id: 'c-1', pending_enrollments: null });
    expect(r.ok).toBe(true);
    expect(upsert).not.toHaveBeenCalled();
    expect(r.unresolvedNames).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/academy/__tests__/publishCourse.test.ts`
Expected: FAIL — cannot resolve `../publishCourse`.

- [ ] **Step 3: Implement publishCourse**

Create `src/lib/academy/publishCourse.ts`:

```ts
// Publish a draft course: flip status, enroll the resolved pending roster,
// and hand unresolved names back to the UI. Enrollment happens at publish,
// never at draft (Assistant Course Builder spec).

interface PendingEnrollment { user_id?: string; name: string }

interface PublishableCourse {
  id: string;
  pending_enrollments: PendingEnrollment[] | null;
}

interface SupabaseLike { from: (table: string) => any }

export interface PublishResult {
  ok: boolean;
  unresolvedNames: string[];
  message: string;
}

export async function publishCourse(supabase: SupabaseLike, course: PublishableCourse): Promise<PublishResult> {
  const pending = Array.isArray(course.pending_enrollments) ? course.pending_enrollments : [];
  const resolved = pending.filter((p): p is Required<PendingEnrollment> => typeof p.user_id === 'string' && p.user_id.length > 0);
  const unresolvedNames = pending.filter((p) => !p.user_id).map((p) => p.name);

  const { data: updated, error: updateErr } = await supabase
    .from('gw_courses')
    .update({ status: 'published', pending_enrollments: unresolvedNames.length ? pending.filter((p) => !p.user_id) : null })
    .eq('id', course.id)
    .select();
  if (updateErr || !updated?.length) {
    return { ok: false, unresolvedNames, message: `Couldn't publish${updateErr ? `: ${updateErr.message}` : ' (no row updated — check permissions)'}.` };
  }

  if (resolved.length) {
    const rows = resolved.map((p) => ({
      course_id: course.id, user_id: p.user_id, role: 'student', enrollment_status: 'enrolled',
    }));
    const { error: enrollErr } = await supabase
      .from('gw_course_enrollments')
      .upsert(rows, { onConflict: 'course_id,user_id', ignoreDuplicates: true })
      .select();
    if (enrollErr) {
      return {
        ok: true, unresolvedNames,
        message: `Published, but enrolling students failed: ${enrollErr.message}. Add them from the People tab.`,
      };
    }
  }

  return {
    ok: true,
    unresolvedNames,
    message: unresolvedNames.length
      ? `Published. ${resolved.length} student${resolved.length === 1 ? '' : 's'} enrolled. Still to add manually: ${unresolvedNames.join(', ')}.`
      : `Published${resolved.length ? ` — ${resolved.length} student${resolved.length === 1 ? '' : 's'} enrolled` : ''}.`,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/academy/__tests__/publishCourse.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the UI (three small edits, verified by build + manual QA)**

**(a) AssistantThread confirm card** — in `src/components/assistant/AssistantThread.tsx`, replace the card body (lines 36-47, the two `<p>` blocks before the buttons) with a tool-aware version, and make the primary button label tool-aware:

```tsx
                {m.pendingAction.tool === 'create_course_draft' ? (
                  <>
                    <p className="text-xs text-muted-foreground">Create draft course:</p>
                    <p className="text-xs font-medium">
                      “{String((m.pendingAction.args.spec as Record<string, unknown> | undefined)?.title ?? 'Untitled')}” —{' '}
                      {(((m.pendingAction.args.spec as Record<string, unknown> | undefined)?.modules as unknown[]) ?? []).length} modules.
                      Students can’t see drafts.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {m.pendingAction.tool === 'send_sms' ? 'Text' : 'Email'} to{' '}
                      {(m.pendingAction.args.recipient_names as string[] | undefined)?.join(', ') ?? 'recipients'}:
                    </p>
                    {m.pendingAction.tool === 'send_email' && m.pendingAction.args.subject != null && (
                      <p className="text-xs text-muted-foreground">Subject: {String(m.pendingAction.args.subject)}</p>
                    )}
                    <p className="text-xs font-medium">
                      {String(m.pendingAction.args.message ?? m.pendingAction.args.body ?? '')}
                    </p>
                  </>
                )}
```

and change the primary button text (line 59) from `Send` to:

```tsx
                    {m.pendingAction.tool === 'create_course_draft' ? 'Create' : 'Send'}
```

**(b) CourseShell** — in `src/pages/academy/CourseShell.tsx`:
- Add `status, pending_enrollments` to the course `select` string (~line 145: `"id, course_code, title, description, instructor_id, instructor_name, semester"` → append `, status, pending_enrollments`). Do NOT touch the `.eq("is_active", true)` filter — drafts keep `is_active = true`; RLS handles student invisibility.
- In the header render block (just above the `<h1>` around line 209), add a draft banner gated on `canEdit`:

```tsx
        {course.status === 'draft' && canEdit && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-300/60 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-950/30">
            <p className="text-sm text-amber-900 dark:text-amber-200">
              Draft — review and publish. Students can’t see this course yet.
            </p>
            <Button
              size="sm"
              disabled={publishing}
              onClick={async () => {
                setPublishing(true);
                try {
                  const r = await publishCourse(supabase, {
                    id: course.id,
                    pending_enrollments: course.pending_enrollments ?? null,
                  });
                  toast(r.ok ? { title: r.message } : { title: r.message, variant: 'destructive' });
                  if (r.ok) await reloadCourse();
                } finally {
                  setPublishing(false);
                }
              }}
            >
              {publishing ? 'Publishing…' : 'Publish'}
            </Button>
          </div>
        )}
```

with `const [publishing, setPublishing] = useState(false);` beside the page's other state, `import { publishCourse } from '@/lib/academy/publishCourse';`, and `reloadCourse` = whatever refetch mechanism the page already uses for the course query (reuse its existing loader function; if the fetch is inline in a `useEffect`, extract it to a named `loadCourse` and call that). Use the page's existing `toast` import/pattern (check how neighboring mutations toast in this file and match exactly).

**(c) CourseManagementTable** — in `src/components/grading/admin/CourseManagementTable.tsx`: add `status` to its `gw_courses` select, and next to the title cell render:

```tsx
{course.status === 'draft' && <Badge variant="outline" className="ml-2">Draft</Badge>}
```

(using the file's existing `Badge` import, or add `import { Badge } from '@/components/ui/badge';`).

- [ ] **Step 6: Build + full test run**

```bash
npx vitest run
npm run build
```

Expected: all tests pass; build succeeds with no TS errors.

- [ ] **Step 7: Commit**

```bash
git branch --show-current   # must print: assistant-course-builder
git add src/components/assistant/AssistantThread.tsx src/lib/academy/publishCourse.ts src/lib/academy/__tests__/publishCourse.test.ts src/pages/academy/CourseShell.tsx src/components/grading/admin/CourseManagementTable.tsx
git commit -m "feat(academy): draft banner + publish flow, course confirm card, draft chip"
```

---

### Task 7: Verification, PR

- [ ] **Step 1: Full local verification**

```bash
git branch --show-current   # must print: assistant-course-builder
npx vitest run              # expect: all green
npm run build               # expect: clean build
```

- [ ] **Step 2: Push and open the PR**

```bash
git push -u origin assistant-course-builder
gh pr create --title "Assistant Course Builder: interview → draft course → publish" --body "$(cat <<'EOF'
## Summary
- New confirm-gated assistant tool `create_course_draft`: the Assistant interviews a teacher, then one RPC (`assistant_create_course`, SECURITY INVOKER) transactionally creates a draft course — modules, assignments (in `gw_assignments`, per the live CourseShell data model), rubric + criteria, class sessions expanded from the meeting schedule, playlist shell, pending roster.
- `gw_courses.status` (draft|published) + RLS predicate: students never see drafts; owner/admins do.
- CourseShell: draft banner + Publish (flips status, applies pending enrollments, reports unresolved names). Draft chip in course management.
- Spec validation server-side in the edge fn BEFORE the confirm card; structured errors loop back to the model.
- Normalized course-satellite write policies behind `is_course_editor()` (accepts both super_admin spellings).

Spec: docs/superpowers/specs/2026-07-13-assistant-course-builder-design.md
Plan: docs/superpowers/plans/2026-07-13-assistant-course-builder.md

## Test plan
- [x] vitest: courseSpec validator, tool catalog gating, prompt sections, clientActions RPC path, publishCourse
- [x] SQL migration test on scratch DB (session expansion, policies, RPC smoke)
- [ ] Post-deploy: droplet integration (real JWT, scratch tenant), full interview → draft → edit → publish on demo tenant (writes there fail silently — the `.select()` checks prove it)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## Post-merge deploy checklist (NOT part of plan execution — done with Kevin)

1. Migration on the droplet: apply `20260713220000_assistant_course_builder.sql` via psql **as postgres superuser** against the self-hosted Supabase DB.
2. Edge fn: copy `supabase/functions/assistant-chat/` to `/opt/supabase/volumes/functions/assistant-chat/` (md5-verify each file after scp), restart the functions container. Relative imports already carry `.ts`.
3. Web: build locally, rsync `dist/` — **never `--delete`**.
4. Integration test: assistant-chat with a real admin JWT on a scratch/demo tenant; confirm card → RPC → draft page loads at `/academy/c/<code>`; verify a student account cannot see the draft; publish; verify enrollment rows exist (`.select()`).
5. No CSP change needed (no new external hosts).
