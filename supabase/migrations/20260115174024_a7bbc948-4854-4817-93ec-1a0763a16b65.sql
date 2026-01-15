-- Create LH 100 Bowman Scholars course for Spring 2026
INSERT INTO public.gw_courses (
  id,
  course_code,
  code,
  title,
  description,
  term,
  semester,
  start_date,
  end_date,
  timezone,
  is_active,
  is_free
) VALUES (
  'a0000000-0000-0000-0000-000000000100',
  'LH 100',
  'LH-100',
  'Bowman Scholars',
  'Named after Sister Thea Bowman, this program develops liturgical leaders through spiritual formation, music ministry, and worship planning.',
  'Spring 2026',
  'SPRING 2026',
  '2026-01-14',
  '2026-05-06',
  'America/New_York',
  true,
  true
) ON CONFLICT (id) DO UPDATE SET
  course_code = EXCLUDED.course_code,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  term = EXCLUDED.term,
  semester = EXCLUDED.semester,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  is_active = EXCLUDED.is_active;

-- Add course_id column to bowman_scholars to link scholars to LH 100
ALTER TABLE public.bowman_scholars 
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.gw_courses(id);

-- Update existing bowman_scholars to link to LH 100
UPDATE public.bowman_scholars 
SET course_id = 'a0000000-0000-0000-0000-000000000100'
WHERE course_id IS NULL;

-- Create enrollment records for existing Bowman Scholars (without semester column)
INSERT INTO public.gw_course_enrollments (student_profile_id, course_id, enrollment_status)
SELECT 
  bs.user_id,
  'a0000000-0000-0000-0000-000000000100',
  'enrolled'
FROM public.bowman_scholars bs
WHERE EXISTS (SELECT 1 FROM public.gw_student_profiles sp WHERE sp.user_id = bs.user_id)
ON CONFLICT DO NOTHING;