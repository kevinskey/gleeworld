-- Remove Sanaia Harrison from MUS240 Fall 2025 enrollment
UPDATE public.mus240_enrollments 
SET 
  enrollment_status = 'withdrawn',
  updated_at = now()
WHERE student_id = '10daa1a0-7e12-4db5-8124-1906609c2a1b' 
  AND semester = 'Fall 2025';