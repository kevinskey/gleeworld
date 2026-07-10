-- Songwriting add-on: AI-assisted lyric writing for students.
-- Port of kpjsongwriting.com. Songs are private to the writer by
-- default; visibility='tenant' opt-in makes a song readable (not
-- writable) by everyone in the tenant. Recordings are owner-only
-- even on shared songs (v1). AI usage rows are written by the
-- songwriting-ai edge function (service role) and double as the
-- rate-limit counter and per-tenant DeepSeek cost ledger.

CREATE TABLE IF NOT EXISTS public.gw_songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled song',
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  tempo_bpm INTEGER,
  key_signature TEXT,
  graveyard JSONB NOT NULL DEFAULT '[]'::jsonb,
  chord_chart JSONB,
  chord_charts JSONB NOT NULL DEFAULT '[]'::jsonb,
  visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'tenant')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_songs_owner_idx
  ON public.gw_songs (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS gw_songs_tenant_shared_idx
  ON public.gw_songs (tenant_id, visibility, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.gw_song_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  song_id UUID NOT NULL REFERENCES public.gw_songs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,        -- path inside the 'songwriting' bucket
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_song_recordings_song_idx
  ON public.gw_song_recordings (song_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.gw_songwriting_ai_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  feature TEXT NOT NULL,            -- rhymes | next_line | synonyms | sensory | related | rewrite
  input_preview TEXT,
  output_preview TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_songwriting_ai_logs_rate_idx
  ON public.gw_songwriting_ai_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS gw_songwriting_ai_logs_tenant_idx
  ON public.gw_songwriting_ai_logs (tenant_id, created_at DESC);

-- ── tenant_id backfill triggers (belt-and-suspenders with DEFAULT) ──
CREATE OR REPLACE FUNCTION public.gw_songs_fill_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.current_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gw_songs_fill_tenant_trg ON public.gw_songs;
CREATE TRIGGER gw_songs_fill_tenant_trg
  BEFORE INSERT ON public.gw_songs
  FOR EACH ROW EXECUTE FUNCTION public.gw_songs_fill_tenant();

DROP TRIGGER IF EXISTS gw_song_recordings_fill_tenant_trg ON public.gw_song_recordings;
CREATE TRIGGER gw_song_recordings_fill_tenant_trg
  BEFORE INSERT ON public.gw_song_recordings
  FOR EACH ROW EXECUTE FUNCTION public.gw_songs_fill_tenant();

-- ── updated_at bump ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.gw_songs_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gw_songs_touch_trg ON public.gw_songs;
CREATE TRIGGER gw_songs_touch_trg
  BEFORE UPDATE ON public.gw_songs
  FOR EACH ROW EXECUTE FUNCTION public.gw_songs_touch();

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE public.gw_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_song_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_songwriting_ai_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_restrict ON public.gw_songs AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY tenant_isolation_restrict ON public.gw_song_recordings AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY tenant_isolation_restrict ON public.gw_songwriting_ai_logs AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Songs: owner full control; tenant-mates read shared songs only.
CREATE POLICY songs_select ON public.gw_songs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR visibility = 'tenant');
CREATE POLICY songs_insert ON public.gw_songs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY songs_update ON public.gw_songs FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY songs_delete ON public.gw_songs FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Recordings: owner-only, all verbs (spec: not shared in v1).
CREATE POLICY song_recordings_owner ON public.gw_song_recordings
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- AI logs: users may read their own usage; only the edge function
-- (service role, bypasses RLS) writes.
CREATE POLICY ai_logs_select_own ON public.gw_songwriting_ai_logs
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ── Storage bucket ───────────────────────────────────────────────────
-- Path layout: <tenant_id>/<user_id>/<song_id>/take-<ts>.<ext>
INSERT INTO storage.buckets (id, name, public)
VALUES ('songwriting', 'songwriting', false)
ON CONFLICT (id) DO NOTHING;

-- Owner-only (stricter than the studio bucket: recordings are private).
CREATE POLICY songwriting_bucket_owner_read ON storage.objects FOR SELECT
  USING (
    bucket_id = 'songwriting'
    AND (storage.foldername(name))[1] = current_tenant_id()::text
    AND owner = auth.uid()
  );
CREATE POLICY songwriting_bucket_owner_write ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'songwriting'
    AND (storage.foldername(name))[1] = current_tenant_id()::text
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
CREATE POLICY songwriting_bucket_owner_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'songwriting'
    AND (storage.foldername(name))[1] = current_tenant_id()::text
    AND owner = auth.uid()
  );

-- ── Billing catalog row (ships DARK: no stripe_price_id) ────────────
INSERT INTO public.gw_billing_modules
  (id, name, description, tier, category, icon, monthly_price_cents, is_active, sort_order)
VALUES (
  'songwriting',
  'Songwriting',
  'AI-assisted songwriting for your students: lyric editor with syllable counts, rhyme and next-line suggestions, chord charts, and demo recording.',
  'addon',
  'create',
  'PenLine',
  1499,
  true,
  70
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;
