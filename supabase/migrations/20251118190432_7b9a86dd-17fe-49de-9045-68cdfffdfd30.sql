-- Update all MUS240 listening journal assignments to be worth 20 points
UPDATE mus240_assignments
SET points = 20,
    updated_at = now()
WHERE assignment_type = 'listening_journal';

-- Also update any other journal-type assignments to 20 points if needed
UPDATE mus240_assignments
SET points = 20,
    updated_at = now()
WHERE assignment_code LIKE 'lj%'
  AND points != 20;