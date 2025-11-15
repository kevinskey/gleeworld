-- Add grading columns to mus240_journal_entries table
ALTER TABLE mus240_journal_entries
ADD COLUMN IF NOT EXISTS grade integer,
ADD COLUMN IF NOT EXISTS feedback jsonb,
ADD COLUMN IF NOT EXISTS graded_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS graded_by text;