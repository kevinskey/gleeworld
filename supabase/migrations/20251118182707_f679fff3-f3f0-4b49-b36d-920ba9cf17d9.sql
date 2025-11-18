-- Add assignment_code column to mus240_assignments table
ALTER TABLE mus240_assignments ADD COLUMN IF NOT EXISTS assignment_code TEXT;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mus240_assignments_assignment_code ON mus240_assignments(assignment_code);

-- Add a comment explaining the column
COMMENT ON COLUMN mus240_assignments.assignment_code IS 'Short code like lj1, lj2, etc. used to match with journal entries';