# Video Link Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a member save YouTube links into their own named tabs inside `/video`, alongside the existing upload flow.

**Architecture:** Two new user-scoped tables (`gw_video_collections`, `gw_video_links`) with restrictive tenant RLS. A Deno edge function (`youtube-oembed`) resolves title/author/thumbnail — extracting the video ID *before* any outbound fetch so the function can never be used as an SSRF proxy. `/video` gains page-level **Uploads** / **Links** tabs; Uploads is untouched. Playback is a `youtube-nocookie` iframe.

**Tech Stack:** React 18 + TypeScript, React Query, shadcn/ui, Tailwind, Supabase (self-hosted) + PostgREST, Deno edge functions, vitest.

**Spec:** `docs/superpowers/specs/2026-07-09-video-link-library-design.md` (approved, unchanged)

## Global Constraints

- **Provider is YouTube only in v1.** `provider` column exists with `check (provider in ('youtube'))` so Vimeo is a later constraint change, not a new table. Do not add Vimeo or arbitrary-URL support.
- **Every new table needs BOTH `tenant_id DEFAULT public.current_tenant_id()` AND a `BEFORE INSERT` trigger** filling a NULL `tenant_id`. The restrictive policy `WITH CHECK (tenant_id = current_tenant_id())` silently rejects inserts that don't set it, and PostgREST will happily send `tenant_id: null` from a client payload.
- **Never write a second YouTube URL parser.** `src/lib/youtubeId.ts` exports `getYouTubeId(url: string): string | null` and has 7 passing tests. The Deno copy in `_shared/` must be byte-identical in behavior.
- **The edge function must extract the ID before fetching.** No code path may pass a caller-supplied string into `fetch()`.
- **No CSP change.** Verified 2026-07-18: `index.html` `frame-src` already includes `https://www.youtube-nocookie.com`; `img-src` already allows `https:`. If you find yourself editing the CSP meta tag, you have gone off-plan.
- **Tenant-neutral copy.** Never hardcode a tenant name (e.g. "Spelman") in user-visible strings.
- **Light-theme tokens.** Use `bg-card` / `text-muted-foreground` etc. Never dark-navy cards. Studio chrome minimum: `text-xs`/`text-sm`, `w-4 h-4` icons.
- **Test command:** `npx vitest run <path>`.
- **Typecheck gate is `npx vite build` — NOT `tsc --noEmit`.** `tsconfig.json` sets `"files": []`, so `tsc --noEmit` type-checks nothing and always exits 0. It is a no-op that will report success on broken code.
- **`git add -A` is FORBIDDEN** in this repo (it sweeps in macOS `" 2"` duplicate-file litter). Stage explicit paths only.
- **The suite has ~37 pre-existing failures** in the `sightReading`/`notation` suites. They are not yours. Gate on your own test files plus `npx vite build`, not on a fully green `npx vitest run`.

---

## Pre-flight: isolated worktree

The main checkout (`~/Documents/GitHub/gleeworld`) is on branch `notes-quick-create` with ~10 modified files belonging to a concurrent session. **Do not build there.**

```bash
cd ~/Documents/GitHub/gleeworld
git fetch origin
git worktree add /private/tmp/claude-501/-Users-kevinjohnson/2cc35800-6c17-40fa-a927-505e4ab4bf26/scratchpad/video-links -b feat/video-link-library origin/main
cd /private/tmp/claude-501/-Users-kevinjohnson/2cc35800-6c17-40fa-a927-505e4ab4bf26/scratchpad/video-links
npm ci
```

`npm ci` is required — worktrees do not share `node_modules`. All paths below are relative to this worktree.

---

## File Structure

| Path | Responsibility |
|---|---|
| `supabase/migrations/20260718120000_video_link_library.sql` | Both tables, RLS, triggers, indexes |
| `supabase/functions/_shared/youtubeId.ts` | Deno copy of the URL parser |
| `supabase/functions/_shared/__tests__/youtubeId.test.ts` | Parity tests for the copy |
| `supabase/functions/youtube-oembed/index.ts` | oEmbed lookup, SSRF-safe |
| `supabase/functions/youtube-oembed/__tests__/index.test.ts` | Handler tests incl. no-fetch assertion |
| `src/lib/video/links.ts` | Data layer: collections + links CRUD, oEmbed call |
| `src/lib/video/linkTypes.ts` | `VideoCollection`, `VideoLink` types |
| `src/hooks/useVideoLinks.ts` | React Query hooks |
| `src/components/video-links/AddLinkDialog.tsx` | Paste URL → resolve → pick tab → save |
| `src/components/video-links/CollectionTabs.tsx` | The member's tab strip + create/rename/delete |
| `src/components/video-links/LinkCard.tsx` | One saved video card + its menu |
| `src/components/video-links/LinksTab.tsx` | Composes the three above |
| `src/pages/video/VideoLibrary.tsx` | **Modify:** wrap existing body in Uploads/Links tabs |

Note `src/components/video/` is Jitsi **meeting** UI — unrelated. New components go in `src/components/video-links/` to avoid that trap.

---

### Task 1: Migration — tables, RLS, triggers

**Files:**
- Create: `supabase/migrations/20260718120000_video_link_library.sql`

**Interfaces:**
- Consumes: `public.current_tenant_id()` (existing)
- Produces: tables `gw_video_collections`, `gw_video_links` with the columns named in Task 3's types

- [ ] **Step 1: Write the migration**

```sql
-- Video link library: per-member YouTube links organised into member-defined tabs.
-- Follows gw_studio_videos conventions (20260624020000_studio_videos.sql).

CREATE TABLE IF NOT EXISTS public.gw_video_collections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL DEFAULT public.current_tenant_id(),
  user_id     uuid NOT NULL DEFAULT auth.uid(),
  name        text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, name)
);

CREATE TABLE IF NOT EXISTS public.gw_video_links (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL DEFAULT public.current_tenant_id(),
  user_id       uuid NOT NULL DEFAULT auth.uid(),
  collection_id uuid NOT NULL REFERENCES public.gw_video_collections(id) ON DELETE CASCADE,
  provider      text NOT NULL DEFAULT 'youtube' CHECK (provider IN ('youtube')),
  video_id      text NOT NULL CHECK (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  url           text NOT NULL,
  title         text NOT NULL,
  author        text,
  thumbnail_url text,
  position      integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, collection_id, video_id)
);

CREATE INDEX IF NOT EXISTS gw_video_collections_owner_idx
  ON public.gw_video_collections (tenant_id, user_id, position);

CREATE INDEX IF NOT EXISTS gw_video_links_collection_idx
  ON public.gw_video_links (tenant_id, user_id, collection_id, created_at DESC);

-- ── tenant_id backfill triggers ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.gw_video_collections_fill_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN NEW.tenant_id := current_tenant_id(); END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gw_video_collections_fill_tenant_trg ON public.gw_video_collections;
CREATE TRIGGER gw_video_collections_fill_tenant_trg
  BEFORE INSERT ON public.gw_video_collections
  FOR EACH ROW EXECUTE FUNCTION public.gw_video_collections_fill_tenant();

CREATE OR REPLACE FUNCTION public.gw_video_links_fill_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN NEW.tenant_id := current_tenant_id(); END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gw_video_links_fill_tenant_trg ON public.gw_video_links;
CREATE TRIGGER gw_video_links_fill_tenant_trg
  BEFORE INSERT ON public.gw_video_links
  FOR EACH ROW EXECUTE FUNCTION public.gw_video_links_fill_tenant();

CREATE OR REPLACE FUNCTION public.gw_video_collections_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gw_video_collections_touch_trg ON public.gw_video_collections;
CREATE TRIGGER gw_video_collections_touch_trg
  BEFORE UPDATE ON public.gw_video_collections
  FOR EACH ROW EXECUTE FUNCTION public.gw_video_collections_touch();

-- ── RLS ──────────────────────────────────────────────────────────────

ALTER TABLE public.gw_video_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_video_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_restrict ON public.gw_video_collections
  AS RESTRICTIVE FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_restrict ON public.gw_video_links
  AS RESTRICTIVE FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY video_collections_owner ON public.gw_video_collections
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY video_links_owner ON public.gw_video_links
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

- [ ] **Step 2: Verify the SQL parses**

Run: `npx supabase db lint --file supabase/migrations/20260718120000_video_link_library.sql` — if the CLI is unavailable, skip; Task 1 Step 3 is the real gate.

- [ ] **Step 3: Apply to the live database — STOP AND ASK KEVIN**

The harness blocks Claude from writing to the prod DB. Present this to Kevin to run himself with a leading `!`:

```
! PGPASSWORD=... psql -h supabase.gleeworld.org -U postgres -d postgres -f supabase/migrations/20260718120000_video_link_library.sql
```

Do not proceed to Task 2 until he confirms it applied.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260718120000_video_link_library.sql
git commit -m "feat(video): add gw_video_collections + gw_video_links tables"
```

---

### Task 2: Shared parser copy for Deno

**Files:**
- Create: `supabase/functions/_shared/youtubeId.ts`
- Test: `supabase/functions/_shared/__tests__/youtubeId.test.ts`
- Read (do not modify): `src/lib/youtubeId.ts`

**Interfaces:**
- Produces: `getYouTubeId(url: string): string | null` importable as `../_shared/youtubeId.ts`

- [ ] **Step 1: Write the failing parity test**

```ts
// supabase/functions/_shared/__tests__/youtubeId.test.ts
import { describe, it, expect } from 'vitest';
import { getYouTubeId } from '../youtubeId';

describe('getYouTubeId (Deno shared copy)', () => {
  it('reads watch?v=', () => {
    expect(getYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('reads youtu.be short links', () => {
    expect(getYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('reads /shorts/, /embed/, /live/', () => {
    expect(getYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(getYouTubeId('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(getYouTubeId('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('rejects non-YouTube hosts', () => {
    expect(getYouTubeId('https://evil.example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(getYouTubeId('http://169.254.169.254/latest/meta-data/')).toBeNull();
  });
  it('rejects malformed ids and garbage', () => {
    expect(getYouTubeId('https://www.youtube.com/watch?v=short')).toBeNull();
    expect(getYouTubeId('not a url')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run supabase/functions/_shared/__tests__/youtubeId.test.ts`
Expected: FAIL — `Failed to resolve import "../youtubeId"`

- [ ] **Step 3: Create the copy**

Copy `src/lib/youtubeId.ts` verbatim to `supabase/functions/_shared/youtubeId.ts`, prepending this header comment:

```ts
// Deno copy of src/lib/youtubeId.ts — edge functions cannot import from src/.
// These two files MUST stay behaviourally identical. A parser that disagrees
// with itself across the client/server boundary is how a "valid" URL gets
// saved with an ID the player can't resolve. Change both, or neither.
```

The body is unchanged from `src/lib/youtubeId.ts` (`YT_HOSTS`, `ID_RE`, `getYouTubeId`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run supabase/functions/_shared/__tests__/youtubeId.test.ts src/lib/youtubeId.test.ts`
Expected: PASS, both files (5 new + 7 existing).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/youtubeId.ts supabase/functions/_shared/__tests__/youtubeId.test.ts
git commit -m "feat(video): share YouTube id parser with edge functions"
```

---

### Task 3: The `youtube-oembed` edge function

**Files:**
- Create: `supabase/functions/youtube-oembed/index.ts`
- Test: `supabase/functions/youtube-oembed/__tests__/index.test.ts`

**Interfaces:**
- Consumes: `getYouTubeId` from `../_shared/youtubeId.ts`
- Produces: `handleRequest(req: Request, fetchImpl?: typeof fetch): Promise<Response>` — exported for tests. Success body `{ video_id: string; title: string; author: string | null; thumbnail_url: string | null }`. Upstream-404 body `{ error: 'no_metadata', video_id: string }` with HTTP 200.

**Security note for the implementer:** `supabase/functions/tiktok-oembed/index.ts:43` does the wrong thing — it interpolates the caller's raw URL into the outbound fetch. Copy its CORS scaffolding; do **not** copy its fetch logic.

- [ ] **Step 1: Write the failing tests**

```ts
// supabase/functions/youtube-oembed/__tests__/index.test.ts
import { describe, it, expect, vi } from 'vitest';
import { handleRequest } from '../index';

const post = (body: unknown) =>
  new Request('https://fn.local/youtube-oembed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('youtube-oembed', () => {
  it('rejects a non-YouTube URL AND makes no outbound request', async () => {
    const fetchSpy = vi.fn();
    const res = await handleRequest(post({ url: 'http://169.254.169.254/latest/meta-data/' }), fetchSpy);
    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects a missing url without fetching', async () => {
    const fetchSpy = vi.fn();
    const res = await handleRequest(post({}), fetchSpy);
    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('builds its outbound URL from the extracted id, not the caller string', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ title: 'Never Gonna Give You Up', author_name: 'Rick Astley' }), { status: 200 }),
    );
    await handleRequest(post({ url: 'https://youtu.be/dQw4w9WgXcQ?utm=evil' }), fetchSpy);
    const called = fetchSpy.mock.calls[0][0] as string;
    expect(called).toContain('watch%3Fv%3DdQw4w9WgXcQ');
    expect(called).not.toContain('utm');
  });

  it('returns the oembed shape on success', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ title: 'Never Gonna Give You Up', author_name: 'Rick Astley' }), { status: 200 }),
    );
    const res = await handleRequest(post({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }), fetchSpy);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      video_id: 'dQw4w9WgXcQ',
      title: 'Never Gonna Give You Up',
      author: 'Rick Astley',
      thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    });
  });

  it('turns an upstream 404 into a distinguishable no_metadata result, not a 500', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response('', { status: 404 }));
    const res = await handleRequest(post({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }), fetchSpy);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ error: 'no_metadata', video_id: 'dQw4w9WgXcQ' });
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run supabase/functions/youtube-oembed/__tests__/index.test.ts`
Expected: FAIL — cannot resolve `../index`

- [ ] **Step 3: Implement**

```ts
// supabase/functions/youtube-oembed/index.ts
// Resolve a YouTube URL's title/author/thumbnail for the video link library.
//
// SECURITY: the video id is extracted from the caller's string FIRST, by a pure
// parser. If no valid 11-char id falls out we return 400 having made no network
// request at all. The outbound URL is then rebuilt from the extracted id — the
// caller's string never reaches fetch(). Without that ordering this function is
// an SSRF proxy running inside our infrastructure.
import { getYouTubeId } from '../_shared/youtubeId.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

export async function handleRequest(req: Request, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let url: unknown;
  try {
    ({ url } = await req.json());
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  // Extract first. No fetch happens above this line.
  const videoId = typeof url === 'string' ? getYouTubeId(url) : null;
  if (!videoId) return json({ error: 'not_a_youtube_url' }, 400);

  // Rebuilt from videoId — never from the caller's string.
  const target = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${videoId}`,
  )}`;

  let upstream: Response;
  try {
    upstream = await fetchImpl(target, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; GleeWorld/1.0)' },
    });
  } catch {
    return json({ error: 'upstream_unreachable', video_id: videoId }, 502);
  }

  // Private, deleted or region-blocked. The member may still be able to play it,
  // so this is a soft result the dialog recovers from — not an error.
  if (!upstream.ok) return json({ error: 'no_metadata', video_id: videoId });

  const data = await upstream.json();
  return json({
    video_id: videoId,
    title: typeof data.title === 'string' ? data.title : '',
    author: typeof data.author_name === 'string' ? data.author_name : null,
    thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  });
}

// @ts-ignore Deno global is absent in the vitest environment
if (typeof Deno !== 'undefined' && Deno.serve) Deno.serve((req: Request) => handleRequest(req));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run supabase/functions/youtube-oembed/__tests__/index.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/youtube-oembed/
git commit -m "feat(video): add SSRF-safe youtube-oembed edge function"
```

- [ ] **Step 6: Deploy the function — STOP AND ASK KEVIN**

Real path is `/opt/supabase/volumes/functions/` on the droplet; Deno requires the `.ts` extension on relative imports (already used above). Both `_shared/youtubeId.ts` and `youtube-oembed/index.ts` must be copied. Present the scp/restart commands for Kevin to run with a leading `!`, then wait for confirmation.

---

### Task 4: Types and data layer

**Files:**
- Create: `src/lib/video/linkTypes.ts`, `src/lib/video/links.ts`
- Test: `src/lib/video/__tests__/links.test.ts`

**Interfaces:**
- Consumes: `supabase` client from `@/integrations/supabase/client`; `getYouTubeId` from `@/lib/youtubeId`
- Produces:
  - `type VideoCollection = { id: string; name: string; position: number; created_at: string }`
  - `type VideoLink = { id: string; collection_id: string; provider: 'youtube'; video_id: string; url: string; title: string; author: string | null; thumbnail_url: string | null; position: number; created_at: string }`
  - `type OEmbedResult = { video_id: string; title: string; author: string | null; thumbnail_url: string | null } | { error: 'no_metadata'; video_id: string }`
  - `listCollections(): Promise<VideoCollection[]>`
  - `createCollection(name: string): Promise<VideoCollection>`
  - `renameCollection(id: string, name: string): Promise<void>`
  - `deleteCollection(id: string): Promise<void>`
  - `listLinks(collectionId: string): Promise<VideoLink[]>`
  - `countLinksByCollection(): Promise<Record<string, number>>`
  - `resolveYouTubeUrl(url: string): Promise<OEmbedResult>`
  - `saveLink(input: { collectionId: string; videoId: string; url: string; title: string; author: string | null; thumbnailUrl: string | null }): Promise<VideoLink>`
  - `deleteLink(id: string): Promise<void>`
  - `moveLink(id: string, collectionId: string): Promise<void>`
  - `DUPLICATE_IN_TAB` — the sentinel `Error.message` thrown on unique-constraint violation

- [ ] **Step 1: Write the types**

```ts
// src/lib/video/linkTypes.ts
export type VideoCollection = {
  id: string;
  name: string;
  position: number;
  created_at: string;
};

export type VideoLink = {
  id: string;
  collection_id: string;
  provider: 'youtube';
  video_id: string;
  url: string;
  title: string;
  author: string | null;
  thumbnail_url: string | null;
  position: number;
  created_at: string;
};

export type OEmbedResult =
  | { video_id: string; title: string; author: string | null; thumbnail_url: string | null }
  | { error: 'no_metadata'; video_id: string };
```

- [ ] **Step 2: Write the failing tests**

```ts
// src/lib/video/__tests__/links.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const invoke = vi.fn();
const insert = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
    from: () => ({
      insert: (...a: unknown[]) => insert(...a),
    }),
  },
}));

import { resolveYouTubeUrl, DUPLICATE_IN_TAB, saveLink } from '../links';

beforeEach(() => { invoke.mockReset(); insert.mockReset(); });

describe('resolveYouTubeUrl', () => {
  it('fails fast on an obviously bad paste without calling the function', async () => {
    await expect(resolveYouTubeUrl('not a youtube link')).rejects.toThrow('not_a_youtube_url');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('passes a good URL through to the edge function', async () => {
    invoke.mockResolvedValue({
      data: { video_id: 'dQw4w9WgXcQ', title: 'T', author: 'A', thumbnail_url: 'https://i.ytimg.com/x.jpg' },
      error: null,
    });
    const r = await resolveYouTubeUrl('https://youtu.be/dQw4w9WgXcQ');
    expect(invoke).toHaveBeenCalledWith('youtube-oembed', { body: { url: 'https://youtu.be/dQw4w9WgXcQ' } });
    expect(r).toMatchObject({ video_id: 'dQw4w9WgXcQ', title: 'T' });
  });
});

describe('saveLink', () => {
  it('translates a unique-constraint violation into the duplicate sentinel', async () => {
    insert.mockReturnValue({
      select: () => ({ single: () => Promise.resolve({ data: null, error: { code: '23505', message: 'dup' } }) }),
    });
    await expect(saveLink({
      collectionId: 'c1', videoId: 'dQw4w9WgXcQ', url: 'https://youtu.be/dQw4w9WgXcQ',
      title: 'T', author: null, thumbnailUrl: null,
    })).rejects.toThrow(DUPLICATE_IN_TAB);
  });
});
```

- [ ] **Step 3: Run to confirm failure**

Run: `npx vitest run src/lib/video/__tests__/links.test.ts`
Expected: FAIL — cannot resolve `../links`

- [ ] **Step 4: Implement the data layer**

```ts
// src/lib/video/links.ts
// Data layer for the personal YouTube link library. Rows are user-scoped by RLS;
// we never send tenant_id or user_id — the column defaults and the BEFORE INSERT
// trigger fill them. Sending tenant_id: null explicitly is what the trigger guards.
import { supabase } from '@/integrations/supabase/client';
import { getYouTubeId } from '@/lib/youtubeId';
import type { VideoCollection, VideoLink, OEmbedResult } from './linkTypes';

export const DUPLICATE_IN_TAB = 'Already in this tab';

export async function listCollections(): Promise<VideoCollection[]> {
  const { data, error } = await supabase
    .from('gw_video_collections')
    .select('id, name, position, created_at')
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as VideoCollection[];
}

export async function createCollection(name: string): Promise<VideoCollection> {
  const { data, error } = await supabase
    .from('gw_video_collections')
    .insert({ name: name.trim() })
    .select('id, name, position, created_at')
    .single();
  if (error) throw error;
  return data as VideoCollection;
}

export async function renameCollection(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('gw_video_collections')
    .update({ name: name.trim() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteCollection(id: string): Promise<void> {
  const { error } = await supabase.from('gw_video_collections').delete().eq('id', id);
  if (error) throw error;
}

export async function listLinks(collectionId: string): Promise<VideoLink[]> {
  const { data, error } = await supabase
    .from('gw_video_links')
    .select('id, collection_id, provider, video_id, url, title, author, thumbnail_url, position, created_at')
    .eq('collection_id', collectionId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as VideoLink[];
}

// The tab-delete confirm must state how many videos go with the tab — for EVERY
// tab, not just the one on screen. RLS already limits this to the member's own
// rows, so one id-only select is cheap and we tally client-side.
export async function countLinksByCollection(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('gw_video_links').select('collection_id');
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { collection_id: string }[]) {
    counts[row.collection_id] = (counts[row.collection_id] ?? 0) + 1;
  }
  return counts;
}

// Client-side parse is a convenience so a bad paste fails without a round trip.
// It is never a security control — the edge function parses again regardless.
export async function resolveYouTubeUrl(url: string): Promise<OEmbedResult> {
  if (!getYouTubeId(url)) throw new Error('not_a_youtube_url');
  const { data, error } = await supabase.functions.invoke('youtube-oembed', { body: { url } });
  if (error) throw error;
  return data as OEmbedResult;
}

export async function saveLink(input: {
  collectionId: string;
  videoId: string;
  url: string;
  title: string;
  author: string | null;
  thumbnailUrl: string | null;
}): Promise<VideoLink> {
  const { data, error } = await supabase
    .from('gw_video_links')
    .insert({
      collection_id: input.collectionId,
      provider: 'youtube',
      video_id: input.videoId,
      url: input.url,
      title: input.title,
      author: input.author,
      thumbnail_url: input.thumbnailUrl,
    })
    .select('id, collection_id, provider, video_id, url, title, author, thumbnail_url, position, created_at')
    .single();
  if (error) {
    if (error.code === '23505') throw new Error(DUPLICATE_IN_TAB);
    throw error;
  }
  return data as VideoLink;
}

export async function deleteLink(id: string): Promise<void> {
  const { error } = await supabase.from('gw_video_links').delete().eq('id', id);
  if (error) throw error;
}

export async function moveLink(id: string, collectionId: string): Promise<void> {
  const { error } = await supabase
    .from('gw_video_links')
    .update({ collection_id: collectionId })
    .eq('id', id);
  if (error) throw error;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/video/__tests__/links.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/video/linkTypes.ts src/lib/video/links.ts src/lib/video/__tests__/links.test.ts
git commit -m "feat(video): add video link data layer"
```

---

### Task 5: React Query hooks

**Files:**
- Create: `src/hooks/useVideoLinks.ts`

**Interfaces:**
- Consumes: everything exported from `src/lib/video/links.ts` (Task 4)
- Produces: `useCollections()`, `useCreateCollection()`, `useRenameCollection()`, `useDeleteCollection()`, `useLinks(collectionId: string | null)`, `useSaveLink()`, `useDeleteLink()`, `useMoveLink()`

- [ ] **Step 1: Implement the hooks**

Follow the shape already used in `src/hooks/useStudioVideo.ts`.

```ts
// src/hooks/useVideoLinks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listCollections, createCollection, renameCollection, deleteCollection,
  listLinks, saveLink, deleteLink, moveLink, countLinksByCollection,
} from '@/lib/video/links';

const COLLECTIONS_KEY = ['video-collections'];
const COUNTS_KEY = ['video-link-counts'];
const linksKey = (id: string) => ['video-links', id];

export function useLinkCounts() {
  return useQuery({ queryKey: COUNTS_KEY, queryFn: countLinksByCollection });
}

export function useCollections() {
  return useQuery({ queryKey: COLLECTIONS_KEY, queryFn: listCollections });
}

export function useCreateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createCollection(name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: COLLECTIONS_KEY }); },
  });
}

export function useRenameCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameCollection(id, name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: COLLECTIONS_KEY }); },
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCollection(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: COLLECTIONS_KEY }); },
  });
}

export function useLinks(collectionId: string | null) {
  return useQuery({
    queryKey: linksKey(collectionId ?? 'none'),
    queryFn: () => listLinks(collectionId!),
    enabled: !!collectionId,
  });
}

export function useSaveLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveLink,
    onSuccess: (link) => {
      qc.invalidateQueries({ queryKey: linksKey(link.collection_id) });
      qc.invalidateQueries({ queryKey: COUNTS_KEY });
    },
  });
}

export function useDeleteLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; collectionId: string }) => deleteLink(id),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: linksKey(vars.collectionId) });
      qc.invalidateQueries({ queryKey: COUNTS_KEY });
    },
  });
}

export function useMoveLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, toCollectionId }: { id: string; toCollectionId: string; fromCollectionId: string }) =>
      moveLink(id, toCollectionId),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: linksKey(vars.fromCollectionId) });
      qc.invalidateQueries({ queryKey: linksKey(vars.toCollectionId) });
      qc.invalidateQueries({ queryKey: COUNTS_KEY });
    },
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx vite build`
Expected: build succeeds. (Do not use `tsc --noEmit` — it is a no-op here.)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useVideoLinks.ts
git commit -m "feat(video): add video link query hooks"
```

---

### Task 6: AddLinkDialog

**Files:**
- Create: `src/components/video-links/AddLinkDialog.tsx`
- Test: `src/components/video-links/__tests__/AddLinkDialog.test.tsx`

**Interfaces:**
- Consumes: `resolveYouTubeUrl` (Task 4), `useCollections`/`useCreateCollection`/`useSaveLink` (Task 5)
- Produces: `<AddLinkDialog open onOpenChange collections activeCollectionId />` — props `{ open: boolean; onOpenChange: (o: boolean) => void; collections: VideoCollection[]; activeCollectionId: string | null }`

**Behaviour required by the spec:**
- Paste URL → resolve → title/author/thumbnail populate; title stays editable.
- oEmbed returns `no_metadata` → do **not** refuse the save. Show "Couldn't read the title — type one" and save with the member's title.
- No tabs exist → auto-create one named **Saved**. Nobody should have to invent a taxonomy before saving their first video.
- Duplicate in the same tab → show `DUPLICATE_IN_TAB` ("Already in this tab"), not a Postgres error.
- Function unreachable → block the save with a retry. This is the one acceptable stuck state; the alternative is rows with no title.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/video-links/__tests__/AddLinkDialog.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddLinkDialog } from '../AddLinkDialog';

const resolveYouTubeUrl = vi.fn();
const saveLink = vi.fn();
const createCollection = vi.fn();
vi.mock('@/lib/video/links', async (orig) => ({
  ...(await orig<typeof import('@/lib/video/links')>()),
  resolveYouTubeUrl: (...a: unknown[]) => resolveYouTubeUrl(...a),
  saveLink: (...a: unknown[]) => saveLink(...a),
  createCollection: (...a: unknown[]) => createCollection(...a),
  listCollections: () => Promise.resolve([]),
}));

const wrap = (ui: React.ReactNode) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

beforeEach(() => { resolveYouTubeUrl.mockReset(); saveLink.mockReset(); createCollection.mockReset(); });

describe('AddLinkDialog', () => {
  it('auto-creates a "Saved" tab when the member has none', async () => {
    resolveYouTubeUrl.mockResolvedValue({
      video_id: 'dQw4w9WgXcQ', title: 'T', author: 'A', thumbnail_url: 'https://i.ytimg.com/x.jpg',
    });
    createCollection.mockResolvedValue({ id: 'new-c', name: 'Saved', position: 0, created_at: '' });
    saveLink.mockResolvedValue({ id: 'l1', collection_id: 'new-c' });

    wrap(<AddLinkDialog open onOpenChange={() => {}} collections={[]} activeCollectionId={null} />);
    await userEvent.type(screen.getByLabelText(/youtube url/i), 'https://youtu.be/dQw4w9WgXcQ');
    await waitFor(() => expect(screen.getByDisplayValue('T')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(createCollection).toHaveBeenCalledWith('Saved'));
    expect(saveLink).toHaveBeenCalledWith(expect.objectContaining({ collectionId: 'new-c' }));
  });

  it('stays usable with a manual title when metadata cannot be read', async () => {
    resolveYouTubeUrl.mockResolvedValue({ error: 'no_metadata', video_id: 'dQw4w9WgXcQ' });
    saveLink.mockResolvedValue({ id: 'l1', collection_id: 'c1' });

    wrap(<AddLinkDialog open onOpenChange={() => {}}
      collections={[{ id: 'c1', name: 'Warm-ups', position: 0, created_at: '' }]} activeCollectionId="c1" />);
    await userEvent.type(screen.getByLabelText(/youtube url/i), 'https://youtu.be/dQw4w9WgXcQ');
    await waitFor(() => expect(screen.getByText(/couldn't read the title/i)).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText(/title/i), 'My warm-up');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(saveLink).toHaveBeenCalledWith(expect.objectContaining({ title: 'My warm-up' })));
  });

  it('shows a friendly message when the video is already in the tab', async () => {
    resolveYouTubeUrl.mockResolvedValue({
      video_id: 'dQw4w9WgXcQ', title: 'T', author: null, thumbnail_url: null,
    });
    saveLink.mockRejectedValue(new Error('Already in this tab'));

    wrap(<AddLinkDialog open onOpenChange={() => {}}
      collections={[{ id: 'c1', name: 'Warm-ups', position: 0, created_at: '' }]} activeCollectionId="c1" />);
    await userEvent.type(screen.getByLabelText(/youtube url/i), 'https://youtu.be/dQw4w9WgXcQ');
    await waitFor(() => expect(screen.getByDisplayValue('T')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(screen.getByText(/already in this tab/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/components/video-links/__tests__/AddLinkDialog.test.tsx`
Expected: FAIL — cannot resolve `../AddLinkDialog`

- [ ] **Step 3: Implement**

```tsx
// src/components/video-links/AddLinkDialog.tsx
// Paste a YouTube URL → resolve metadata → pick a tab → save.
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { resolveYouTubeUrl, saveLink, createCollection } from '@/lib/video/links';
import { getYouTubeId } from '@/lib/youtubeId';
import type { VideoCollection } from '@/lib/video/linkTypes';
import { useQueryClient } from '@tanstack/react-query';

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  collections: VideoCollection[];
  activeCollectionId: string | null;
};

export function AddLinkDialog({ open, onOpenChange, collections, activeCollectionId }: Props) {
  const qc = useQueryClient();
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState<string | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(activeCollectionId);
  const [resolving, setResolving] = useState(false);
  const [noMetadata, setNoMetadata] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onUrlChange = async (value: string) => {
    setUrl(value);
    setError(null); setNoMetadata(false); setBlocked(false);
    const id = getYouTubeId(value);
    if (!id) { setVideoId(null); return; }
    setResolving(true);
    try {
      const r = await resolveYouTubeUrl(value);
      if ('error' in r) {
        setVideoId(r.video_id); setNoMetadata(true);
        setTitle(''); setAuthor(null); setThumb(null);
      } else {
        setVideoId(r.video_id); setTitle(r.title); setAuthor(r.author); setThumb(r.thumbnail_url);
      }
    } catch {
      // No title means no usable row. Block the save rather than write junk.
      setBlocked(true);
    } finally {
      setResolving(false);
    }
  };

  const canSave = !!videoId && title.trim().length > 0 && !blocked && !saving;

  const onSave = async () => {
    if (!videoId) return;
    setSaving(true); setError(null);
    try {
      // Nobody should have to invent a taxonomy before saving their first video.
      let collectionId = target ?? activeCollectionId ?? collections[0]?.id ?? null;
      if (!collectionId) {
        const created = await createCollection('Saved');
        collectionId = created.id;
        qc.invalidateQueries({ queryKey: ['video-collections'] });
      }
      await saveLink({
        collectionId, videoId, url,
        title: title.trim(), author, thumbnailUrl: thumb,
      });
      qc.invalidateQueries({ queryKey: ['video-links', collectionId] });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="text-base">Add a video link</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="yt-url" className="text-xs">YouTube URL</Label>
            <Input id="yt-url" value={url} onChange={(e) => onUrlChange(e.target.value)}
              placeholder="https://youtube.com/watch?v=…" className="text-sm" />
          </div>

          {resolving && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Reading video details…
            </p>
          )}
          {noMetadata && (
            <p className="text-xs text-muted-foreground">Couldn't read the title — type one.</p>
          )}
          {blocked && (
            <p className="text-xs text-rose-600">
              Couldn't reach YouTube.{' '}
              <button type="button" className="underline" onClick={() => onUrlChange(url)}>Retry</button>
            </p>
          )}

          {thumb && <img src={thumb} alt="" className="w-full rounded aspect-video object-cover" />}

          {videoId && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="yt-title" className="text-xs">Title</Label>
                <Input id="yt-title" value={title} onChange={(e) => setTitle(e.target.value)} className="text-sm" />
              </div>
              {collections.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Tab</Label>
                  <Select value={target ?? undefined} onValueChange={setTarget}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Choose a tab" /></SelectTrigger>
                    <SelectContent>
                      {collections.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={onSave} disabled={!canSave}>
            {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/video-links/__tests__/AddLinkDialog.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/video-links/AddLinkDialog.tsx src/components/video-links/__tests__/AddLinkDialog.test.tsx
git commit -m "feat(video): add link dialog with oembed lookup"
```

---

### Task 7: LinkCard and CollectionTabs

**Files:**
- Create: `src/components/video-links/LinkCard.tsx`, `src/components/video-links/CollectionTabs.tsx`
- Test: `src/components/video-links/__tests__/CollectionTabs.test.tsx`

**Interfaces:**
- Consumes: `VideoLink`, `VideoCollection` (Task 4); `useCreateCollection`, `useRenameCollection`, `useDeleteCollection`, `useDeleteLink`, `useMoveLink` (Task 5)
- Produces:
  - `<LinkCard link collections onPlay />` — props `{ link: VideoLink; collections: VideoCollection[]; onPlay: (link: VideoLink) => void }`
  - `<CollectionTabs collections activeId onSelect linkCounts />` — props `{ collections: VideoCollection[]; activeId: string | null; onSelect: (id: string) => void; linkCounts: Record<string, number> }`

**Behaviour required by the spec:**
- Deleting a tab cascades its links; the confirm dialog must state **how many videos** go with it.
- A thumbnail that 404s renders a placeholder with the title and a "may no longer be available" hint. Never auto-delete the member's row.
- Card menu offers Move to tab…, Rename, Remove.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/video-links/__tests__/CollectionTabs.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CollectionTabs } from '../CollectionTabs';

const deleteCollection = vi.fn();
vi.mock('@/lib/video/links', async (orig) => ({
  ...(await orig<typeof import('@/lib/video/links')>()),
  deleteCollection: (...a: unknown[]) => deleteCollection(...a),
}));

const wrap = (ui: React.ReactNode) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

beforeEach(() => { deleteCollection.mockReset(); });

describe('CollectionTabs', () => {
  it('warns with the correct video count before deleting a tab', async () => {
    wrap(<CollectionTabs
      collections={[{ id: 'c1', name: 'Warm-ups', position: 0, created_at: '' }]}
      activeId="c1" onSelect={() => {}} linkCounts={{ c1: 3 }} />);

    await userEvent.click(screen.getByRole('button', { name: /warm-ups options/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /delete/i }));

    await waitFor(() => expect(screen.getByText(/3 videos/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/components/video-links/__tests__/CollectionTabs.test.tsx`
Expected: FAIL — cannot resolve `../CollectionTabs`

- [ ] **Step 3: Implement LinkCard**

```tsx
// src/components/video-links/LinkCard.tsx
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Play } from 'lucide-react';
import { toast } from 'sonner';
import { useDeleteLink, useMoveLink } from '@/hooks/useVideoLinks';
import type { VideoLink, VideoCollection } from '@/lib/video/linkTypes';

export function LinkCard({ link, collections, onPlay }: {
  link: VideoLink;
  collections: VideoCollection[];
  onPlay: (link: VideoLink) => void;
}) {
  // A video deleted on YouTube after we saved it 404s its thumbnail. We show a
  // placeholder and a hint — we never delete the member's row on their behalf.
  const [thumbBroken, setThumbBroken] = useState(false);
  const del = useDeleteLink();
  const move = useMoveLink();

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <button type="button" onClick={() => onPlay(link)} className="block w-full text-left">
        <div className="aspect-video bg-muted flex items-center justify-center relative">
          {link.thumbnail_url && !thumbBroken ? (
            <img src={link.thumbnail_url} alt="" onError={() => setThumbBroken(true)}
              className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <Play className="w-8 h-8 text-primary/60" />
          )}
        </div>
      </button>
      <CardContent className="p-3 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-sm leading-tight truncate">{link.title}</div>
            {link.author && <div className="text-xs text-muted-foreground truncate">{link.author}</div>}
            {thumbBroken && (
              <div className="text-xs text-muted-foreground">This video may no longer be available.</div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0"
                aria-label={`${link.title} options`}>
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-sm">Move to tab…</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {collections.filter((c) => c.id !== link.collection_id).map((c) => (
                    <DropdownMenuItem key={c.id} className="text-sm" onClick={async () => {
                      try {
                        await move.mutateAsync({
                          id: link.id, toCollectionId: c.id, fromCollectionId: link.collection_id,
                        });
                        toast.success(`Moved to ${c.name}`);
                      } catch (e) {
                        toast.error('Could not move', {
                          description: e instanceof Error ? e.message : String(e),
                        });
                      }
                    }}>{c.name}</DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem className="text-sm" onClick={async () => {
                try {
                  await del.mutateAsync({ id: link.id, collectionId: link.collection_id });
                  toast.success('Removed');
                } catch (e) {
                  toast.error('Could not remove', {
                    description: e instanceof Error ? e.message : String(e),
                  });
                }
              }}>Remove</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Implement CollectionTabs**

```tsx
// src/components/video-links/CollectionTabs.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateCollection, useRenameCollection, useDeleteCollection } from '@/hooks/useVideoLinks';
import type { VideoCollection } from '@/lib/video/linkTypes';

export function CollectionTabs({ collections, activeId, onSelect, linkCounts }: {
  collections: VideoCollection[];
  activeId: string | null;
  onSelect: (id: string) => void;
  linkCounts: Record<string, number>;
}) {
  const create = useCreateCollection();
  const rename = useRenameCollection();
  const remove = useDeleteCollection();
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<VideoCollection | null>(null);

  const submitNew = async () => {
    const name = draft.trim();
    if (!name) { setCreating(false); return; }
    try {
      const c = await create.mutateAsync(name);
      onSelect(c.id);
      setDraft(''); setCreating(false);
    } catch (e) {
      toast.error('Could not create tab', { description: e instanceof Error ? e.message : String(e) });
    }
  };

  const count = pendingDelete ? (linkCounts[pendingDelete.id] ?? 0) : 0;

  return (
    <>
      <div className="flex items-center gap-1 flex-wrap border-b pb-2">
        {collections.map((c) => (
          <div key={c.id} className="flex items-center">
            {renamingId === c.id ? (
              <Input
                autoFocus defaultValue={c.name} className="h-7 w-32 text-sm"
                onKeyDown={async (e) => {
                  if (e.key === 'Escape') setRenamingId(null);
                  if (e.key === 'Enter') {
                    const name = (e.target as HTMLInputElement).value.trim();
                    if (name) {
                      try { await rename.mutateAsync({ id: c.id, name }); }
                      catch (err) { toast.error('Could not rename', { description: err instanceof Error ? err.message : String(err) }); }
                    }
                    setRenamingId(null);
                  }
                }}
                onBlur={() => setRenamingId(null)}
              />
            ) : (
              <>
                <Button variant={activeId === c.id ? 'secondary' : 'ghost'} size="sm"
                  className="text-sm h-7" onClick={() => onSelect(c.id)}>
                  {c.name}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-6 p-0"
                      aria-label={`${c.name} options`}>
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem className="text-sm" onClick={() => setRenamingId(c.id)}>Rename</DropdownMenuItem>
                    <DropdownMenuItem className="text-sm" onClick={() => setPendingDelete(c)}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        ))}

        {creating ? (
          <Input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
            placeholder="Tab name" className="h-7 w-32 text-sm"
            onKeyDown={(e) => { if (e.key === 'Enter') submitNew(); if (e.key === 'Escape') { setDraft(''); setCreating(false); } }}
            onBlur={submitNew} />
        ) : (
          <Button variant="ghost" size="sm" className="h-7 text-sm" onClick={() => setCreating(true)}
            aria-label="New tab">
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Delete "{pendingDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {count === 0
                ? 'This tab is empty.'
                : `${count} ${count === 1 ? 'video' : 'videos'} saved in this tab will be removed too.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction className="text-sm" onClick={async () => {
              if (!pendingDelete) return;
              try { await remove.mutateAsync(pendingDelete.id); toast.success('Tab deleted'); }
              catch (e) { toast.error('Could not delete', { description: e instanceof Error ? e.message : String(e) }); }
              setPendingDelete(null);
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/video-links/__tests__/CollectionTabs.test.tsx`
Expected: PASS, 1 test.

- [ ] **Step 6: Commit**

```bash
git add src/components/video-links/LinkCard.tsx src/components/video-links/CollectionTabs.tsx src/components/video-links/__tests__/CollectionTabs.test.tsx
git commit -m "feat(video): add link card and collection tab strip"
```

---

### Task 8: LinksTab — compose, with the player

**Files:**
- Create: `src/components/video-links/LinksTab.tsx`

**Interfaces:**
- Consumes: `CollectionTabs` (Task 7), `LinkCard` (Task 7), `AddLinkDialog` (Task 6), `useCollections`/`useLinks` (Task 5)
- Produces: `<LinksTab />` — no props

**Playback note:** a `youtube-nocookie.com/embed/<id>` iframe. We are **playing, not instrumenting**. If progress tracking is ever added, note that raw-postMessage YouTube embeds never emit `onStateChange` — you must read `infoDelivery.playerState`. That is required reading before writing player code, and is out of scope here.

- [ ] **Step 1: Implement**

```tsx
// src/components/video-links/LinksTab.tsx
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, Link2 } from 'lucide-react';
import { useCollections, useLinks, useLinkCounts } from '@/hooks/useVideoLinks';
import { AddLinkDialog } from './AddLinkDialog';
import { CollectionTabs } from './CollectionTabs';
import { LinkCard } from './LinkCard';
import type { VideoLink } from '@/lib/video/linkTypes';

export function LinksTab() {
  const collections = useCollections();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [playing, setPlaying] = useState<VideoLink | null>(null);

  const list = collections.data ?? [];
  useEffect(() => {
    if (!activeId && list.length > 0) setActiveId(list[0].id);
    if (activeId && !list.some((c) => c.id === activeId)) setActiveId(list[0]?.id ?? null);
  }, [list, activeId]);

  const links = useLinks(activeId);
  // Counts for EVERY tab, so the delete confirm is honest about a tab the
  // member isn't currently looking at.
  const counts = useLinkCounts();
  const linkCounts = counts.data ?? {};

  if (collections.isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {list.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          <CollectionTabs collections={list} activeId={activeId} onSelect={setActiveId} linkCounts={linkCounts} />
          <Button size="sm" onClick={() => setAdding(true)} className="shrink-0">
            <Plus className="w-4 h-4 mr-1.5" /> Add link
          </Button>
        </div>
      )}

      {list.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground space-y-3">
            <Link2 className="w-8 h-8 mx-auto opacity-40" />
            <p>No saved links yet.</p>
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Save your first video
            </Button>
          </CardContent>
        </Card>
      ) : links.isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading videos…
        </div>
      ) : (links.data ?? []).length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nothing in this tab yet.
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {links.data!.map((l) => (
            <li key={l.id}>
              <LinkCard link={l} collections={list} onPlay={setPlaying} />
            </li>
          ))}
        </ul>
      )}

      <AddLinkDialog open={adding} onOpenChange={setAdding} collections={list} activeCollectionId={activeId} />

      <Dialog open={!!playing} onOpenChange={(o) => !o && setPlaying(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle className="text-base">{playing?.title}</DialogTitle></DialogHeader>
          {playing && (
            <iframe
              className="w-full aspect-video rounded"
              src={`https://www.youtube-nocookie.com/embed/${playing.video_id}`}
              title={playing.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx vite build`
Expected: build succeeds. (Do not use `tsc --noEmit` — it is a no-op here.)

- [ ] **Step 3: Commit**

```bash
git add src/components/video-links/LinksTab.tsx
git commit -m "feat(video): compose links tab with nocookie player"
```

---

### Task 9: Wire Uploads/Links tabs into `/video`

**Files:**
- Modify: `src/pages/video/VideoLibrary.tsx`

**Interfaces:**
- Consumes: `<LinksTab />` (Task 8)
- Produces: nothing downstream — this is the last task.

The existing upload flow must be **unchanged in behaviour**. Move its current body into the Uploads tab verbatim; do not refactor it.

- [ ] **Step 1: Extract the current body into an `UploadsTab` component**

In `src/pages/video/VideoLibrary.tsx`, everything currently rendered *inside* `<DashboardPageShell>` (the progress card at lines 77-90 and the list at 92-140) moves into a new local component `function UploadsTab({ fileInput, upload, videos, owner, del })` in the same file. The `Thumbnail` and `StatusBadge` helpers stay where they are.

- [ ] **Step 2: Add the page-level tabs**

The `DashboardPageShell` body becomes:

```tsx
<Tabs value={tab} onValueChange={setTab} className="space-y-3">
  <TabsList>
    <TabsTrigger value="uploads" className="text-sm">Uploads</TabsTrigger>
    <TabsTrigger value="links" className="text-sm">Links</TabsTrigger>
  </TabsList>
  <TabsContent value="uploads">
    <UploadsTab fileInput={fileInput} upload={upload} videos={videos} owner={owner} del={del} />
  </TabsContent>
  <TabsContent value="links">
    <LinksTab />
  </TabsContent>
</Tabs>
```

with `const [tab, setTab] = useState('uploads');` in `VideoLibrary`, and imports:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LinksTab } from '@/components/video-links/LinksTab';
```

The "Upload video" button in `actions` should render only when `tab === 'uploads'`, so the header action matches the visible tab.

- [ ] **Step 3: Typecheck and run the feature suites**

Run: `npx vite build && npx vitest run src/lib/video src/components/video-links supabase/functions`
Expected: build succeeds; all feature tests pass. The ~37 pre-existing `sightReading`/`notation` failures are out of scope — do not attempt to fix them.

- [ ] **Step 4: Verify in the real app**

Use the `Documents/GitHub/gleeworld:verify` skill (preview server + Playwright at phone and desktop viewports). Confirm by observation, not assumption:
- `/video` shows both tabs; Uploads still lists existing videos and the upload button still works.
- Pasting a YouTube URL resolves a title and thumbnail.
- Saving with no tabs creates "Saved".
- The saved card plays in the `youtube-nocookie` iframe.
- No CSP violations in the console.

- [ ] **Step 5: Commit and open the PR**

```bash
git add src/pages/video/VideoLibrary.tsx
git commit -m "feat(video): add Uploads/Links tabs to /video"
git push -u origin feat/video-link-library
gh pr create --title "feat(video): YouTube link library" --body "Implements docs/superpowers/specs/2026-07-09-video-link-library-design.md — the design merged in PR #127 with no implementation.

- gw_video_collections + gw_video_links, user-scoped, restrictive tenant RLS
- youtube-oembed edge function; video id extracted before any outbound fetch (no SSRF)
- /video gains Uploads/Links tabs; upload flow unchanged
- No CSP change needed (frame-src already allows youtube-nocookie)

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

---

## Deploy order

Per the spec: **migration → edge function → SPA build**. The edge function is independently deployable and the SPA does not call it until the Links tab ships. The migration is additive with no backfill, so it can land ahead of the UI.

SPA deploy: build locally, `rsync dist/` — **never** with `--delete` (tenant bootstrap files are not in `dist/`). The iOS app bundles `dist/`, so this web deploy does not reach it; a TestFlight build is a separate decision.

## Follow-ups explicitly not in this plan

- `supabase/functions/tiktok-oembed/index.ts:43` interpolates a caller-supplied URL into an outbound fetch — the SSRF shape this feature was designed to avoid. Worth its own fix.
- `/youtube` is routed at `src/App.tsx:2132` but absent from `navCatalog.ts` and `appDestinations.ts` — unreachable except by typing the URL.
- Ten empty video-related tables (`gw_youtube_videos`, `youtube_channels`, …) are audit-and-drop candidates. Worth doing, not smuggled into a feature build.
- Deferred by the spec: Vimeo/arbitrary URLs, drag-and-drop reordering, sharing, playback progress.
