-- Audition slots: a session is "auditioning FOR a performance date, with a
-- series of audition dates/times" (Kevin, 2026-08-13 — the flat
-- date-range + comma-text model didn't match how auditions work).
-- Each slot: { "date": "2026-09-06", "time": "10:00 AM – 2:00 PM",
--              "location": "Music Building, Rm 210" } (location optional,
-- falls back to the session's).
--
-- Self-hosted: record-only; apply by hand as supabase_admin.

ALTER TABLE public.audition_sessions
  ADD COLUMN IF NOT EXISTS audition_slots jsonb NOT NULL DEFAULT '[]'::jsonb;

DROP FUNCTION IF EXISTS public.get_public_audition_session(text);
CREATE FUNCTION public.get_public_audition_session(p_slug text)
RETURNS TABLE (
  name text, description text, start_date date,
  audition_dates text[], audition_slots jsonb,
  application_deadline timestamptz,
  location text, time_label text, requirements text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.name, s.description, s.start_date,
         s.audition_dates, s.audition_slots, s.application_deadline,
         s.location, s.time_label, s.requirements
  FROM public.audition_sessions s
  JOIN public.gw_tenants t ON t.id = s.tenant_id
  WHERE t.slug = p_slug AND s.is_active = true
  ORDER BY s.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_audition_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_audition_session(text) TO anon, authenticated;
