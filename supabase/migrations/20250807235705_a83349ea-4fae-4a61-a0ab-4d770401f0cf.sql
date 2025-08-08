-- Create messages table for internal messaging system
CREATE TABLE public.gw_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('all-members', 'executive-board', 'section-leaders', 'alumnae', 'individual')),
  recipient_ids UUID[] NULL, -- For individual recipients
  message_type TEXT NOT NULL CHECK (message_type IN ('sms', 'internal', 'email', 'announcement')),
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'delivered', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for messages
CREATE POLICY "Users can view messages they sent" 
ON public.gw_messages 
FOR SELECT 
USING (sender_id = auth.uid());

CREATE POLICY "Users can view messages sent to them individually" 
ON public.gw_messages 
FOR SELECT 
USING (
  recipient_type = 'individual' 
  AND auth.uid() = ANY(recipient_ids)
);

CREATE POLICY "Users can view group messages based on their role" 
ON public.gw_messages 
FOR SELECT 
USING (
  recipient_type != 'individual' 
  AND (
    recipient_type = 'all-members' 
    OR (recipient_type = 'executive-board' AND EXISTS (
      SELECT 1 FROM gw_profiles WHERE user_id = auth.uid() AND is_exec_board = true
    ))
    OR (recipient_type = 'alumnae' AND EXISTS (
      SELECT 1 FROM gw_profiles WHERE user_id = auth.uid() AND role = 'alumna'
    ))
  )
);

CREATE POLICY "Users can create messages" 
ON public.gw_messages 
FOR INSERT 
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Admins can manage all messages" 
ON public.gw_messages 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

-- Create message read status table
CREATE TABLE public.gw_message_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES gw_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.gw_message_reads ENABLE ROW LEVEL SECURITY;

-- Create policies for message reads
CREATE POLICY "Users can manage their own read status" 
ON public.gw_message_reads 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_gw_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_gw_messages_updated_at
  BEFORE UPDATE ON gw_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_gw_messages_updated_at();