-- Create unified communication history table
CREATE TABLE public.gw_user_message_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('sent', 'received')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  subject TEXT,
  content TEXT NOT NULL,
  recipient_emails TEXT[],
  recipient_phones TEXT[],
  sender_email TEXT,
  sender_name TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('draft', 'pending', 'sent', 'delivered', 'failed')),
  external_id TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast user lookups
CREATE INDEX idx_user_message_history_user ON gw_user_message_history(user_id, created_at DESC);
CREATE INDEX idx_user_message_history_channel ON gw_user_message_history(channel, created_at DESC);

-- Enable RLS
ALTER TABLE gw_user_message_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own message history
CREATE POLICY "Users view own message history"
  ON gw_user_message_history FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own sent messages
CREATE POLICY "Users insert own messages"
  ON gw_user_message_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can insert on behalf of users (for edge functions)
CREATE POLICY "Service role full access"
  ON gw_user_message_history FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE gw_user_message_history IS 'Unified log of all email and SMS communications for each user';