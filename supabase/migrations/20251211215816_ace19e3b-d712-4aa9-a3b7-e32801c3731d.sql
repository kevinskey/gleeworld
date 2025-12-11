-- Create table for Glee Lounge video sessions
CREATE TABLE public.gw_video_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  host_user_id UUID NOT NULL,
  room_name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'scheduled')),
  max_participants INTEGER DEFAULT 50,
  is_recording_enabled BOOLEAN DEFAULT false,
  scheduled_start_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  recording_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for session participants
CREATE TABLE public.gw_video_session_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.gw_video_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  is_host BOOLEAN DEFAULT false,
  UNIQUE(session_id, user_id)
);

-- Create table for session chat messages
CREATE TABLE public.gw_video_session_chat (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.gw_video_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_video_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_video_session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_video_session_chat ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video sessions
CREATE POLICY "Authenticated users can view active sessions" 
ON public.gw_video_sessions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create sessions" 
ON public.gw_video_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Hosts can update their sessions" 
ON public.gw_video_sessions 
FOR UPDATE 
USING (auth.uid() = host_user_id);

-- RLS Policies for participants
CREATE POLICY "Authenticated users can view participants" 
ON public.gw_video_session_participants 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can join sessions" 
ON public.gw_video_session_participants 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" 
ON public.gw_video_session_participants 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for chat
CREATE POLICY "Participants can view session chat" 
ON public.gw_video_session_chat 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Participants can send messages" 
ON public.gw_video_session_chat 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_video_session_chat;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gw_video_sessions;

-- Add index for performance
CREATE INDEX idx_video_sessions_status ON public.gw_video_sessions(status);
CREATE INDEX idx_video_session_chat_session ON public.gw_video_session_chat(session_id);