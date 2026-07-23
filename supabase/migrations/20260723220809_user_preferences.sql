-- gw_user_preferences: per-user key/value scratchpad the assistant can read
-- from and write to. Intended for small "recall my usual X" facts:
--   starbucks_usual = "grande blonde with oat milk"
--   favorite_pizza  = "Antico Pizza — Nona Margherita"
--   default_lunch   = "chicken tenders, no bun, ranch"
--
-- Not intended as a general-purpose data table — keep values under a few
-- kilobytes and prefer a domain-specific table when the shape has more
-- structure. RLS scopes every row to its owner; the assistant server always
-- queries via the caller's JWT so it can only see the caller's preferences.

CREATE TABLE IF NOT EXISTS public.gw_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL CHECK (char_length(key) BETWEEN 1 AND 80),
  value TEXT NOT NULL CHECK (char_length(value) <= 4000),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_gw_user_preferences_user_id
  ON public.gw_user_preferences (user_id);

ALTER TABLE public.gw_user_preferences ENABLE ROW LEVEL SECURITY;

-- Owner reads / writes only. No tenant scoping — these are personal to the
-- user account, not the tenant they happen to be signed in as.
CREATE POLICY "user_preferences_own_select"
  ON public.gw_user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_preferences_own_insert"
  ON public.gw_user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences_own_update"
  ON public.gw_user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences_own_delete"
  ON public.gw_user_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Keep updated_at fresh on every UPDATE so the assistant can tell a stale
-- preference (recall from years ago) from a recent one.
CREATE OR REPLACE FUNCTION public.tg_gw_user_preferences_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gw_user_preferences_touch_updated_at
  ON public.gw_user_preferences;
CREATE TRIGGER trg_gw_user_preferences_touch_updated_at
  BEFORE UPDATE ON public.gw_user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.tg_gw_user_preferences_touch_updated_at();
