
-- Update gw_student_profiles with generated Spelman emails based on names
-- Format: firstname.lastname@spelman.edu (lowercase, from "Last, First M." format)

UPDATE gw_student_profiles
SET email = LOWER(
  REGEXP_REPLACE(
    SPLIT_PART(full_name, ', ', 2), -- First name part (e.g., "Karrington R.")
    ' [A-Z]\.?$', '', 'g'           -- Remove middle initial
  ) || '.' ||
  SPLIT_PART(full_name, ', ', 1)    -- Last name (e.g., "Adams")
) || '@spelman.edu'
WHERE email IS NULL 
AND full_name IS NOT NULL
AND full_name LIKE '%, %';
