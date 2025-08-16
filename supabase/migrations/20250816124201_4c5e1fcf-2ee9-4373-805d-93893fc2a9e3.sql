-- Add alumnae liaison permissions to manage alumnae content
CREATE POLICY "alumnae_content_liaison_manage" 
ON public.alumnae_content 
FOR ALL 
USING (public.user_has_alumnae_liaison_role(auth.uid()));

-- Add policies for other alumnae-related tables that liaisons should manage
-- Alumnae stories management
DROP POLICY IF EXISTS "alumnae_stories_liaison_manage" ON public.alumnae_stories;
CREATE POLICY "alumnae_stories_liaison_manage" 
ON public.alumnae_stories 
FOR ALL 
USING (public.user_has_alumnae_liaison_role(auth.uid()));

-- Alumnae messages management  
DROP POLICY IF EXISTS "alumnae_messages_liaison_manage" ON public.alumnae_messages;
CREATE POLICY "alumnae_messages_liaison_manage" 
ON public.alumnae_messages 
FOR ALL 
USING (public.user_has_alumnae_liaison_role(auth.uid()));

-- Alumnae audio stories management
DROP POLICY IF EXISTS "alumnae_audio_stories_liaison_manage" ON public.alumnae_audio_stories;
CREATE POLICY "alumnae_audio_stories_liaison_manage" 
ON public.alumnae_audio_stories 
FOR ALL 
USING (public.user_has_alumnae_liaison_role(auth.uid()));

-- Add your user as alumnae liaison if not already assigned
INSERT INTO public.app_roles (user_id, role, is_active)
VALUES (auth.uid(), 'alumnae_liaison', TRUE)
ON CONFLICT (user_id, role) DO NOTHING;