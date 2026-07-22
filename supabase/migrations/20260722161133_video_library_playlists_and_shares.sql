-- Personal video playlists + a polymorphic share layer for the video
-- library on /youtube. Three tables, all `gw_*` per convention:
--
--   gw_video_playlists       user-owned collections of videos
--   gw_video_playlist_items  join table with display_order
--   gw_video_shares          polymorphic (resource_type x recipient_type)
--                            share ledger — the "Shared with me" surface
--                            reads from here
--
-- We deliberately do NOT touch gw_course_playlists / gw_course_playlist_videos
-- (course-scoped) or youtube_playlists (external YouTube playlist import).
-- Those keep their existing semantics; personal playlists are a separate
-- concept owned by a single user.
--
-- Sharing model: recipient can be a user, a course, or (Phase B) a group.
-- Groups are scaffolded here (recipient_type check accepts 'group') but
-- no group-lookup table is referenced yet — that ships in a follow-up
-- migration once the app decides which group concept to standardize on.

-- ── 1. Personal playlists ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gw_video_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  cover_video_id UUID REFERENCES public.youtube_videos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gw_video_playlists_owner
  ON public.gw_video_playlists (owner_id, updated_at DESC);

ALTER TABLE public.gw_video_playlists ENABLE ROW LEVEL SECURITY;

-- Owner reads + writes freely. Anyone reads a public one. Recipients of
-- an active share also read (see policy right below via gw_video_shares).
CREATE POLICY gw_video_playlists_owner_all ON public.gw_video_playlists
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY gw_video_playlists_public_read ON public.gw_video_playlists
  FOR SELECT TO authenticated
  USING (is_public = TRUE);

-- ── 2. Playlist items ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gw_video_playlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES public.gw_video_playlists(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.youtube_videos(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (playlist_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_gw_video_playlist_items_playlist
  ON public.gw_video_playlist_items (playlist_id, display_order);

ALTER TABLE public.gw_video_playlist_items ENABLE ROW LEVEL SECURITY;

-- Read if the caller can read the parent playlist. Write only if the
-- caller owns the parent.
CREATE POLICY gw_video_playlist_items_read ON public.gw_video_playlist_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gw_video_playlists p
    WHERE p.id = gw_video_playlist_items.playlist_id
      AND (p.owner_id = auth.uid() OR p.is_public = TRUE)
  ));

CREATE POLICY gw_video_playlist_items_write ON public.gw_video_playlist_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gw_video_playlists p
    WHERE p.id = gw_video_playlist_items.playlist_id
      AND p.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.gw_video_playlists p
    WHERE p.id = gw_video_playlist_items.playlist_id
      AND p.owner_id = auth.uid()
  ));

-- ── 3. Shares (polymorphic on resource + recipient) ─────────────────
--
-- resource_type ∈ {'video','playlist','category'}
--   video     → resource_id = youtube_videos.id
--   playlist  → resource_id = gw_video_playlists.id
--   category  → resource_id is NULL, resource_category = 'Rehearsals'
--
-- recipient_type ∈ {'user','course','group'}
--   user      → recipient_id = auth.users.id
--   course    → recipient_id = gw_courses.id
--   group     → recipient_id = a future gw_user_groups.id (see Phase B)
--
-- Category shares are stored as (resource_type='category', resource_category
-- text) — no foreign key because categories are ad-hoc strings on
-- youtube_videos.category, not their own table.
CREATE TABLE IF NOT EXISTS public.gw_video_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('video','playlist','category')),
  resource_id UUID,
  resource_category TEXT,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('user','course','group')),
  recipient_id UUID NOT NULL,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view','comment','edit')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Exactly one of resource_id or resource_category is set, depending on type.
  CONSTRAINT gw_video_shares_resource_shape CHECK (
    (resource_type IN ('video','playlist') AND resource_id IS NOT NULL AND resource_category IS NULL) OR
    (resource_type = 'category' AND resource_id IS NULL AND resource_category IS NOT NULL)
  ),
  -- Dedupe: don't allow the same sharer to double-share the same resource
  -- to the same recipient. Re-sharing is a no-op the app can silently
  -- swallow (ON CONFLICT DO NOTHING).
  UNIQUE (resource_type, resource_id, resource_category, recipient_type, recipient_id, shared_by)
);

CREATE INDEX IF NOT EXISTS idx_gw_video_shares_recipient
  ON public.gw_video_shares (recipient_type, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gw_video_shares_resource
  ON public.gw_video_shares (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_gw_video_shares_shared_by
  ON public.gw_video_shares (shared_by, created_at DESC);

ALTER TABLE public.gw_video_shares ENABLE ROW LEVEL SECURITY;

-- Read: sharer sees their own shares; direct-user recipient sees theirs;
-- course-recipient shares are readable if the caller is enrolled in or
-- teaches that course (via any relation on gw_courses — for now we key
-- off instructor_id / created_by and enrolled-students in a course-user
-- relation. Simplified below to: instructor_id = auth.uid() OR EXISTS
-- an enrollment via gw_course_registrations if that table exists; fall
-- back to just instructor for now).
CREATE POLICY gw_video_shares_read ON public.gw_video_shares
  FOR SELECT TO authenticated
  USING (
    shared_by = auth.uid()
    OR (recipient_type = 'user' AND recipient_id = auth.uid())
    OR (recipient_type = 'course' AND EXISTS (
      SELECT 1 FROM public.gw_courses c
      WHERE c.id = gw_video_shares.recipient_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    ))
    -- Group recipient reads: TODO once gw_user_groups lands.
  );

-- Write: only the sharer inserts, only the sharer or recipient (for
-- user-target shares) can revoke.
CREATE POLICY gw_video_shares_insert ON public.gw_video_shares
  FOR INSERT TO authenticated
  WITH CHECK (shared_by = auth.uid());

CREATE POLICY gw_video_shares_delete ON public.gw_video_shares
  FOR DELETE TO authenticated
  USING (
    shared_by = auth.uid()
    OR (recipient_type = 'user' AND recipient_id = auth.uid())
  );

-- Piggyback: when a video or playlist is shared, the recipient should
-- be able to READ it even without owning it. Add a "share-grant" read
-- policy to both tables.
--
-- youtube_videos already has open-read RLS (per an earlier note on the
-- add-form: "WITH CHECK (true) for any authenticated user") so no extra
-- policy needed there. gw_video_playlists needs one:
CREATE POLICY gw_video_playlists_shared_read ON public.gw_video_playlists
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gw_video_shares s
    WHERE s.resource_type = 'playlist'
      AND s.resource_id = gw_video_playlists.id
      AND (
        (s.recipient_type = 'user' AND s.recipient_id = auth.uid())
        OR (s.recipient_type = 'course' AND EXISTS (
          SELECT 1 FROM public.gw_courses c
          WHERE c.id = s.recipient_id
            AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
        ))
      )
  ));

-- Same "readable-when-shared" for playlist items so a recipient can see
-- the videos inside a shared playlist.
CREATE POLICY gw_video_playlist_items_shared_read ON public.gw_video_playlist_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gw_video_shares s
    WHERE s.resource_type = 'playlist'
      AND s.resource_id = gw_video_playlist_items.playlist_id
      AND (
        (s.recipient_type = 'user' AND s.recipient_id = auth.uid())
        OR (s.recipient_type = 'course' AND EXISTS (
          SELECT 1 FROM public.gw_courses c
          WHERE c.id = s.recipient_id
            AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
        ))
      )
  ));

-- ── 4. updated_at trigger for playlists ──────────────────────────────
CREATE OR REPLACE FUNCTION public.set_gw_video_playlists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gw_video_playlists_updated_at ON public.gw_video_playlists;
CREATE TRIGGER trg_gw_video_playlists_updated_at
  BEFORE UPDATE ON public.gw_video_playlists
  FOR EACH ROW EXECUTE FUNCTION public.set_gw_video_playlists_updated_at();
