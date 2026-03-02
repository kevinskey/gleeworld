
-- Drop and recreate the constraint with a broader set of values
ALTER TABLE public.gw_events DROP CONSTRAINT IF EXISTS gw_events_attendance_type_check;
ALTER TABLE public.gw_events ADD CONSTRAINT gw_events_attendance_type_check 
  CHECK (attendance_type = ANY (ARRAY['none'::text, 'optional'::text, 'required'::text, 'rehearsal'::text, 'mandatory'::text]));

-- Also update the events table constraint to match
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_attendance_type_check;
ALTER TABLE public.events ADD CONSTRAINT events_attendance_type_check 
  CHECK (attendance_type = ANY (ARRAY['none'::text, 'optional'::text, 'required'::text, 'rehearsal'::text, 'mandatory'::text]));
