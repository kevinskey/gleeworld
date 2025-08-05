-- Update the semester check constraint to allow "Fall 2025"
ALTER TABLE public.gw_dues_records 
DROP CONSTRAINT IF EXISTS gw_dues_records_semester_check;

ALTER TABLE public.gw_dues_records 
ADD CONSTRAINT gw_dues_records_semester_check 
CHECK (semester IN ('Fall 2024', 'Spring 2025', 'Fall 2025', 'Spring 2026', 'Fall 2026'));