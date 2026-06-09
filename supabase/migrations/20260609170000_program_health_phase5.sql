-- Program Health module — Phase 5 (contact log)
--
-- Phase 0 added gw_profiles.last_contacted_at as a single timestamp, which
-- fuels the "specific members about to walk" flag but throws away history.
-- This phase adds the audit trail: who reached out, when, on which channel,
-- with what note. A trigger keeps last_contacted_at in sync on insert so the
-- existing health snapshot logic in Phase 2 doesn't need to change.
--
-- Additive only. Re-runnable.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. gw_contact_log — one row per touchpoint.
-- ensemble_id is optional: program-wide outreach (annual newsletter,
-- general check-in) leaves it NULL; ensemble-scoped outreach references
-- the ensemble so the snapshot can attribute it.
-- recorded_by is the director / staff who logged the contact, NOT the
-- contacted member.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gw_contact_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid NOT NULL REFERENCES public.gw_profiles(id) ON DELETE CASCADE,
  ensemble_id   uuid REFERENCES public.gw_ensembles(id) ON DELETE SET NULL,
  recorded_by   uuid REFERENCES public.gw_profiles(id) ON DELETE SET NULL,
  channel       text NOT NULL
                CHECK (channel IN ('email','call','text','in_person','other')),
  note          text,
  contacted_at  timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gw_contact_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_gw_contact_log_profile_time
  ON public.gw_contact_log(profile_id, contacted_at DESC);
CREATE INDEX IF NOT EXISTS idx_gw_contact_log_ensemble_time
  ON public.gw_contact_log(ensemble_id, contacted_at DESC);

CREATE POLICY "Members can see their own contact log"
  ON public.gw_contact_log FOR SELECT
  USING (
    profile_id IN (SELECT id FROM public.gw_profiles WHERE user_id = auth.uid())
    OR is_admin(auth.uid())
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Admins can manage contact log"
  ON public.gw_contact_log FOR ALL
  USING (is_admin(auth.uid()) OR is_super_admin(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Trigger — keep gw_profiles.last_contacted_at fresh.
-- Only writes forward (never clobbers a newer timestamp), so back-dated
-- entries don't make the staleness signal lie.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.gw_contact_log_touch_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.gw_profiles
     SET last_contacted_at = NEW.contacted_at
   WHERE id = NEW.profile_id
     AND (last_contacted_at IS NULL OR last_contacted_at < NEW.contacted_at);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gw_contact_log_touch_profile ON public.gw_contact_log;
CREATE TRIGGER trg_gw_contact_log_touch_profile
  AFTER INSERT ON public.gw_contact_log
  FOR EACH ROW
  EXECUTE FUNCTION public.gw_contact_log_touch_profile();
