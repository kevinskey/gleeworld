-- Allow session hosts to update their own sessions (to end them)
CREATE POLICY "Hosts can update their own video sessions"
ON public.gw_video_sessions
FOR UPDATE
USING (auth.uid() = host_user_id)
WITH CHECK (auth.uid() = host_user_id);