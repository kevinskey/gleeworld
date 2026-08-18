-- Audition sessions drive the public site (Kevin, 2026-08-13: "a backend
-- to schedule audition dates without your help"). The Auditions module's
-- Sessions tab becomes the scheduling backend; the public `audition` block
-- reads the active session live.
--
-- Self-hosted: record-only; apply by hand as supabase_admin.

ALTER TABLE public.audition_sessions
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS time_label text;

-- Anon-safe reader: the active session's PUBLIC-facing fields only, by
-- tenant slug (the public site has no session/tenant context). SECURITY
-- DEFINER instead of an anon RLS policy so nothing else about the table's
-- visibility changes.
CREATE OR REPLACE FUNCTION public.get_public_audition_session(p_slug text)
RETURNS TABLE (
  name text, description text, start_date date,
  audition_dates text[], application_deadline timestamptz,
  location text, time_label text, requirements text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.name, s.description, s.start_date,
         s.audition_dates, s.application_deadline,
         s.location, s.time_label, s.requirements
  FROM public.audition_sessions s
  JOIN public.gw_tenants t ON t.id = s.tenant_id
  WHERE t.slug = p_slug AND s.is_active = true
  ORDER BY s.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_audition_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_audition_session(text) TO anon, authenticated;
