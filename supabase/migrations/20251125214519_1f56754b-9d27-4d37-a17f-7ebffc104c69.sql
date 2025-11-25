-- Add poll support to messaging system

-- Create polls table
CREATE TABLE IF NOT EXISTS public.gw_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.gw_group_messages(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE,
  allow_multiple_selections BOOLEAN NOT NULL DEFAULT false,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create poll options table
CREATE TABLE IF NOT EXISTS public.gw_poll_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.gw_polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create poll votes table
CREATE TABLE IF NOT EXISTS public.gw_poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.gw_polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.gw_poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, option_id, user_id)
);

-- Enable RLS
ALTER TABLE public.gw_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_poll_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for polls
CREATE POLICY "Users can view polls in groups they belong to"
ON public.gw_polls FOR SELECT
USING (
  message_id IN (
    SELECT gm.id FROM public.gw_group_messages gm
    INNER JOIN public.gw_group_members gmem ON gmem.group_id = gm.group_id
    WHERE gmem.user_id = auth.uid()
  )
);

CREATE POLICY "Group members can create polls"
ON public.gw_polls FOR INSERT
WITH CHECK (
  message_id IN (
    SELECT gm.id FROM public.gw_group_messages gm
    INNER JOIN public.gw_group_members gmem ON gmem.group_id = gm.group_id
    WHERE gmem.user_id = auth.uid()
  )
);

CREATE POLICY "Poll creators can update their polls"
ON public.gw_polls FOR UPDATE
USING (created_by = auth.uid());

-- RLS Policies for poll options
CREATE POLICY "Users can view poll options for accessible polls"
ON public.gw_poll_options FOR SELECT
USING (
  poll_id IN (
    SELECT p.id FROM public.gw_polls p
    INNER JOIN public.gw_group_messages gm ON gm.id = p.message_id
    INNER JOIN public.gw_group_members gmem ON gmem.group_id = gm.group_id
    WHERE gmem.user_id = auth.uid()
  )
);

CREATE POLICY "Poll creators can insert options"
ON public.gw_poll_options FOR INSERT
WITH CHECK (
  poll_id IN (
    SELECT id FROM public.gw_polls WHERE created_by = auth.uid()
  )
);

-- RLS Policies for poll votes
CREATE POLICY "Users can view votes for accessible polls"
ON public.gw_poll_votes FOR SELECT
USING (
  poll_id IN (
    SELECT p.id FROM public.gw_polls p
    INNER JOIN public.gw_group_messages gm ON gm.id = p.message_id
    INNER JOIN public.gw_group_members gmem ON gmem.group_id = gm.group_id
    WHERE gmem.user_id = auth.uid()
  )
);

CREATE POLICY "Users can vote on accessible polls"
ON public.gw_poll_votes FOR INSERT
WITH CHECK (
  poll_id IN (
    SELECT p.id FROM public.gw_polls p
    INNER JOIN public.gw_group_messages gm ON gm.id = p.message_id
    INNER JOIN public.gw_group_members gmem ON gmem.group_id = gm.group_id
    WHERE gmem.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own votes"
ON public.gw_poll_votes FOR DELETE
USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX idx_gw_polls_message_id ON public.gw_polls(message_id);
CREATE INDEX idx_gw_poll_options_poll_id ON public.gw_poll_options(poll_id);
CREATE INDEX idx_gw_poll_votes_poll_id ON public.gw_poll_votes(poll_id);
CREATE INDEX idx_gw_poll_votes_user_id ON public.gw_poll_votes(user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_gw_polls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_polls_updated_at
  BEFORE UPDATE ON public.gw_polls
  FOR EACH ROW EXECUTE FUNCTION update_gw_polls_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_poll_options;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_poll_votes;

-- Set replica identity
ALTER TABLE public.gw_polls REPLICA IDENTITY FULL;
ALTER TABLE public.gw_poll_options REPLICA IDENTITY FULL;
ALTER TABLE public.gw_poll_votes REPLICA IDENTITY FULL;

-- Update message_type constraint to include 'poll'
ALTER TABLE public.gw_group_messages 
DROP CONSTRAINT IF EXISTS gw_group_messages_message_type_check;

ALTER TABLE public.gw_group_messages
ADD CONSTRAINT gw_group_messages_message_type_check 
CHECK (message_type IN ('text', 'image', 'file', 'audio', 'system', 'poll'));