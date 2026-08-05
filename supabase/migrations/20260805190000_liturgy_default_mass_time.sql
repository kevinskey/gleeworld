-- Default the Mass time to 10:30.
--
-- The frontend seeds it on create, but a column default makes the behaviour
-- true regardless of which client version (or which insert path) creates the
-- row — the iOS app can be several builds behind the web bundle.
--
-- Existing rows are deliberately NOT backfilled. A plan someone deliberately
-- left without a time is theirs; the editor fills the blank with 10:30 when
-- it is opened, so the default shows up without rewriting anyone's data.

ALTER TABLE public.gw_liturgy_masses
  ALTER COLUMN mass_time SET DEFAULT '10:30:00';

COMMENT ON COLUMN public.gw_liturgy_masses.mass_time IS
  'Local wall-clock start time. Defaults to 10:30, the common principal Mass; '
  'freely editable.';

NOTIFY pgrst, 'reload schema';
