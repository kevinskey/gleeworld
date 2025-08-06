-- Create edge function to assess sight singing recordings
-- This function will analyze audio recordings for pitch accuracy and timing

-- First, create a table to store detailed sight singing assessments
CREATE TABLE IF NOT EXISTS sight_singing_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  score_value INTEGER NOT NULL CHECK (score_value >= 0 AND score_value <= 100),
  pitch_accuracy DECIMAL(5,2),
  rhythm_accuracy DECIMAL(5,2), 
  intonation_score DECIMAL(5,2),
  tempo_consistency DECIMAL(5,2),
  overall_musicality DECIMAL(5,2),
  feedback TEXT,
  audio_duration_seconds INTEGER,
  exercise_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on the sight singing assessments table
ALTER TABLE sight_singing_assessments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sight singing assessments
CREATE POLICY "Users can view their own sight singing assessments"
  ON sight_singing_assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sight singing assessments"
  ON sight_singing_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all sight singing assessments"
  ON sight_singing_assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_sight_singing_assessments_user_id 
ON sight_singing_assessments(user_id);

CREATE INDEX IF NOT EXISTS idx_sight_singing_assessments_created_at 
ON sight_singing_assessments(created_at);

-- Update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_sight_singing_assessments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sight_singing_assessments_updated_at
  BEFORE UPDATE ON sight_singing_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_sight_singing_assessments_updated_at();