-- Add Rev. Dr. Fr. Urey P. Mark as second instructor for LH100
INSERT INTO public.course_teaching_assistants (user_id, course_code, notes, is_active)
VALUES (
  '03e7c706-7d07-40b6-82a3-6dea7c794f51',
  'LH100',
  'Second Instructor - Full course rights',
  true
)
ON CONFLICT DO NOTHING;

-- Update Rudy Schlosser's role to Secretary
UPDATE public.course_teaching_assistants 
SET notes = 'Secretary - Administrative support and attendance management'
WHERE user_id = 'b4df1a55-1c8b-44ae-96d0-861488fb9e53' 
AND course_code = 'LH100';

-- Add Sanaia Harrison as TA for LH100
INSERT INTO public.course_teaching_assistants (user_id, course_code, notes, is_active)
VALUES (
  'c5a895a8-841e-4157-95f9-31e1cbc66b4f',
  'LH100',
  'Teaching Assistant',
  true
)
ON CONFLICT DO NOTHING;

-- Add Morgan Harvey as TA for LH100 (using Spelman email)
INSERT INTO public.course_teaching_assistants (user_id, course_code, notes, is_active)
VALUES (
  '1fb922f5-a62d-4e1d-8bce-a18e88cc917e',
  'LH100',
  'Teaching Assistant',
  true
)
ON CONFLICT DO NOTHING;