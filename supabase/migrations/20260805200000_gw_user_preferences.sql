-- The assistant's long-term memory: a small per-user key/value scratchpad.
--
-- This table has been referenced by shipped code since the assistant gained
-- remember_preference/get_preference, but was never created — so BOTH sides
-- were dead. Writes failed with "relation does not exist" (surfaced only as
-- a chat message), and reads returned an error the assistant reported as
-- "no preference set", so it silently forgot everything and re-asked. That
-- is why it kept asking for facts you had already given it.
--
-- Key/value rather than columns on user_preferences: the tool contract is an
-- OPEN namespace the model invents keys in ('starbucks_usual',
-- 'favorite_pizza', 'default_lunch'). user_preferences is a wide-column table
-- — one column per setting — so it cannot hold keys nobody has thought of
-- yet. Wiring these to columns would mean shipping a migration every time the
-- assistant learns a new kind of fact. They are different shapes with
-- different jobs, so they stay separate tables.
--
-- Owner-private, following gw_planner_notes: tenant isolation RESTRICTIVE,
-- ownership PERMISSIVE, and deliberately NO admin read policy. This holds
-- offhand personal detail ("oat milk, no foam") a user told an assistant, not
-- roster data an administrator has business reading.

CREATE TABLE IF NOT EXISTS public.gw_user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.current_tenant_id(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL CHECK (length(key) BETWEEN 1 AND 128),
  -- 4000 matches the cap the tool description already advertises to the model.
  value TEXT NOT NULL CHECK (length(value) <= 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- tenant_id is part of the key, not just (user_id, key). A user who belongs to
-- two tenants must be able to save the same key in each: with a tenant-less
-- unique index, their row in tenant A is INVISIBLE under tenant B's
-- RESTRICTIVE policy, so the upsert would neither see it nor be able to insert
-- past it — a unique violation against a row the user cannot read. This
-- ordering also serves the lookup, which is always (tenant, user) then key.
CREATE UNIQUE INDEX IF NOT EXISTS gw_user_preferences_scope_key_idx
  ON public.gw_user_preferences (tenant_id, user_id, key);

CREATE OR REPLACE FUNCTION public.gw_user_preferences_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gw_user_preferences_touch ON public.gw_user_preferences;
CREATE TRIGGER gw_user_preferences_touch
  BEFORE UPDATE ON public.gw_user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.gw_user_preferences_touch();

-- Platform-standard tenant backfill: the column DEFAULT does not fire when a
-- client sends tenant_id explicitly as NULL.
DROP TRIGGER IF EXISTS gw_user_preferences_set_tenant ON public.gw_user_preferences;
CREATE TRIGGER gw_user_preferences_set_tenant
  BEFORE INSERT ON public.gw_user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

ALTER TABLE public.gw_user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gw_user_preferences_isolation ON public.gw_user_preferences;
CREATE POLICY gw_user_preferences_isolation ON public.gw_user_preferences
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS gw_user_preferences_owner ON public.gw_user_preferences;
CREATE POLICY gw_user_preferences_owner ON public.gw_user_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- anon has no business here: this is signed-in personal data, and the
-- assistant only offers these tools at minRole 'member'.
REVOKE ALL ON public.gw_user_preferences FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gw_user_preferences TO authenticated;

COMMENT ON TABLE public.gw_user_preferences IS
  'Per-user key/value scratchpad for assistant long-term memory '
  '(remember_preference / get_preference). Owner-private; not admin-readable.';

NOTIFY pgrst, 'reload schema';
