-- Drop and recreate the check constraint with additional event types
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_type_check;

ALTER TABLE public.events ADD CONSTRAINT events_event_type_check 
CHECK (event_type = ANY (ARRAY[
  'performance'::text, 
  'rehearsal'::text, 
  'meeting'::text, 
  'other'::text, 
  'concert'::text, 
  'workshop'::text, 
  'social'::text, 
  'fundraiser'::text, 
  'competition'::text, 
  'audition'::text, 
  'masterclass'::text,
  'exec-meeting'::text,
  'tour'::text,
  'class'::text,
  'deadline'::text,
  'holiday'::text
]));