-- Update assignment codes for Listening Journal assignments
-- Extract the number from titles like "Listening Journal 10" and create codes like "lj10"
UPDATE mus240_assignments
SET assignment_code = 'lj' || regexp_replace(title, '[^0-9]', '', 'g')
WHERE title LIKE 'Listening Journal%' 
  AND assignment_code IS NULL
  AND title ~ '\d+';