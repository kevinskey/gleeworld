-- Drop and recreate with ALL event types from codebase
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_type_check;

ALTER TABLE public.events ADD CONSTRAINT events_event_type_check 
CHECK (event_type = ANY (ARRAY[
  -- Core types
  'performance'::text, 
  'rehearsal'::text, 
  'meeting'::text, 
  'other'::text,
  -- Concert/Music types
  'concert'::text, 
  'workshop'::text, 
  'masterclass'::text,
  'audition'::text,
  'competition'::text,
  'voice-lesson'::text,
  'sectional'::text,
  'tutorial'::text,
  -- Meeting types
  'member-meeting'::text,
  'exec-meeting'::text,
  -- Social/Event types
  'social'::text, 
  'fundraiser'::text,
  'banquet'::text,
  'retreat'::text,
  -- Tour types
  'tour'::text,
  'tour_stop'::text,
  'travel'::text,
  -- Academic types
  'class'::text,
  'academic'::text,
  -- Special types
  'deadline'::text,
  'holiday'::text,
  'worship_event'::text,
  'volunteer'::text
]));