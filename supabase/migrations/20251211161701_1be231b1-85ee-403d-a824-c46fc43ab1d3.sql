-- Create table for live video session invites
CREATE TABLE public.gw_live_session_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_host_id UUID NOT NULL,
  session_host_name TEXT NOT NULL,
  invited_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 minutes')
);

-- Enable RLS
ALTER TABLE public.gw_live_session_invites ENABLE ROW LEVEL SECURITY;

-- Users can see invites sent to them
CREATE POLICY "Users can view their own invites"
ON public.gw_live_session_invites
FOR SELECT
USING (auth.uid() = invited_user_id);

-- Users can insert invites (as hosts)
CREATE POLICY "Users can create invites"
ON public.gw_live_session_invites
FOR INSERT
WITH CHECK (auth.uid() = session_host_id);

-- Users can update their own invites (accept/decline)
CREATE POLICY "Users can update their invites"
ON public.gw_live_session_invites
FOR UPDATE
USING (auth.uid() = invited_user_id);

-- Hosts can delete their invites
CREATE POLICY "Hosts can delete their invites"
ON public.gw_live_session_invites
FOR DELETE
USING (auth.uid() = session_host_id);

-- Enable realtime
ALTER TABLE public.gw_live_session_invites REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_live_session_invites;