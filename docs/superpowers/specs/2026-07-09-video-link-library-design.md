# Video link library — design

**Date:** 2026-07-09
**Status:** approved for planning
**Branch:** `feature/video-link-library`

## Problem

The Video addon (`/video`) only handles videos a member *uploads* — a file goes to storage,
gets transcoded, and plays back. There is no way to save a video that already exists on the
internet. Members want to keep the YouTube videos they actually study (warm-ups, repertoire
references, masterclasses) in one place, organised the way *they* think about them.

## What we're building

A **personal YouTube link library**, per member, per tenant.

- A member pastes a YouTube URL; we fetch its title and thumbnail and save it.
- The member creates their own tabs ("Warm-ups", "Repertoire", "Sight-reading").
- Each saved video sits in a tab. The same video may be saved into more than one tab.
- Libraries are private: a member sees only their own.

`/video` gains two top-level tabs: **Uploads** (the existing flow, unchanged) and **Links** (new).
One nav item, one home for "video".

## Explicitly out of scope (v1)

- Any provider other than YouTube. No Vimeo, no arbitrary URLs. (Both are additive later;
  Vimeo needs a `frame-src` CSP entry, arbitrary URLs need a link-out card with no thumbnail.)
- Drag-and-drop reordering. The `position` column ships so ordering is stable and DnD is a
  later pure-UI change with no migration.
- Sharing a library, or a tenant-wide curated library. This is per-member only.
- Unifying links with uploaded videos in the same tab. They share a page, not a data model.
- Playback progress / resume. See "Playback" for why this matters if we add it.

## Data model

Two new tables. Both are scoped by `tenant_id` **and** `user_id`.

```sql
create table public.gw_video_collections (       -- the tabs
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null default public.current_tenant_id(),
  user_id     uuid not null default auth.uid(),
  name        text not null check (length(trim(name)) between 1 and 60),
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (tenant_id, user_id, name)
);

create table public.gw_video_links (             -- the saved videos
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null default public.current_tenant_id(),
  user_id       uuid not null default auth.uid(),
  collection_id uuid not null references public.gw_video_collections(id) on delete cascade,
  provider      text not null default 'youtube' check (provider in ('youtube')),
  video_id      text not null check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  url           text not null,
  title         text not null,
  author        text,
  thumbnail_url text,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  unique (tenant_id, user_id, collection_id, video_id)
);
```

**The unique constraint is per collection, not per user.** The same video may live in
"Warm-ups" and "Concert Prep" simultaneously; it may not be added twice to the same tab.
Deleting a card deletes *that copy* — the other tab is unaffected.

`provider` is a column, not an assumption, so adding Vimeo later is a check-constraint change
rather than a table.

### tenant_id: default AND trigger

Both tables get `tenant_id DEFAULT public.current_tenant_id()` **and** a `BEFORE INSERT`
trigger that fills a NULL `tenant_id` from the JWT.

This is not belt-and-braces. The restrictive RLS policy is `WITH CHECK (tenant_id =
current_tenant_id())`, and a policy like that **silently rejects every insert that doesn't set
tenant_id**. The column default covers the normal path; the trigger covers an explicit
`tenant_id: null` in a client payload, which PostgREST will happily send. This trap cost us
519 tables' worth of hotfixes during the self-host cutover and it will cost us again here.

### RLS

Follow the naming already in use on `gw_studio_videos` (verified against the live database):

- `tenant_isolation_restrict` — RESTRICTIVE, `USING (tenant_id = current_tenant_id())`.
- `video_links_owner` / `video_collections_owner` — PERMISSIVE, `FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`.

Triggers follow the same convention: `gw_video_links_fill_tenant_trg` (BEFORE INSERT, fills a
NULL `tenant_id` from the JWT) and `gw_video_collections_touch_trg` (maintains `updated_at`).

A member cannot read, update, or delete another member's rows, even inside their own tenant.
There is no admin read path in v1; nobody needs to see somebody else's watch list.

### Why not reuse an existing table

There are eleven video-related tables already, ten of them empty:
`youtube_videos`, `gw_youtube_videos`, `youtube_channels`, `youtube_channel_videos`,
`youtube_playlists`, `gw_featured_videos`, `dashboard_youtube_videos`,
`gw_course_playlist_videos`, `course_video_resources`, `mus240_video_edits`.
Only `gw_studio_videos` has rows (2).

`youtube_videos` looks close but is channel-sync shaped: it hangs off a `channel_id` FK and
carries `view_count`, `like_count`, `is_featured`, `display_order`. It models "a video we
ingested from a channel we follow", not "a link a member saved". Bending it would couple this
feature to a sync pipeline nobody is running.

**We add two tables and touch none of the others.** Auditing and dropping the ten dead tables
is real work worth doing — as its own change, not smuggled into a feature build.

## The oEmbed edge function

`supabase/functions/youtube-oembed`.

Request: `{ url: string }`. Response: `{ video_id, title, author, thumbnail_url }`.

### It must never fetch a user-supplied URL

The function extracts the video ID **first**, from the URL the client sent, using a pure parser.
If no valid 11-character ID falls out, it returns 400 and performs no network request at all.
Only then does it build its own request to `https://www.youtube.com/oembed?format=json&url=…`
from the *extracted ID*, never from the caller's string.

Without that ordering this function is an SSRF proxy running inside our infrastructure with
service-role reach. This is the single most security-sensitive line in the feature.

### The parser already exists — reuse it

`src/lib/youtubeId.ts` on `main` already exports `getYouTubeId(url): string | null`,
with 7 tests. It validates the hostname against an allowlist, handles `watch?v=`,
`youtu.be/<id>`, `/shorts/<id>`, `/embed/<id>`, `/live/<id>`, `music.youtube.com`, and
`youtube-nocookie.com`, and returns `null` for anything that doesn't yield a valid
11-character ID. **Do not write a second one.**

One wrinkle: edge functions run on Deno and can't import from `src/`. Copy the module to
`supabase/functions/_shared/youtubeId.ts` and have the SPA keep importing `src/lib/youtubeId.ts`,
or move it to a location both can reach. Either way there is exactly one implementation and one
test suite — a parser that disagrees with itself across the client/server boundary is how a
"valid" URL gets saved with an ID the player can't resolve.

The client should call `getYouTubeId` *before* hitting the function, so an obviously bad paste
fails instantly without a round trip. The function must call it again anyway: client-side
validation is a convenience, never a security control.

### Why an edge function and not a browser fetch

`connect-src` in the CSP meta tag does not include `youtube.com`, so a browser oEmbed call is
blocked. It already includes `supabase.gleeworld.org`. Routing through our function means
**no CSP change**, and therefore no SPA rebuild-and-deploy just to ship metadata lookup.
It also lets us cache and keeps YouTube's endpoint off the client's critical path.

Thumbnails need no function: `img-src` already allows any `https:`, so the card renders
`https://i.ytimg.com/vi/<id>/hqdefault.jpg` directly.

## Playback

A `https://www.youtube-nocookie.com/embed/<id>` iframe. `frame-src` already permits it.

We are **playing, not instrumenting**. That sidesteps a known trap: raw-postMessage YouTube
embeds never emit `onStateChange`, and you have to read `infoDelivery.playerState` instead.
If we ever add progress tracking or "resume where you left off", that behaviour becomes
required reading before writing a line of player code.

## UI

```
/video
┌────────────────────────────────────────────────┐
│  Video            [ Uploads ] [ Links ]        │   ← page-level tabs
├────────────────────────────────────────────────┤
│  [ Warm-ups ] [ Repertoire ] [ Technique ] [+] │   ← the member's own tabs
│   ───────────                                   │
│                                                 │
│   ┌────────┐  ┌────────┐  ┌────────┐            │
│   │ ▶ thumb│  │ ▶ thumb│  │ ▶ thumb│            │
│   │ title  │  │ title  │  │ title  │  [+ Add]   │
│   └────────┘  └────────┘  └────────┘            │
└────────────────────────────────────────────────┘
```

- **Add link** — paste URL → the dialog calls `youtube-oembed` → title, author and thumbnail
  populate → member picks a tab → save. Title stays editable.
- **Card menu** — Move to tab…, Rename, Remove.
- **Tab strip** — `+` creates a tab; a tab's menu offers Rename and Delete. Deleting a tab
  cascades its links (`on delete cascade`), and the confirm dialog says how many videos go
  with it.
- Videos sort newest-first within a tab; tabs sort by `position`, then `created_at`.

### States that are normal, not exceptional

- **First run, no tabs.** Adding a link when no tab exists auto-creates one named **Saved**.
  Nobody should have to invent a taxonomy before they can save their first video.
- **oEmbed 404** (private, deleted, region-blocked). The dialog does not refuse the save. It
  shows "Couldn't read the title — type one" and saves with a member-supplied title. The
  video may still be perfectly playable for them.
- **Video deleted after saving.** The thumbnail 404s; the card renders a placeholder with the
  title and a "may no longer be available" hint. We do not delete the member's row for them.
- **Duplicate in the same tab.** The unique constraint rejects it; the UI says "Already in
  this tab" rather than surfacing a Postgres error.
- **Offline / function down.** Save is blocked with a retry, because we have no title. This is
  the one case where the member is stuck, and it is acceptable — the alternative is rows with
  no title.

## Testing

Written before the implementation, per the project's TDD practice.

**URL parser** — already covered by `src/lib/youtubeId.test.ts` (7 cases). Extend it only if the
shared/Deno copy needs its own harness; do not duplicate the cases.

**Edge function**
- A non-YouTube URL returns 400 **and makes no outbound request** (assert on a stubbed fetch).
- A valid URL returns the oEmbed shape.
- Upstream 404 propagates as a distinguishable "no metadata" result, not a 500.

**RLS** (against a real database, not mocked)
- Member A cannot `select`, `update`, or `delete` member B's link, same tenant.
- An insert with an explicit `tenant_id: null` still lands with the correct tenant — the
  trigger test. This is the regression test for the cutover bug.
- An insert naming another tenant's `tenant_id` is rejected.

**Component**
- Adding a link with no tabs creates "Saved" and puts the video in it.
- oEmbed failure path leaves the dialog usable with a manual title.
- Deleting a tab warns with the correct video count.

## Migration and rollout

One migration, additive: two tables, their RLS policies, the `tenant_id` defaults and triggers,
and indexes on `(tenant_id, user_id, collection_id)` and `(tenant_id, user_id)`.

Nothing existing changes. No backfill. No data loss path. The feature is invisible until the
**Links** tab renders, so the migration can land ahead of the UI.

Deploy order: migration → edge function → SPA build. The edge function is independently
deployable and the SPA doesn't call it until the Links tab exists.

## Open questions

None blocking. Two deliberate deferrals, recorded above: provider expansion (Vimeo/arbitrary
URLs) and drag-and-drop reordering.
