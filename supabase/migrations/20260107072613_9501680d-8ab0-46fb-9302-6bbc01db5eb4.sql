-- Update MUS 210 to Spring 2026 term
UPDATE public.gw_courses 
SET term = 'Spring 2026', updated_at = now() 
WHERE course_code = 'MUS 210';

-- Update MUS 240 to have the correct term
UPDATE public.gw_courses 
SET term = 'Spring 2026', updated_at = now() 
WHERE course_code = 'MUS 240';