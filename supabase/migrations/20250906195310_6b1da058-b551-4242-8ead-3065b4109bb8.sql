-- Delete all existing rehearsal events to make way for recurring rehearsals
DELETE FROM public.gw_events 
WHERE title ILIKE '%rehearsal%' OR event_type = 'rehearsal';