-- Create direct message conversations table
CREATE TABLE IF NOT EXISTS public.dm_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT different_participants CHECK (participant_1 != participant_2),
  CONSTRAINT ordered_participants CHECK (participant_1 < participant_2)
);

-- Create direct messages table
CREATE TABLE IF NOT EXISTS public.dm_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dm_conversations_participants ON public.dm_conversations(participant_1, participant_2);
CREATE INDEX IF NOT EXISTS idx_dm_messages_conversation ON public.dm_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_messages_sender ON public.dm_messages(sender_id);

-- Enable Row Level Security
ALTER TABLE public.dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dm_conversations
CREATE POLICY "Users can view their own conversations"
  ON public.dm_conversations
  FOR SELECT
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Users can create conversations"
  ON public.dm_conversations
  FOR INSERT
  WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- RLS Policies for dm_messages
CREATE POLICY "Users can view messages in their conversations"
  ON public.dm_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dm_conversations
      WHERE id = conversation_id
      AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON public.dm_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.dm_conversations
      WHERE id = conversation_id
      AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
    )
  );

CREATE POLICY "Users can update their own message read status"
  ON public.dm_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.dm_conversations
      WHERE id = conversation_id
      AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
    )
  );

-- Function to update last_message_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.dm_conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update conversation timestamp on new message
CREATE TRIGGER update_dm_conversation_timestamp
  AFTER INSERT ON public.dm_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- Enable realtime for dm_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
ALTER TABLE public.dm_messages REPLICA IDENTITY FULL;