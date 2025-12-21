-- Add semester column to mus240_journal_entries
ALTER TABLE mus240_journal_entries 
ADD COLUMN IF NOT EXISTS semester TEXT DEFAULT 'Fall 2025';

-- Add semester column to mus240_midterm_submissions
ALTER TABLE mus240_midterm_submissions 
ADD COLUMN IF NOT EXISTS semester TEXT DEFAULT 'Fall 2025';

-- Add semester column to mus240_assignments
ALTER TABLE mus240_assignments 
ADD COLUMN IF NOT EXISTS semester TEXT DEFAULT 'Fall 2025';

-- Add semester column to mus240_polls if missing
ALTER TABLE mus240_polls 
ADD COLUMN IF NOT EXISTS semester TEXT DEFAULT 'Fall 2025';

-- Add semester column to mus240_poll_responses if missing
ALTER TABLE mus240_poll_responses 
ADD COLUMN IF NOT EXISTS semester TEXT DEFAULT 'Fall 2025';

-- Add semester column to mus240_participation_grades if missing
ALTER TABLE mus240_participation_grades 
ADD COLUMN IF NOT EXISTS semester TEXT DEFAULT 'Fall 2025';

-- Add semester column to mus240_journal_grades if missing
ALTER TABLE mus240_journal_grades 
ADD COLUMN IF NOT EXISTS semester TEXT DEFAULT 'Fall 2025';

-- Add semester column to mus240_submission_grades if missing
ALTER TABLE mus240_submission_grades 
ADD COLUMN IF NOT EXISTS semester TEXT DEFAULT 'Fall 2025';

-- Add semester column to mus240_peer_reviews if missing
ALTER TABLE mus240_peer_reviews 
ADD COLUMN IF NOT EXISTS semester TEXT DEFAULT 'Fall 2025';

-- Create indexes for semester columns for better query performance
CREATE INDEX IF NOT EXISTS idx_journal_entries_semester ON mus240_journal_entries(semester);
CREATE INDEX IF NOT EXISTS idx_midterm_submissions_semester ON mus240_midterm_submissions(semester);
CREATE INDEX IF NOT EXISTS idx_assignments_semester ON mus240_assignments(semester);
CREATE INDEX IF NOT EXISTS idx_polls_semester ON mus240_polls(semester);
CREATE INDEX IF NOT EXISTS idx_poll_responses_semester ON mus240_poll_responses(semester);

-- Update existing records to be associated with Fall 2025 semester
-- (This is safe since all current data is from Fall 2025)
UPDATE mus240_journal_entries SET semester = 'Fall 2025' WHERE semester IS NULL;
UPDATE mus240_midterm_submissions SET semester = 'Fall 2025' WHERE semester IS NULL;
UPDATE mus240_assignments SET semester = 'Fall 2025' WHERE semester IS NULL;
UPDATE mus240_polls SET semester = 'Fall 2025' WHERE semester IS NULL;
UPDATE mus240_poll_responses SET semester = 'Fall 2025' WHERE semester IS NULL;