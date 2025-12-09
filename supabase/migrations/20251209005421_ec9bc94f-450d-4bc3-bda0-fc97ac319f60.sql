-- Add is_draft column to member_exit_interviews to support saving drafts
ALTER TABLE member_exit_interviews 
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT true;

-- Update existing records to mark them as submitted (not drafts)
UPDATE member_exit_interviews SET is_draft = false WHERE is_draft IS NULL;