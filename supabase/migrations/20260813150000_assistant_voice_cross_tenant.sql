-- Assistant voice: same cross-tenant disease as nav prefs (2026-08-13),
-- same cure. user_preferences is UNIQUE(user_id) but tenant-stamped; the
-- voice hook read tenant-walled rows and saved with a direct upsert the
-- RESTRICTIVE policy rejects from any other tenant — "voices won't change
-- and save" for anyone active on two tenants.

-- get_nav_prefs grows the voice column (return-shape change needs a drop).
DROP FUNCTION IF EXISTS public.get_nav_prefs();
CREATE FUNCTION public.get_nav_prefs()
RETURNS TABLE (nav_item_order jsonb, home_tile_layout jsonb, assistant_voice_id text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT up.nav_item_order, up.home_tile_layout, up.assistant_voice_id
  FROM public.user_preferences up
  WHERE up.user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_nav_prefs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_nav_prefs() TO authenticated;

-- Tenant-blind voice save, mirroring save_nav_item_order.
CREATE OR REPLACE FUNCTION public.save_assistant_voice(p_voice_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tenant_id uuid := public.current_tenant_id();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'must be signed in to save assistant voice';
  END IF;
  INSERT INTO public.user_preferences (user_id, tenant_id, assistant_voice_id)
  VALUES (v_user_id, v_tenant_id, p_voice_id)
  ON CONFLICT (user_id) DO UPDATE
    SET assistant_voice_id = EXCLUDED.assistant_voice_id,
        updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.save_assistant_voice(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_assistant_voice(text) TO authenticated;
