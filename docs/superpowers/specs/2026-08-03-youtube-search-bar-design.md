# YouTube search bar on /video

**Date:** 2026-08-03
**Status:** Design — awaiting review
**Scope:** Frontend only. No migration, no RLS change.

## Goal

Put a YouTube search field on the right of the "Video Library" page title on
`/video`. Any signed-in user can search YouTube and preview a result inline.
Only admins can add a result to the tenant's library.

## Why this is mostly surfacing, not building

The capability already exists and is buried. `AddYouTubeVideoForm` defaults to
`mode: 'search'`, calls the `youtube-search` edge function with a 300ms
debounce, and inserts the chosen hit. That form renders only inside an
admin-gated dialog behind the "Add video" button, so no non-admin has ever seen
it, and an admin has to open a dialog to reach it.

The `youtube-search` edge function (`supabase/functions/youtube-search/`) is
already written and proxies YouTube Data API v3 server-side so the API key never
reaches the client.

So the work is: lift the search out of the dialog, give it a home in the page
header, and widen who can use it.

## Decisions

### Everyone searches, admins add

`youtube_videos` writes are admin-only at the RLS level. Migration
`20260216024654` deliberately dropped the older permissive policies:

```sql
DROP POLICY IF EXISTS "Authenticated users can insert youtube videos" ON public.youtube_videos;
CREATE POLICY "Admins can manage youtube videos" ON public.youtube_videos
  FOR ALL TO authenticated
  USING (is_current_user_admin_or_super_admin())
  WITH CHECK (is_current_user_admin_or_super_admin());
```

Letting members add would mean re-opening that lockdown for all ~50 tenants.
Personal playlists are not a way around it either — `gw_video_playlist_items`
joins back to `youtube_videos` (`src/hooks/useVideoLibrary.ts:190-198`), so any
"add" needs a `youtube_videos` row.

Decision: `+ Add` renders only for `isAdmin()`. Everyone else gets search and
preview. This keeps the change frontend-only.

### Explicit submit, not search-as-you-type

Each `youtube-search` call costs ~100 YouTube quota units against a 10,000/day
free tier — roughly **100 searches per day across the entire platform, all
tenants**. The existing dialog debounces at 300ms, which was tolerable when only
admins could reach it. Exposure now widens to every signed-in member.

Decision: the header bar searches on Enter or on the search button. It does not
fire per keystroke. The dialog keeps its debounce (unchanged behavior for a
surface that already shipped).

If quota becomes a problem despite this, the next lever is caching in the edge
function, which its header already anticipates.

### Extract rather than duplicate

`YouTubeChannel.tsx` is already 875 lines. Copying the search logic into it
would mean two debounce implementations and two insert paths drifting apart.

## Structure

| Unit | Purpose | Depends on |
|---|---|---|
| `src/hooks/useYouTubeSearch.ts` | Query → hits. Owns the edge-fn call, in-flight cancellation, loading and error state. Exposes `search(term)`, `hits`, `searching`, `error`, `clear()`. | `youtube-search` edge fn |
| `src/lib/videoLibrary.ts` → `addVideoToLibrary()` | `insertRow` lifted from `AddYouTubeVideoForm`: dupe (`23505`) handling and the `channel_id: null` FK rule (a non-UUID string fails every insert). | supabase client |
| `src/components/youtube/YouTubeSearchBar.tsx` | The header field plus its results panel. Props: `canAdd: boolean`, `existingVideoIds: Set<string>`, `onAdded: () => void`, `onPreview: (hit) => void`. | both above |

`AddYouTubeVideoForm` then consumes both shared units and drops its local
copies. One debounce implementation, one insert path.

Each unit is independently testable: the hook against a mocked supabase client,
the helper against a mocked insert, the bar against props.

## Behavior

**Placement.** The title row (`YouTubeChannel.tsx:278-289`) gains the bar pushed
right with `ml-auto`. On narrow screens it wraps to its own line at full width
rather than crushing the title.

**Results.** While a search is active, the results panel replaces the library
grid, headed `YouTube results for "…"` with a `Back to library` control. Tabs,
sort, category, and tag filters are untouched and reappear on clear. Switching
tabs clears the search.

**Per hit:** thumbnail, title, channel, published date.

- `▶ Preview` opens the existing `YouTubeVideoModal` — no new player.
- `+ Add` for admins only. On success, refresh the grid via the existing
  `fetchVideos()` and toast.
- A hit whose `videoId` is already in `videos` shows a non-interactive
  `In library` chip instead of `+ Add`. This is a UI convenience only; the
  `23505` unique-violation path in `addVideoToLibrary` remains the real guard,
  since the library fetch is capped at `LIBRARY_HARD_CAP` (500) rows and may not
  contain every row.

**Failure states.** All surface inline in the results panel, never as a silent
empty list:

- 503 (`YOUTUBE_API_KEY not configured`) → "YouTube search isn't configured on
  this server."
- 502 (upstream error, includes quota exhaustion) → "YouTube search is
  unavailable right now. Try again later."
- Empty `hits` with no error → "No YouTube results for …".

**Stale comment to fix.** `AddYouTubeVideoForm.tsx:37-41` claims "youtube_videos
RLS is WITH CHECK (true) for any authenticated user, so the real access control
here is UI-only". Migration `20260216024654` made that false. Correct it while
editing the file.

## Testing

New coverage — nothing currently tests the dialog's search path.

`useYouTubeSearch`:
- A resolved search populates `hits`.
- An unmount mid-flight does not set state (no cancelled-update warning).
- A second search supersedes the first; a slow first response does not overwrite
  newer results.
- An edge-fn error populates `error` and leaves `hits` empty.

`YouTubeSearchBar`:
- `+ Add` is absent when `canAdd` is false, present when true.
- A hit in `existingVideoIds` renders `In library`, not `+ Add`.
- Typing alone fires no search; Enter fires exactly one.

`addVideoToLibrary`:
- A `23505` error resolves to the "already in library" outcome, not a thrown
  error.

Regression check on `AddYouTubeVideoForm`: its search and add still work after
the extraction.

## Out of scope

**Owner-scoped visibility.** The video library is currently tenant-wide: every
member sees every video. `youtube_videos` has no owner column, its SELECT policy
is `USING (true)`, and `video_id` carries a global `UNIQUE` constraint, so two
users cannot each hold a row for the same video. Making the library
owner-scoped — you see only your own videos plus what has been shared with
you — needs an owner column, a rescoped `UNIQUE`, a rewritten SELECT policy, and
a decision about who inherits the rows already in each tenant (channel-synced
uploads are the tenant's public videos and likely should stay visible to all).

That is a schema and RLS project across all ~50 tenants and gets its own spec.
Sequencing agreed 2026-08-03: search bar first, ownership second.

Also out of scope: server-side caching of search results, paginating past the
first page of YouTube hits, and adding non-YouTube providers to this bar (the
dialog's URL and upload modes already cover those).
