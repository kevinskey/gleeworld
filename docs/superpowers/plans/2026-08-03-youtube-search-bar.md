# YouTube Search Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put a YouTube search field to the right of the "Video Library" title on `/video`, so any signed-in user can search YouTube and preview results, while only admins can add a result to the library.

**Architecture:** The search already exists inside the admin-only `AddYouTubeVideoForm` dialog. Extract its two reusable halves — the edge-function search and the row insert — into a hook and a lib module, then build a header field and results panel on top of them and wire both into `YouTubeChannel`. The dialog is rewired to consume the same units, so there is one search implementation and one insert path.

**Tech Stack:** React 18 + TypeScript, Vite, Tailwind + shadcn/Radix, Supabase JS client, Vitest + @testing-library/react.

## Global Constraints

- **No migration, no RLS change.** `youtube_videos` writes stay admin-only per `20260216024654`. Anything requiring a schema change is out of scope.
- **`+ Add` renders only for `isAdmin()`** from `useUserRole()`. Everyone signed in gets search and preview.
- **The header bar searches on Enter or button click only — never per keystroke.** Each search costs ~100 units of a 10,000/day platform-wide YouTube quota. The dialog keeps its existing 300ms debounce.
- **Preserve `channel_id: null as unknown as string`** in the insert. That column is a UUID FK; a non-UUID string like `'manual-upload'` fails every insert.
- Component tests need `// @vitest-environment jsdom` as line 1 — `vitest.config.ts` sets `environment: 'node'` globally.
- Mock the client with `vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: vi.fn() } } }))`, matching `src/components/assistant/AssistantSheet.test.tsx:13`.
- Run `npm run typecheck:guard` before each commit. It diffs against `.typecheck-baseline.txt`; never edit that file.

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/videoLibrary.ts` (create) | `addVideoToLibrary()` and `youTubeSource()`. The only place that inserts a `youtube_videos` row. |
| `src/hooks/useYouTubeSearch.ts` (create) | Calls the `youtube-search` edge function. Owns race-cancellation, loading, and human-readable errors. |
| `src/components/youtube/YouTubeSearchField.tsx` (create) | The header input. Local draft text; submits on Enter or button. |
| `src/components/youtube/YouTubeResultsPanel.tsx` (create) | Renders hits, empty/loading/error states, and per-hit Preview / Add / In-library. |
| `src/components/youtube/AddYouTubeVideoForm.tsx` (modify) | Drops its private copies of both extracted units. |
| `src/pages/YouTubeChannel.tsx` (modify) | Owns the hook; places the field in the header and the panel in the grid slot. |

---

### Task 1: Extract the insert path into `src/lib/videoLibrary.ts`

`AddYouTubeVideoForm` currently owns the only insert. `insertSource` (line 160) is already pure and returns an outcome — lift it verbatim. `insertRow` (line 193) is the toasting wrapper and stays in the component.

**Files:**
- Create: `src/lib/videoLibrary.ts`
- Create: `src/lib/videoLibrary.test.ts`
- Modify: `src/components/youtube/AddYouTubeVideoForm.tsx`

**Interfaces:**
- Consumes: `ParsedVideoSource`, `providerLabel` from `@/lib/videoSources`.
- Produces:
  - `type AddOutcome = 'added' | 'duplicate' | 'failed'`
  - `interface AddVideoResult { outcome: AddOutcome; message?: string }`
  - `addVideoToLibrary(source: ParsedVideoSource, providedTitle: string): Promise<AddVideoResult>`
  - `youTubeSource(videoId: string): ParsedVideoSource`

- [ ] **Step 1: Write the failing test**

Create `src/lib/videoLibrary.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const insertMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ insert: (...a: unknown[]) => insertMock(...a) }) },
}));

import { addVideoToLibrary, youTubeSource } from './videoLibrary';

// insert(...).select() is the shape the real client returns.
const resolving = (value: unknown) => ({ select: () => Promise.resolve(value) });

beforeEach(() => insertMock.mockReset());

describe('youTubeSource', () => {
  it('builds canonical, embed, and thumbnail URLs from a video id', () => {
    expect(youTubeSource('abc123')).toEqual({
      provider: 'youtube',
      videoId: 'abc123',
      embedUrl: 'https://www.youtube.com/embed/abc123',
      canonicalUrl: 'https://www.youtube.com/watch?v=abc123',
      thumbnailUrl: 'https://img.youtube.com/vi/abc123/hqdefault.jpg',
    });
  });
});

describe('addVideoToLibrary', () => {
  it('reports added when a row comes back', async () => {
    insertMock.mockReturnValue(resolving({ data: [{ id: 'row-1' }], error: null }));
    const result = await addVideoToLibrary(youTubeSource('abc123'), 'Hallelujah');
    expect(result).toEqual({ outcome: 'added' });
  });

  it('sends channel_id as null so the UUID FK accepts the row', async () => {
    insertMock.mockReturnValue(resolving({ data: [{ id: 'row-1' }], error: null }));
    await addVideoToLibrary(youTubeSource('abc123'), 'Hallelujah');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        video_id: 'abc123',
        channel_id: null,
        title: 'Hallelujah',
        video_url: 'https://www.youtube.com/watch?v=abc123',
      }),
    );
  });

  it('falls back to the video id when no title is provided', async () => {
    insertMock.mockReturnValue(resolving({ data: [{ id: 'row-1' }], error: null }));
    await addVideoToLibrary(youTubeSource('abc123'), '');
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'abc123' }));
  });

  it('maps a 23505 unique violation to duplicate rather than throwing', async () => {
    insertMock.mockReturnValue(resolving({ data: null, error: { code: '23505', message: 'dupe' } }));
    const result = await addVideoToLibrary(youTubeSource('abc123'), 'Hallelujah');
    expect(result).toEqual({ outcome: 'duplicate' });
  });

  it('reports failed with the message on any other error', async () => {
    insertMock.mockReturnValue(resolving({ data: null, error: { code: '42501', message: 'denied' } }));
    const result = await addVideoToLibrary(youTubeSource('abc123'), 'Hallelujah');
    expect(result).toEqual({ outcome: 'failed', message: 'denied' });
  });

  it('treats an empty row set as failed — RLS silently returns no rows', async () => {
    insertMock.mockReturnValue(resolving({ data: [], error: null }));
    const result = await addVideoToLibrary(youTubeSource('abc123'), 'Hallelujah');
    expect(result.outcome).toBe('failed');
    expect(result.message).toMatch(/permission/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/videoLibrary.test.ts`
Expected: FAIL — cannot resolve `./videoLibrary`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/videoLibrary.ts`:

```ts
// The single place a youtube_videos row gets created. Both the /video header
// search and the Add-video dialog (search, paste-URL, and upload modes) go
// through addVideoToLibrary so there is one insert shape to keep correct.
//
// Note youtube_videos writes are admin-only at the RLS level (migration
// 20260216024654 replaced the old permissive policies with
// "Admins can manage youtube videos"). A non-admin call resolves to
// { outcome: 'failed' } with an empty row set rather than throwing — callers
// should gate the UI on isAdmin() rather than relying on this to explain it.
import { supabase } from '@/integrations/supabase/client';
import { providerLabel, type ParsedVideoSource } from '@/lib/videoSources';

export type AddOutcome = 'added' | 'duplicate' | 'failed';

export interface AddVideoResult {
  outcome: AddOutcome;
  message?: string;
}

// A YouTube video id is all the header search gets back, so build the rest of
// the source shape here rather than at each call site.
export function youTubeSource(videoId: string): ParsedVideoSource {
  return {
    provider: 'youtube',
    videoId,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  };
}

// Reports an outcome instead of toasting, so a bulk paste can tally a whole
// batch while a single add keeps its one-video-shaped message.
export async function addVideoToLibrary(
  source: ParsedVideoSource,
  providedTitle: string,
): Promise<AddVideoResult> {
  try {
    const { data, error } = await supabase
      .from('youtube_videos')
      .insert({
        video_id: source.videoId,
        // NOT a channels row — see clientActions.ts add_video for why null is
        // correct here and 'manual-upload' (a string) is not: this column is a
        // UUID FK and a non-UUID string fails every insert.
        channel_id: null as unknown as string,
        title:
          providedTitle ||
          (source.provider === 'youtube'
            ? source.videoId
            : `${providerLabel(source.provider)} video`),
        thumbnail_url: source.thumbnailUrl ?? '',
        video_url: source.canonicalUrl,
        published_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      if (error.code === '23505') return { outcome: 'duplicate' };
      return { outcome: 'failed', message: error.message };
    }
    if (!data?.length) {
      return { outcome: 'failed', message: 'No row was returned — check permissions.' };
    }
    return { outcome: 'added' };
  } catch (err) {
    return { outcome: 'failed', message: err instanceof Error ? err.message : 'Unknown error' };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/videoLibrary.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Rewire `AddYouTubeVideoForm` to the shared module**

In `src/components/youtube/AddYouTubeVideoForm.tsx`:

1. Add to the imports:

```ts
import { addVideoToLibrary, youTubeSource, type AddOutcome } from '@/lib/videoLibrary';
```

2. Delete the local `type AddOutcome = 'added' | 'duplicate' | 'failed';` (line 27) — it now comes from the import. If after the edits below nothing in the file still names `AddOutcome` (the bulk-paste tally is the likely user), drop it from the import too — an unused import fails lint.

3. Delete the whole `insertSource` function (lines 160-191).

4. In `insertRow`, replace `const result = await insertSource(source, providedTitle);` with:

```ts
      const result = await addVideoToLibrary(source, providedTitle);
```

5. Replace the body of `addYouTube` with the shared source builder:

```ts
  const addYouTube = async (videoId: string, videoTitle: string) => {
    await insertRow(youTubeSource(videoId), videoTitle);
  };
```

6. Search the file for any other `insertSource(` call (the bulk-paste path has one) and change each to `addVideoToLibrary(`.

7. Fix the stale RLS comment in the header block (lines 88-93). Replace:

```
// Gating who SEES this form is the caller's job (YouTubeChannel checks
// useUserRole().isAdmin) — this component assumes it should render. Note
// youtube_videos RLS is WITH CHECK (true) for any authenticated user,
// so the real access control here is UI-only; a signed-in non-admin who
// reaches this component via devtools could still insert. Tightening
// that is an RLS change, not a UI one.
```

with:

```
// Gating who SEES this form is the caller's job (YouTubeChannel checks
// useUserRole().isAdmin) — this component assumes it should render. The UI
// gate is belt-and-braces: migration 20260216024654 dropped the old
// permissive policies, so youtube_videos writes are admin-only at the RLS
// level too. A non-admin who reaches this via devtools gets an empty row
// set back, which addVideoToLibrary reports as { outcome: 'failed' }.
```

- [ ] **Step 6: Verify nothing regressed**

Run: `npx vitest run src/lib src/components/youtube && npm run typecheck:guard`
Expected: PASS, and typecheck reports no new errors.

Then grep to confirm the old function is fully gone:

Run: `grep -n "insertSource" src/components/youtube/AddYouTubeVideoForm.tsx`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/lib/videoLibrary.ts src/lib/videoLibrary.test.ts src/components/youtube/AddYouTubeVideoForm.tsx
git commit -m "refactor(video): extract addVideoToLibrary into src/lib/videoLibrary

One insert path for the Add-video dialog and the incoming header search.
Also corrects a stale comment claiming youtube_videos RLS is WITH CHECK
(true) — 20260216024654 made writes admin-only."
```

---

### Task 2: Extract the search into `src/hooks/useYouTubeSearch.ts`

**Files:**
- Create: `src/hooks/useYouTubeSearch.ts`
- Create: `src/hooks/useYouTubeSearch.test.tsx`
- Modify: `src/components/youtube/AddYouTubeVideoForm.tsx`

**Interfaces:**
- Consumes: `supabase.functions.invoke('youtube-search', { body: { q, maxResults } })`, which resolves `{ hits: YouTubeHit[] }` or `{ error: string }`.
- Produces:
  - `interface YouTubeHit { videoId, title, channelTitle, publishedAt, description, thumbnail, url }` — all `string`.
  - `describeSearchFailure(raw: string): string`
  - `useYouTubeSearch(maxResults?: number)` → `{ hits: YouTubeHit[]; searching: boolean; error: string | null; term: string; search(raw: string): Promise<void>; clear(): void }`

The hook fires immediately when `search()` is called. Debouncing is the caller's choice: the header bar submits on Enter, the dialog keeps its 300ms timer.

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useYouTubeSearch.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

import { supabase } from '@/integrations/supabase/client';
import { useYouTubeSearch, describeSearchFailure } from './useYouTubeSearch';

const invoke = supabase.functions.invoke as unknown as ReturnType<typeof vi.fn>;

const hit = (videoId: string) => ({
  videoId, title: `Title ${videoId}`, channelTitle: 'A Choir',
  publishedAt: '2026-01-01T00:00:00Z', description: '', thumbnail: '',
  url: `https://www.youtube.com/watch?v=${videoId}`,
});

beforeEach(() => invoke.mockReset());

describe('describeSearchFailure', () => {
  it('explains a missing API key', () => {
    expect(describeSearchFailure('YOUTUBE_API_KEY not configured on the server'))
      .toMatch(/isn't configured/i);
  });

  it('explains quota exhaustion', () => {
    expect(describeSearchFailure('YouTube 403 quotaExceeded')).toMatch(/daily limit/i);
  });

  it('gives a generic message for other upstream failures', () => {
    expect(describeSearchFailure('YouTube 502 upstream blew up')).toMatch(/unavailable right now/i);
  });

  it('passes an unrecognized message through unchanged', () => {
    expect(describeSearchFailure('Network request failed')).toBe('Network request failed');
  });
});

describe('useYouTubeSearch', () => {
  it('populates hits from a resolved search', async () => {
    invoke.mockResolvedValue({ data: { hits: [hit('a'), hit('b')] }, error: null });
    const { result } = renderHook(() => useYouTubeSearch());

    await act(async () => { await result.current.search('handel'); });

    expect(result.current.hits).toHaveLength(2);
    expect(result.current.term).toBe('handel');
    expect(result.current.searching).toBe(false);
    expect(invoke).toHaveBeenCalledWith('youtube-search', { body: { q: 'handel', maxResults: 10 } });
  });

  it('trims the query and skips the call when it is blank', async () => {
    const { result } = renderHook(() => useYouTubeSearch());
    await act(async () => { await result.current.search('   '); });
    expect(invoke).not.toHaveBeenCalled();
  });

  it('surfaces a readable error and empties hits when the edge function fails', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('YouTube 502 upstream') });
    const { result } = renderHook(() => useYouTubeSearch());

    await act(async () => { await result.current.search('handel'); });

    expect(result.current.error).toMatch(/unavailable right now/i);
    expect(result.current.hits).toEqual([]);
  });

  it('treats an error field in the body as a failure', async () => {
    invoke.mockResolvedValue({ data: { error: 'YOUTUBE_API_KEY not configured' }, error: null });
    const { result } = renderHook(() => useYouTubeSearch());

    await act(async () => { await result.current.search('handel'); });

    expect(result.current.error).toMatch(/isn't configured/i);
  });

  it('ignores a slow earlier response so it cannot overwrite newer results', async () => {
    let resolveFirst: (v: unknown) => void = () => {};
    invoke
      .mockReturnValueOnce(new Promise((r) => { resolveFirst = r; }))
      .mockResolvedValueOnce({ data: { hits: [hit('new')] }, error: null });

    const { result } = renderHook(() => useYouTubeSearch());

    let firstCall: Promise<void>;
    act(() => { firstCall = result.current.search('old'); });
    await act(async () => { await result.current.search('new'); });

    await act(async () => {
      resolveFirst({ data: { hits: [hit('stale')] }, error: null });
      await firstCall;
    });

    expect(result.current.hits).toHaveLength(1);
    expect(result.current.hits[0].videoId).toBe('new');
  });

  it('clear() drops hits, error, and term', async () => {
    invoke.mockResolvedValue({ data: { hits: [hit('a')] }, error: null });
    const { result } = renderHook(() => useYouTubeSearch());

    await act(async () => { await result.current.search('handel'); });
    act(() => { result.current.clear(); });

    expect(result.current.hits).toEqual([]);
    expect(result.current.term).toBe('');
    expect(result.current.error).toBeNull();
  });

  it('does not set state after unmount', async () => {
    let resolveIt: (v: unknown) => void = () => {};
    invoke.mockReturnValue(new Promise((r) => { resolveIt = r; }));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result, unmount } = renderHook(() => useYouTubeSearch());
    let pending: Promise<void>;
    act(() => { pending = result.current.search('handel'); });
    unmount();

    await act(async () => {
      resolveIt({ data: { hits: [hit('a')] }, error: null });
      await pending;
    });

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('honors a custom maxResults', async () => {
    invoke.mockResolvedValue({ data: { hits: [] }, error: null });
    const { result } = renderHook(() => useYouTubeSearch(5));
    await act(async () => { await result.current.search('handel'); });
    expect(invoke).toHaveBeenCalledWith('youtube-search', { body: { q: 'handel', maxResults: 5 } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useYouTubeSearch.test.tsx`
Expected: FAIL — cannot resolve `./useYouTubeSearch`.

- [ ] **Step 3: Write the implementation**

Create `src/hooks/useYouTubeSearch.ts`:

```ts
// Shared YouTube search. The youtube-search edge function proxies the Data
// API v3 so the key never reaches the client.
//
// QUOTA: each call costs ~100 units of a 10,000/day free tier — about 100
// searches per DAY across the whole platform, every tenant. This hook fires
// the moment search() is called and deliberately does NOT debounce; that is
// the caller's decision. The /video header bar submits on Enter only, since
// every signed-in member can reach it. The admin-only Add-video dialog keeps
// a 300ms debounce because its audience is small.
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface YouTubeHit {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  description: string;
  thumbnail: string;
  url: string;
}

// The edge function answers 503 when YOUTUBE_API_KEY is unset and 502 for any
// upstream rejection — quota exhaustion arrives as the latter. Neither string
// means anything to a choir director, so translate before display.
export function describeSearchFailure(raw: string): string {
  if (/not configured/i.test(raw)) return "YouTube search isn't configured on this server.";
  if (/quota/i.test(raw)) return 'YouTube search has hit its daily limit. Try again tomorrow.';
  if (/^YouTube \d{3}/.test(raw)) return 'YouTube search is unavailable right now. Try again later.';
  return raw;
}

export function useYouTubeSearch(maxResults = 10) {
  const [hits, setHits] = useState<YouTubeHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [term, setTerm] = useState('');

  // Monotonic request id: a slow earlier response must never overwrite a
  // newer one. Paired with an alive flag so an unmount drops everything
  // in flight instead of setting state on a dead component.
  const requestRef = useRef(0);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const clear = useCallback(() => {
    requestRef.current += 1;
    setHits([]);
    setError(null);
    setSearching(false);
    setTerm('');
  }, []);

  const search = useCallback(async (raw: string) => {
    const q = raw.trim();
    if (!q) { clear(); return; }

    const id = ++requestRef.current;
    const current = () => aliveRef.current && id === requestRef.current;

    setTerm(q);
    setSearching(true);
    setError(null);

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('youtube-search', {
        body: { q, maxResults },
      });
      if (fnErr) throw fnErr;
      const body = data as { hits?: YouTubeHit[]; error?: string } | null;
      if (body?.error) throw new Error(body.error);
      if (current()) setHits(body?.hits ?? []);
    } catch (e) {
      if (current()) {
        setError(describeSearchFailure(e instanceof Error ? e.message : 'YouTube search failed.'));
        setHits([]);
      }
    } finally {
      if (current()) setSearching(false);
    }
  }, [clear, maxResults]);

  return { hits, searching, error, term, search, clear };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useYouTubeSearch.test.tsx`
Expected: PASS, 12 tests.

- [ ] **Step 5: Rewire the dialog's search to the hook**

In `src/components/youtube/AddYouTubeVideoForm.tsx`:

1. Add the import:

```ts
import { useYouTubeSearch, type YouTubeHit } from '@/hooks/useYouTubeSearch';
```

2. Delete the local `interface SearchHit { ... }` (lines 16-24). Replace every remaining `SearchHit` reference with `YouTubeHit`.

3. Delete these four state declarations (around lines 109-112):

```ts
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
```

and replace with:

```ts
  const [query, setQuery] = useState('');
  const { hits, searching, error: searchErr, search: runSearch, clear: clearSearch } = useYouTubeSearch(10);
```

4. Replace the whole search `useEffect` (lines 130-153) with a debounce that delegates to the hook:

```ts
  // 300ms debounce is safe here because this dialog is admin-only. The
  // /video header bar, which every member can reach, submits explicitly
  // instead — see the QUOTA note in useYouTubeSearch.
  useEffect(() => {
    if (!open || mode !== 'search') return;
    const term = query.trim();
    if (!term) { clearSearch(); return; }
    const handle = window.setTimeout(() => { void runSearch(term); }, 300);
    return () => window.clearTimeout(handle);
  }, [open, mode, query, runSearch, clearSearch]);
```

5. In `reset()`, replace the `setHits([])` and `setSearchErr(null)` lines with a single `clearSearch();` and keep `setQuery('')`.

- [ ] **Step 6: Verify the dialog still works**

Run: `npx vitest run src/hooks src/lib src/components/youtube && npm run typecheck:guard`
Expected: PASS, no new type errors.

Run: `grep -n "SearchHit\|setSearchErr\|setHits\|setSearching" src/components/youtube/AddYouTubeVideoForm.tsx`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useYouTubeSearch.ts src/hooks/useYouTubeSearch.test.tsx src/components/youtube/AddYouTubeVideoForm.tsx
git commit -m "refactor(video): extract useYouTubeSearch hook

Owns the youtube-search edge call, race-cancellation, and readable
error text. The dialog keeps its 300ms debounce on top of it."
```

---

### Task 3: Build the search field and results panel

**Files:**
- Create: `src/components/youtube/YouTubeSearchField.tsx`
- Create: `src/components/youtube/YouTubeResultsPanel.tsx`
- Create: `src/components/youtube/YouTubeSearchField.test.tsx`
- Create: `src/components/youtube/YouTubeResultsPanel.test.tsx`

**Interfaces:**
- Consumes: `YouTubeHit` from `@/hooks/useYouTubeSearch`.
- Produces:
  - `YouTubeSearchField` — props `{ searching: boolean; active: boolean; onSearch: (term: string) => void; onClear: () => void }`
  - `YouTubeResultsPanel` — props `{ hits: YouTubeHit[]; searching: boolean; error: string | null; term: string; canAdd: boolean; existingVideoIds: Set<string>; addingId: string | null; onAdd: (hit: YouTubeHit) => void; onPreview: (hit: YouTubeHit) => void; onBack: () => void }`

Both are presentational. The page owns the hook and all state.

- [ ] **Step 1: Write the failing tests**

Create `src/components/youtube/YouTubeSearchField.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { YouTubeSearchField } from './YouTubeSearchField';

afterEach(() => cleanup());

const props = { searching: false, active: false, onSearch: vi.fn(), onClear: vi.fn() };

describe('YouTubeSearchField', () => {
  it('does not search while the user is only typing', () => {
    const onSearch = vi.fn();
    render(<YouTubeSearchField {...props} onSearch={onSearch} />);
    fireEvent.change(screen.getByLabelText('Search YouTube'), { target: { value: 'handel' } });
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('searches once on Enter', () => {
    const onSearch = vi.fn();
    render(<YouTubeSearchField {...props} onSearch={onSearch} />);
    const input = screen.getByLabelText('Search YouTube');
    fireEvent.change(input, { target: { value: 'handel' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('handel');
  });

  it('searches on the button', () => {
    const onSearch = vi.fn();
    render(<YouTubeSearchField {...props} onSearch={onSearch} />);
    fireEvent.change(screen.getByLabelText('Search YouTube'), { target: { value: 'handel' } });
    fireEvent.click(screen.getByRole('button', { name: /search youtube/i }));
    expect(onSearch).toHaveBeenCalledWith('handel');
  });

  it('ignores Enter on a blank field', () => {
    const onSearch = vi.fn();
    render(<YouTubeSearchField {...props} onSearch={onSearch} />);
    fireEvent.keyDown(screen.getByLabelText('Search YouTube'), { key: 'Enter' });
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('clears the text and notifies when the clear button is used', () => {
    const onClear = vi.fn();
    render(<YouTubeSearchField {...props} active onClear={onClear} />);
    const input = screen.getByLabelText('Search YouTube') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'handel' } });
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(onClear).toHaveBeenCalled();
    expect(input.value).toBe('');
  });

  it('shows no clear button until a search is active', () => {
    render(<YouTubeSearchField {...props} active={false} />);
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
  });

  it('disables the search button while a search is in flight', () => {
    render(<YouTubeSearchField {...props} searching />);
    expect(screen.getByRole('button', { name: /search youtube/i })).toBeDisabled();
  });
});
```

Create `src/components/youtube/YouTubeResultsPanel.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { YouTubeResultsPanel } from './YouTubeResultsPanel';
import type { YouTubeHit } from '@/hooks/useYouTubeSearch';

afterEach(() => cleanup());

const hit = (videoId: string): YouTubeHit => ({
  videoId, title: `Title ${videoId}`, channelTitle: 'A Choir',
  publishedAt: '2026-01-01T00:00:00Z', description: '', thumbnail: '',
  url: `https://www.youtube.com/watch?v=${videoId}`,
});

const base = {
  hits: [hit('a')], searching: false, error: null, term: 'handel',
  canAdd: true, existingVideoIds: new Set<string>(), addingId: null,
  onAdd: vi.fn(), onPreview: vi.fn(), onBack: vi.fn(),
};

describe('YouTubeResultsPanel', () => {
  it('shows the search term and a way back to the library', () => {
    const onBack = vi.fn();
    render(<YouTubeResultsPanel {...base} onBack={onBack} />);
    expect(screen.getByText(/handel/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /back to library/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it('hides Add from members who cannot add', () => {
    render(<YouTubeResultsPanel {...base} canAdd={false} />);
    expect(screen.queryByRole('button', { name: /^add$/i })).not.toBeInTheDocument();
  });

  it('shows Add to admins', () => {
    render(<YouTubeResultsPanel {...base} canAdd />);
    expect(screen.getByRole('button', { name: /^add$/i })).toBeInTheDocument();
  });

  it('always offers preview, even without add rights', () => {
    const onPreview = vi.fn();
    render(<YouTubeResultsPanel {...base} canAdd={false} onPreview={onPreview} />);
    fireEvent.click(screen.getByRole('button', { name: /preview/i }));
    expect(onPreview).toHaveBeenCalledWith(base.hits[0]);
  });

  it('marks a hit already in the library instead of offering Add', () => {
    render(<YouTubeResultsPanel {...base} existingVideoIds={new Set(['a'])} />);
    expect(screen.getByText(/in library/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^add$/i })).not.toBeInTheDocument();
  });

  it('disables the row being added', () => {
    render(<YouTubeResultsPanel {...base} addingId="a" />);
    expect(screen.getByRole('button', { name: /adding/i })).toBeDisabled();
  });

  it('renders the error instead of an empty list', () => {
    render(<YouTubeResultsPanel {...base} hits={[]} error="YouTube search is unavailable right now." />);
    expect(screen.getByText(/unavailable right now/i)).toBeInTheDocument();
    expect(screen.queryByText(/no youtube results/i)).not.toBeInTheDocument();
  });

  it('says so when a completed search found nothing', () => {
    render(<YouTubeResultsPanel {...base} hits={[]} />);
    expect(screen.getByText(/no youtube results/i)).toBeInTheDocument();
  });

  it('shows a spinner while searching', () => {
    render(<YouTubeResultsPanel {...base} hits={[]} searching />);
    expect(screen.getByText(/searching/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/youtube/YouTubeSearchField.test.tsx src/components/youtube/YouTubeResultsPanel.test.tsx`
Expected: FAIL — neither module resolves.

- [ ] **Step 3: Write `YouTubeSearchField`**

Create `src/components/youtube/YouTubeSearchField.tsx`:

```tsx
// The search box beside the /video page title. Deliberately NOT
// search-as-you-type: every signed-in member can reach this, and the
// platform shares ~100 YouTube searches per day. Submitting is an explicit
// act — Enter or the button.
import React, { useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface YouTubeSearchFieldProps {
  searching: boolean;
  // True once a search has run — drives the clear affordance.
  active: boolean;
  onSearch: (term: string) => void;
  onClear: () => void;
}

export const YouTubeSearchField: React.FC<YouTubeSearchFieldProps> = ({
  searching, active, onSearch, onClear,
}) => {
  const [draft, setDraft] = useState('');

  const submit = () => {
    const term = draft.trim();
    if (!term) return;
    onSearch(term);
  };

  const clear = () => {
    setDraft('');
    onClear();
  };

  return (
    <div className="flex items-center gap-1.5 w-full sm:w-auto">
      <div className="relative flex-1 sm:w-64">
        <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
          placeholder="Search YouTube…"
          aria-label="Search YouTube"
          className="pl-8 pr-8 text-sm h-9"
        />
        {active && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear YouTube search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-9 shrink-0"
        onClick={submit}
        disabled={searching}
        aria-label="Search YouTube"
      >
        {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
      </Button>
    </div>
  );
};
```

- [ ] **Step 4: Write `YouTubeResultsPanel`**

Create `src/components/youtube/YouTubeResultsPanel.tsx`:

```tsx
// YouTube search results, shown in place of the library grid while a search
// is active. Add is admin-only (youtube_videos writes are admin-gated by
// RLS); preview is for everyone.
import React from 'react';
import { Loader2, Play, Plus, Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { YouTubeHit } from '@/hooks/useYouTubeSearch';

interface YouTubeResultsPanelProps {
  hits: YouTubeHit[];
  searching: boolean;
  error: string | null;
  term: string;
  canAdd: boolean;
  existingVideoIds: Set<string>;
  // videoId of the row mid-insert, so only that button shows a spinner.
  addingId: string | null;
  onAdd: (hit: YouTubeHit) => void;
  onPreview: (hit: YouTubeHit) => void;
  onBack: () => void;
}

const formatDate = (value: string): string => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const YouTubeResultsPanel: React.FC<YouTubeResultsPanelProps> = ({
  hits, searching, error, term, canAdd, existingVideoIds, addingId, onAdd, onPreview, onBack,
}) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <h2 className="!text-sm font-semibold text-foreground">
        YouTube results for “{term}”
      </h2>
      <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={onBack}>
        <ArrowLeft className="w-3.5 h-3.5" /> Back to library
      </Button>
    </div>

    {searching && (
      <div className="flex items-center gap-2 py-16 justify-center text-sm text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" /> Searching YouTube…
      </div>
    )}

    {!searching && error && (
      <div className="py-16 text-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )}

    {!searching && !error && hits.length === 0 && (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">No YouTube results for “{term}”.</p>
      </div>
    )}

    {!searching && !error && hits.length > 0 && (
      <ul className="space-y-2">
        {hits.map((hit) => {
          const inLibrary = existingVideoIds.has(hit.videoId);
          const adding = addingId === hit.videoId;
          return (
            <li key={hit.videoId} className="flex gap-3 p-3 rounded-xl border border-border bg-card">
              <button
                type="button"
                onClick={() => onPreview(hit)}
                aria-label={`Preview ${hit.title}`}
                className="shrink-0 aspect-video w-40 rounded overflow-hidden bg-muted relative group"
              >
                {hit.thumbnail ? (
                  <img src={hit.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                )}
              </button>
              <div className="flex-1 min-w-0">
                {/* Explicit text-sm: the global h3 rule is 22px/700, which would
                    let the metadata outweigh the thumbnail. */}
                <h3 className="!text-sm font-medium text-foreground line-clamp-2">{hit.title}</h3>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  {hit.channelTitle}
                  {formatDate(hit.publishedAt) && ` · ${formatDate(hit.publishedAt)}`}
                </div>
                <div className="flex items-center gap-1 pt-2">
                  <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => onPreview(hit)}>
                    <Play className="w-3.5 h-3.5 mr-1" /> Preview
                  </Button>
                  {canAdd && !inLibrary && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => onAdd(hit)}
                      disabled={adding}
                    >
                      {adding
                        ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Adding…</>
                        : <><Plus className="w-3.5 h-3.5 mr-1" /> Add</>}
                    </Button>
                  )}
                  {inLibrary && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground px-2">
                      <Check className="w-3.5 h-3.5" /> In library
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    )}
  </div>
);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/youtube/YouTubeSearchField.test.tsx src/components/youtube/YouTubeResultsPanel.test.tsx`
Expected: PASS, 16 tests.

- [ ] **Step 6: Typecheck and commit**

Run: `npm run typecheck:guard`
Expected: no new errors.

```bash
git add src/components/youtube/YouTubeSearchField.tsx src/components/youtube/YouTubeResultsPanel.tsx src/components/youtube/YouTubeSearchField.test.tsx src/components/youtube/YouTubeResultsPanel.test.tsx
git commit -m "feat(video): YouTube search field and results panel

Explicit submit rather than search-as-you-type — the platform shares
~100 YouTube searches/day. Add is admin-only; preview is for everyone."
```

---

### Task 4: Wire the search into `/video`

**Files:**
- Modify: `src/pages/YouTubeChannel.tsx`

**Interfaces:**
- Consumes: `useYouTubeSearch`, `YouTubeHit`, `YouTubeSearchField`, `YouTubeResultsPanel`, `addVideoToLibrary`, `youTubeSource`.
- Produces: nothing — this is the top of the tree.

- [ ] **Step 1: Add the imports**

In `src/pages/YouTubeChannel.tsx`, after the existing `AddYouTubeVideoForm` import:

```ts
import { YouTubeSearchField } from '@/components/youtube/YouTubeSearchField';
import { YouTubeResultsPanel } from '@/components/youtube/YouTubeResultsPanel';
import { useYouTubeSearch, type YouTubeHit } from '@/hooks/useYouTubeSearch';
import { addVideoToLibrary, youTubeSource } from '@/lib/videoLibrary';
```

- [ ] **Step 2: Add the state and handlers**

Directly after `const [syncing, setSyncing] = useState(false);` (around line 99):

```ts
  // ── YouTube search ────────────────────────────────────────────────────
  // Searching all of YouTube, as opposed to `search` above which filters the
  // library already loaded. While a YouTube search is active it takes over the
  // grid area; clearing it restores the library and its filters untouched.
  const yt = useYouTubeSearch(10);
  const [addingId, setAddingId] = useState<string | null>(null);
  const ytActive = yt.term !== '';

  // Only covers the first LIBRARY_HARD_CAP rows, so this is a UI convenience —
  // the 23505 duplicate path in addVideoToLibrary stays the real guard.
  const existingVideoIds = useMemo(
    () => new Set(videos.map((v) => v.video_id)),
    [videos],
  );

  const addHit = async (hit: YouTubeHit) => {
    setAddingId(hit.videoId);
    try {
      const result = await addVideoToLibrary(youTubeSource(hit.videoId), hit.title);
      if (result.outcome === 'duplicate') {
        toast({ title: 'Already added', description: 'That video is already in the library.' });
        return;
      }
      if (result.outcome === 'failed') {
        toast({ title: 'Could not add video', description: result.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Video added', description: 'It is in your library now.' });
      fetchVideos();
    } finally {
      setAddingId(null);
    }
  };

  // Preview reuses the existing modal, which wants a VideoRow — same shape the
  // playlist dialog synthesizes for its rows.
  const previewHit = (hit: YouTubeHit) => {
    stopInlineTracking();
    setSelectedVideo({
      id: '', video_id: hit.videoId, title: hit.title, description: hit.description,
      thumbnail_url: hit.thumbnail, video_url: hit.url, duration: null, view_count: null,
      published_at: hit.publishedAt, category: null, tags: null, is_featured: null,
    });
  };
```

- [ ] **Step 3: Put the field in the header**

Replace the title block (lines 278-289) with:

```tsx
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-full bg-destructive flex items-center justify-center">
              <Youtube className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground leading-tight">Video Library</h1>
              <p className="text-sm text-muted-foreground leading-tight">
                {videos.length} video{videos.length === 1 ? '' : 's'}
                {filtered.length !== videos.length && ` · ${filtered.length} shown`}
              </p>
            </div>
            {/* ml-auto on a flex-wrap row: sits right of the title on desktop,
                drops to its own full-width line on phones. */}
            <div className="w-full sm:w-auto sm:ml-auto">
              <YouTubeSearchField
                searching={yt.searching}
                active={ytActive}
                onSearch={(term) => { void yt.search(term); }}
                onClear={yt.clear}
              />
            </div>
          </div>
```

- [ ] **Step 4: Render the panel in place of the grid**

The body is one chained ternary starting at line 405 (`{tab === 'playlists' ? (`). Put the YouTube branch first so it wins over every tab. Change:

```tsx
          {tab === 'playlists' ? (
```

to:

```tsx
          {ytActive ? (
            <YouTubeResultsPanel
              hits={yt.hits}
              searching={yt.searching}
              error={yt.error}
              term={yt.term}
              canAdd={isAdmin()}
              existingVideoIds={existingVideoIds}
              addingId={addingId}
              onAdd={addHit}
              onPreview={previewHit}
              onBack={yt.clear}
            />
          ) : tab === 'playlists' ? (
```

- [ ] **Step 5: Hide the library toolbar during a YouTube search**

The tabs, library search, sort, category, and tag filters do not apply to YouTube results. Wrap that block — the `<div className="flex flex-col gap-3">` opened at line 310 through its matching close just before the body ternary — in `{!ytActive && ( ... )}`.

Leave the admin Add-video row above it visible.

This supersedes the spec's "switching tabs clears the search": with the toolbar hidden there are no tabs to switch to during a search, so no clearing rule is needed. `Back to library` is the only exit, and it restores the tab and filter state untouched because none of it was ever reset.

- [ ] **Step 6: Verify in the app**

Run: `npm run dev`

Check, at `/video`:
1. The field sits right of "Video Library" on a wide window and wraps to its own line under ~640px.
2. Typing without pressing Enter fires no network call (Network tab, filter `youtube-search`).
3. Enter runs exactly one `youtube-search` call and results replace the grid; tabs and filters disappear.
4. Preview opens the modal and plays.
5. As an admin, Add inserts and the count in the header goes up after returning to the library.
6. A result already in the library reads "In library".
7. Back to library restores the grid with the previous tab, sort, and tag filters intact.

- [ ] **Step 7: Full suite, typecheck, and commit**

Run: `npm run test && npm run typecheck:guard && npm run lint`
Expected: PASS; no new type errors; no new lint errors.

```bash
git add src/pages/YouTubeChannel.tsx
git commit -m "feat(video): search YouTube from the library header

Everyone signed in can search and preview; Add is admin-only because
youtube_videos writes are admin-gated by RLS. Results take over the
grid area and restore the library untouched on clear."
```

---

## Manual QA before merge

- Sign in as a non-admin. The field is present, search and preview work, and no Add button appears on any result.
- Sign in as an admin. Add works and the video appears in the grid.
- iOS (per `reference_gleeworld_ios`): confirm the header does not overflow at 390px and the results panel scrolls.

## Out of scope

Owner-scoped library visibility — every member currently sees every video in the tenant. That needs an owner column, a rescoped `UNIQUE(video_id)`, a rewritten SELECT policy, and a backfill decision across all ~50 tenants. Agreed on 2026-08-03 to ship this search bar first and spec ownership separately.
