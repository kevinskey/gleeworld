-- 20260730000002_permission_slip_trigger_guard.sql
--
-- Guard the gw_create_permission_slip_for_roster trigger function against
-- roster rows that do not carry a tour_id.
--
-- Background: gw_tour_roster.tour_id is nullable — roster rows can be inserted
-- without an event-scope (e.g. from TourRosterSection when the UI hasn't
-- associated the student with a specific tour yet). The trigger previously
-- tried to INSERT into gw_permission_slips(tour_id, ...) with NEW.tour_id = NULL,
-- which violates the NOT NULL constraint on gw_permission_slips.tour_id and
-- caused the entire roster INSERT to roll back.
--
-- Fix: return early when NEW.tour_id IS NULL. Roster rows without event-scoping
-- do not need a permission slip — slips are always per-tour.
--
-- Follow-up (tracked separately): TourRosterSection.tsx should be updated to
-- populate tour_id on every insert so all K-12 roster additions automatically
-- generate slips without needing a separate step.

CREATE OR REPLACE FUNCTION gw_create_permission_slip_for_roster()
RETURNS TRIGGER AS $$
DECLARE
  is_k12 BOOLEAN;
BEGIN
  -- Roster rows without an event-scope cannot produce a valid permission slip
  -- (gw_permission_slips.tour_id is NOT NULL). Return early to avoid a
  -- constraint violation that would roll back the roster INSERT entirely.
  IF NEW.tour_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(k12_ensemble, false) INTO is_k12
  FROM gw_branding_settings
  WHERE tenant_id = current_tenant_id();
  IF is_k12 THEN
    INSERT INTO gw_permission_slips (tour_id, student_user_id)
    VALUES (NEW.tour_id, NEW.user_id)
    ON CONFLICT (tour_id, student_user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
