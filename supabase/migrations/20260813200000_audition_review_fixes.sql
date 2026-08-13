-- Fixes from the 2026-08-13 audition-code review (10 confirmed findings).
-- Self-hosted: record-only; apply by hand as supabase_admin.

-- ── Staff predicate: tenant-scoped, both admin models ────────────────────
-- The global gw_profiles flag check (is_current_user_admin_or_super_admin)
-- has no tenant term, and membership-only admins (gw_tenant_members.role)
-- have no flag. Every audition/wall policy below uses this instead.
CREATE OR REPLACE FUNCTION public.is_staff_of_tenant(p_tenant uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_tenant_members m
    WHERE m.tenant_id = p_tenant
      AND m.user_id = auth.uid()
      AND m.role IN ('admin', 'owner', 'super_admin', 'super-admin')
  )
  OR (public.is_current_user_admin_or_super_admin()
      AND p_tenant = public.current_tenant_id());
$$;
REVOKE ALL ON FUNCTION public.is_staff_of_tenant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff_of_tenant(uuid) TO authenticated;

-- Client-callable variant keyed by slug (the public site knows only slugs).
CREATE OR REPLACE FUNCTION public.am_i_staff(p_slug text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_staff_of_tenant(t.id)
  FROM public.gw_tenants t WHERE t.slug = p_slug;
$$;
REVOKE ALL ON FUNCTION public.am_i_staff(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.am_i_staff(text) TO authenticated;

-- ── Finding 1: public-site writes filed into the WRONG tenant ────────────
-- current_tenant_id() falls back to the signed-in user's HOME tenant when
-- they are not a member of the page's tenant — a graduate homed elsewhere
-- submitted into their own tenant and vanished from the concert tenant's
-- admin. These writers resolve the tenant FROM THE PAGE SLUG.
CREATE OR REPLACE FUNCTION public.submit_audition_signup(
  p_slug text, p_voice_part text, p_era text, p_phone text, p_note text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'sign in to audition'; END IF;
  IF p_voice_part IS NULL OR length(trim(p_voice_part)) = 0 THEN
    RAISE EXCEPTION 'voice part required';
  END IF;
  SELECT id INTO v_tenant FROM public.gw_tenants WHERE slug = p_slug;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'unknown site'; END IF;
  INSERT INTO public.gw_audition_signups (tenant_id, user_id, voice_part, era, phone, note, updated_at)
  VALUES (v_tenant, auth.uid(), left(trim(p_voice_part), 40), left(p_era, 120), left(p_phone, 30), left(p_note, 500), now())
  ON CONFLICT (tenant_id, user_id) DO UPDATE
    SET voice_part = EXCLUDED.voice_part, era = EXCLUDED.era,
        phone = EXCLUDED.phone, note = EXCLUDED.note, updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.submit_audition_signup(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_audition_signup(text, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_audition_signup(p_slug text)
RETURNS TABLE (voice_part text, era text, phone text, note text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.voice_part, s.era, s.phone, s.note
  FROM public.gw_audition_signups s
  JOIN public.gw_tenants t ON t.id = s.tenant_id
  WHERE t.slug = p_slug AND s.user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_my_audition_signup(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_audition_signup(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.post_wish(
  p_slug text, p_class_year text, p_message text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant uuid;
  v_display text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'sign in to post'; END IF;
  IF p_message IS NULL OR length(trim(p_message)) NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'message must be 1-1000 characters';
  END IF;
  SELECT id INTO v_tenant FROM public.gw_tenants WHERE slug = p_slug;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'unknown site'; END IF;
  -- Display name comes from the profile server-side; the client no longer
  -- supplies it (it was client-forgeable).
  SELECT COALESCE(NULLIF(trim(p.preferred_name), ''), NULLIF(trim(p.full_name), ''), p.email, 'A graduate')
    INTO v_display
  FROM public.gw_profiles p WHERE p.user_id = auth.uid()
  ORDER BY (p.tenant_id = v_tenant) DESC LIMIT 1;
  INSERT INTO public.gw_wish_wall_posts (tenant_id, user_id, display_name, class_year, message)
  VALUES (v_tenant, auth.uid(), COALESCE(v_display, 'A graduate'), left(p_class_year, 20), trim(p_message));
END;
$$;
REVOKE ALL ON FUNCTION public.post_wish(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_wish(text, text, text) TO authenticated;

-- ── Finding 2: wish-wall admin powers were GLOBAL, now tenant-scoped ─────
DROP POLICY IF EXISTS wish_wall_read_visible ON public.gw_wish_wall_posts;
CREATE POLICY wish_wall_read_visible ON public.gw_wish_wall_posts
  FOR SELECT
  USING (hidden = false OR public.is_staff_of_tenant(tenant_id));
DROP POLICY IF EXISTS wish_wall_admin_hide ON public.gw_wish_wall_posts;
CREATE POLICY wish_wall_admin_hide ON public.gw_wish_wall_posts
  FOR UPDATE TO authenticated
  USING (public.is_staff_of_tenant(tenant_id))
  WITH CHECK (public.is_staff_of_tenant(tenant_id));
DROP POLICY IF EXISTS wish_wall_delete_own_or_admin ON public.gw_wish_wall_posts;
CREATE POLICY wish_wall_delete_own_or_admin ON public.gw_wish_wall_posts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_of_tenant(tenant_id));

-- ── Finding 3: membership-only tenant admins locked out ──────────────────
DROP POLICY IF EXISTS audition_signup_read_self_or_admin ON public.gw_audition_signups;
CREATE POLICY audition_signup_read_self_or_admin ON public.gw_audition_signups
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_of_tenant(tenant_id));
-- Promote path: membership admins may file applications for others.
DROP POLICY IF EXISTS audition_applications_staff_insert ON public.audition_applications;
CREATE POLICY audition_applications_staff_insert ON public.audition_applications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_of_tenant(public.current_tenant_id()));
DROP POLICY IF EXISTS audition_applications_staff_read ON public.audition_applications;
CREATE POLICY audition_applications_staff_read ON public.audition_applications
  FOR SELECT TO authenticated
  USING (public.is_staff_of_tenant(tenant_id));

-- ── Finding 6/9: staff roster reader (profiles are tenant-walled) ────────
CREATE OR REPLACE FUNCTION public.get_audition_signup_profiles()
RETURNS TABLE (user_id uuid, full_name text, email text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT ON (p.user_id) p.user_id, p.full_name, p.email
  FROM public.gw_profiles p
  WHERE public.is_staff_of_tenant(public.current_tenant_id())
    AND EXISTS (
      SELECT 1 FROM public.gw_audition_signups s
      WHERE s.user_id = p.user_id
        AND s.tenant_id = public.current_tenant_id()
    )
  ORDER BY p.user_id, (p.tenant_id = public.current_tenant_id()) DESC;
$$;
REVOKE ALL ON FUNCTION public.get_audition_signup_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_audition_signup_profiles() TO authenticated;

-- ── Finding 8: anon session reads gated on an actually-published block ───
DROP FUNCTION IF EXISTS public.get_public_audition_session(text);
CREATE FUNCTION public.get_public_audition_session(p_slug text)
RETURNS TABLE (
  name text, description text, start_date date,
  audition_dates text[], audition_slots jsonb,
  application_deadline timestamptz,
  location text, time_label text, requirements text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.name, s.description, s.start_date,
         s.audition_dates, s.audition_slots, s.application_deadline,
         s.location, s.time_label, s.requirements
  FROM public.audition_sessions s
  JOIN public.gw_tenants t ON t.id = s.tenant_id
  WHERE t.slug = p_slug AND s.is_active = true
    -- Only tenants whose PUBLISHED site actually shows an audition block.
    AND EXISTS (
      SELECT 1 FROM public.gw_public_sites ps
      WHERE ps.tenant_id = s.tenant_id
        AND ps.is_published = true
        AND ps.published_blocks @> '[{"block_type": "audition"}]'::jsonb
    )
  ORDER BY s.created_at DESC
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_public_audition_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_audition_session(text) TO anon, authenticated;
