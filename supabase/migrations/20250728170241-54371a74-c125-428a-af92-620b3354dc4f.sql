-- Add source column to scholarships table for tracking origin
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_scholarships_source ON scholarships(source);
CREATE INDEX IF NOT EXISTS idx_scholarships_deadline ON scholarships(deadline);
CREATE INDEX IF NOT EXISTS idx_scholarships_active ON scholarships(is_active);

-- Update existing scholarships to have 'manual' source
UPDATE scholarships SET source = 'manual' WHERE source IS NULL;