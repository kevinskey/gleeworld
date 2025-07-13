-- Delete all Spelman College Glee Club Rehearsal events
DELETE FROM public.gw_events 
WHERE title = 'Spelman College Glee Club Rehearsal' 
  AND event_type = 'performance';