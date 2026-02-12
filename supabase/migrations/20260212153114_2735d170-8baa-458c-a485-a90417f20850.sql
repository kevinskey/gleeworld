
-- Step 1: Add new enum values (these get committed with this migration)
ALTER TYPE assignment_status ADD VALUE IF NOT EXISTS 'ai_graded';
ALTER TYPE assignment_status ADD VALUE IF NOT EXISTS 'revision_submitted';

-- Add revision columns to gw_assignment_submissions
ALTER TABLE gw_assignment_submissions
  ADD COLUMN IF NOT EXISTS revision_content text,
  ADD COLUMN IF NOT EXISTS revision_recording_url text,
  ADD COLUMN IF NOT EXISTS revision_notes text,
  ADD COLUMN IF NOT EXISTS revision_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revised_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_feedback text,
  ADD COLUMN IF NOT EXISTS ai_score numeric;

-- Add revision columns to gw_course_submissions
ALTER TABLE gw_course_submissions
  ADD COLUMN IF NOT EXISTS revision_content text,
  ADD COLUMN IF NOT EXISTS revision_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revised_at timestamptz,
  ADD COLUMN IF NOT EXISTS original_content text;
