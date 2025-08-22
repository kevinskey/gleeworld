-- Add missing foreign keys and indexes for messaging system

-- Add foreign key from gw_group_messages.user_id to gw_profiles.user_id
ALTER TABLE public.gw_group_messages 
ADD CONSTRAINT fk_gw_group_messages_user_profile 
FOREIGN KEY (user_id) REFERENCES public.gw_profiles(user_id) ON DELETE SET NULL;

-- Add foreign key from gw_message_reactions.user_id to gw_profiles.user_id
ALTER TABLE public.gw_message_reactions 
ADD CONSTRAINT fk_gw_message_reactions_user_profile 
FOREIGN KEY (user_id) REFERENCES public.gw_profiles(user_id) ON DELETE CASCADE;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_gw_group_messages_group_created 
ON public.gw_group_messages(group_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gw_group_messages_user_id 
ON public.gw_group_messages(user_id);

CREATE INDEX IF NOT EXISTS idx_gw_message_reactions_message_user 
ON public.gw_message_reactions(message_id, user_id);