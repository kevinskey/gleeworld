-- Make created_by NOT NULL with a default of auth.uid() so RLS insert policy always works
ALTER TABLE gw_tour_timeline_events ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE gw_tour_timeline_events ALTER COLUMN created_by SET NOT NULL;