# GleeWorld Assistant Phase 1 (Web) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the web version of the GleeWorld Assistant — a role-aware, voice-capable, tool-calling chat assistant launched from the home greeting row that answers questions and performs actions via existing GleeWorld APIs.

**Architecture:** A new `assistant-chat` edge function runs the DeepSeek function-calling loop and executes **read-only** tools server-side under the caller's JWT (RLS enforced by Postgres). All **mutations** come back to the browser as structured actions and execute through existing, already-tested client code paths (`notesApi`, `tasksApi`, `supabase.functions.invoke(...)`, gw_events insert) — outward actions (SMS/email) only after a confirmation card. Voice in = Web Speech API behind a `SpeechInputSource` facade; voice out = `speechSynthesis` with a persisted mute toggle.

**Tech Stack:** Deno edge function (self-hosted Supabase), DeepSeek `deepseek-chat` (OpenAI-compatible function calling), React + TypeScript + shadcn, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-12-gleeworld-assistant-design.md` (approved 2026-07-12).

## Global Constraints

- Branch: `feat/gleeworld-assistant`. Commit after every task.
- Light theme tokens only; no dark-navy cards. Chrome sizing: `text-xs`/`text-sm` minimum, icons `w-4 h-4` minimum.
- Tenant-neutral copy — never "Spelman". Say "students"/"graduates", never "singers"/"alumnae".
- Never parse JWTs with bare `atob` — server side uses `_shared/auth.ts` helpers.
- Every Supabase insert/update: `.select()` and check returned rows (writes can fail silently as 0 rows).
- No new external fetch hosts from the BROWSER (CSP meta tag). `api.deepseek.com` is called only from the edge function — no CSP change needed.
- Edge function deploys to the droplet: scp + **md5 verify** + `docker compose up -d --force-recreate functions` in `/opt/supabase` (check `container_name` before any compose down).
- Web deploy: build + `rsync -az dist/ root@198.211.113.144:/var/www/gleeworld/html/` — **NEVER `--delete`**.
- Run tests with `npm test` (Vitest v4, default config, no jsdom — tests must be pure logic, no DOM rendering).
- Planner has duplicate " 2" files (`notesApi 2.ts` etc.) — always import/edit the canonical non-" 2" names.

## File Structure

```
supabase/functions/assistant-chat/
  index.ts          — HTTP entry: auth, role, tool loop orchestration
  toolCatalog.ts    — pure TS: tool definitions + role filtering (no Deno APIs)
  prompt.ts         — pure TS: system prompt builder
  provider.ts       — pure request-shaping + fetch to DeepSeek/OpenAI
  executors.ts      — server-side read-only tool executors (take a SupabaseClient)
  __tests__/        — vitest unit tests for the pure modules
src/lib/assistant/
  types.ts          — client envelope/action types (mirrors toolCatalog action names)
  threadReducer.ts  — chat thread state machine
  clientActions.ts  — client-side action executors (notesApi, tasksApi, navigate…)
  speech.ts         — SpeechInputSource facade + TTS/mute helpers
  __tests__/        — vitest unit tests
src/components/assistant/
  AssistantLauncher.tsx  — mic + "Ask" pill in the greeting row
  AssistantSheet.tsx     — thread UI, input, mic, mute, confirm cards, video dialog
src/lib/planner/markdown.ts — add textToDoc() helper (create_note body)
src/pages/dashboard/HouseHome.tsx — greeting row becomes flex justify-between + launcher
```

---

### Task 1: `textToDoc` helper in planner markdown lib

`create_note` needs to turn plain assistant text into the planner's DocNode shape. `EMPTY_DOC` is `{ type: 'doc', content: [{ type: 'paragraph' }] }` (`src/lib/planner/markdown.ts:113`); text nodes are `{ type: 'text', text }` per `src/lib/planner/types.ts`.

**Files:**
- Modify: `src/lib/planner/markdown.ts`
- Test: `src/lib/planner/__tests__/markdown.textToDoc.test.ts`

**Interfaces:**
- Produces: `export function textToDoc(text: string): DocNode` — one paragraph per non-empty line; empty/whitespace input returns `EMPTY_DOC`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/planner/__tests__/markdown.textToDoc.test.ts
import { describe, it, expect } from 'vitest';
import { textToDoc, EMPTY_DOC, docToText } from '../markdown';

describe('textToDoc', () => {
  it('returns EMPTY_DOC for empty/whitespace input', () => {
    expect(textToDoc('')).toEqual(EMPTY_DOC);
    expect(textToDoc('   \n  ')).toEqual(EMPTY_DOC);
  });

  it('builds one paragraph per non-empty line', () => {
    const doc = textToDoc('Line one\n\nLine two');
    expect(doc).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Line one' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Line two' }] },
      ],
    });
  });

  it('round-trips through docToText', () => {
    expect(docToText(textToDoc('Rehearsal notes')).trim()).toContain('Rehearsal notes');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/planner/__tests__/markdown.textToDoc.test.ts`
Expected: FAIL — `textToDoc` is not exported.

- [ ] **Step 3: Implement**

Add to `src/lib/planner/markdown.ts` (below `EMPTY_DOC`):

```ts
export function textToDoc(text: string): DocNode {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return EMPTY_DOC;
  return {
    type: 'doc',
    content: lines.map((line) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: line }],
    })),
  };
}
```

If `DocNode`'s type for `content` complains, match the existing node typing in `src/lib/planner/types.ts` — do not widen types.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/planner/__tests__/markdown.textToDoc.test.ts` → PASS.
Also run the whole planner suite: `npx vitest run src/lib/planner` → all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/planner/markdown.ts src/lib/planner/__tests__/markdown.textToDoc.test.ts
git commit -m "feat(planner): textToDoc helper for programmatic note bodies"
```

---

### Task 2: Tool catalog with role filtering

Pure-TS module inside the edge function dir (Deno imports it relatively; Vitest tests it directly — keep it free of Deno/browser APIs).

**Files:**
- Create: `supabase/functions/assistant-chat/toolCatalog.ts`
- Test: `supabase/functions/assistant-chat/__tests__/toolCatalog.test.ts`

**Interfaces:**
- Produces:
  - `export type AssistantRole = 'member' | 'admin'` (admin = `gw_profiles.is_admin || is_super_admin`; everything else is member)
  - `export interface ToolDef { name: string; description: string; parameters: Record<string, unknown>; minRole: AssistantRole; execution: 'server' | 'client'; confirm: boolean }`
  - `export const TOOL_CATALOG: ToolDef[]`
  - `export function toolsForRole(role: AssistantRole): ToolDef[]`
  - `export function toOpenAiTools(tools: ToolDef[]): Array<{ type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }>`

- [ ] **Step 1: Write the failing test**

```ts
// supabase/functions/assistant-chat/__tests__/toolCatalog.test.ts
import { describe, it, expect } from 'vitest';
import { TOOL_CATALOG, toolsForRole, toOpenAiTools } from '../toolCatalog';

describe('toolCatalog', () => {
  it('members get only member tools', () => {
    const names = toolsForRole('member').map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining(['query_calendar', 'search_music', 'open_page', 'open_song',
        'create_note', 'create_task', 'start_video_session']),
    );
    expect(names).not.toContain('send_sms');
    expect(names).not.toContain('send_email');
    expect(names).not.toContain('create_event');
    expect(names).not.toContain('find_user');
    expect(names).not.toContain('search_youtube');
    expect(names).not.toContain('add_video');
  });

  it('admins get every tool', () => {
    expect(toolsForRole('admin').length).toBe(TOOL_CATALOG.length);
  });

  it('only send_sms and send_email require confirmation', () => {
    const confirmed = TOOL_CATALOG.filter((t) => t.confirm).map((t) => t.name).sort();
    expect(confirmed).toEqual(['send_email', 'send_sms']);
  });

  it('server tools are exactly the read-only set', () => {
    const server = TOOL_CATALOG.filter((t) => t.execution === 'server').map((t) => t.name).sort();
    expect(server).toEqual(['find_user', 'query_calendar', 'search_music', 'search_youtube']);
  });

  it('converts to OpenAI tool format', () => {
    const [first] = toOpenAiTools(toolsForRole('member'));
    expect(first).toMatchObject({ type: 'function', function: { name: expect.any(String) } });
    expect(first.function.parameters).toHaveProperty('type', 'object');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/functions/assistant-chat` → FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// supabase/functions/assistant-chat/toolCatalog.ts
// Pure TS — imported by both the Deno edge function and Vitest tests.
// Keep free of Deno/browser APIs.

export type AssistantRole = 'member' | 'admin';

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  minRole: AssistantRole;
  execution: 'server' | 'client';
  confirm: boolean;
}

const str = (description: string) => ({ type: 'string', description });

export const TOOL_CATALOG: ToolDef[] = [
  {
    name: 'query_calendar',
    description: "Look up the user's calendar events (GleeWorld events plus their synced Google Calendar events) in a date range. Use for any what/when/where question about rehearsals, classes, or events.",
    parameters: {
      type: 'object',
      properties: {
        from: str('ISO date (inclusive), e.g. 2026-07-13'),
        to: str('ISO date (inclusive)'),
      },
      required: ['from', 'to'],
    },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'search_music',
    description: 'Search the music library by title or composer. Returns matching scores with ids.',
    parameters: {
      type: 'object',
      properties: { query: str('Title or composer fragment') },
      required: ['query'],
    },
    minRole: 'member', execution: 'server', confirm: false,
  },
  {
    name: 'find_user',
    description: 'Look up a member by name to get their user id, email, and phone. Use before send_sms or send_email to an individual.',
    parameters: {
      type: 'object',
      properties: { name: str('Full or partial name') },
      required: ['name'],
    },
    minRole: 'admin', execution: 'server', confirm: false,
  },
  {
    name: 'search_youtube',
    description: 'Search YouTube for videos. Returns video ids, titles, channels, and URLs.',
    parameters: {
      type: 'object',
      properties: { q: str('Search query') },
      required: ['q'],
    },
    minRole: 'admin', execution: 'server', confirm: false,
  },
  {
    name: 'open_page',
    description: 'Navigate the user to a GleeWorld page. Valid keys: home, calendar, planner, music-library, studio, video, messenger, academy, sight-reading, part-tracks, media-library, songwriting, concert-planner, tour-manager, attendance, users, analytics.',
    parameters: {
      type: 'object',
      properties: { key: str('Page key from the list in the description') },
      required: ['key'],
    },
    minRole: 'member', execution: 'client', confirm: false,
  },
  {
    name: 'open_song',
    description: 'Open a score from the music library in the PDF viewer. Get score_id from search_music first.',
    parameters: {
      type: 'object',
      properties: { score_id: str('gw_sheet_music id'), title: str('Score title, for the reply') },
      required: ['score_id'],
    },
    minRole: 'member', execution: 'client', confirm: false,
  },
  {
    name: 'create_note',
    description: "Create a note in the user's private Planner. Optionally include body text.",
    parameters: {
      type: 'object',
      properties: { title: str('Note title'), body: str('Plain-text body (optional)') },
      required: ['title'],
    },
    minRole: 'member', execution: 'client', confirm: false,
  },
  {
    name: 'create_task',
    description: "Create a task in the user's Planner. due_at is an ISO datetime; scheduled_date an ISO date; priority one of none|low|medium|high.",
    parameters: {
      type: 'object',
      properties: {
        title: str('Task title'),
        due_at: str('ISO datetime (optional)'),
        scheduled_date: str('ISO date (optional)'),
        priority: str('none|low|medium|high (optional)'),
      },
      required: ['title'],
    },
    minRole: 'member', execution: 'client', confirm: false,
  },
  {
    name: 'create_event',
    description: 'Create a calendar event on the default calendar. Times are ISO datetimes with timezone.',
    parameters: {
      type: 'object',
      properties: {
        title: str('Event title'),
        start: str('ISO start datetime'),
        end: str('ISO end datetime'),
        location: str('Venue/location (optional)'),
        description: str('Description (optional)'),
      },
      required: ['title', 'start', 'end'],
    },
    minRole: 'admin', execution: 'client', confirm: false,
  },
  {
    name: 'start_video_session',
    description: 'Start a video meeting room and open it for the user. room_name must be letters/numbers/dots/underscores/hyphens only.',
    parameters: {
      type: 'object',
      properties: { room_name: str('Short room slug, e.g. rehearsal-check-in') },
      required: ['room_name'],
    },
    minRole: 'member', execution: 'client', confirm: false,
  },
  {
    name: 'send_sms',
    description: 'Text one or more members. recipient_user_ids from find_user. REQUIRES user confirmation before sending.',
    parameters: {
      type: 'object',
      properties: {
        recipient_user_ids: { type: 'array', items: { type: 'string' }, description: 'gw_profiles user ids' },
        recipient_names: { type: 'array', items: { type: 'string' }, description: 'Display names, same order' },
        message: str('SMS body (keep under 160 chars)'),
      },
      required: ['recipient_user_ids', 'recipient_names', 'message'],
    },
    minRole: 'admin', execution: 'client', confirm: true,
  },
  {
    name: 'send_email',
    description: 'Email one or more members. Addresses from find_user. REQUIRES user confirmation before sending.',
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'array', items: { type: 'string' }, description: 'Email addresses' },
        recipient_names: { type: 'array', items: { type: 'string' }, description: 'Display names, same order' },
        subject: str('Subject'),
        body: str('Plain-text body; will be sent as simple HTML paragraphs'),
      },
      required: ['to', 'recipient_names', 'subject', 'body'],
    },
    minRole: 'admin', execution: 'client', confirm: true,
  },
  {
    name: 'add_video',
    description: 'Save a YouTube video to the Videos library. Get fields from search_youtube first.',
    parameters: {
      type: 'object',
      properties: {
        video_id: str('YouTube video id'),
        title: str('Video title'),
        channel: str('Channel name'),
        thumbnail_url: str('Thumbnail URL'),
      },
      required: ['video_id', 'title'],
    },
    minRole: 'admin', execution: 'client', confirm: false,
  },
];

export function toolsForRole(role: AssistantRole): ToolDef[] {
  return TOOL_CATALOG.filter((t) => t.minRole === 'member' || role === 'admin');
}

export function toOpenAiTools(tools: ToolDef[]) {
  return tools.map((t) => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/functions/assistant-chat` → PASS.
Also `npm test` → confirm the new tests are picked up and nothing else broke. If Vitest's default include misses `supabase/functions/**`, move the test to `src/lib/assistant/__tests__/toolCatalog.test.ts` importing `../../../../supabase/functions/assistant-chat/toolCatalog` and re-run.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/assistant-chat/
git commit -m "feat(assistant): tool catalog with role filtering"
```

---

### Task 3: System prompt builder + provider adapter

**Files:**
- Create: `supabase/functions/assistant-chat/prompt.ts`
- Create: `supabase/functions/assistant-chat/provider.ts`
- Test: `supabase/functions/assistant-chat/__tests__/prompt.test.ts`
- Test: `supabase/functions/assistant-chat/__tests__/provider.test.ts`

**Interfaces:**
- Produces:
  - `export interface AssistantContext { firstName: string; role: AssistantRole; tenantName: string; activeModules: string[]; nowIso: string; timezone: string }`
  - `export function buildSystemPrompt(ctx: AssistantContext): string`
  - `export interface ChatMessage { role: 'system' | 'user' | 'assistant' | 'tool'; content: string | null; tool_calls?: unknown[]; tool_call_id?: string }`
  - `export function buildChatRequest(messages: ChatMessage[], tools: ReturnType<typeof toOpenAiTools>, model: string): Record<string, unknown>`
  - `export async function callModel(req: Record<string, unknown>, apiKey: string, apiUrl: string): Promise<{ message: ChatMessage & { tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> } }>`

- [ ] **Step 1: Write the failing tests**

```ts
// supabase/functions/assistant-chat/__tests__/prompt.test.ts
import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../prompt';

describe('buildSystemPrompt', () => {
  const ctx = {
    firstName: 'Kevin', role: 'admin' as const, tenantName: 'Harmony Hall Choir',
    activeModules: ['studio', 'planner'], nowIso: '2026-07-12T20:00:00-04:00',
    timezone: 'America/New_York',
  };
  it('includes user, tenant, date, and modules', () => {
    const p = buildSystemPrompt(ctx);
    expect(p).toContain('Kevin');
    expect(p).toContain('Harmony Hall Choir');
    expect(p).toContain('2026-07-12');
    expect(p).toContain('studio');
  });
  it('never hardcodes a tenant name in the template', () => {
    const p = buildSystemPrompt({ ...ctx, tenantName: 'X' });
    expect(p).not.toMatch(/spelman/i);
  });
  it('tells member-role assistants they cannot message people', () => {
    const p = buildSystemPrompt({ ...ctx, role: 'member' });
    expect(p.toLowerCase()).toContain('cannot send');
  });
});
```

```ts
// supabase/functions/assistant-chat/__tests__/provider.test.ts
import { describe, it, expect } from 'vitest';
import { buildChatRequest } from '../provider';
import { toolsForRole, toOpenAiTools } from '../toolCatalog';

describe('buildChatRequest', () => {
  it('shapes an OpenAI-compatible tool-calling request', () => {
    const req = buildChatRequest(
      [{ role: 'user', content: 'hi' }],
      toOpenAiTools(toolsForRole('member')),
      'deepseek-chat',
    );
    expect(req).toMatchObject({ model: 'deepseek-chat', tool_choice: 'auto' });
    expect(Array.isArray((req as any).tools)).toBe(true);
    expect((req as any).max_tokens).toBeLessThanOrEqual(1500);
    expect((req as any).stream).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run supabase/functions/assistant-chat` → FAIL (modules not found).

- [ ] **Step 3: Implement**

```ts
// supabase/functions/assistant-chat/prompt.ts
import type { AssistantRole } from './toolCatalog';

export interface AssistantContext {
  firstName: string;
  role: AssistantRole;
  tenantName: string;
  activeModules: string[];
  nowIso: string;
  timezone: string;
}

export function buildSystemPrompt(ctx: AssistantContext): string {
  const memberNote = ctx.role === 'member'
    ? 'This user is a member: you cannot send texts or emails, create events, or manage other users. If asked, explain that a director or admin can do that.'
    : 'This user is an admin/director: messaging and event tools are available. Always use find_user before texting or emailing an individual, and never invent phone numbers or addresses.';
  return [
    `You are the GleeWorld Assistant, built into the GleeWorld music-organization platform (${ctx.tenantName}).`,
    `You help with: calendar questions, creating notes and tasks, opening pages (Studio, Music Library, Planner, Video, and other add-ons), opening scores, starting video sessions${ctx.role === 'admin' ? ', creating events, texting/emailing members, and adding YouTube videos to the library' : ''}.`,
    `Current user: ${ctx.firstName}. Date/time now: ${ctx.nowIso} (${ctx.timezone}). Active modules: ${ctx.activeModules.join(', ') || 'core'}.`,
    memberNote,
    'Rules:',
    '- Prefer calling a tool over describing how to do something manually.',
    '- For calendar questions, call query_calendar with a narrow date range, then answer concisely with times in the user\'s timezone.',
    '- Keep replies to 1-3 short sentences; they may be read aloud.',
    '- If a tool errors or you lack permission, say so plainly. Never fabricate results.',
    '- Answer questions about how GleeWorld works from your knowledge of the tools and pages above.',
  ].join('\n');
}
```

```ts
// supabase/functions/assistant-chat/provider.ts
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: unknown[];
  tool_call_id?: string;
}

export function buildChatRequest(
  messages: ChatMessage[],
  tools: Array<Record<string, unknown>>,
  model: string,
): Record<string, unknown> {
  return { model, messages, tools, tool_choice: 'auto', max_tokens: 1000, temperature: 0.3 };
}

export async function callModel(
  req: Record<string, unknown>,
  apiKey: string,
  apiUrl: string,
): Promise<{ message: ChatMessage & { tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> } }> {
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Model API ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const message = data?.choices?.[0]?.message;
  if (!message) throw new Error('Model API returned no message');
  return { message };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run supabase/functions/assistant-chat` → PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/assistant-chat/
git commit -m "feat(assistant): system prompt builder and DeepSeek provider adapter"
```

---

### Task 4: Server-side tool executors

Read-only executors that take a Supabase client (constructed with the caller's JWT in Task 5) so unit tests can pass a stub.

**Files:**
- Create: `supabase/functions/assistant-chat/executors.ts`
- Test: `supabase/functions/assistant-chat/__tests__/executors.test.ts`

**Interfaces:**
- Consumes: tool names from `toolCatalog.ts` (`query_calendar`, `search_music`, `find_user`, `search_youtube`).
- Produces: `export async function executeServerTool(name: string, args: Record<string, unknown>, deps: { supabase: SupabaseLike; youtubeApiKey?: string }): Promise<string>` — always returns a JSON string (fed back to the model as the tool result). `SupabaseLike` is a minimal structural type (`from(...).select(...)...`) so tests don't need the real client.

- [ ] **Step 1: Write the failing test**

```ts
// supabase/functions/assistant-chat/__tests__/executors.test.ts
import { describe, it, expect } from 'vitest';
import { executeServerTool } from '../executors';

function stubSupabase(rows: unknown[], error: { message: string } | null = null) {
  // Chainable stub: every method returns the builder; awaiting it resolves {data, error}.
  const builder: any = {};
  for (const m of ['select', 'gte', 'lte', 'lt', 'eq', 'or', 'ilike', 'order', 'limit']) {
    builder[m] = () => builder;
  }
  builder.then = (resolve: (v: unknown) => void) => resolve({ data: rows, error });
  return { from: () => builder } as any;
}

describe('executeServerTool', () => {
  it('query_calendar returns events as JSON', async () => {
    const out = await executeServerTool('query_calendar',
      { from: '2026-07-13', to: '2026-07-13' },
      { supabase: stubSupabase([{ id: '1', title: 'Rehearsal', start_date: '2026-07-13T21:00:00Z' }]) });
    expect(JSON.parse(out).events[0].title).toBe('Rehearsal');
  });

  it('search_music returns scores as JSON', async () => {
    const out = await executeServerTool('search_music', { query: 'lift' },
      { supabase: stubSupabase([{ id: 's1', title: 'Lift Every Voice', composer: 'J. R. Johnson' }]) });
    expect(JSON.parse(out).scores[0].id).toBe('s1');
  });

  it('surfaces db errors as an error field, not a throw', async () => {
    const out = await executeServerTool('search_music', { query: 'x' },
      { supabase: stubSupabase([], { message: 'permission denied' }) });
    expect(JSON.parse(out).error).toContain('permission denied');
  });

  it('rejects unknown tools', async () => {
    const out = await executeServerTool('drop_tables', {}, { supabase: stubSupabase([]) });
    expect(JSON.parse(out).error).toContain('Unknown tool');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/functions/assistant-chat/__tests__/executors.test.ts` → FAIL.

- [ ] **Step 3: Implement**

```ts
// supabase/functions/assistant-chat/executors.ts
// Read-only tool executors. The supabase client is constructed with the
// CALLER's JWT (Task 5), so RLS scopes every query to their tenant/role.

type SupabaseLike = { from: (table: string) => any };

interface Deps { supabase: SupabaseLike; youtubeApiKey?: string }

export async function executeServerTool(
  name: string,
  args: Record<string, unknown>,
  deps: Deps,
): Promise<string> {
  try {
    switch (name) {
      case 'query_calendar': return await queryCalendar(args, deps);
      case 'search_music': return await searchMusic(args, deps);
      case 'find_user': return await findUser(args, deps);
      case 'search_youtube': return await searchYoutube(args, deps);
      default: return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (e) {
    return JSON.stringify({ error: e instanceof Error ? e.message : 'tool failed' });
  }
}

async function queryCalendar(args: Record<string, unknown>, { supabase }: Deps): Promise<string> {
  const from = String(args.from ?? '');
  const to = String(args.to ?? '');
  const { data: events, error } = await supabase
    .from('gw_events')
    .select('id, title, start_date, end_date, location, category')
    .gte('start_date', `${from}T00:00:00`)
    .lte('start_date', `${to}T23:59:59`)
    .order('start_date')
    .limit(50);
  if (error) return JSON.stringify({ error: error.message });
  const { data: gcal } = await supabase
    .from('gw_google_events')
    .select('id, title, start_at, end_at, location')
    .gte('start_at', `${from}T00:00:00`)
    .lte('start_at', `${to}T23:59:59`)
    .order('start_at')
    .limit(50);
  return JSON.stringify({
    events: events ?? [],
    google_calendar_events: (gcal ?? []).map((g: any) => ({ ...g, read_only: true })),
  });
}

async function searchMusic(args: Record<string, unknown>, { supabase }: Deps): Promise<string> {
  const q = String(args.query ?? '').replace(/[%_]/g, '');
  const { data, error } = await supabase
    .from('gw_sheet_music')
    .select('id, title, composer, voicing')
    .or(`title.ilike.%${q}%,composer.ilike.%${q}%`)
    .limit(10);
  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ scores: data ?? [] });
}

async function findUser(args: Record<string, unknown>, { supabase }: Deps): Promise<string> {
  const q = String(args.name ?? '').replace(/[%_]/g, '');
  const { data, error } = await supabase
    .from('gw_profiles')
    .select('user_id, full_name, email, phone')
    .ilike('full_name', `%${q}%`)
    .limit(5);
  if (error) return JSON.stringify({ error: error.message });
  return JSON.stringify({ users: data ?? [] });
}

async function searchYoutube(args: Record<string, unknown>, { youtubeApiKey }: Deps): Promise<string> {
  if (!youtubeApiKey) return JSON.stringify({ error: 'YouTube search is not configured' });
  const q = encodeURIComponent(String(args.q ?? ''));
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${q}&key=${youtubeApiKey}`;
  const res = await fetch(url);
  if (!res.ok) return JSON.stringify({ error: `YouTube API ${res.status}` });
  const data = await res.json();
  const hits = (data.items ?? []).map((it: any) => ({
    video_id: it.id?.videoId,
    title: it.snippet?.title,
    channel: it.snippet?.channelTitle,
    thumbnail_url: it.snippet?.thumbnails?.medium?.url,
    url: `https://www.youtube.com/watch?v=${it.id?.videoId}`,
  }));
  return JSON.stringify({ hits });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/functions/assistant-chat` → PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/assistant-chat/
git commit -m "feat(assistant): server-side read-only tool executors"
```

---

### Task 5: `assistant-chat` edge function entry

**Files:**
- Create: `supabase/functions/assistant-chat/index.ts`

**Interfaces:**
- Consumes: `authenticateCaller` from `../_shared/auth.ts` (`Caller { internal, userId?, isAdmin? }`), `toolsForRole`/`toOpenAiTools` (Task 2), `buildSystemPrompt` (Task 3), `buildChatRequest`/`callModel` (Task 3), `executeServerTool` (Task 4).
- Produces (HTTP contract the client relies on):
  - Request: `POST { messages: Array<{role:'user'|'assistant', content:string}>, context?: { tenantName?: string, activeModules?: string[], timezone?: string, firstName?: string } }` with the user's Bearer JWT.
  - Response: `200 { reply: string, actions: Array<{ tool: string, args: Record<string, unknown>, confirm: boolean }> }` or `401/400/500 { error: string }`.

- [ ] **Step 1: Implement**

```ts
// supabase/functions/assistant-chat/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateCaller, unauthorizedResponse } from '../_shared/auth.ts';
import { toolsForRole, toOpenAiTools, TOOL_CATALOG, type AssistantRole } from './toolCatalog.ts';
import { buildSystemPrompt } from './prompt.ts';
import { buildChatRequest, callModel, type ChatMessage } from './provider.ts';
import { executeServerTool } from './executors.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const MAX_TOOL_ITERATIONS = 6;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const caller = await authenticateCaller(req);
  if (!caller || !caller.userId) return unauthorizedResponse(corsHeaders);
  const role: AssistantRole = caller.isAdmin ? 'admin' : 'member';

  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  const apiUrl = Deno.env.get('ASSISTANT_API_URL') ?? 'https://api.deepseek.com/chat/completions';
  const model = Deno.env.get('ASSISTANT_MODEL') ?? 'deepseek-chat';
  if (!apiKey) return json({ error: 'Assistant is not configured' }, 500);

  let body: { messages?: Array<{ role: string; content: string }>; context?: Record<string, unknown> };
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const history = (body.messages ?? []).filter(
    (m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string',
  ).slice(-20);
  if (history.length === 0 || history[history.length - 1].role !== 'user') {
    return json({ error: 'messages must end with a user message' }, 400);
  }

  // Client constructed WITH the caller's JWT: every query below runs under RLS.
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
  );

  const ctx = {
    firstName: String(body.context?.firstName ?? 'there'),
    role,
    tenantName: String(body.context?.tenantName ?? 'GleeWorld'),
    activeModules: Array.isArray(body.context?.activeModules) ? body.context!.activeModules as string[] : [],
    nowIso: new Date().toISOString(),
    timezone: String(body.context?.timezone ?? 'America/New_York'),
  };

  const tools = toolsForRole(role);
  const openAiTools = toOpenAiTools(tools);
  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(ctx) },
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];
  const actions: Array<{ tool: string; args: Record<string, unknown>; confirm: boolean }> = [];

  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const { message } = await callModel(buildChatRequest(messages, openAiTools, model), apiKey, apiUrl);
      const toolCalls = message.tool_calls ?? [];
      if (toolCalls.length === 0) {
        return json({ reply: message.content ?? '', actions });
      }
      messages.push({ role: 'assistant', content: message.content ?? null, tool_calls: toolCalls });
      for (const tc of toolCalls) {
        const def = tools.find((t) => t.name === tc.function.name);
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(tc.function.arguments || '{}'); } catch { /* leave empty */ }
        let result: string;
        if (!def) {
          result = JSON.stringify({ error: `Tool not available: ${tc.function.name}` });
        } else if (def.execution === 'server') {
          result = await executeServerTool(def.name, args, {
            supabase: userClient,
            youtubeApiKey: Deno.env.get('YOUTUBE_API_KEY') ?? undefined,
          });
        } else {
          // Client-executed: queue it for the browser and tell the model it's underway.
          actions.push({ tool: def.name, args, confirm: def.confirm });
          result = JSON.stringify(
            def.confirm
              ? { status: 'pending_user_confirmation', note: 'Tell the user you have prepared this and they must confirm the card to send it.' }
              : { status: 'queued_on_client', note: 'Tell the user this is being done now.' },
          );
        }
        messages.push({ role: 'tool', content: result, tool_call_id: tc.id });
      }
    }
    return json({ reply: 'That took too many steps — try breaking the request into smaller pieces.', actions });
  } catch (e) {
    console.error('assistant-chat error:', e);
    return json({ error: "I couldn't reach the assistant right now. Please try again." }, 502);
  }
});
```

- [ ] **Step 2: Typecheck the pure modules still pass under Vitest**

Run: `npx vitest run supabase/functions/assistant-chat` → PASS (index.ts is Deno-only and is NOT imported by any test).

- [ ] **Step 3: Deploy to the droplet and smoke-test**

```bash
# copy the function dir (md5-verify per deploy gotcha)
scp -r supabase/functions/assistant-chat root@198.211.113.144:/opt/supabase/functions/
ssh root@198.211.113.144 'for f in index toolCatalog prompt provider executors; do md5 -q 2>/dev/null || md5sum /opt/supabase/functions/assistant-chat/$f.ts; done'
# compare against local: md5 -q supabase/functions/assistant-chat/*.ts
# verify env then restart ONLY the functions container
ssh root@198.211.113.144 'grep -c "DEEPSEEK_API_KEY\|YOUTUBE_API_KEY" /opt/supabase/.env; cd /opt/supabase && docker compose up -d --force-recreate functions'
```

If `DEEPSEEK_API_KEY` is missing from `/opt/supabase/.env`, STOP and ask Kevin for the key — do not reuse another project's key.

Smoke test with a real user JWT (grab one from the browser's localStorage `sb-*-auth-token` on gleeworld.org, field `access_token`):

```bash
curl -s https://supabase.gleeworld.org/functions/v1/assistant-chat \
  -H "Authorization: Bearer $USER_JWT" -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is on my calendar tomorrow?"}],"context":{"firstName":"Kevin","timezone":"America/New_York"}}' | jq .
```

Expected: `{ "reply": "...", "actions": [] }` mentioning real events (or none). Then:

```bash
curl -s https://supabase.gleeworld.org/functions/v1/assistant-chat \
  -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"hi"}]}' -o /dev/null -w '%{http_code}\n'
```

Expected: `401` (no JWT).

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/assistant-chat/index.ts
git commit -m "feat(assistant): assistant-chat edge function — DeepSeek tool loop under caller JWT"
```

---

### Task 6: Client thread reducer + types

**Files:**
- Create: `src/lib/assistant/types.ts`
- Create: `src/lib/assistant/threadReducer.ts`
- Test: `src/lib/assistant/__tests__/threadReducer.test.ts`

**Interfaces:**
- Produces:
  - `export interface AssistantAction { tool: string; args: Record<string, unknown>; confirm: boolean }`
  - `export interface ThreadMessage { id: string; role: 'user' | 'assistant'; content: string; pendingAction?: AssistantAction; actionState?: 'pending' | 'confirmed' | 'cancelled' | 'done' | 'error' }`
  - `export interface ThreadState { messages: ThreadMessage[]; busy: boolean; error: string | null }`
  - `export type ThreadEvent = { type: 'send'; id: string; content: string } | { type: 'reply'; id: string; content: string; pendingAction?: AssistantAction } | { type: 'fail'; error: string } | { type: 'action-state'; id: string; state: ThreadMessage['actionState'] } | { type: 'reset' }`
  - `export function threadReducer(state: ThreadState, ev: ThreadEvent): ThreadState`
  - `export const INITIAL_THREAD: ThreadState`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/assistant/__tests__/threadReducer.test.ts
import { describe, it, expect } from 'vitest';
import { threadReducer, INITIAL_THREAD } from '../threadReducer';

describe('threadReducer', () => {
  it('send appends a user message and sets busy', () => {
    const s = threadReducer(INITIAL_THREAD, { type: 'send', id: 'u1', content: 'hi' });
    expect(s.messages).toHaveLength(1);
    expect(s.busy).toBe(true);
    expect(s.error).toBeNull();
  });

  it('reply appends assistant message and clears busy', () => {
    let s = threadReducer(INITIAL_THREAD, { type: 'send', id: 'u1', content: 'hi' });
    s = threadReducer(s, { type: 'reply', id: 'a1', content: 'hello' });
    expect(s.messages[1]).toMatchObject({ role: 'assistant', content: 'hello' });
    expect(s.busy).toBe(false);
  });

  it('reply with pendingAction marks the message pending', () => {
    let s = threadReducer(INITIAL_THREAD, { type: 'send', id: 'u1', content: 'text sarah' });
    s = threadReducer(s, {
      type: 'reply', id: 'a1', content: 'Ready to send.',
      pendingAction: { tool: 'send_sms', args: { message: 'hi' }, confirm: true },
    });
    expect(s.messages[1].actionState).toBe('pending');
  });

  it('action-state updates only the targeted message', () => {
    let s = threadReducer(INITIAL_THREAD, { type: 'send', id: 'u1', content: 'x' });
    s = threadReducer(s, {
      type: 'reply', id: 'a1', content: 'ok',
      pendingAction: { tool: 'send_sms', args: {}, confirm: true },
    });
    s = threadReducer(s, { type: 'action-state', id: 'a1', state: 'done' });
    expect(s.messages[1].actionState).toBe('done');
  });

  it('fail clears busy and sets error', () => {
    let s = threadReducer(INITIAL_THREAD, { type: 'send', id: 'u1', content: 'x' });
    s = threadReducer(s, { type: 'fail', error: 'network' });
    expect(s.busy).toBe(false);
    expect(s.error).toBe('network');
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/lib/assistant` → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/assistant/types.ts
export interface AssistantAction {
  tool: string;
  args: Record<string, unknown>;
  confirm: boolean;
}

export interface ThreadMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pendingAction?: AssistantAction;
  actionState?: 'pending' | 'confirmed' | 'cancelled' | 'done' | 'error';
}

export interface ThreadState {
  messages: ThreadMessage[];
  busy: boolean;
  error: string | null;
}
```

```ts
// src/lib/assistant/threadReducer.ts
import type { AssistantAction, ThreadMessage, ThreadState } from './types';

export type ThreadEvent =
  | { type: 'send'; id: string; content: string }
  | { type: 'reply'; id: string; content: string; pendingAction?: AssistantAction }
  | { type: 'fail'; error: string }
  | { type: 'action-state'; id: string; state: ThreadMessage['actionState'] }
  | { type: 'reset' };

export const INITIAL_THREAD: ThreadState = { messages: [], busy: false, error: null };

export function threadReducer(state: ThreadState, ev: ThreadEvent): ThreadState {
  switch (ev.type) {
    case 'send':
      return {
        messages: [...state.messages, { id: ev.id, role: 'user', content: ev.content }],
        busy: true,
        error: null,
      };
    case 'reply':
      return {
        messages: [...state.messages, {
          id: ev.id, role: 'assistant', content: ev.content,
          pendingAction: ev.pendingAction,
          actionState: ev.pendingAction ? 'pending' : undefined,
        }],
        busy: false,
        error: null,
      };
    case 'fail':
      return { ...state, busy: false, error: ev.error };
    case 'action-state':
      return {
        ...state,
        messages: state.messages.map((m) => (m.id === ev.id ? { ...m, actionState: ev.state } : m)),
      };
    case 'reset':
      return INITIAL_THREAD;
  }
}
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run src/lib/assistant` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/assistant/
git commit -m "feat(assistant): client thread reducer and types"
```

---

### Task 7: Client action executors

Every mutation runs here, through existing app code paths, under the signed-in session. Navigation is returned as a path for the caller to route.

**Files:**
- Create: `src/lib/assistant/clientActions.ts`
- Test: `src/lib/assistant/__tests__/clientActions.test.ts`

**Interfaces:**
- Consumes: `AssistantAction` (Task 6), `createNote` from `@/lib/planner/notesApi`, `createTask` from `@/lib/planner/tasksApi`, `textToDoc` from `@/lib/planner/markdown` (Task 1), `supabase` from `@/integrations/supabase/client`, `pushEventToGoogle` from `@/hooks/useGoogleConnection`.
- Produces:
  - `export interface ActionOutcome { ok: boolean; navigateTo?: string; openVideoRoom?: string; message: string }`
  - `export async function executeClientAction(action: AssistantAction, deps?: Partial<ActionDeps>): Promise<ActionOutcome>` — deps injectable for tests.
  - `export const PAGE_ROUTES: Record<string, string>` — the open_page whitelist.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/assistant/__tests__/clientActions.test.ts
import { describe, it, expect, vi } from 'vitest';
import { executeClientAction, PAGE_ROUTES } from '../clientActions';

describe('PAGE_ROUTES', () => {
  it('maps every documented open_page key to a route', () => {
    for (const key of ['home', 'calendar', 'planner', 'music-library', 'studio', 'video',
      'messenger', 'academy', 'sight-reading', 'part-tracks', 'media-library', 'songwriting',
      'concert-planner', 'tour-manager', 'attendance', 'users', 'analytics']) {
      expect(PAGE_ROUTES[key], key).toMatch(/^\//);
    }
  });
});

describe('executeClientAction', () => {
  it('open_page returns the whitelisted route and rejects unknown keys', async () => {
    const ok = await executeClientAction({ tool: 'open_page', args: { key: 'studio' }, confirm: false });
    expect(ok).toMatchObject({ ok: true, navigateTo: '/studio' });
    const bad = await executeClientAction({ tool: 'open_page', args: { key: '../evil' }, confirm: false });
    expect(bad.ok).toBe(false);
  });

  it('open_song builds the viewer deep link', async () => {
    const out = await executeClientAction({ tool: 'open_song', args: { score_id: 'abc-123' }, confirm: false });
    expect(out.navigateTo).toBe('/dashboard/music-library?view=abc-123');
  });

  it('start_video_session sanitizes the room slug', async () => {
    const out = await executeClientAction({ tool: 'start_video_session', args: { room_name: 'my room!!' }, confirm: false });
    expect(out.ok).toBe(true);
    expect(out.openVideoRoom).toMatch(/^[a-zA-Z0-9._-]+$/);
  });

  it('create_note calls notesApi and reports the title', async () => {
    const createNote = vi.fn().mockResolvedValue({ id: 'n1', title: 'Setlist' });
    const out = await executeClientAction(
      { tool: 'create_note', args: { title: 'Setlist', body: 'Songs' }, confirm: false },
      { createNote } as any,
    );
    expect(createNote).toHaveBeenCalled();
    expect(out).toMatchObject({ ok: true, navigateTo: '/planner' });
  });

  it('create_event fails loudly when insert returns zero rows', async () => {
    const insertChain: any = {
      insert: () => insertChain, select: () => insertChain,
      single: async () => ({ data: null, error: null }),
    };
    const calChain: any = {
      select: () => calChain, eq: () => calChain, order: () => calChain,
      limit: async () => ({ data: [{ id: 'cal1' }], error: null }),
    };
    const supabase = { from: (t: string) => (t === 'gw_calendars' ? calChain : insertChain) };
    const out = await executeClientAction(
      { tool: 'create_event', args: { title: 'X', start: '2026-07-14T18:00:00Z', end: '2026-07-14T19:00:00Z' }, confirm: false },
      { supabase, pushEventToGoogle: vi.fn() } as any,
    );
    expect(out.ok).toBe(false);
  });

  it('unknown tools are rejected', async () => {
    const out = await executeClientAction({ tool: 'rm_rf', args: {}, confirm: false });
    expect(out.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/lib/assistant` → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/assistant/clientActions.ts
import type { AssistantAction } from './types';

// Route whitelist for open_page. Paths come from src/lib/navigation/navCatalog.ts —
// keep keys in sync with the open_page tool description in toolCatalog.ts.
export const PAGE_ROUTES: Record<string, string> = {
  home: '/dashboard',
  calendar: '/dashboard/calendar',
  planner: '/planner',
  'music-library': '/dashboard/music-library',
  studio: '/studio',
  video: '/video',
  messenger: '/dashboard/messenger',
  academy: '/dashboard/academy',
  'sight-reading': '/dashboard/sight-reading',
  'part-tracks': '/dashboard/part-tracks',
  'media-library': '/dashboard/media-library',
  songwriting: '/songwriting',
  'concert-planner': '/dashboard/concert-planner',
  'tour-manager': '/tour-manager',
  attendance: '/attendance',
  users: '/dashboard/users',
  analytics: '/dashboard/analytics',
};

export interface ActionOutcome {
  ok: boolean;
  navigateTo?: string;
  openVideoRoom?: string;
  message: string;
}

export interface ActionDeps {
  supabase: { from: (table: string) => any; functions: { invoke: (name: string, opts: { body: unknown }) => Promise<{ data: any; error: any }> } };
  createNote: (partial: { title: string; content?: unknown }) => Promise<{ id: string; title: string }>;
  createTask: (input: { title: string; due_at?: string | null; scheduled_date?: string | null; priority?: string }) => Promise<unknown>;
  textToDoc: (text: string) => unknown;
  pushEventToGoogle: (eventId: string, op: 'create' | 'update' | 'delete') => Promise<unknown>;
}

async function defaultDeps(): Promise<ActionDeps> {
  const [{ supabase }, notesApi, tasksApi, markdown, googleConn] = await Promise.all([
    import('@/integrations/supabase/client'),
    import('@/lib/planner/notesApi'),
    import('@/lib/planner/tasksApi'),
    import('@/lib/planner/markdown'),
    import('@/hooks/useGoogleConnection'),
  ]);
  return {
    supabase: supabase as ActionDeps['supabase'],
    createNote: notesApi.createNote,
    createTask: tasksApi.createTask,
    textToDoc: markdown.textToDoc,
    pushEventToGoogle: googleConn.pushEventToGoogle,
  };
}

export async function executeClientAction(
  action: AssistantAction,
  depsOverride?: Partial<ActionDeps>,
): Promise<ActionOutcome> {
  const needsDeps = !['open_page', 'open_song', 'start_video_session'].includes(action.tool);
  const deps = { ...(needsDeps && !depsOverride ? await defaultDeps() : {}), ...depsOverride } as ActionDeps;
  const a = action.args;
  try {
    switch (action.tool) {
      case 'open_page': {
        const route = PAGE_ROUTES[String(a.key)];
        if (!route) return { ok: false, message: `I don't know a page called "${a.key}".` };
        return { ok: true, navigateTo: route, message: `Opening ${a.key}.` };
      }
      case 'open_song': {
        const id = String(a.score_id ?? '');
        if (!/^[0-9a-f-]{10,}$/i.test(id)) return { ok: false, message: 'That score id looks invalid.' };
        return { ok: true, navigateTo: `/dashboard/music-library?view=${id}`, message: `Opening ${a.title ?? 'the score'}.` };
      }
      case 'start_video_session': {
        const slug = String(a.room_name ?? 'gleeworld-room').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 60) || 'gleeworld-room';
        return { ok: true, openVideoRoom: slug, message: 'Starting your video session.' };
      }
      case 'create_note': {
        const body = typeof a.body === 'string' && a.body.trim() ? a.body : '';
        const note = await deps.createNote({
          title: String(a.title ?? 'Untitled'),
          ...(body ? { content: deps.textToDoc(body) } : {}),
        });
        return { ok: true, navigateTo: '/planner', message: `Created the note "${note.title}".` };
      }
      case 'create_task': {
        await deps.createTask({
          title: String(a.title ?? 'Untitled task'),
          due_at: typeof a.due_at === 'string' ? a.due_at : null,
          scheduled_date: typeof a.scheduled_date === 'string' ? a.scheduled_date : null,
          priority: typeof a.priority === 'string' ? a.priority : 'none',
        });
        return { ok: true, message: `Added the task "${a.title}".` };
      }
      case 'create_event': {
        const { data: cals, error: calErr } = await deps.supabase
          .from('gw_calendars').select('id, is_default').eq('is_visible', true).order('is_default', { ascending: false }).limit(1);
        if (calErr || !cals?.length) return { ok: false, message: 'No calendar available to add the event to.' };
        const { data: { user } } = await (deps.supabase as any).auth?.getUser?.() ?? { data: { user: null } };
        const { data: event, error } = await deps.supabase.from('gw_events').insert({
          title: String(a.title), description: a.description ?? null,
          start_date: String(a.start), end_date: String(a.end),
          venue_name: a.location ?? null, calendar_id: cals[0].id,
          created_by: user?.id, status: 'scheduled', is_public: false,
        }).select().single();
        if (error || !event) return { ok: false, message: `Couldn't create the event${error ? `: ${error.message}` : ' (no row returned — check permissions)'}.` };
        try { await deps.pushEventToGoogle(event.id, 'create'); } catch { /* google sync is best-effort */ }
        return { ok: true, navigateTo: '/dashboard/calendar', message: `Created "${a.title}".` };
      }
      case 'send_sms': {
        const ids = Array.isArray(a.recipient_user_ids) ? a.recipient_user_ids : [];
        if (!ids.length || typeof a.message !== 'string') return { ok: false, message: 'Missing recipients or message.' };
        const { data: profiles, error: pErr } = await deps.supabase
          .from('gw_profiles').select('user_id, full_name, email, phone').in('user_id', ids);
        if (pErr || !profiles?.length) return { ok: false, message: 'Could not resolve those recipients.' };
        const { error } = await deps.supabase.functions.invoke('send-unified-communication', {
          body: {
            communicationId: crypto.randomUUID(),
            title: 'Assistant SMS',
            content: a.message,
            recipients: profiles.map((p: any) => ({ id: p.user_id, name: p.full_name, email: p.email, phone: p.phone })),
            channels: ['sms'],
          },
        });
        if (error) return { ok: false, message: `SMS failed: ${error.message ?? 'unknown error'}` };
        return { ok: true, message: `Text sent to ${profiles.length} ${profiles.length === 1 ? 'person' : 'people'}.` };
      }
      case 'send_email': {
        const to = Array.isArray(a.to) ? a.to.map(String) : [];
        if (!to.length || !a.subject || !a.body) return { ok: false, message: 'Missing recipients, subject, or body.' };
        const html = String(a.body).split('\n').filter(Boolean).map((p) => `<p>${p}</p>`).join('');
        const { error } = await deps.supabase.functions.invoke('send-branded-email', {
          body: { to, subject: String(a.subject), html },
        });
        if (error) return { ok: false, message: `Email failed: ${error.message ?? 'unknown error'}` };
        return { ok: true, message: `Email sent to ${to.length} ${to.length === 1 ? 'address' : 'addresses'}.` };
      }
      case 'add_video': {
        const { data, error } = await deps.supabase.from('youtube_videos').insert({
          video_id: String(a.video_id), title: String(a.title),
          channel_title: a.channel ?? null, thumbnail_url: a.thumbnail_url ?? null,
        }).select();
        if (error || !data?.length) return { ok: false, message: `Couldn't add the video${error ? `: ${error.message}` : ' (no row returned — check permissions)'}.` };
        return { ok: true, navigateTo: '/video', message: `Added "${a.title}" to Videos.` };
      }
      default:
        return { ok: false, message: `I can't perform "${action.tool}".` };
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Action failed.' };
  }
}
```

**Implementation notes for this task:**
- Before finalizing `add_video`, read `src/hooks/useYouTubeVideos.ts:40-70` for the actual `youtube_videos` column names (`video_id` vs `youtube_id`, `channel_title` etc.) and match them exactly; adjust the test only if columns differ.
- Before finalizing `send_sms`, read `supabase/functions/send-unified-communication/index.ts` request interface and match required fields exactly (it may require `communication_type`, `sender` fields, etc.). Adjust body accordingly.
- `createNote`'s `partial` type may not accept `content` — check `src/lib/planner/notesApi.ts:120-145`; it does (`partial.content ?? EMPTY_DOC` per `getOrCreatePeriodNote`, and `createNote` uses `partial.content` — verify and adapt).

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run src/lib/assistant` → PASS. Run `npm test` for the full suite.

- [ ] **Step 5: Commit**

```bash
git add src/lib/assistant/clientActions.ts src/lib/assistant/__tests__/clientActions.test.ts
git commit -m "feat(assistant): client-side action executors with route whitelist and confirm-gated sends"
```

---

### Task 8: Speech facade (mic in, TTS out)

**Files:**
- Create: `src/lib/assistant/speech.ts`
- Test: `src/lib/assistant/__tests__/speech.test.ts`

**Interfaces:**
- Produces:
  - `export interface SpeechInputSource { available: boolean; start(onResult: (transcript: string, isFinal: boolean) => void, onEnd: () => void): void; stop(): void }`
  - `export function getSpeechInput(win?: Window & typeof globalThis): SpeechInputSource` — wraps `SpeechRecognition`/`webkitSpeechRecognition`; `available: false` when neither exists (the launcher hides the mic).
  - `export function isMuted(storage?: Storage): boolean` / `export function setMuted(muted: boolean, storage?: Storage): void` — key `gw-assistant-muted`.
  - `export function speak(text: string, opts?: { muted?: boolean; synth?: SpeechSynthesis }): void` — no-op when muted or synth missing.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/assistant/__tests__/speech.test.ts
import { describe, it, expect, vi } from 'vitest';
import { getSpeechInput, isMuted, setMuted, speak } from '../speech';

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(), key: () => null, length: 0,
  } as Storage;
}

describe('speech facade', () => {
  it('reports unavailable without SpeechRecognition', () => {
    expect(getSpeechInput({} as any).available).toBe(false);
  });

  it('reports available with webkitSpeechRecognition', () => {
    const fake = function () { return { start: vi.fn(), stop: vi.fn() }; };
    expect(getSpeechInput({ webkitSpeechRecognition: fake } as any).available).toBe(true);
  });

  it('mute persists through storage', () => {
    const s = memoryStorage();
    expect(isMuted(s)).toBe(false);
    setMuted(true, s);
    expect(isMuted(s)).toBe(true);
  });

  it('speak is a no-op when muted and calls synth otherwise', () => {
    const synth = { speak: vi.fn(), cancel: vi.fn() } as unknown as SpeechSynthesis;
    speak('hello', { muted: true, synth });
    expect((synth.speak as any)).not.toHaveBeenCalled();
    speak('hello', { muted: false, synth });
    expect((synth.speak as any)).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/lib/assistant/__tests__/speech.test.ts` → FAIL.

**Note:** `SpeechSynthesisUtterance` doesn't exist in the node test env — `speak` must construct the utterance defensively (see implementation) so the test can assert `synth.speak` was called with whatever was constructed.

- [ ] **Step 3: Implement**

```ts
// src/lib/assistant/speech.ts
export interface SpeechInputSource {
  available: boolean;
  start(onResult: (transcript: string, isFinal: boolean) => void, onEnd: () => void): void;
  stop(): void;
}

const MUTE_KEY = 'gw-assistant-muted';

export function getSpeechInput(win?: Window & typeof globalThis): SpeechInputSource {
  const w = (win ?? (typeof window !== 'undefined' ? window : undefined)) as any;
  const Ctor = w?.SpeechRecognition ?? w?.webkitSpeechRecognition;
  if (!Ctor) {
    return { available: false, start: () => {}, stop: () => {} };
  }
  let rec: any = null;
  return {
    available: true,
    start(onResult, onEnd) {
      rec = new Ctor();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (e: any) => {
        let transcript = '';
        let isFinal = false;
        for (let i = 0; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript;
          if (e.results[i].isFinal) isFinal = true;
        }
        onResult(transcript, isFinal);
      };
      rec.onend = onEnd;
      rec.onerror = onEnd;
      rec.start();
    },
    stop() {
      try { rec?.stop(); } catch { /* already stopped */ }
      rec = null;
    },
  };
}

export function isMuted(storage?: Storage): boolean {
  const s = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
  return s?.getItem(MUTE_KEY) === '1';
}

export function setMuted(muted: boolean, storage?: Storage): void {
  const s = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
  if (muted) s?.setItem(MUTE_KEY, '1');
  else s?.removeItem(MUTE_KEY);
}

export function speak(text: string, opts?: { muted?: boolean; synth?: SpeechSynthesis }): void {
  const muted = opts?.muted ?? isMuted();
  if (muted || !text.trim()) return;
  const synth = opts?.synth ?? (typeof speechSynthesis !== 'undefined' ? speechSynthesis : undefined);
  if (!synth) return;
  synth.cancel();
  const UtterCtor = (globalThis as any).SpeechSynthesisUtterance;
  const utterance = UtterCtor ? new UtterCtor(text) : ({ text } as any);
  synth.speak(utterance);
}
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run src/lib/assistant` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/assistant/speech.ts src/lib/assistant/__tests__/speech.test.ts
git commit -m "feat(assistant): speech input facade and TTS with persisted mute"
```

---

### Task 9: AssistantSheet + AssistantLauncher UI, wired into HouseHome

UI work — **invoke the `gleeworld-design` skill before writing JSX** and follow it (light tokens, hover:bg-accent, text-xs/sm, w-4 h-4 icons).

**Files:**
- Create: `src/components/assistant/AssistantLauncher.tsx`
- Create: `src/components/assistant/AssistantSheet.tsx`
- Modify: `src/pages/dashboard/HouseHome.tsx` (greeting block, lines ~149-156)

**Interfaces:**
- Consumes: everything from Tasks 6-8; `useUserRole` (`profile`, `getEffectiveRole`), `useTenantModules`, `supabase.functions.invoke('assistant-chat', { body })` (contract from Task 5), `JitsiMeetRoom` (`src/components/video/JitsiMeetRoom.tsx`, props `{ roomName, userName, onClose }`), shadcn `Sheet`, `Button`, `Input`, planner toasts via `sonner`.
- Produces: `<AssistantLauncher />` — self-contained; owns the open state and renders `<AssistantSheet />`.

- [ ] **Step 1: Build `AssistantSheet`**

Structure (complete component; adapt imports to the repo's shadcn paths):

```tsx
// src/components/assistant/AssistantSheet.tsx
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Send, Volume2, VolumeX, Loader2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { threadReducer, INITIAL_THREAD } from '@/lib/assistant/threadReducer';
import { executeClientAction } from '@/lib/assistant/clientActions';
import { getSpeechInput, isMuted, setMuted, speak } from '@/lib/assistant/speech';
import type { AssistantAction } from '@/lib/assistant/types';
import { JitsiMeetRoom } from '@/components/video/JitsiMeetRoom';

interface AssistantSheetProps { open: boolean; onOpenChange: (open: boolean) => void; autoListen?: boolean }

export const AssistantSheet = ({ open, onOpenChange, autoListen }: AssistantSheetProps) => {
  const navigate = useNavigate();
  const { profile } = useUserRole();
  const [state, dispatch] = useReducer(threadReducer, INITIAL_THREAD);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const [videoRoom, setVideoRoom] = useState<string | null>(null);
  const speechRef = useRef(getSpeechInput());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 999999 }); }, [state.messages.length]);

  const runAction = useCallback(async (msgId: string, action: AssistantAction) => {
    dispatch({ type: 'action-state', id: msgId, state: 'confirmed' });
    const outcome = await executeClientAction(action);
    dispatch({ type: 'action-state', id: msgId, state: outcome.ok ? 'done' : 'error' });
    if (outcome.openVideoRoom) setVideoRoom(outcome.openVideoRoom);
    if (outcome.navigateTo) { onOpenChange(false); navigate(outcome.navigateTo); }
    if (!outcome.ok) speak(outcome.message, { muted });
  }, [muted, navigate, onOpenChange]);

  const send = useCallback(async (content: string) => {
    const text = content.trim();
    if (!text || state.busy) return;
    setInput('');
    const userId = crypto.randomUUID();
    dispatch({ type: 'send', id: userId, content: text });
    const history = [...state.messages.map((m) => ({ role: m.role, content: m.content })), { role: 'user' as const, content: text }];
    const { data, error } = await supabase.functions.invoke('assistant-chat', {
      body: {
        messages: history,
        context: {
          firstName: profile?.full_name?.split(' ')[0] ?? 'there',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
    });
    if (error || data?.error) {
      dispatch({ type: 'fail', error: data?.error ?? "I couldn't reach the assistant right now." });
      return;
    }
    const replyId = crypto.randomUUID();
    const actions: AssistantAction[] = data.actions ?? [];
    const confirmAction = actions.find((a) => a.confirm);
    dispatch({ type: 'reply', id: replyId, content: data.reply ?? '', pendingAction: confirmAction });
    speak(data.reply ?? '', { muted });
    // Non-confirm actions run immediately, in order.
    for (const action of actions.filter((a) => !a.confirm)) {
      await runAction(replyId, action);
    }
  }, [state.busy, state.messages, profile, muted, runAction]);

  const toggleMic = useCallback(() => {
    const speech = speechRef.current;
    if (!speech.available) return;
    if (listening) { speech.stop(); setListening(false); return; }
    setListening(true);
    let finalTranscript = '';
    speech.start(
      (transcript, isFinal) => { setInput(transcript); if (isFinal) finalTranscript = transcript; },
      () => { setListening(false); if (finalTranscript.trim()) send(finalTranscript); },
    );
  }, [listening, send]);

  useEffect(() => { if (open && autoListen && !listening && speechRef.current.available) toggleMic(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] sm:h-[70vh] sm:max-w-xl sm:mx-auto rounded-t-2xl flex flex-col p-0">
        <SheetHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-sm font-semibold">GleeWorld Assistant</SheetTitle>
          <button
            type="button"
            onClick={() => { const m = !muted; setMuted(m); setMutedState(m); }}
            className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
            title={muted ? 'Unmute replies' : 'Mute replies'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-muted-foreground" />}
          </button>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {state.messages.length === 0 && (
            <p className="text-sm text-muted-foreground pt-6 text-center">
              Ask me anything — "What's on my calendar tomorrow?", "Open Studio", "Make a note…"
            </p>
          )}
          {state.messages.map((m) => (
            <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div className={m.role === 'user'
                ? 'max-w-[85%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-3 py-2 text-sm'
                : 'max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-sm text-foreground'}>
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.pendingAction && m.actionState === 'pending' && (
                  <div className="mt-2 rounded-lg border bg-card p-2 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {m.pendingAction.tool === 'send_sms' ? 'Text' : 'Email'} to{' '}
                      {(m.pendingAction.args.recipient_names as string[] | undefined)?.join(', ') ?? 'recipients'}:
                    </p>
                    <p className="text-xs font-medium">
                      {String(m.pendingAction.args.message ?? m.pendingAction.args.body ?? '')}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs" onClick={() => runAction(m.id, m.pendingAction!)}>Send</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => dispatch({ type: 'action-state', id: m.id, state: 'cancelled' })}>Cancel</Button>
                    </div>
                  </div>
                )}
                {m.actionState === 'done' && <p className="text-xs text-muted-foreground mt-1">✓ Done</p>}
                {m.actionState === 'cancelled' && <p className="text-xs text-muted-foreground mt-1">Cancelled</p>}
                {m.actionState === 'error' && <p className="text-xs text-red-600 mt-1">That didn't work — see above.</p>}
              </div>
            </div>
          ))}
          {state.busy && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          {state.error && <p className="text-xs text-red-600">{state.error}</p>}
        </div>

        <form
          className="border-t px-3 py-2 flex items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); send(input); }}
        >
          {speechRef.current.available && (
            <button type="button" onClick={toggleMic}
              className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${listening ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-accent text-muted-foreground'}`}
              title={listening ? 'Stop listening' : 'Speak'}>
              <Mic className="w-4 h-4" />
            </button>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={listening ? 'Listening…' : 'Ask GleeWorld…'}
            className="flex-1 h-9 rounded-full border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" size="sm" className="h-9 w-9 rounded-full p-0" disabled={state.busy || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>

        {videoRoom && (
          <div className="fixed inset-0 z-[60] bg-background">
            <button type="button" onClick={() => setVideoRoom(null)}
              className="absolute top-3 right-3 z-[61] h-8 w-8 rounded-full bg-card border flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
            <JitsiMeetRoom roomName={videoRoom} userName={profile?.full_name ?? 'Member'} onClose={() => setVideoRoom(null)} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
```

Check `JitsiMeetRoom`'s actual props in `src/components/video/JitsiMeetRoom.tsx` and pass `userEmail`/`userId`/`isModerator` if required.

- [ ] **Step 2: Build `AssistantLauncher`**

```tsx
// src/components/assistant/AssistantLauncher.tsx
import { useState } from 'react';
import { Mic, Sparkles } from 'lucide-react';
import { AssistantSheet } from './AssistantSheet';
import { getSpeechInput } from '@/lib/assistant/speech';

/** Mic + "Ask" pill on the right side of the home greeting row. */
export const AssistantLauncher = () => {
  const [open, setOpen] = useState(false);
  const [autoListen, setAutoListen] = useState(false);
  const micAvailable = getSpeechInput().available;

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      {micAvailable && (
        <button
          type="button"
          onClick={() => { setAutoListen(true); setOpen(true); }}
          className="h-9 w-9 rounded-full border bg-card flex items-center justify-center hover:bg-accent transition-colors"
          title="Ask by voice"
        >
          <Mic className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
      <button
        type="button"
        onClick={() => { setAutoListen(false); setOpen(true); }}
        className="h-9 px-3 rounded-full border bg-card flex items-center gap-1.5 text-sm font-medium hover:bg-accent transition-colors"
      >
        <Sparkles className="w-4 h-4 text-muted-foreground" />
        Ask
      </button>
      <AssistantSheet open={open} onOpenChange={setOpen} autoListen={autoListen} />
    </div>
  );
};
```

- [ ] **Step 3: Wire into HouseHome**

In `src/pages/dashboard/HouseHome.tsx`, change the greeting block (~lines 149-156) from:

```tsx
        <div>
          <h1 className="font-serif text-2xl font-semibold">{greetingFor(now.getHours(), firstName)}</h1>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {format(now, 'EEE · MMM d')}
          </p>
        </div>
```

to:

```tsx
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-semibold">{greetingFor(now.getHours(), firstName)}</h1>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {format(now, 'EEE · MMM d')}
            </p>
          </div>
          <AssistantLauncher />
        </div>
```

and add `import { AssistantLauncher } from '@/components/assistant/AssistantLauncher';` with the other component imports.

- [ ] **Step 4: Build + lint**

Run: `npm run build` → clean. Run `npm test` → all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/assistant/ src/pages/dashboard/HouseHome.tsx
git commit -m "feat(assistant): AssistantLauncher + AssistantSheet wired into home greeting row"
```

---

### Task 10: End-to-end verification on local preview

Use the scoped **`Documents/GitHub/gleeworld:verify`** skill (preview server + Playwright at phone/desktop viewports). Writes go to prod DB — use benign titles and clean up.

- [ ] **Step 1: Drive the flows**

With a signed-in admin session on the local preview:
1. Home shows the launcher right of the greeting; no layout shift at 390px and desktop widths.
2. "What's on my calendar tomorrow?" → reply cites real events.
3. "Open Studio" → sheet closes, router lands on `/studio`.
4. "Make a note called Assistant Test with body hello" → note exists in Planner; delete it after.
5. "Add a task to test the assistant" → task appears in Planner Today/All; delete it after.
6. "Text Kevin Johnson hello from the assistant" → confirmation card renders with recipient + message; **Cancel** → state shows Cancelled, nothing sent (check `gw_sms_messages` has no new row).
7. Mic button: speak a query in Chrome → transcript appears, sends on end. Mute toggle silences TTS and persists across reload.
8. Sign in as a member (demo@ creds) → launcher present; "text everyone" politely refuses; `send_sms` absent from its tool set (verify via the reply, and via server logs showing member tool list).

- [ ] **Step 2: Fix anything found, re-run the relevant tests, and commit fixes**

```bash
git add -A && git commit -m "fix(assistant): QA fixes from local preview verification"
```

---

### Task 11: PR

- [ ] **Step 1: Push and open the PR**

```bash
git push -u origin feat/gleeworld-assistant
gh pr create --title "GleeWorld Assistant Phase 1: voice + tool-calling assistant on home" --body "$(cat <<'EOF'
## What
Role-aware AI assistant launched from the home greeting row (mic + Ask pill):
- assistant-chat edge function — DeepSeek function-calling loop; read-only tools run server-side under the caller's JWT (RLS-enforced)
- All mutations execute client-side through existing code paths (notesApi, tasksApi, gw_events insert, send-branded-email, send-unified-communication)
- SMS/email require a confirmation card; navigation and lookups are instant
- Voice in (Web Speech API, hidden when unsupported) + spoken replies with persisted mute

Per spec docs/superpowers/specs/2026-07-12-gleeworld-assistant-design.md. Phase 2 (iOS GWSpeech plugin) is a separate build.

## Verification
- npm test: all suites pass (new: toolCatalog, prompt, provider, executors, threadReducer, clientActions, speech, textToDoc)
- npm run build: clean
- Local preview QA: calendar Q&A, navigation, note/task creation, SMS confirm + cancel, member role gating, mic + TTS

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: Hand off**

Do NOT merge or deploy the web build without Kevin's go-ahead. The edge function deployed in Task 5 is inert until the UI ships (nothing calls it), so it can stay deployed.

---

## Self-Review Notes

- Spec coverage: launcher/sheet (T9), voice in/out + mute (T8/T9), role-aware catalog (T2/T5), JWT/RLS execution (T5), confirm cards (T5/T7/T9), navigate directives (T7/T9), all v1 tools (T2/T4/T7), error handling (T4/T5/T7), tests (every task), phasing (iOS + create_class/download_pdf deferred per spec). "Provider adapter swappable via env" → `ASSISTANT_MODEL`/`ASSISTANT_API_URL` in T5.
- Known simplification vs spec: the spec's `ASSISTANT_PROVIDER` env collapsed into `ASSISTANT_API_URL` + `ASSISTANT_MODEL` (any OpenAI-compatible endpoint works, incl. OpenAI itself). Claude support would need a small translation layer — out of v1 scope.
- Type consistency: `AssistantAction { tool, args, confirm }` is produced by T5's envelope, consumed by T6 reducer, T7 executor, T9 UI. Tool names in T2 = switch cases in T4 (server) + T7 (client) = catalog descriptions.
- The three "Implementation notes" in Task 7 are verification steps against live code, not placeholders — the executor code shown is complete and adjusted only if the referenced interfaces differ.
