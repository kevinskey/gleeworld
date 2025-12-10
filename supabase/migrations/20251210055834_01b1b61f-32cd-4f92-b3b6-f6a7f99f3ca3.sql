-- Add 'direct' to the allowed group_type values
ALTER TABLE public.gw_message_groups 
DROP CONSTRAINT IF EXISTS gw_message_groups_group_type_check;

ALTER TABLE public.gw_message_groups 
ADD CONSTRAINT gw_message_groups_group_type_check 
CHECK (group_type = ANY (ARRAY['general'::text, 'executive'::text, 'voice_section'::text, 'event'::text, 'private'::text, 'direct'::text]));