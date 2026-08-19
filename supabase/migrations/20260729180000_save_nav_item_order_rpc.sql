-- save_nav_item_order — SECURITY DEFINER RPC that writes the per-user
-- sidebar order for the CURRENT auth.uid(), resyncing tenant_id to
-- current_tenant_id() on every save.
--
-- Why an RPC: user_preferences carries a RESTRICTIVE tenant_isolation_restrict
-- policy. When current_tenant_id() became subdomain-aware, users whose
-- existing row was written on a different subdomain hit a 403 on every
-- upsert (USING expression failed against the stored tenant_id). Rather
-- than drop tenant isolation on the whole table, this function runs as
-- owner (bypasses RLS), manually enforces "signed-in user writes own
-- row," and upserts the row's tenant_id to whatever the caller's
-- current session says — so the drag-to-reorder path stops fighting
-- the RLS gate on every save.

CREATE OR REPLACE FUNCTION public.save_nav_item_order(p_nav_item_order jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tenant_id uuid := public.current_tenant_id();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'must be signed in to save nav order';
  END IF;
  INSERT INTO public.user_preferences (user_id, tenant_id, nav_item_order)
  VALUES (v_user_id, v_tenant_id, p_nav_item_order)
  ON CONFLICT (user_id) DO UPDATE
    SET nav_item_order = EXCLUDED.nav_item_order,
        tenant_id = EXCLUDED.tenant_id,
        updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.save_nav_item_order(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_nav_item_order(jsonb) TO authenticated;
