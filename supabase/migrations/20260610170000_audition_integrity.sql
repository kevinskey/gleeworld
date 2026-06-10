-- Audition integrity fixes:
-- 1. Applicants could UPDATE their own audition_applications row with no
--    column restriction, including status — i.e. self-acceptance. The trigger
--    below lets admins/exec-board set status freely but silently preserves
--    the existing status for everyone else (raising would break the
--    re-submit flow, which always sends status='submitted').
-- 2. Slot booking on gw_auditions was check-then-insert in the client with
--    no constraint, so two users could claim the same slot. Unique partial
--    index closes the race (rejected auditions free their slot).

CREATE OR REPLACE FUNCTION public.protect_audition_application_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- auth.uid() IS NULL = service role / internal job: leave untouched.
  IF auth.uid() IS NOT NULL
     AND NOT (public.is_current_user_admin_or_super_admin()
              OR public.is_executive_board_or_admin()) THEN
    IF TG_OP = 'INSERT' THEN
      NEW.status := 'submitted';
    ELSE
      NEW.status := OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_application_status ON public.audition_applications;
CREATE TRIGGER trg_protect_application_status
  BEFORE INSERT OR UPDATE ON public.audition_applications
  FOR EACH ROW EXECUTE FUNCTION public.protect_audition_application_status();

-- sync_audition_to_management() mirrors each application into gw_auditions,
-- passing audition_time_slot::date/::time — NULL until the applicant books a
-- slot. NOT NULL on these columns made every slot-less application submission
-- fail, so applications could never be created from AuditionApplicationPage.
ALTER TABLE public.gw_auditions ALTER COLUMN audition_date DROP NOT NULL;
ALTER TABLE public.gw_auditions ALTER COLUMN audition_time DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_gw_auditions_slot
  ON public.gw_auditions (tenant_id, audition_date, audition_time)
  WHERE status <> 'rejected';
