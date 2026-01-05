-- Add DELETE policy for video sessions so hosts can delete their own sessions
CREATE POLICY "Hosts can delete their own video sessions"
ON public.gw_video_sessions
FOR DELETE
USING (auth.uid() = host_user_id);