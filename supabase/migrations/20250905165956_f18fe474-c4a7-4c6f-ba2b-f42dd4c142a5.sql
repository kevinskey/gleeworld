-- Add current question tracking to polls
ALTER TABLE mus240_polls 
ADD COLUMN current_question_index INTEGER DEFAULT 0,
ADD COLUMN is_live_session BOOLEAN DEFAULT false,
ADD COLUMN show_results BOOLEAN DEFAULT false;

-- Create table for live poll responses
CREATE TABLE mus240_poll_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES mus240_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  question_index INTEGER NOT NULL,
  selected_answer INTEGER NOT NULL,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(poll_id, user_id, question_index)
);

-- Enable RLS
ALTER TABLE mus240_poll_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for poll responses
CREATE POLICY "Students can insert their own responses"
  ON mus240_poll_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update their own responses"
  ON mus240_poll_responses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Students can view their own responses"
  ON mus240_poll_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all responses"
  ON mus240_poll_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gw_profiles 
      WHERE user_id = auth.uid() 
      AND (is_admin = true OR is_super_admin = true)
    )
  );

-- Add indexes for performance
CREATE INDEX idx_poll_responses_poll_question ON mus240_poll_responses(poll_id, question_index);
CREATE INDEX idx_poll_responses_user ON mus240_poll_responses(user_id);

-- Enable realtime for poll responses
ALTER TABLE mus240_poll_responses REPLICA IDENTITY FULL;

-- Enable realtime for polls table updates
ALTER TABLE mus240_polls REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE mus240_poll_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE mus240_polls;