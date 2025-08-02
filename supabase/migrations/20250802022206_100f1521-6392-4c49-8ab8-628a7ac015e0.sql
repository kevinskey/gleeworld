-- Remove sample meeting minutes data
DELETE FROM public.gw_meeting_minutes 
WHERE title IN (
  'Executive Board Meeting - March 2024',
  'General Assembly - March 2024', 
  'Emergency Executive Board Meeting - February 2024',
  'Planning Committee Meeting - February 2024'
);