-- Create SMS group conversation tables
CREATE TABLE IF NOT EXISTS public.gw_sms_conversations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES public.gw_message_groups(id) ON DELETE CASCADE,
    twilio_phone_number TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gw_sms_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.gw_sms_conversations(id) ON DELETE CASCADE,
    sender_phone TEXT NOT NULL,
    sender_user_id UUID REFERENCES auth.users(id),
    message_body TEXT NOT NULL,
    twilio_message_sid TEXT UNIQUE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    status TEXT NOT NULL DEFAULT 'delivered',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_sms_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_sms_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for SMS conversations
CREATE POLICY "Group members can view conversations"
ON public.gw_sms_conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_group_members gm
    WHERE gm.group_id = gw_sms_conversations.group_id 
    AND gm.user_id = auth.uid()
  )
  OR 
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp
    WHERE gp.user_id = auth.uid() 
    AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
);

CREATE POLICY "Admins can manage conversations"
ON public.gw_sms_conversations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp
    WHERE gp.user_id = auth.uid() 
    AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
);

-- RLS Policies for SMS messages
CREATE POLICY "Group members can view messages"
ON public.gw_sms_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_sms_conversations sc
    JOIN public.gw_group_members gm ON gm.group_id = sc.group_id
    WHERE sc.id = gw_sms_messages.conversation_id 
    AND gm.user_id = auth.uid()
  )
  OR 
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp
    WHERE gp.user_id = auth.uid() 
    AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
);

CREATE POLICY "Group members can send messages"
ON public.gw_sms_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_sms_conversations sc
    JOIN public.gw_group_members gm ON gm.group_id = sc.group_id
    WHERE sc.id = gw_sms_messages.conversation_id 
    AND gm.user_id = auth.uid()
  )
  OR 
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp
    WHERE gp.user_id = auth.uid() 
    AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
);

CREATE POLICY "Admins can manage messages"
ON public.gw_sms_messages FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp
    WHERE gp.user_id = auth.uid() 
    AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_gw_sms_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_sms_conversations_updated_at
    BEFORE UPDATE ON public.gw_sms_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_gw_sms_conversations_updated_at();

-- Add some indexes for performance
CREATE INDEX IF NOT EXISTS idx_gw_sms_conversations_group_id ON public.gw_sms_conversations(group_id);
CREATE INDEX IF NOT EXISTS idx_gw_sms_messages_conversation_id ON public.gw_sms_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_gw_sms_messages_sender_phone ON public.gw_sms_messages(sender_phone);
CREATE INDEX IF NOT EXISTS idx_gw_sms_messages_twilio_sid ON public.gw_sms_messages(twilio_message_sid);