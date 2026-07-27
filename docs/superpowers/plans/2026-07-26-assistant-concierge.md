# Assistant Concierge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fold the deployed `/dashboard/concierge` capabilities (rides, food, web search) into the GleeWorld Assistant as three new tools, with results surfaced in a side panel on the assistant sheet. Delete no code — a fresh build from origin/main already drops the standalone page.

**Architecture:** Add three tools to the existing `supabase/functions/assistant-chat` tool catalog (`get_ride`, `order_food`, `web_search`). Each executor is server-side and returns both a JSON reply for the model and a structured `resultsPanel` payload that the edge function surfaces alongside the reply. On the client, `AssistantProvider` gains a `resultsPanel` state (mirroring the existing `videoRoom` pattern), and `AssistantSheet` grows a two-column desktop layout / stacked phone layout that mounts a new `AssistantResultsPanel` component. Rides call Google Places for geocoding + build Uber/Lyft universal deep links; food builds deterministic DoorDash / Uber Eats / Grubhub search URLs; web-search calls a new `web-search` edge function (Brave Search API + DeepSeek synthesis), gated by a per-tenant daily cap stored in a new `assistant_usage_daily` table.

**Tech Stack:** TypeScript, Vite/React 18 (front-end), Deno edge functions, Supabase Postgres + RLS, DeepSeek chat completions, Google Places API (New), Brave Search API. Test runner is Vitest.

## Global Constraints

- **Working directory:** `~/Documents/GitHub/gleeworld`. Never `/tmp`. Concurrent sessions share the checkout — verify branch before every commit/build.
- **Tenant-neutral copy:** never hardcode "Spelman" (or any specific tenant name) in user-visible strings.
- **Light theme:** cream page, white cards, dark text. Use tokens (`bg-card`, `text-foreground`, etc.), never dark-navy.
- **Studio-sizing minimum:** if anything renders in Studio, `text-xs`/`text-sm` + `w-4 h-4` icons minimum, never sub-12px. Not expected to apply here (assistant sheet only), but noted.
- **Multi-tenant model:** every new user-scoped table needs a `tenant_id` column with a `DEFAULT current_tenant_id()` and a `BEFORE INSERT` trigger to prevent silent write failures. RLS RESTRICTIVE policy.
- **No service worker:** never re-add SW caching. `/sw.js` is a self-uninstall stub.
- **Deploy:** front-end builds locally, `rsync` `dist/` without `--delete` (breaks tenant bootstraps). Never commit `pbxproj` for iOS bumps.
- **Copy tone:** the assistant already speaks in warm-first-person. Match its tone. Never refer to "graduates" as "alumnae/alumni" and never refer to "students" as "singers".

---

## File Structure

**New files:**
- `supabase/migrations/20260726120000_assistant_usage_daily.sql` — tenant-scoped tool usage counter.
- `supabase/functions/web-search/index.ts` — Brave Search + DeepSeek synthesis.
- `supabase/functions/assistant-chat/__tests__/executors.concierge.test.ts` — unit tests for the 3 new executors.
- `src/components/assistant/AssistantResultsPanel.tsx` — the side-panel shell with three card variants.
- `src/components/assistant/AssistantResultsPanel.test.tsx` — component tests.

**Modified files:**
- `supabase/functions/assistant-chat/toolCatalog.ts` — add 3 tool defs.
- `supabase/functions/assistant-chat/executors.ts` — change return type + add 3 executors.
- `supabase/functions/assistant-chat/index.ts` — bubble `resultsPanel` up in the JSON response.
- `supabase/functions/assistant-chat/__tests__/executors.test.ts` — update to the new return shape.
- `src/lib/assistant/AssistantProvider.tsx` — add `resultsPanel` state + consumer wiring.
- `src/components/assistant/AssistantSheet.tsx` — mount the panel on both shells.
- `src/components/assistant/AssistantSuggestions.tsx` — add three concierge chips.

**Types:** `ConciergeResult` is exported from `AssistantResultsPanel.tsx` and re-imported by `AssistantProvider.tsx`. Backend side just returns matching shape as JSON.

---

## Task 1: `assistant_usage_daily` migration

**Files:**
- Create: `supabase/migrations/20260726120000_assistant_usage_daily.sql`
- Test: manual verification via `psql`

**Interfaces:**
- Produces: table `public.assistant_usage_daily(tenant_id uuid, tool_name text, day date, count int)` with unique index `(tenant_id, tool_name, day)`; RPC `increment_assistant_usage(p_tool_name text) returns int` returning the post-increment count for the caller's tenant on today's date.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260726120000_assistant_usage_daily.sql`:

```sql
-- assistant_usage_daily: per-tenant, per-tool daily counter used to cap
-- upstream-metered assistant tools (web_search → Brave).
-- Kept tiny: one row per (tenant, tool, day). Never joined; only counted.

CREATE TABLE public.assistant_usage_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
  tool_name text NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, tool_name, day)
);

-- Multi-tenant guard: matches the pattern used across the schema.
CREATE OR REPLACE FUNCTION public.assistant_usage_daily_set_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := current_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER assistant_usage_daily_set_tenant_trg
BEFORE INSERT ON public.assistant_usage_daily
FOR EACH ROW EXECUTE FUNCTION public.assistant_usage_daily_set_tenant();

ALTER TABLE public.assistant_usage_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY assistant_usage_daily_tenant_isolation
ON public.assistant_usage_daily
AS RESTRICTIVE
FOR ALL
USING (tenant_id = current_tenant_id())
WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY assistant_usage_daily_service_role_rw
ON public.assistant_usage_daily
FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- Increment-and-return: atomic, single round trip. Executor calls this
-- BEFORE hitting Brave and refuses the call if the returned count exceeds
-- the tool's cap. Runs under the caller's JWT so RLS applies naturally.
CREATE OR REPLACE FUNCTION public.increment_assistant_usage(p_tool_name text)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  INSERT INTO public.assistant_usage_daily (tool_name, day, count)
  VALUES (p_tool_name, v_today, 1)
  ON CONFLICT (tenant_id, tool_name, day)
  DO UPDATE SET count = assistant_usage_daily.count + 1
  RETURNING count INTO v_count;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_assistant_usage(text) TO authenticated;
```

- [ ] **Step 2: Apply locally against Supabase**

Kevin runs this in his Terminal (no leading `!` — Claude cannot write to the prod DB):

```bash
psql "$(supabase status | grep 'DB URL' | awk '{print $NF}')" \
  -f supabase/migrations/20260726120000_assistant_usage_daily.sql
```

Expected: no errors, four `CREATE` statements + one `ALTER TABLE`.

- [ ] **Step 3: Smoke-check the RPC**

```sql
SELECT increment_assistant_usage('web_search');
SELECT increment_assistant_usage('web_search');
SELECT count FROM assistant_usage_daily WHERE tool_name = 'web_search';
```

Expected: RPC returns `1` then `2`; table shows `count = 2`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260726120000_assistant_usage_daily.sql
git commit -m "assistant: assistant_usage_daily table + increment_assistant_usage RPC"
```

---

## Task 2: Extend `executeServerTool` return type to carry a `resultsPanel` payload

The current signature returns `Promise<string>`. Concierge executors also need to hand up a structured payload for the client. Change the signature to return both, update every existing executor and the index.ts loop.

**Files:**
- Modify: `supabase/functions/assistant-chat/executors.ts`
- Modify: `supabase/functions/assistant-chat/index.ts:65-107`
- Modify: `supabase/functions/assistant-chat/__tests__/executors.test.ts`

**Interfaces:**
- Produces: `type ConciergeResult` exported from `executors.ts`. `executeServerTool` now returns `Promise<{ replyJson: string; resultsPanel?: ConciergeResult }>`. index.ts response body gains an optional `resultsPanel` field. Every existing executor returns `{ replyJson: '<their JSON string>' }`.

- [ ] **Step 1: Write failing test for the new return shape**

Add to `supabase/functions/assistant-chat/__tests__/executors.test.ts`:

```ts
it('returns { replyJson } shape for existing tools', async () => {
  const out = await executeServerTool('search_music', { query: 'lift' },
    { supabase: stubSupabase([{ id: 's1', title: 'Lift Every Voice' }]) });
  expect(typeof out.replyJson).toBe('string');
  expect(out.resultsPanel).toBeUndefined();
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd ~/Documents/GitHub/gleeworld && npx vitest run supabase/functions/assistant-chat/__tests__/executors.test.ts
```

Expected: TypeError — the test dereferences `.replyJson` on a string.

- [ ] **Step 3: Change the return type in `executors.ts`**

Top of file — add:

```ts
export type ConciergeResult =
  | { kind: 'ride'; query: string; resolvedAddress: string; uberUrl: string; lyftUrl: string; preferred?: 'uber' | 'lyft' }
  | { kind: 'food'; query: string; services: Array<{ name: 'DoorDash' | 'Uber Eats' | 'Grubhub'; deepLinkUrl: string }>; preferred?: 'doordash' | 'ubereats' | 'grubhub' }
  | { kind: 'web';  query: string; answer?: string; results: Array<{ title: string; url: string; snippet: string }> };

export interface ToolResult {
  replyJson: string;
  resultsPanel?: ConciergeResult;
}
```

Change the exported function:

```ts
export async function executeServerTool(
  name: string,
  args: Record<string, unknown>,
  deps: Deps,
): Promise<ToolResult> {
  try {
    switch (name) {
      case 'query_calendar': return { replyJson: await queryCalendar(args, deps) };
      case 'search_music':   return { replyJson: await searchMusic(args, deps) };
      case 'find_user':      return { replyJson: await findUser(args, deps) };
      case 'search_youtube': return { replyJson: await searchYoutube(args, deps) };
      default: return { replyJson: JSON.stringify({ error: `Unknown tool: ${name}` }) };
    }
  } catch (e) {
    return { replyJson: JSON.stringify({ error: e instanceof Error ? e.message : 'tool failed' }) };
  }
}
```

- [ ] **Step 4: Update `index.ts` to consume the new shape and forward `resultsPanel`**

In `supabase/functions/assistant-chat/index.ts`, change the response body init:

```ts
let resultsPanel: unknown = undefined;
```

Placed near `const actions: Array<{...}> = [];` (line 64).

Then update the server-tool branch inside the tool-call loop (currently lines 81-85):

```ts
} else if (def.execution === 'server') {
  const toolOut = await executeServerTool(def.name, args, {
    supabase: userClient,
    youtubeApiKey: Deno.env.get('YOUTUBE_API_KEY') ?? undefined,
  });
  result = toolOut.replyJson;
  if (toolOut.resultsPanel) resultsPanel = toolOut.resultsPanel;
}
```

And update the two `return json(...)` sites so both include `resultsPanel`:

```ts
return json({ reply: message.content ?? '', actions, resultsPanel });
```

```ts
return json({ reply: 'That took too many steps — try breaking the request into smaller pieces.', actions, resultsPanel });
```

- [ ] **Step 5: Run the updated tests**

```bash
npx vitest run supabase/functions/assistant-chat/__tests__/executors.test.ts
```

Update the existing tests in that file that previously did `JSON.parse(out).events[0]` etc. — they now need `JSON.parse(out.replyJson).events[0]`. Fix and rerun.

Expected: all 4+ tests PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/assistant-chat/executors.ts supabase/functions/assistant-chat/index.ts supabase/functions/assistant-chat/__tests__/executors.test.ts
git commit -m "assistant-chat: server-tool executors return { replyJson, resultsPanel? }"
```

---

## Task 3: `get_ride` tool + executor

**Files:**
- Modify: `supabase/functions/assistant-chat/toolCatalog.ts`
- Modify: `supabase/functions/assistant-chat/executors.ts`
- Create: `supabase/functions/assistant-chat/__tests__/executors.concierge.test.ts`

**Interfaces:**
- Consumes: `ToolResult` type (from Task 2), `Deps` interface widened to include an optional `googleMapsApiKey: string` and an optional `homeAddress: string` (from `gw_profiles.home_address`).
- Produces: tool `get_ride` (member role, server, no confirm). Executor `getRide(args, deps): Promise<ToolResult>`. Panel payload kind `ride`.

- [ ] **Step 1: Widen `Deps` and thread the two new deps through `index.ts`**

`executors.ts`:

```ts
interface Deps {
  supabase: SupabaseLike;
  youtubeApiKey?: string;
  googleMapsApiKey?: string;
  homeAddress?: string;
}
```

`index.ts` — before the tool-call loop, resolve the caller's home address once (RLS scopes to their profile):

```ts
const { data: profileRow } = await userClient
  .from('gw_profiles')
  .select('home_address')
  .eq('user_id', caller.userId)
  .maybeSingle();
const homeAddress = (profileRow?.home_address ?? '').trim() || undefined;
```

Then pass into every `executeServerTool` call:

```ts
const toolOut = await executeServerTool(def.name, args, {
  supabase: userClient,
  youtubeApiKey: Deno.env.get('YOUTUBE_API_KEY') ?? undefined,
  googleMapsApiKey: Deno.env.get('GOOGLE_MAPS_API_KEY') ?? undefined,
  homeAddress,
});
```

- [ ] **Step 2: Write the failing test**

Create `supabase/functions/assistant-chat/__tests__/executors.concierge.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeServerTool } from '../executors';

const stubSupabase = { from: () => ({}) } as any;

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => ({
      places: [{ formattedAddress: '350 Spelman Ln SW, Atlanta, GA 30314', location: { latitude: 33.7461, longitude: -84.4128 } }],
    }),
  })));
});
afterEach(() => vi.unstubAllGlobals());

describe('get_ride executor', () => {
  it('geocodes destination and returns Uber+Lyft deep links + ride panel', async () => {
    const out = await executeServerTool('get_ride', { destination: 'Spelman College' }, {
      supabase: stubSupabase, googleMapsApiKey: 'test',
    });
    const panel = out.resultsPanel as any;
    expect(panel.kind).toBe('ride');
    expect(panel.resolvedAddress).toContain('Spelman');
    expect(panel.uberUrl).toContain('dropoff%5Blatitude%5D=33.7461');
    expect(panel.uberUrl).toContain('m.uber.com/ul/');
    expect(panel.lyftUrl).toContain('ride.lyft.com/ride');
    expect(panel.lyftUrl).toContain('destination%5Blatitude%5D=33.7461');
    expect(JSON.parse(out.replyJson).resolvedAddress).toContain('Spelman');
  });

  it('resolves "home" to the profile home_address', async () => {
    const out = await executeServerTool('get_ride', { destination: 'home' }, {
      supabase: stubSupabase, googleMapsApiKey: 'test', homeAddress: '100 Main St, Atlanta, GA',
    });
    // Executor should have called fetch with the resolved home_address, not "home".
    const fetchArg = (globalThis.fetch as any).mock.calls[0][1].body;
    expect(fetchArg).toContain('100 Main St');
  });

  it('returns a helpful error when no Google Maps key is configured', async () => {
    const out = await executeServerTool('get_ride', { destination: 'anywhere' }, { supabase: stubSupabase });
    expect(out.resultsPanel).toBeUndefined();
    expect(JSON.parse(out.replyJson).error).toContain('not configured');
  });

  it('asks for a destination when "home" is unresolved', async () => {
    const out = await executeServerTool('get_ride', { destination: 'home' }, {
      supabase: stubSupabase, googleMapsApiKey: 'test',
    });
    // No home_address in deps → executor must NOT hit fetch.
    expect((globalThis.fetch as any)).not.toHaveBeenCalled();
    expect(JSON.parse(out.replyJson).error).toContain("don't have your home address");
  });
});
```

- [ ] **Step 3: Run to verify FAIL**

```bash
npx vitest run supabase/functions/assistant-chat/__tests__/executors.concierge.test.ts
```

Expected: all 4 tests FAIL — `Unknown tool: get_ride`.

- [ ] **Step 4: Register the tool in `toolCatalog.ts`**

Add to the `TOOL_CATALOG` array (any position after `search_youtube`):

```ts
{
  name: 'get_ride',
  description:
    "Prepare a rideshare deep link to a destination. The user speaks naturally ('take me home', 'ride to the Fox Theatre'); you resolve the destination and hand back a card the user taps to launch Uber or Lyft. 'home' resolves to the user's saved home address; if it's not set, ASK for the address instead of calling this tool blindly.",
  parameters: {
    type: 'object',
    properties: {
      destination: str('Where the user wants to go. Free text; may be "home", a place name, or an address.'),
      preferred: str("'uber' or 'lyft' if the user has a preference (optional)"),
    },
    required: ['destination'],
  },
  minRole: 'member', execution: 'server', confirm: false,
},
```

- [ ] **Step 5: Implement `getRide` in `executors.ts`**

Add the switch case:

```ts
case 'get_ride': return await getRide(args, deps);
```

Then the implementation (place below `searchYoutube`):

```ts
async function getRide(args: Record<string, unknown>, deps: Deps): Promise<ToolResult> {
  const rawDest = String(args.destination ?? '').trim();
  if (!rawDest) {
    return { replyJson: JSON.stringify({ error: 'Which destination?' }) };
  }
  if (!deps.googleMapsApiKey) {
    return { replyJson: JSON.stringify({ error: 'Rides are not configured on this workspace yet.' }) };
  }

  // "home" is a first-class shortcut: resolve from the profile, or bail
  // out with a specific error the model turns into a follow-up question.
  const isHome = rawDest.toLowerCase() === 'home';
  const query = isHome ? (deps.homeAddress ?? '') : rawDest;
  if (isHome && !query) {
    return { replyJson: JSON.stringify({
      error: "I don't have your home address saved. Give me the address and I'll remember it for next time.",
    }) };
  }

  // Google Places API (New) Text Search — one call gives us both the
  // canonical address and the coordinates. Fields mask keeps the response tiny.
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': deps.googleMapsApiKey,
      'X-Goog-FieldMask': 'places.formattedAddress,places.location',
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
  });
  if (!res.ok) {
    return { replyJson: JSON.stringify({ error: `Places lookup failed (${res.status}).` }) };
  }
  const body = await res.json();
  const place = body.places?.[0];
  if (!place?.location) {
    return { replyJson: JSON.stringify({ error: `I couldn't find "${rawDest}".` }) };
  }
  const lat = place.location.latitude;
  const lng = place.location.longitude;
  const address = place.formattedAddress ?? rawDest;

  const uberUrl =
    'https://m.uber.com/ul/?action=setPickup&pickup=my_location'
    + `&dropoff%5Blatitude%5D=${lat}`
    + `&dropoff%5Blongitude%5D=${lng}`
    + `&dropoff%5Bnickname%5D=${encodeURIComponent(address)}`;

  const lyftUrl =
    'https://ride.lyft.com/ride?id=lyft'
    + `&destination%5Blatitude%5D=${lat}`
    + `&destination%5Blongitude%5D=${lng}`;

  const preferred = (String(args.preferred ?? '').toLowerCase() as 'uber' | 'lyft') || undefined;

  return {
    replyJson: JSON.stringify({ resolvedAddress: address, preferred }),
    resultsPanel: { kind: 'ride', query: rawDest, resolvedAddress: address, uberUrl, lyftUrl, preferred },
  };
}
```

- [ ] **Step 6: Run tests to verify PASS**

```bash
npx vitest run supabase/functions/assistant-chat/__tests__/executors.concierge.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/assistant-chat/toolCatalog.ts supabase/functions/assistant-chat/executors.ts supabase/functions/assistant-chat/__tests__/executors.concierge.test.ts supabase/functions/assistant-chat/index.ts
git commit -m "assistant: add get_ride tool (Uber/Lyft deep links via Google Places)"
```

---

## Task 4: `order_food` tool + executor

**Files:**
- Modify: `supabase/functions/assistant-chat/toolCatalog.ts`
- Modify: `supabase/functions/assistant-chat/executors.ts`
- Modify: `supabase/functions/assistant-chat/__tests__/executors.concierge.test.ts`

**Interfaces:**
- Consumes: `ToolResult`, `ConciergeResult` from Task 2.
- Produces: tool `order_food` (member, server, no confirm). Executor `orderFood(args, deps): Promise<ToolResult>`. Panel payload kind `food`.

- [ ] **Step 1: Write the failing test**

Append to `executors.concierge.test.ts`:

```ts
describe('order_food executor', () => {
  it('returns three service deep links with the query in each URL', async () => {
    const out = await executeServerTool('order_food', { query: 'donuts' }, { supabase: stubSupabase });
    const panel = out.resultsPanel as any;
    expect(panel.kind).toBe('food');
    expect(panel.query).toBe('donuts');
    const names = panel.services.map((s: any) => s.name).sort();
    expect(names).toEqual(['DoorDash', 'Grubhub', 'Uber Eats']);
    for (const svc of panel.services) {
      expect(svc.deepLinkUrl).toMatch(/donuts/i);
      expect(svc.deepLinkUrl).toMatch(/^https:\/\//);
    }
  });

  it('with no query, returns homepage URLs (no query fragment)', async () => {
    const out = await executeServerTool('order_food', {}, { supabase: stubSupabase });
    const panel = out.resultsPanel as any;
    expect(panel.query).toBe('');
    for (const svc of panel.services) {
      expect(svc.deepLinkUrl).not.toMatch(/donuts/);
    }
  });

  it('preserves preferred service in payload', async () => {
    const out = await executeServerTool('order_food', { query: 'pizza', preferred: 'grubhub' }, { supabase: stubSupabase });
    expect((out.resultsPanel as any).preferred).toBe('grubhub');
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
npx vitest run supabase/functions/assistant-chat/__tests__/executors.concierge.test.ts -t "order_food"
```

Expected: 3 tests FAIL — `Unknown tool: order_food`.

- [ ] **Step 3: Register the tool**

Append to `TOOL_CATALOG`:

```ts
{
  name: 'order_food',
  description:
    "Prepare food-delivery deep links. Pass an optional query like 'donuts' or 'thai near me' and the user gets DoorDash, Uber Eats, and Grubhub buttons pre-loaded with that search. No query is fine — the panel then opens each service's homepage.",
  parameters: {
    type: 'object',
    properties: {
      query: str('What the user wants to order (optional)'),
      preferred: str("'doordash', 'ubereats', or 'grubhub' if the user has a preference (optional)"),
    },
    required: [],
  },
  minRole: 'member', execution: 'server', confirm: false,
},
```

- [ ] **Step 4: Implement `orderFood` in `executors.ts`**

Switch case:

```ts
case 'order_food': return await orderFood(args);
```

Implementation:

```ts
async function orderFood(args: Record<string, unknown>): Promise<ToolResult> {
  const q = String(args.query ?? '').trim();
  const preferred = (String(args.preferred ?? '').toLowerCase() as 'doordash' | 'ubereats' | 'grubhub') || undefined;
  const enc = encodeURIComponent(q);

  // Homepage URLs when the query is empty — the panel still shows three
  // buttons the user can tap.
  const services = q ? [
    { name: 'DoorDash' as const, deepLinkUrl: `https://www.doordash.com/search/store/${enc}` },
    { name: 'Uber Eats' as const, deepLinkUrl: `https://www.ubereats.com/search?q=${enc}` },
    { name: 'Grubhub'  as const, deepLinkUrl: `https://www.grubhub.com/search?queryText=${enc}` },
  ] : [
    { name: 'DoorDash' as const, deepLinkUrl: 'https://www.doordash.com/' },
    { name: 'Uber Eats' as const, deepLinkUrl: 'https://www.ubereats.com/' },
    { name: 'Grubhub'  as const, deepLinkUrl: 'https://www.grubhub.com/' },
  ];

  return {
    replyJson: JSON.stringify({ query: q, preferred, count: services.length }),
    resultsPanel: { kind: 'food', query: q, services, preferred },
  };
}
```

- [ ] **Step 5: Run tests to verify PASS**

```bash
npx vitest run supabase/functions/assistant-chat/__tests__/executors.concierge.test.ts
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/assistant-chat/toolCatalog.ts supabase/functions/assistant-chat/executors.ts supabase/functions/assistant-chat/__tests__/executors.concierge.test.ts
git commit -m "assistant: add order_food tool (DoorDash/UberEats/Grubhub deep links)"
```

---

## Task 5: `web-search` edge function (Brave + DeepSeek synthesis)

**Files:**
- Create: `supabase/functions/web-search/index.ts`
- Create: `supabase/functions/web-search/__tests__/websearch.test.ts`

**Interfaces:**
- Consumes: env `BRAVE_SEARCH_API_KEY`, `DEEPSEEK_API_KEY`.
- Produces: HTTP POST endpoint at `/functions/v1/web-search` accepting `{ query: string }` and returning `{ answer?: string; results: Array<{ title: string; url: string; snippet: string }> }`. Requires an authenticated caller (JWT) — the executor in Task 6 forwards the caller's Authorization header.

- [ ] **Step 1: Write the failing test**

Create `supabase/functions/web-search/__tests__/websearch.test.ts`. This test doesn't hit real APIs; it verifies the transformation logic by importing a helper we'll extract:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runWebSearch } from '../index';

beforeEach(() => {
  const braveOk = {
    ok: true,
    json: async () => ({
      web: {
        results: [
          { title: 'Result 1', url: 'https://example.com/1', description: 'First snippet' },
          { title: 'Result 2', url: 'https://example.com/2', description: 'Second snippet' },
        ],
      },
    }),
  };
  const deepseekOk = {
    ok: true,
    json: async () => ({
      choices: [{ message: { content: 'A synthesized answer.' } }],
    }),
  };
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (String(url).includes('brave')) return braveOk;
    if (String(url).includes('deepseek')) return deepseekOk;
    throw new Error(`unexpected fetch: ${url}`);
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe('runWebSearch', () => {
  it('returns Brave results + DeepSeek answer', async () => {
    const out = await runWebSearch({ query: 'gospel choir history', braveKey: 'b', deepseekKey: 'd' });
    expect(out.results.length).toBe(2);
    expect(out.results[0].title).toBe('Result 1');
    expect(out.answer).toBe('A synthesized answer.');
  });

  it('returns results without an answer when DeepSeek fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url).includes('brave')) return { ok: true, json: async () => ({ web: { results: [{ title: 't', url: 'https://x', description: 's' }] } }) };
      return { ok: false, status: 500, json: async () => ({}) };
    }));
    const out = await runWebSearch({ query: 'x', braveKey: 'b', deepseekKey: 'd' });
    expect(out.results.length).toBe(1);
    expect(out.answer).toBeUndefined();
  });

  it('throws with a friendly message when Brave fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 502, json: async () => ({}) })));
    await expect(runWebSearch({ query: 'x', braveKey: 'b', deepseekKey: 'd' }))
      .rejects.toThrow('Search is unavailable');
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
npx vitest run supabase/functions/web-search/__tests__/websearch.test.ts
```

Expected: file-not-found on `../index`.

- [ ] **Step 3: Implement the edge function**

Create `supabase/functions/web-search/index.ts`:

```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { authenticateCaller, unauthorizedResponse } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface WebResult { title: string; url: string; snippet: string }
export interface WebSearchOutput { answer?: string; results: WebResult[] }

// Exported for tests. Keeps the transport separate from the request handler.
export async function runWebSearch(opts: {
  query: string; braveKey: string; deepseekKey: string;
}): Promise<WebSearchOutput> {
  const q = opts.query.trim();
  if (!q) return { results: [] };

  const braveRes = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=8&safesearch=strict`,
    { headers: { 'X-Subscription-Token': opts.braveKey, 'Accept': 'application/json' } },
  );
  if (!braveRes.ok) throw new Error('Search is unavailable right now. Please try again.');
  const braveBody = await braveRes.json();
  const results: WebResult[] = (braveBody.web?.results ?? []).slice(0, 5).map((r: any) => ({
    title: String(r.title ?? ''),
    url: String(r.url ?? ''),
    snippet: String(r.description ?? ''),
  }));

  // Synthesize a 2-3 sentence answer from the top snippets. Never fabricate:
  // if DeepSeek is unhappy, we just return results without an answer.
  let answer: string | undefined;
  try {
    const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opts.deepseekKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'Answer briefly (2-3 sentences) based only on the given search snippets. If they do not answer the question, say so plainly. Never invent facts or URLs.' },
          { role: 'user', content: `Question: ${q}\n\nSnippets:\n${results.map((r, i) => `[${i+1}] ${r.title}: ${r.snippet}`).join('\n')}` },
        ],
      }),
    });
    if (dsRes.ok) {
      const body = await dsRes.json();
      const text = body.choices?.[0]?.message?.content?.trim();
      if (text) answer = text;
    }
  } catch { /* leave answer undefined */ }

  return { answer, results };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('POST only', { status: 405, headers: corsHeaders });

  const caller = await authenticateCaller(req);
  if (!caller?.userId) return unauthorizedResponse(corsHeaders);

  const braveKey = Deno.env.get('BRAVE_SEARCH_API_KEY');
  const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!braveKey || !deepseekKey) {
    return new Response(JSON.stringify({ error: 'Search is not configured.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let body: { query?: string };
  try { body = await req.json(); } catch { return new Response('bad json', { status: 400, headers: corsHeaders }); }
  const query = String(body.query ?? '').trim();
  if (!query) return new Response(JSON.stringify({ results: [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const out = await runWebSearch({ query, braveKey, deepseekKey });
    return new Response(JSON.stringify(out),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Search failed.';
    return new Response(JSON.stringify({ error: msg }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
```

- [ ] **Step 4: Run tests to verify PASS**

```bash
npx vitest run supabase/functions/web-search/__tests__/websearch.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Deploy the edge function to the self-hosted stack**

The edge functions live at `/opt/supabase/volumes/functions/` on the droplet (`reference_edge_fn_deploy` memory). Kevin runs (no leading `!`):

```bash
scp -r supabase/functions/web-search root@supabase.gleeworld.org:/opt/supabase/volumes/functions/
ssh root@supabase.gleeworld.org "docker exec supabase-edge-functions supabase functions serve --no-verify-jwt=false" || true
```

Then set the Brave key on the droplet:

```bash
ssh root@supabase.gleeworld.org "grep -q BRAVE_SEARCH_API_KEY /opt/supabase/.env || echo 'BRAVE_SEARCH_API_KEY=<paste-key>' >> /opt/supabase/.env"
ssh root@supabase.gleeworld.org "cd /opt/supabase && docker compose restart edge-functions"
```

Smoke test:

```bash
curl -s -X POST https://supabase.gleeworld.org/functions/v1/web-search \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"HBCU choral tradition"}' | jq .
```

Expected: JSON with `answer` string and `results` array.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/web-search
git commit -m "web-search: Brave Search + DeepSeek synthesis edge function"
```

---

## Task 6: `web_search` tool + executor with per-tenant cap

**Files:**
- Modify: `supabase/functions/assistant-chat/toolCatalog.ts`
- Modify: `supabase/functions/assistant-chat/executors.ts`
- Modify: `supabase/functions/assistant-chat/index.ts` (pass an internal-fetch URL)
- Modify: `supabase/functions/assistant-chat/__tests__/executors.concierge.test.ts`

**Interfaces:**
- Consumes: `ToolResult`, `ConciergeResult`, `Deps`. Widen `Deps` again with `webSearchUrl?: string` and `webSearchAuthHeader?: string`. Uses `increment_assistant_usage` RPC from Task 1.
- Produces: tool `web_search` (member, server, no confirm). Executor `webSearch(args, deps): Promise<ToolResult>`. Panel payload kind `web`. Constant `WEB_SEARCH_DAILY_CAP = 100`.

- [ ] **Step 1: Widen `Deps` and thread through `index.ts`**

`executors.ts`:

```ts
interface Deps {
  supabase: SupabaseLike;
  youtubeApiKey?: string;
  googleMapsApiKey?: string;
  homeAddress?: string;
  webSearchUrl?: string;
  webSearchAuthHeader?: string;
}
```

`index.ts` — build the URL once and forward the caller's Authorization header:

```ts
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const webSearchUrl = supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}/functions/v1/web-search` : undefined;
const webSearchAuthHeader = req.headers.get('Authorization') ?? undefined;
```

And pass into every `executeServerTool`:

```ts
webSearchUrl,
webSearchAuthHeader,
```

- [ ] **Step 2: Write the failing test**

Append to `executors.concierge.test.ts`:

```ts
describe('web_search executor', () => {
  it('calls web-search fn and returns results + panel', async () => {
    const rpcSpy = vi.fn(async () => ({ data: 1, error: null }));
    const supabaseWithRpc = { from: () => ({}), rpc: rpcSpy } as any;
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ answer: 'An answer.', results: [{ title: 't', url: 'https://x', snippet: 's' }] }),
    })));
    const out = await executeServerTool('web_search', { query: 'gospel history' }, {
      supabase: supabaseWithRpc, webSearchUrl: 'http://ws', webSearchAuthHeader: 'Bearer x',
    });
    expect(rpcSpy).toHaveBeenCalledWith('increment_assistant_usage', { p_tool_name: 'web_search' });
    expect((out.resultsPanel as any).kind).toBe('web');
    expect((out.resultsPanel as any).answer).toBe('An answer.');
  });

  it('refuses over the daily cap without hitting web-search', async () => {
    const rpcSpy = vi.fn(async () => ({ data: 101, error: null }));
    const supabaseWithRpc = { from: () => ({}), rpc: rpcSpy } as any;
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const out = await executeServerTool('web_search', { query: 'x' }, {
      supabase: supabaseWithRpc, webSearchUrl: 'http://ws', webSearchAuthHeader: 'Bearer x',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(JSON.parse(out.replyJson).error).toMatch(/daily search limit/i);
    expect(out.resultsPanel).toBeUndefined();
  });

  it('returns friendly error when web-search is unreachable', async () => {
    const rpcSpy = vi.fn(async () => ({ data: 1, error: null }));
    const supabaseWithRpc = { from: () => ({}), rpc: rpcSpy } as any;
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 502, json: async () => ({ error: 'up' }) })));
    const out = await executeServerTool('web_search', { query: 'x' }, {
      supabase: supabaseWithRpc, webSearchUrl: 'http://ws', webSearchAuthHeader: 'Bearer x',
    });
    expect(JSON.parse(out.replyJson).error).toContain('unavailable');
  });
});
```

- [ ] **Step 3: Run to verify FAIL**

```bash
npx vitest run supabase/functions/assistant-chat/__tests__/executors.concierge.test.ts -t "web_search"
```

Expected: 3 tests FAIL.

- [ ] **Step 4: Widen the `SupabaseLike` type**

Top of `executors.ts`:

```ts
type SupabaseLike = {
  from: (table: string) => any;
  rpc?: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};
```

- [ ] **Step 5: Register the tool**

Append to `TOOL_CATALOG`:

```ts
{
  name: 'web_search',
  description:
    "Search the live web (Brave) and return a short answer plus a list of result URLs. Use for current-events or fact-check questions your own knowledge can't cover. Daily limit is per-tenant — don't chain multiple searches for a single question.",
  parameters: {
    type: 'object',
    properties: { query: str('The search query') },
    required: ['query'],
  },
  minRole: 'member', execution: 'server', confirm: false,
},
```

- [ ] **Step 6: Implement `webSearch` in `executors.ts`**

Constant + switch case + function:

```ts
const WEB_SEARCH_DAILY_CAP = 100;

// switch case
case 'web_search': return await webSearch(args, deps);

async function webSearch(args: Record<string, unknown>, deps: Deps): Promise<ToolResult> {
  const q = String(args.query ?? '').trim();
  if (!q) return { replyJson: JSON.stringify({ error: 'What should I search for?' }) };
  if (!deps.webSearchUrl || !deps.webSearchAuthHeader || !deps.supabase.rpc) {
    return { replyJson: JSON.stringify({ error: 'Search is not configured.' }) };
  }

  // Increment first, then check. This is intentional: we want the counter
  // to advance even if the caller retries — this is the cost meter, not
  // the request meter.
  const { data: post, error: rpcErr } = await deps.supabase.rpc('increment_assistant_usage', { p_tool_name: 'web_search' });
  if (rpcErr) {
    return { replyJson: JSON.stringify({ error: 'Search rate check failed.' }) };
  }
  if (typeof post === 'number' && post > WEB_SEARCH_DAILY_CAP) {
    return { replyJson: JSON.stringify({
      error: "You've hit today's daily search limit for this workspace. Try again tomorrow.",
    }) };
  }

  const res = await fetch(deps.webSearchUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: deps.webSearchAuthHeader },
    body: JSON.stringify({ query: q }),
  });
  if (!res.ok) {
    return { replyJson: JSON.stringify({ error: 'Search is unavailable right now. Please try again.' }) };
  }
  const body = await res.json();
  const results = Array.isArray(body.results) ? body.results : [];
  const answer = typeof body.answer === 'string' ? body.answer : undefined;

  return {
    replyJson: JSON.stringify({ query: q, answer, resultCount: results.length }),
    resultsPanel: { kind: 'web', query: q, answer, results },
  };
}
```

- [ ] **Step 7: Run tests to verify PASS**

```bash
npx vitest run supabase/functions/assistant-chat/__tests__/executors.concierge.test.ts
```

Expected: all executor tests PASS.

- [ ] **Step 8: Commit**

```bash
git add supabase/functions/assistant-chat/toolCatalog.ts supabase/functions/assistant-chat/executors.ts supabase/functions/assistant-chat/index.ts supabase/functions/assistant-chat/__tests__/executors.concierge.test.ts
git commit -m "assistant: add web_search tool with per-tenant daily cap"
```

---

## Task 7: `resultsPanel` state on `AssistantProvider`

**Files:**
- Modify: `src/lib/assistant/AssistantProvider.tsx`

**Interfaces:**
- Consumes: `ConciergeResult` type from `AssistantResultsPanel` (Task 8). *For this task, define an interim inline type in the provider and export it, then Task 8 will import from the provider instead of the panel. Actually — invert: types file wins. Define `ConciergeResult` in a new `src/lib/assistant/conciergeTypes.ts` here to avoid the circular import.*
- Produces: `AssistantContextValue` gains `resultsPanel: ConciergeResult | null; setResultsPanel: (r: ConciergeResult | null) => void`. `send()` reads `data.resultsPanel` from the assistant-chat response and calls `setResultsPanel`.

- [ ] **Step 1: Create the shared types file**

Create `src/lib/assistant/conciergeTypes.ts`:

```ts
export type ConciergeResult =
  | { kind: 'ride'; query: string; resolvedAddress: string; uberUrl: string; lyftUrl: string; preferred?: 'uber' | 'lyft' }
  | { kind: 'food'; query: string; services: Array<{ name: 'DoorDash' | 'Uber Eats' | 'Grubhub'; deepLinkUrl: string }>; preferred?: 'doordash' | 'ubereats' | 'grubhub' }
  | { kind: 'web';  query: string; answer?: string; results: Array<{ title: string; url: string; snippet: string }> };
```

- [ ] **Step 2: Add state + expose in context**

In `src/lib/assistant/AssistantProvider.tsx`:

Add import at top:

```ts
import type { ConciergeResult } from './conciergeTypes';
```

Extend `AssistantContextValue` (after `setVideoRoom`, before `captionReply`):

```ts
resultsPanel: ConciergeResult | null;
setResultsPanel: (r: ConciergeResult | null) => void;
```

Add state in the provider body (near `const [videoRoom, ...]`):

```ts
const [resultsPanel, setResultsPanel] = useState<ConciergeResult | null>(null);
```

- [ ] **Step 3: Consume the response field in `send()`**

Inside `send`, after the malformed-response guard and before dispatching the reply, add:

```ts
if (data.resultsPanel && typeof data.resultsPanel === 'object' && 'kind' in data.resultsPanel) {
  setResultsPanel(data.resultsPanel as ConciergeResult);
}
```

Then include the two new fields in the context provider value:

```ts
resultsPanel, setResultsPanel,
```

- [ ] **Step 4: Type-check**

```bash
cd ~/Documents/GitHub/gleeworld && npx tsc --noEmit
```

Expected: no new errors. Existing errors (if any) unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/lib/assistant/conciergeTypes.ts src/lib/assistant/AssistantProvider.tsx
git commit -m "assistant: resultsPanel state on AssistantProvider (concierge)"
```

---

## Task 8: `AssistantResultsPanel` component with 3 card variants

**Files:**
- Create: `src/components/assistant/AssistantResultsPanel.tsx`
- Create: `src/components/assistant/AssistantResultsPanel.test.tsx`

**Interfaces:**
- Consumes: `ConciergeResult` from `src/lib/assistant/conciergeTypes`.
- Produces: default export `AssistantResultsPanel` accepting `{ result: ConciergeResult; onClose: () => void; className?: string }`. Renders header + one of `RideCard | FoodCard | WebCard`. All anchor buttons open `target="_blank" rel="noopener noreferrer"`.

- [ ] **Step 1: Write failing tests**

Create `src/components/assistant/AssistantResultsPanel.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AssistantResultsPanel } from './AssistantResultsPanel';
import type { ConciergeResult } from '@/lib/assistant/conciergeTypes';

describe('AssistantResultsPanel', () => {
  it('renders ride card with two anchors carrying the deep links', () => {
    const result: ConciergeResult = {
      kind: 'ride', query: 'home', resolvedAddress: '100 Main St',
      uberUrl: 'https://m.uber.com/ul/?x=1', lyftUrl: 'https://ride.lyft.com/ride?y=1',
    };
    render(<AssistantResultsPanel result={result} onClose={() => {}} />);
    expect(screen.getByText(/100 Main St/)).toBeInTheDocument();
    const uber = screen.getByRole('link', { name: /Uber/i });
    const lyft = screen.getByRole('link', { name: /Lyft/i });
    expect(uber).toHaveAttribute('href', result.uberUrl);
    expect(uber).toHaveAttribute('target', '_blank');
    expect(uber).toHaveAttribute('rel', 'noopener noreferrer');
    expect(lyft).toHaveAttribute('href', result.lyftUrl);
  });

  it('renders food card with three services', () => {
    const result: ConciergeResult = {
      kind: 'food', query: 'donuts', services: [
        { name: 'DoorDash', deepLinkUrl: 'https://d.example' },
        { name: 'Uber Eats', deepLinkUrl: 'https://u.example' },
        { name: 'Grubhub', deepLinkUrl: 'https://g.example' },
      ],
    };
    render(<AssistantResultsPanel result={result} onClose={() => {}} />);
    expect(screen.getByText('donuts')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'DoorDash' })).toHaveAttribute('href', 'https://d.example');
    expect(screen.getByRole('link', { name: 'Uber Eats' })).toHaveAttribute('href', 'https://u.example');
    expect(screen.getByRole('link', { name: 'Grubhub' })).toHaveAttribute('href', 'https://g.example');
  });

  it('renders web card with optional answer + result list', () => {
    const result: ConciergeResult = {
      kind: 'web', query: 'q', answer: 'The synthesized answer.',
      results: [
        { title: 'Result A', url: 'https://a.example', snippet: 'snippet a' },
        { title: 'Result B', url: 'https://b.example', snippet: 'snippet b' },
      ],
    };
    render(<AssistantResultsPanel result={result} onClose={() => {}} />);
    expect(screen.getByText(/synthesized answer/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Result A/ })).toHaveAttribute('href', 'https://a.example');
  });

  it('close button calls onClose', () => {
    const onClose = vi.fn();
    const result: ConciergeResult = { kind: 'web', query: 'q', results: [] };
    render(<AssistantResultsPanel result={result} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
npx vitest run src/components/assistant/AssistantResultsPanel.test.tsx
```

Expected: file-not-found on the component.

- [ ] **Step 3: Implement the component**

Create `src/components/assistant/AssistantResultsPanel.tsx`:

```tsx
import { X, Car, Utensils, Globe, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConciergeResult } from '@/lib/assistant/conciergeTypes';

interface Props {
  result: ConciergeResult;
  onClose: () => void;
  className?: string;
}

// Concierge side-panel. Mounted from AssistantSheet next to the chat on
// desktop and stacked above it on phone. Its only external contract is the
// two anchors per result variant — the chat drives everything else.
export function AssistantResultsPanel({ result, onClose, className }: Props) {
  return (
    <div className={cn('flex flex-col h-full bg-card border-l border-border', className)}>
      <header className="flex items-center justify-between px-4 py-2.5 border-b">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {result.kind === 'ride' && <Car className="w-4 h-4 text-amber-600" />}
          {result.kind === 'food' && <Utensils className="w-4 h-4 text-sky-600" />}
          {result.kind === 'web'  && <Globe className="w-4 h-4 text-violet-600" />}
          {result.kind === 'ride' && 'Ride ready'}
          {result.kind === 'food' && 'Order ready'}
          {result.kind === 'web'  && 'Search results'}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close results"
          className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {result.kind === 'ride' && <RideCard result={result} />}
        {result.kind === 'food' && <FoodCard result={result} />}
        {result.kind === 'web'  && <WebCard result={result} />}
      </div>
    </div>
  );
}

function RideCard({ result }: { result: Extract<ConciergeResult, { kind: 'ride' }> }) {
  const uberPrimary = result.preferred !== 'lyft';
  const lyftPrimary = result.preferred === 'lyft';
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Destination</p>
      <p className="text-sm font-medium">{result.resolvedAddress}</p>
      <div className="flex flex-wrap gap-2 pt-2">
        <a
          href={result.uberUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-semibold transition-colors',
            uberPrimary ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'border border-border text-foreground hover:bg-accent',
          )}
        >
          Ride with Uber
        </a>
        <a
          href={result.lyftUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-semibold transition-colors',
            lyftPrimary ? 'bg-pink-500 text-white hover:bg-pink-600'
                        : 'border border-border text-foreground hover:bg-accent',
          )}
        >
          Ride with Lyft
        </a>
      </div>
    </div>
  );
}

function FoodCard({ result }: { result: Extract<ConciergeResult, { kind: 'food' }> }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Searching for</p>
      <p className="text-sm font-medium">{result.query || 'anything'}</p>
      <div className="flex flex-wrap gap-2 pt-2">
        {result.services.map((svc) => (
          <a
            key={svc.name}
            href={svc.deepLinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-semibold transition-colors',
              result.preferred && svcMatches(svc.name, result.preferred)
                ? 'bg-sky-500 text-white hover:bg-sky-600'
                : 'border border-border text-foreground hover:bg-accent',
            )}
          >
            {svc.name}
          </a>
        ))}
      </div>
    </div>
  );
}

function svcMatches(name: 'DoorDash' | 'Uber Eats' | 'Grubhub', preferred: string) {
  if (preferred === 'doordash') return name === 'DoorDash';
  if (preferred === 'ubereats') return name === 'Uber Eats';
  if (preferred === 'grubhub')  return name === 'Grubhub';
  return false;
}

function WebCard({ result }: { result: Extract<ConciergeResult, { kind: 'web' }> }) {
  return (
    <div className="space-y-4">
      {result.answer && (
        <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-violet-600">
            <Sparkles className="w-4 h-4" />
            AI answer
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{result.answer}</p>
        </div>
      )}
      <div className="space-y-3">
        {result.results.length === 0 && (
          <p className="text-sm text-muted-foreground">No results found.</p>
        )}
        {result.results.map((r) => (
          <a
            key={r.url}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-md border border-border p-3 hover:bg-accent transition-colors"
          >
            <p className="text-sm font-medium">{r.title}</p>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{r.snippet}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify PASS**

```bash
npx vitest run src/components/assistant/AssistantResultsPanel.test.tsx
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/assistant/AssistantResultsPanel.tsx src/components/assistant/AssistantResultsPanel.test.tsx
git commit -m "assistant: AssistantResultsPanel with ride/food/web card variants"
```

---

## Task 9: Integrate the panel into `AssistantSheet`

**Files:**
- Modify: `src/components/assistant/AssistantSheet.tsx`

**Interfaces:**
- Consumes: `resultsPanel`, `setResultsPanel` from `useAssistant()` (Task 7). `AssistantResultsPanel` from Task 8.
- Produces: no new exports. Visual behavior: when `resultsPanel` is null the sheet keeps its current shape; when non-null, desktop dialog widens to two columns and phone sheet shows the panel above the chat.

- [ ] **Step 1: Read the current file to note both shell endings**

```bash
sed -n '49,127p;129,215p' src/components/assistant/AssistantSheet.tsx | head -60
```

Confirm which lines to edit: phone sheet is roughly lines 49–127 (returns inside `if (isPhone)`), desktop dialog is 129–215.

- [ ] **Step 2: Update the destructuring at the top**

Change (currently line 24 area):

```ts
const {
  state, send, runAction, cancelAction,
  sheetOpen, setSheetOpen,
  micAvailable, listening, transcript, toggleMic,
  muted, toggleMute,
  speaking, stopSpeaking,
  videoRoom, setVideoRoom,
  resultsPanel, setResultsPanel,
} = useAssistant();
```

Add the import near the other AssistantX imports:

```ts
import { AssistantResultsPanel } from './AssistantResultsPanel';
```

- [ ] **Step 3: Phone shell — stack panel above the chat**

Inside `if (isPhone)` return, the `<SheetContent>` currently contains a header + a flex-column chat region. Wrap them so the panel (when present) sits above the header:

Change the outer `<SheetContent>` structure to:

```tsx
<SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl flex flex-col p-0">
  {resultsPanel && (
    <div className="max-h-[45vh] border-b flex-shrink-0">
      <AssistantResultsPanel
        result={resultsPanel}
        onClose={() => setResultsPanel(null)}
        className="h-full border-l-0"
      />
    </div>
  )}
  <SheetHeader className="px-4 py-2.5 border-b flex-row items-center justify-between space-y-0">
    {/* … unchanged header contents … */}
  </SheetHeader>
  {/* … rest of the phone sheet unchanged … */}
</SheetContent>
```

The panel's own header includes the close X, so no extra button needed.

- [ ] **Step 4: Desktop shell — widen dialog to two columns when panel is present**

The desktop `<DialogPrimitive.Content>` currently has `w-full max-w-2xl`. Update to conditional widths:

```tsx
<DialogPrimitive.Content
  onOpenAutoFocus={(e) => { e.preventDefault(); inputRef.current?.focus(); }}
  className={cn(
    'fixed left-1/2 top-[15%] z-50 -translate-x-1/2 rounded-2xl border bg-card shadow-2xl',
    'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
    resultsPanel ? 'w-full max-w-4xl' : 'w-full max-w-2xl',
  )}
>
```

Add `import { cn } from '@/lib/utils';` at the top.

Then wrap the existing chat content (the `<form>` and the `<div className="border-t px-4 py-3">…</div>` blocks) in a flex row that reserves the right column for the panel:

```tsx
<div className="flex">
  <div className={cn('flex flex-col', resultsPanel ? 'flex-1 border-r' : 'w-full')}>
    {/* form row (unchanged) */}
    {/* border-t suggestions + thread block (unchanged) */}
  </div>
  {resultsPanel && (
    <div className="w-[380px] flex-shrink-0">
      <AssistantResultsPanel
        result={resultsPanel}
        onClose={() => setResultsPanel(null)}
        className="h-full"
      />
    </div>
  )}
</div>
```

Leave `AssistantVideoOverlay` mounted outside the two-column div (still absolute-positioned inside the dialog content) — no interaction with the panel.

- [ ] **Step 5: Build**

```bash
cd ~/Documents/GitHub/gleeworld && npm run build
```

Expected: clean build. If the type-check flags a `resultsPanel is possibly null` inside the wrapper — narrow it in a local variable or with `resultsPanel && (...)` guards (already used in the snippets above).

- [ ] **Step 6: Manual sanity check in dev**

```bash
npm run dev
```

Open `http://localhost:5173/dashboard` in Chrome, open the assistant, type: "Order me donuts". Confirm the desktop dialog widens and the FoodCard appears on the right; close button collapses it. Resize to phone width (390px) and confirm the panel stacks above the chat.

- [ ] **Step 7: Commit**

```bash
git add src/components/assistant/AssistantSheet.tsx
git commit -m "assistant: two-column desktop / stacked phone results panel"
```

---

## Task 10: Concierge suggestion chips

**Files:**
- Modify: `src/components/assistant/AssistantSuggestions.tsx`

**Interfaces:**
- Produces: three additional strings in `ASSISTANT_SUGGESTIONS`.

- [ ] **Step 1: Edit the constant**

```ts
export const ASSISTANT_SUGGESTIONS = [
  "What's on my calendar tomorrow?",
  'Open Studio',
  'Make a note…',
  'Ride home',
  'Order food',
  'Search the web',
] as const;
```

- [ ] **Step 2: Manual check**

Open a fresh assistant (clear session storage or click "Reset" if available) and confirm the chips render and clicking one of the three new ones sends the text and triggers a tool call.

- [ ] **Step 3: Commit**

```bash
git add src/components/assistant/AssistantSuggestions.tsx
git commit -m "assistant: add ride/order/search suggestion chips"
```

---

## Task 11: Deploy + end-to-end verification

**Files:** none (deploy only).

- [ ] **Step 1: Verify branch state**

```bash
cd ~/Documents/GitHub/gleeworld
git status --short
git log --oneline main..HEAD
```

Expected: clean tree, ~10 commits ahead of main, all from this feature.

- [ ] **Step 2: Deploy the edge functions**

The `assistant-chat` and `web-search` functions both need to reach the droplet:

```bash
# Kevin runs these (no leading `!`) — service_role env is in /opt/supabase/.env on the droplet
scp -r supabase/functions/assistant-chat supabase/functions/web-search \
  root@supabase.gleeworld.org:/opt/supabase/volumes/functions/
ssh root@supabase.gleeworld.org "cd /opt/supabase && docker compose restart edge-functions"
```

- [ ] **Step 3: Apply the migration to prod**

Kevin runs the SQL from Task 1 against the prod DB (from his Terminal, not Studio — Studio silently fails on tenant-scoped writes for non-main tenants):

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260726120000_assistant_usage_daily.sql
```

- [ ] **Step 4: Build + deploy the front-end**

```bash
npm run build
# rsync without --delete (never --delete on gleeworld — breaks tenant bootstraps)
rsync -avz dist/ root@gleeworld.org:/opt/gleeworld/dist/
```

- [ ] **Step 5: Verify concierge page is gone**

```bash
curl -sI https://lykehouse.gleeworld.org/dashboard/concierge | head -1
```

Expected: `200 OK` (SPA routes always return the shell) but no ConciergePage in the rendered output — visit in a browser and confirm the page renders the not-found or dashboard landing, NOT the three-panel Concierge page. Also confirm there's no "Concierge" nav entry.

- [ ] **Step 6: Manual QA — one prompt per tool**

In a signed-in browser session on any tenant subdomain:

1. **Ride:** open the assistant, say/type "Take me to the Fox Theatre". Expect: assistant confirms → results panel opens with the address + Uber/Lyft buttons. Click Uber → new tab opens `m.uber.com/ul/?…`.
2. **Food:** "I want donuts". Expect: panel with three service buttons pre-loaded with `?q=donuts`.
3. **Web:** "Search the web for HBCU choral tradition". Expect: panel with a short AI answer + a list of Brave results. Click one → new tab opens the article.

For (1), also test "Ride home" both with and without a `home_address` on the profile — with none set, the assistant should ask; with one set, it should silently resolve.

- [ ] **Step 7: Commit any small polish + open the PR**

```bash
gh pr create --title "assistant: concierge tools (ride, food, web search) with side panel" --body "$(cat <<'EOF'
## Summary
- Fold /dashboard/concierge capabilities into the assistant as three tools (get_ride, order_food, web_search)
- New side-panel on AssistantSheet: two-column desktop, stacked-above-chat phone
- Brave Search + DeepSeek synthesis for web_search, gated by per-tenant daily cap

## Test plan
- [ ] Ride tool with a place name and with "home" (both known + unknown profile home)
- [ ] Food tool with and without a query
- [ ] Web search returns answer + results
- [ ] Daily cap kicks in after 100 web searches
- [ ] Standalone /dashboard/concierge no longer renders the three-panel page
- [ ] Panel closes cleanly; new tool overwrites the panel

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage checked against `docs/superpowers/specs/2026-07-26-assistant-concierge-design.md`:**

- ✓ Three assistant tools (`get_ride`, `order_food`, `web_search`) → Tasks 3, 4, 6
- ✓ Brave + DeepSeek synthesis for web-search → Task 5
- ✓ Google Places geocoding for rides → Task 3
- ✓ Deterministic food deep links → Task 4
- ✓ Home resolution via profiles with chat fallback → Task 3 (executor + tool description)
- ✓ Per-tenant daily cap on web_search → Tasks 1, 6
- ✓ `resultsPanel` state on AssistantProvider mirroring `videoRoom` pattern → Task 7
- ✓ Two-column desktop / stacked phone layout on AssistantSheet → Task 9
- ✓ Three card variants (ride/food/web) → Task 8
- ✓ Concierge suggestion chips → Task 10
- ✓ Cleanup via fresh build (source not in origin/main) → Task 11 (verification step)
- ✓ Global constraints: tenant-neutral copy, light theme, no service worker, no --delete rsync — all echoed in the plan

**Placeholder scan:** No TBD / TODO in step bodies. Every code step has runnable code; every test step has runnable test code.

**Type consistency:**
- `ConciergeResult` defined once in `src/lib/assistant/conciergeTypes.ts` (Task 7), imported by AssistantProvider (Task 7) and AssistantResultsPanel (Task 8). Backend returns matching shape as JSON (Task 2's export from `executors.ts` is duplicated for the Deno runtime — that's intentional because Deno can't import from browser TS paths — but they're kept identical by shape).
- `ToolResult` and `Deps` widening lines up: Task 2 introduces `ToolResult`; Task 3 widens `Deps` with `googleMapsApiKey` + `homeAddress`; Task 6 widens `Deps` again with `webSearchUrl` + `webSearchAuthHeader` + `SupabaseLike.rpc`. index.ts passes all four env-derived deps at the same call site.
- Tool names match across tests, catalog, and executor switch.

Nothing to fix.
