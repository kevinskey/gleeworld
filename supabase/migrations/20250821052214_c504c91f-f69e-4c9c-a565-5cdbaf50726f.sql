-- Create message groups/channels table
CREATE TABLE public.gw_message_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  group_type TEXT NOT NULL DEFAULT 'general' CHECK (group_type IN ('general', 'executive', 'voice_section', 'event', 'private')),
  is_private BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group memberships table
CREATE TABLE public.gw_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.gw_message_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin', 'moderator')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_muted BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(group_id, user_id)
);

-- Create messages table
CREATE TABLE public.gw_group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.gw_message_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'audio', 'system')),
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  reply_to_id UUID REFERENCES public.gw_group_messages(id),
  is_edited BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create message reactions table
CREATE TABLE public.gw_message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.gw_group_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Create typing indicators table
CREATE TABLE public.gw_typing_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.gw_message_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 seconds'),
  UNIQUE(group_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.gw_message_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message groups
CREATE POLICY "Users can view groups they are members of" 
ON public.gw_message_groups FOR SELECT 
USING (
  id IN (
    SELECT group_id FROM public.gw_group_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Group admins can update groups" 
ON public.gw_message_groups FOR UPDATE 
USING (
  id IN (
    SELECT group_id FROM public.gw_group_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins and executives can create groups" 
ON public.gw_message_groups FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ) OR EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- RLS Policies for group members
CREATE POLICY "Users can view group memberships for groups they belong to" 
ON public.gw_group_members FOR SELECT 
USING (
  group_id IN (
    SELECT group_id FROM public.gw_group_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Group admins can manage memberships" 
ON public.gw_group_members FOR ALL 
USING (
  group_id IN (
    SELECT group_id FROM public.gw_group_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can update their own membership" 
ON public.gw_group_members FOR UPDATE 
USING (user_id = auth.uid());

-- RLS Policies for messages
CREATE POLICY "Users can view messages in groups they belong to" 
ON public.gw_group_messages FOR SELECT 
USING (
  group_id IN (
    SELECT group_id FROM public.gw_group_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Group members can send messages" 
ON public.gw_group_messages FOR INSERT 
WITH CHECK (
  group_id IN (
    SELECT group_id FROM public.gw_group_members 
    WHERE user_id = auth.uid()
  ) AND user_id = auth.uid()
);

CREATE POLICY "Users can edit their own messages" 
ON public.gw_group_messages FOR UPDATE 
USING (user_id = auth.uid());

-- RLS Policies for reactions
CREATE POLICY "Users can view reactions in groups they belong to" 
ON public.gw_message_reactions FOR SELECT 
USING (
  message_id IN (
    SELECT id FROM public.gw_group_messages 
    WHERE group_id IN (
      SELECT group_id FROM public.gw_group_members 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can add/remove their own reactions" 
ON public.gw_message_reactions FOR ALL 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

-- RLS Policies for typing indicators
CREATE POLICY "Users can view typing indicators in their groups" 
ON public.gw_typing_indicators FOR SELECT 
USING (
  group_id IN (
    SELECT group_id FROM public.gw_group_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their own typing indicators" 
ON public.gw_typing_indicators FOR ALL 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_gw_group_members_user_id ON public.gw_group_members(user_id);
CREATE INDEX idx_gw_group_members_group_id ON public.gw_group_members(group_id);
CREATE INDEX idx_gw_group_messages_group_id ON public.gw_group_messages(group_id);
CREATE INDEX idx_gw_group_messages_created_at ON public.gw_group_messages(created_at DESC);
CREATE INDEX idx_gw_message_reactions_message_id ON public.gw_message_reactions(message_id);
CREATE INDEX idx_gw_typing_indicators_group_id ON public.gw_typing_indicators(group_id);

-- Create update triggers
CREATE OR REPLACE FUNCTION update_gw_message_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_gw_group_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_message_groups_updated_at
  BEFORE UPDATE ON public.gw_message_groups
  FOR EACH ROW EXECUTE FUNCTION update_gw_message_groups_updated_at();

CREATE TRIGGER update_gw_group_messages_updated_at
  BEFORE UPDATE ON public.gw_group_messages
  FOR EACH ROW EXECUTE FUNCTION update_gw_group_messages_updated_at();

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_message_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_typing_indicators;

-- Set replica identity for realtime updates
ALTER TABLE public.gw_message_groups REPLICA IDENTITY FULL;
ALTER TABLE public.gw_group_members REPLICA IDENTITY FULL;
ALTER TABLE public.gw_group_messages REPLICA IDENTITY FULL;
ALTER TABLE public.gw_message_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.gw_typing_indicators REPLICA IDENTITY FULL;