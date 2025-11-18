-- Add fields for resubmission tracking and AI detection to journal entries
ALTER TABLE mus240_journal_entries
ADD COLUMN IF NOT EXISTS resubmission_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_submission_id UUID REFERENCES mus240_journal_entries(id),
ADD COLUMN IF NOT EXISTS is_resubmission BOOLEAN DEFAULT false;

-- Add AI detection fields to grades table
ALTER TABLE mus240_journal_grades
ADD COLUMN IF NOT EXISTS ai_writing_detected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_detection_confidence DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS ai_detection_notes TEXT;

-- Add comment for clarity
COMMENT ON COLUMN mus240_journal_entries.resubmission_count IS 'Number of times student has resubmitted (max 1 allowed)';
COMMENT ON COLUMN mus240_journal_grades.ai_writing_detected IS 'Whether AI-generated writing was detected in the submission';
COMMENT ON COLUMN mus240_journal_grades.ai_detection_confidence IS 'Confidence level of AI detection (0-100)';