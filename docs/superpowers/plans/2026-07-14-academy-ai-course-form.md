# Academy AI Course Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "Create with AI" form in Glee Academy that turns course basics into a complete AI-authored draft course via the deployed `assistant_create_course` RPC, landing the teacher on the draft course page.

**Architecture:** A new edge function `generate-course-draft` authenticates an admin/director, prompts the model to author a full CourseSpec from the form's basics, validates it with the shared `courseSpec` validator (moved to `_shared`), and calls `assistant_create_course` under the caller's JWT (RLS applies). A React form (`AiCourseForm`) collects the inputs and navigates to `/academy/c/<code>` on success. No new tables.

**Tech Stack:** Deno/TS Supabase edge functions, DeepSeek (OpenAI-format) via `response_format: json_object`, plpgsql RPC (already deployed), React + shadcn, vitest.

## Global Constraints

- Reuse the DEPLOYED `assistant_create_course(spec jsonb)` RPC and the `courseSpec.ts` validator — do NOT reimplement course creation or validation.
- Tenant-neutral copy: never "Spelman"; students are "students" (never "singers"/"members").
- Light theme: white cards / dark text; use tokens; never set `color` on bare h1–h6.
- Every Supabase write must be `.select()`-checked (demo-tenant writes fail silently).
- Deno relative imports need the `.ts` extension.
- Admin/director gating server-side via `_shared/auth.ts` `authenticateCaller` → `caller.isAdmin` (ADMIN_ROLES = admin, super-admin, executive, plus is_admin/is_super_admin flags).
- Edge fn deploy path: `/opt/supabase/volumes/functions/`; DB container `supabase-db`; functions container `supabase-edge-functions`; restart `cd /opt/supabase && docker compose up -d --force-recreate functions`.
- vite build is the typecheck gate (`tsc --noEmit` is a NO-OP); `git add -A` FORBIDDEN (stage explicit paths); vitest, tests beside source.
- Shared checkout: `git branch --show-current` must be `academy-ai-course-form` before every commit.

---

### Task 1: Move `courseSpec.ts` to `_shared` (DRY — shared by both edge functions)

**Files:**
- Create: `supabase/functions/_shared/courseSpec.ts` (moved content, unchanged)
- Delete: `supabase/functions/assistant-chat/courseSpec.ts`
- Modify: `supabase/functions/assistant-chat/index.ts` (import path)
- Move: `supabase/functions/assistant-chat/__tests__/courseSpec.test.ts` → `supabase/functions/_shared/__tests__/courseSpec.test.ts` (import path)

**Interfaces:**
- Produces: `_shared/courseSpec.ts` exporting `validateCourseSpec(raw: unknown): { ok: true; spec: CourseSpec; sessionCount: number } | { ok: false; error: string }`, `countSessions`, and the `CourseSpec` types — identical to today. Task 2 imports from `../_shared/courseSpec.ts`.

- [ ] **Step 1: Move the file unchanged**

```bash
git mv supabase/functions/assistant-chat/courseSpec.ts supabase/functions/_shared/courseSpec.ts
mkdir -p supabase/functions/_shared/__tests__
git mv supabase/functions/assistant-chat/__tests__/courseSpec.test.ts supabase/functions/_shared/__tests__/courseSpec.test.ts
```

- [ ] **Step 2: Verify the test's import still resolves**

The test moved alongside the file, so its `import { validateCourseSpec, type CourseSpec } from '../courseSpec';` still points at the moved validator (`_shared/__tests__/` → `../courseSpec` = `_shared/courseSpec.ts`). No edit needed — just confirm that line is present and unchanged.

- [ ] **Step 3: Update the assistant-chat import**

In `supabase/functions/assistant-chat/index.ts`, change:
```ts
import { validateCourseSpec } from './courseSpec.ts';
```
to:
```ts
import { validateCourseSpec } from '../_shared/courseSpec.ts';
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run supabase/functions/_shared/__tests__/courseSpec.test.ts supabase/functions/assistant-chat/`
Expected: PASS (validator tests + assistant-chat suite green, unchanged behavior).

- [ ] **Step 5: Commit**

```bash
git branch --show-current   # academy-ai-course-form
git add supabase/functions/_shared/courseSpec.ts supabase/functions/_shared/__tests__/courseSpec.test.ts supabase/functions/assistant-chat/index.ts
git commit -m "refactor(assistant): move courseSpec validator to _shared for reuse"
```

---

### Task 2: `generate-course-draft` edge function — prompt builder

**Files:**
- Create: `supabase/functions/generate-course-draft/prompt.ts`
- Test: `supabase/functions/generate-course-draft/__tests__/prompt.test.ts`

**Interfaces:**
- Produces: `interface CourseFormInput { title: string; subject?: string; level?: string; term_start: string; term_end: string; meeting_patterns: Array<{ weekday: number; start_time: string; end_time: string; location?: string }>; learning_goals?: string; grading_approach?: string; repertoire?: Array<{ library_item_id?: string; title: string }>; roster?: Array<{ user_id?: string; name: string }>; }` and `buildGenerationMessages(input: CourseFormInput, nowIso: string): Array<{ role: 'system'|'user'; content: string }>`. Task 3 calls `buildGenerationMessages`.

- [ ] **Step 1: Write the failing test**

Create `supabase/functions/generate-course-draft/__tests__/prompt.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildGenerationMessages, type CourseFormInput } from '../prompt';

const input: CourseFormInput = {
  title: 'Choral Conducting I',
  subject: 'Choral conducting', level: 'Undergraduate',
  term_start: '2026-08-24', term_end: '2026-12-11',
  meeting_patterns: [{ weekday: 1, start_time: '10:00', end_time: '10:50' }],
  learning_goals: 'Beat patterns; cueing; score study.',
  grading_approach: 'Weekly reflections 20%, two performances 60%, final 20%.',
  repertoire: [{ title: 'Lift Every Voice and Sing' }],
  roster: [{ name: 'Ada Lovelace' }],
};

describe('buildGenerationMessages', () => {
  it('produces a system + user message carrying the form inputs and the JSON contract', () => {
    const msgs = buildGenerationMessages(input, '2026-07-14T12:00:00Z');
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe('system');
    expect(msgs[1].role).toBe('user');
    const all = msgs.map((m) => m.content).join('\n');
    expect(all).toContain('CourseSpec');            // names the target schema
    expect(all).toContain('Choral Conducting I');   // title threaded in
    expect(all).toContain('2026-08-24');            // dates threaded in
    expect(all).toContain('reflections');           // grading approach threaded in
    expect(all.toLowerCase()).toContain('json');    // instructs JSON-only
    // meeting patterns serialized for the model
    expect(all).toContain('"weekday"');
  });

  it('tolerates missing optional fields', () => {
    const msgs = buildGenerationMessages(
      { title: 'X', term_start: '2026-08-24', term_end: '2026-09-24', meeting_patterns: [] },
      '2026-07-14T12:00:00Z',
    );
    expect(msgs[1].content).toContain('X');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/functions/generate-course-draft/__tests__/prompt.test.ts`
Expected: FAIL — cannot resolve `../prompt`.

- [ ] **Step 3: Implement**

Create `supabase/functions/generate-course-draft/prompt.ts`:

```ts
// Pure TS — builds the generation prompt from the form inputs. Imported by the
// edge function and by Vitest; no Deno/browser APIs.

export interface CourseFormInput {
  title: string;
  subject?: string;
  level?: string;
  term_start: string; // YYYY-MM-DD
  term_end: string;   // YYYY-MM-DD
  meeting_patterns: Array<{ weekday: number; start_time: string; end_time: string; location?: string }>;
  learning_goals?: string;
  grading_approach?: string;
  repertoire?: Array<{ library_item_id?: string; title: string }>;
  roster?: Array<{ user_id?: string; name: string }>;
}

export function buildGenerationMessages(
  input: CourseFormInput,
  nowIso: string,
): Array<{ role: 'system' | 'user'; content: string }> {
  const system = [
    'You are an expert music-education instructional designer for the GleeWorld Academy.',
    'Produce a COMPLETE course as ONE JSON object matching this CourseSpec shape (no prose, no markdown fences):',
    '{',
    '  "title": string, "course_code": string (suggest e.g. MUS-240), "description": string, "semester": string,',
    '  "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD",',
    '  "meeting_patterns": [{ "weekday": 0-6 (0=Sunday), "start_time": "HH:MM", "end_time": "HH:MM", "location"?: string }],',
    '  "modules": [{ "title": string, "description": string (2-5 sentences), "week_number": number,',
    '     "learning_objectives": [string],',
    '     "assignments": [{ "title": string, "instructions": string (a full authored prompt the student reads),',
    '        "points": number, "due_at": "ISO datetime with timezone", "assignment_type"?: string }] }],',
    '  "rubric": { "title": string, "criteria": [{ "name": string, "max_points": number, "weight_percentage": number }] },',
    '  "repertoire"?: [{ "library_item_id"?: string, "title": string }],',
    '  "roster"?: [{ "user_id"?: string, "name": string }]',
    '}',
    'Rules: author real module descriptions and real assignment prompts (never stubs). Derive rubric criteria/weights from the grading approach. Copy meeting_patterns straight from the input. Pass repertoire and roster through unchanged. Keep each text field under 2000 characters and at most 16 modules, 8 assignments per module. Do NOT invent quiz questions.',
    `Now: ${nowIso}.`,
  ].join('\n');

  const user = [
    'Create a course from these inputs:',
    `- Title: ${input.title}`,
    input.subject ? `- Subject: ${input.subject}` : '',
    input.level ? `- Level: ${input.level}` : '',
    `- Term: ${input.term_start} to ${input.term_end}`,
    `- Meeting patterns (JSON): ${JSON.stringify(input.meeting_patterns)}`,
    input.learning_goals ? `- Learning goals: ${input.learning_goals}` : '',
    input.grading_approach ? `- Grading approach: ${input.grading_approach}` : '',
    input.repertoire?.length ? `- Repertoire (JSON): ${JSON.stringify(input.repertoire)}` : '',
    input.roster?.length ? `- Roster (JSON): ${JSON.stringify(input.roster)}` : '',
    'Return ONLY the CourseSpec JSON object.',
  ].filter(Boolean).join('\n');

  return [{ role: 'system', content: system }, { role: 'user', content: user }];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/functions/generate-course-draft/__tests__/prompt.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git branch --show-current
git add supabase/functions/generate-course-draft/prompt.ts supabase/functions/generate-course-draft/__tests__/prompt.test.ts
git commit -m "feat(academy): generate-course-draft prompt builder"
```

---

### Task 3: `generate-course-draft` edge function — handler

**Files:**
- Create: `supabase/functions/generate-course-draft/index.ts`
- (No unit test harness for index.ts — the model call + RPC are exercised in the Task 6 droplet integration test. The pure prompt builder and shared validator are already unit-tested.)

**Interfaces:**
- Consumes: `buildGenerationMessages`, `CourseFormInput` (Task 2); `validateCourseSpec` from `../_shared/courseSpec.ts` (Task 1); `authenticateCaller` from `../_shared/auth.ts`; the deployed `assistant_create_course(spec jsonb)` RPC.
- Produces: `POST` handler returning `{ course_id, course_code, title, module_count, assignment_count, session_count }` on 200, `{ error }` on 4xx/5xx.

- [ ] **Step 1: Implement (thin orchestration over already-tested parts)**

Create `supabase/functions/generate-course-draft/index.ts`:

```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateCaller } from '../_shared/auth.ts';
import { validateCourseSpec } from '../_shared/courseSpec.ts';
import { buildGenerationMessages, type CourseFormInput } from './prompt.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// One model call → JSON content. No tools; DeepSeek json_object mode.
async function generateSpec(messages: Array<{ role: string; content: string }>, apiKey: string, apiUrl: string, model: string): Promise<unknown> {
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 4000, response_format: { type: 'json_object' } }),
  });
  if (!res.ok) throw new Error(`Model API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('Model returned no content');
  return JSON.parse(content);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const caller = await authenticateCaller(req);
  if (!caller || (!caller.internal && !caller.userId)) return json({ error: 'Unauthorized' }, 401);
  if (!caller.internal && !caller.isAdmin) return json({ error: 'Only a director or admin can create courses.' }, 403);

  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  const apiUrl = Deno.env.get('ASSISTANT_API_URL') ?? 'https://api.deepseek.com/chat/completions';
  const model = Deno.env.get('ASSISTANT_MODEL') ?? 'deepseek-chat';
  if (!apiKey) return json({ error: 'Course generation is not configured' }, 500);

  let input: CourseFormInput;
  try { input = (await req.json()) as CourseFormInput; } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!input?.title || !input.term_start || !input.term_end || !Array.isArray(input.meeting_patterns)) {
    return json({ error: 'title, term_start, term_end, and meeting_patterns are required.' }, 400);
  }

  // Generate → validate, with one corrective retry on invalid spec.
  let spec: unknown;
  let lastErr = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const messages = buildGenerationMessages(input, new Date().toISOString());
    if (attempt === 1 && lastErr) messages.push({ role: 'user', content: `The previous JSON was invalid: ${lastErr}. Return a corrected CourseSpec JSON.` });
    let candidate: unknown;
    try { candidate = await generateSpec(messages, apiKey, apiUrl, model); }
    catch (e) { return json({ error: `Generation failed: ${e instanceof Error ? e.message : 'model error'}` }, 502); }
    const v = validateCourseSpec(candidate);
    if (v.ok) { spec = v.spec; break; }
    lastErr = v.error;
  }
  if (!spec) return json({ error: `Couldn't generate a valid course from those inputs — try simplifying the goals or shortening the term. (${lastErr})` }, 422);

  // Create the draft under the caller's JWT so RLS applies (same trust model as the client path).
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
  );
  const { data, error } = await userClient.rpc('assistant_create_course', { spec });
  if (error) return json({ error: `Couldn't create the course: ${error.message}` }, 500);
  if (!data?.course_id) return json({ error: "Couldn't create the course (no confirmation returned — check permissions)." }, 500);
  return json(data);
});
```

- [ ] **Step 2: Type + suite check**

Run: `npx vitest run supabase/functions/`
Expected: PASS (no new unit tests here; nothing else broke).

- [ ] **Step 3: Commit**

```bash
git branch --show-current
git add supabase/functions/generate-course-draft/index.ts
git commit -m "feat(academy): generate-course-draft handler (generate → validate → RPC)"
```

---

### Task 4: `AiCourseForm` component + submit lib

**Files:**
- Create: `src/lib/academy/generateCourse.ts`
- Create: `src/components/academy/AiCourseForm.tsx`
- Test: `src/lib/academy/__tests__/generateCourse.test.ts`

**Interfaces:**
- Consumes: the `generate-course-draft` edge fn (Task 3).
- Produces: `generateCourse(supabase, input): Promise<{ ok: true; courseCode: string; message: string } | { ok: false; message: string }>` and the `AiCourseForm` React component. Task 5 renders `AiCourseForm`.

- [ ] **Step 1: Write the failing test for the lib**

Create `src/lib/academy/__tests__/generateCourse.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { generateCourse } from '../generateCourse';

const input = {
  title: 'Choral Conducting I', term_start: '2026-08-24', term_end: '2026-12-11',
  meeting_patterns: [{ weekday: 1, start_time: '10:00', end_time: '10:50' }],
};

function sb(resp: { data?: unknown; error?: unknown }) {
  return { functions: { invoke: vi.fn().mockResolvedValue(resp) } } as any;
}

describe('generateCourse', () => {
  it('invokes the edge fn and returns the course code on success', async () => {
    const supabase = sb({ data: { course_id: 'c1', course_code: 'MUS-240', module_count: 4, assignment_count: 9, session_count: 28 }, error: null });
    const r = await generateCourse(supabase, input);
    expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-course-draft', { body: input });
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.courseCode).toBe('MUS-240'); expect(r.message).toContain('4 modules'); }
  });

  it('surfaces edge fn errors', async () => {
    const r = await generateCourse(sb({ data: null, error: { message: 'boom' } }), input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('boom');
  });

  it('surfaces a returned {error} body (edge fn non-2xx)', async () => {
    const r = await generateCourse(sb({ data: { error: 'Only a director or admin can create courses.' }, error: null }), input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('director or admin');
  });

  it('treats a missing course_code as failure', async () => {
    const r = await generateCourse(sb({ data: {}, error: null }), input);
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/academy/__tests__/generateCourse.test.ts`
Expected: FAIL — cannot resolve `../generateCourse`.

- [ ] **Step 3: Implement the lib**

Create `src/lib/academy/generateCourse.ts`:

```ts
export interface CourseFormInput {
  title: string;
  subject?: string;
  level?: string;
  term_start: string;
  term_end: string;
  meeting_patterns: Array<{ weekday: number; start_time: string; end_time: string; location?: string }>;
  learning_goals?: string;
  grading_approach?: string;
  repertoire?: Array<{ library_item_id?: string; title: string }>;
  roster?: Array<{ user_id?: string; name: string }>;
}

interface SupabaseLike {
  functions: { invoke: (name: string, opts: { body: unknown }) => Promise<{ data: any; error: any }> };
}

export type GenerateResult =
  | { ok: true; courseCode: string; message: string }
  | { ok: false; message: string };

export async function generateCourse(supabase: SupabaseLike, input: CourseFormInput): Promise<GenerateResult> {
  const { data, error } = await supabase.functions.invoke('generate-course-draft', { body: input });
  if (error) return { ok: false, message: `Couldn't generate the course: ${error.message ?? 'unknown error'}` };
  // Edge fn returns {error} in the body for handled 4xx (invoke surfaces those as data).
  if (data?.error) return { ok: false, message: String(data.error) };
  if (!data?.course_code) return { ok: false, message: "Couldn't generate the course (no confirmation returned)." };
  return {
    ok: true,
    courseCode: String(data.course_code),
    message: `Draft "${String(data.title ?? '')}" created — ${data.module_count} modules, ${data.assignment_count} assignments, ${data.session_count} class sessions.`,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/academy/__tests__/generateCourse.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement the form component**

Create `src/components/academy/AiCourseForm.tsx` (follow existing shadcn form idiom in `src/pages/academy/NewCoursePage.tsx` — `Input`, `Textarea`, `Button`, `Label`, `Select`, `useToast`/`sonner` per that file; check which toast NewCoursePage uses and match):

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { generateCourse, type CourseFormInput } from '@/lib/academy/generateCourse';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AiCourseForm() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    title: '', subject: '', level: '', term_start: '', term_end: '',
    days: [] as number[], start_time: '10:00', end_time: '10:50', location: '',
    learning_goals: '', grading_approach: '',
  });
  const set = (k: string, v: unknown) => setF((s) => ({ ...s, [k]: v }));
  const toggleDay = (d: number) => setF((s) => ({ ...s, days: s.days.includes(d) ? s.days.filter((x) => x !== d) : [...s.days, d] }));

  const canSubmit = f.title.trim() && f.term_start && f.term_end && f.term_end > f.term_start && f.days.length > 0;

  async function onSubmit() {
    setError(null);
    if (!canSubmit) { setError('Add a title, valid term dates (end after start), and at least one meeting day.'); return; }
    const input: CourseFormInput = {
      title: f.title.trim(), subject: f.subject.trim() || undefined, level: f.level.trim() || undefined,
      term_start: f.term_start, term_end: f.term_end,
      meeting_patterns: f.days.map((weekday) => ({ weekday, start_time: f.start_time, end_time: f.end_time, location: f.location.trim() || undefined })),
      learning_goals: f.learning_goals.trim() || undefined,
      grading_approach: f.grading_approach.trim() || undefined,
    };
    setBusy(true);
    try {
      const r = await generateCourse(supabase, input);
      if (r.ok) navigate(`/academy/c/${r.courseCode.toLowerCase()}`);
      else setError(r.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Label>Course title</Label>
        <Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Choral Conducting I" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Subject</Label><Input value={f.subject} onChange={(e) => set('subject', e.target.value)} placeholder="Choral conducting" /></div>
        <div><Label>Level</Label><Input value={f.level} onChange={(e) => set('level', e.target.value)} placeholder="Undergraduate" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Term start</Label><Input type="date" value={f.term_start} onChange={(e) => set('term_start', e.target.value)} /></div>
        <div><Label>Term end</Label><Input type="date" value={f.term_end} onChange={(e) => set('term_end', e.target.value)} /></div>
      </div>
      <div>
        <Label>Meeting days</Label>
        <div className="flex gap-1 flex-wrap">
          {WEEKDAYS.map((w, d) => (
            <Button key={d} type="button" size="sm" variant={f.days.includes(d) ? 'default' : 'outline'}
              className="h-8 text-xs" onClick={() => toggleDay(d)}>{w}</Button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><Label>Start</Label><Input type="time" value={f.start_time} onChange={(e) => set('start_time', e.target.value)} /></div>
        <div><Label>End</Label><Input type="time" value={f.end_time} onChange={(e) => set('end_time', e.target.value)} /></div>
        <div><Label>Room</Label><Input value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="optional" /></div>
      </div>
      <div>
        <Label>Learning goals</Label>
        <Textarea value={f.learning_goals} onChange={(e) => set('learning_goals', e.target.value)}
          placeholder="What students should be able to do by the end." rows={3} />
      </div>
      <div>
        <Label>Grading approach</Label>
        <Textarea value={f.grading_approach} onChange={(e) => set('grading_approach', e.target.value)}
          placeholder="e.g. Weekly reflections 20%, two performances 60%, final 20%." rows={2} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button disabled={busy || !canSubmit} onClick={onSubmit}>
        {busy ? 'Generating your course…' : 'Generate course'}
      </Button>
      <p className="text-xs text-muted-foreground">
        The AI drafts modules, assignments, and a rubric from these basics. You'll review and publish it on the next screen.
      </p>
    </div>
  );
}
```

- [ ] **Step 6: Run tests + build**

Run: `npx vitest run src/lib/academy/ && npx vite build`
Expected: tests PASS; build clean (confirms the component typechecks).

- [ ] **Step 7: Commit**

```bash
git branch --show-current
git add src/lib/academy/generateCourse.ts src/lib/academy/__tests__/generateCourse.test.ts src/components/academy/AiCourseForm.tsx
git commit -m "feat(academy): AiCourseForm + generateCourse client lib"
```

---

### Task 5: Wire "Create with AI" into NewCoursePage

**Files:**
- Modify: `src/pages/academy/NewCoursePage.tsx`

**Interfaces:**
- Consumes: `AiCourseForm` (Task 4).
- Produces: a mode toggle on `/academy/new` — default shows the AI form; a "create an empty course instead" link reveals the existing manual form (unchanged).

- [ ] **Step 1: Read NewCoursePage and add the toggle**

Open `src/pages/academy/NewCoursePage.tsx`. Keep the existing manual form fully intact. At the top of the page body, add a mode toggle driven by the URL search param `mode` (default `ai`), rendering `AiCourseForm` for `ai` and the existing manual form for `manual`. Add near the imports:

```tsx
import { useSearchParams } from 'react-router-dom';
import { AiCourseForm } from '@/components/academy/AiCourseForm';
```

Inside the component, near the top of the returned JSX (above the existing manual form), branch on the mode:

```tsx
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'manual' ? 'manual' : 'ai';
```

and render:

```tsx
      <div className="mb-4 flex items-center gap-3 text-sm">
        <span className="font-medium">New course</span>
        <button type="button" className={mode === 'ai' ? 'underline font-medium' : 'text-muted-foreground'}
          onClick={() => setSearchParams({ mode: 'ai' })}>Create with AI</button>
        <span className="text-muted-foreground">·</span>
        <button type="button" className={mode === 'manual' ? 'underline font-medium' : 'text-muted-foreground'}
          onClick={() => setSearchParams({ mode: 'manual' })}>Empty course</button>
      </div>
      {mode === 'ai' ? <AiCourseForm /> : (
        /* existing manual form JSX stays here, unchanged */
        <>{/* ...existing form... */}</>
      )}
```

Wrap the pre-existing manual form JSX in the `mode === 'manual'` branch. Do not change the manual form's fields or submit logic — only gate its rendering behind the toggle. Match the page's existing container/heading markup.

- [ ] **Step 2: Build**

Run: `npx vite build`
Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git branch --show-current
git add src/pages/academy/NewCoursePage.tsx
git commit -m "feat(academy): New Course page defaults to Create-with-AI, keeps empty-course fallback"
```

---

### Task 6: Verify, deploy notes, PR

- [ ] **Step 1: Full local verification**

```bash
git branch --show-current
npx vitest run src/lib/academy/ src/components/ supabase/functions/
npx vite build
```
Expected: feature suites green; build clean.

- [ ] **Step 2: Push + PR**

```bash
git push -u origin academy-ai-course-form
gh pr create --title "Glee Academy: Create-with-AI course form" --body "$(cat <<'EOF'
## Summary
Form-based course creation in Glee Academy (Phase 1 of the Academy structure roadmap). Fill in title, subject/level, term dates, meeting days, learning goals, and grading approach → Generate → a new `generate-course-draft` edge function authors a full CourseSpec with the model, validates it with the shared `courseSpec` validator, and calls the deployed `assistant_create_course` RPC → land on the draft course page to review and publish. No conversational interview; no new tables.

Spec: docs/superpowers/specs/2026-07-14-academy-ai-course-form-design.md
Plan: docs/superpowers/plans/2026-07-14-academy-ai-course-form.md

## Test plan
- [x] vitest: shared courseSpec validator (moved), generate-course-draft prompt builder, generateCourse client lib
- [x] vite build clean
- [ ] Post-deploy: deploy generate-course-draft edge fn (/opt/supabase/volumes/functions/ + force-recreate functions); real admin fills the form on demo tenant → draft course created → /academy/c/:code loads → publish

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## Post-merge deploy checklist (done with Kevin, like the last one)
1. Edge fns: rsync BOTH `supabase/functions/_shared/` (courseSpec moved here) AND `supabase/functions/generate-course-draft/` to `/opt/supabase/volumes/functions/`, then `cd /opt/supabase && docker compose up -d --force-recreate functions`; check `docker logs supabase-edge-functions --since 1m` boots clean. (assistant-chat also now imports `../_shared/courseSpec.ts` — its `_shared` is already mounted; the moved file must be present.)
2. Web: `npx vite build` locally → `rsync -az dist/ root@198.211.113.144:/var/www/gleeworld/html/` (NEVER `--delete`).
3. No migration (reuses the deployed RPC + schema).
4. Smoke: admin → `/academy/new` → Create with AI → fill → Generate → draft loads → publish.
