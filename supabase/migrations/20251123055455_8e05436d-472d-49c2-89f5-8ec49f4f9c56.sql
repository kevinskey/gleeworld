-- Create direct_messages table for 1-on-1 conversations
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT different_users CHECK (sender_id != recipient_id)
);

-- Create index for faster queries
CREATE INDEX idx_direct_messages_sender ON public.direct_messages(sender_id, created_at DESC);
CREATE INDEX idx_direct_messages_recipient ON public.direct_messages(recipient_id, created_at DESC);
CREATE INDEX idx_direct_messages_conversation ON public.direct_messages(
  LEAST(sender_id, recipient_id), 
  GREATEST(sender_id, recipient_id), 
  created_at DESC
);

-- Enable Row Level Security
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages they sent or received
CREATE POLICY "Users can view their own direct messages"
  ON public.direct_messages
  FOR SELECT
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id
  );

-- Users can send direct messages
CREATE POLICY "Users can send direct messages"
  ON public.direct_messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can update read status on messages sent to them
CREATE POLICY "Users can mark received messages as read"
  ON public.direct_messages
  FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_direct_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_direct_messages_updated_at_trigger
  BEFORE UPDATE ON public.direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_direct_messages_updated_at();

-- Create view for conversation summaries
CREATE OR REPLACE VIEW direct_message_conversations AS
SELECT DISTINCT ON (conversation_id)
  CASE 
    WHEN sender_id < recipient_id THEN sender_id || '-' || recipient_id
    ELSE recipient_id || '-' || sender_id
  END as conversation_id,
  CASE 
    WHEN sender_id < recipient_id THEN sender_id
    ELSE recipient_id
  END as user1_id,
  CASE 
    WHEN sender_id < recipient_id THEN recipient_id
    ELSE sender_id
  END as user2_id,
  message_body as last_message,
  created_at as last_message_at,
  sender_id as last_sender_id
FROM public.direct_messages
ORDER BY conversation_id, created_at DESC;