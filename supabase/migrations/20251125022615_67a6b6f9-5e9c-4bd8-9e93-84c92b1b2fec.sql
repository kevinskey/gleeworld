-- Insert default group message groups for the Glee Club
INSERT INTO public.gw_message_groups (name, description, group_type, type, created_by, is_active)
SELECT 
  'Executive Board', 
  'Executive board members only', 
  'executive',
  'custom',
  id,
  true
FROM auth.users 
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.gw_message_groups (name, description, group_type, type, created_by, is_active)
SELECT 
  'Section Leaders', 
  'Section leaders group', 
  'general',
  'custom',
  id,
  true
FROM auth.users 
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.gw_message_groups (name, description, group_type, type, created_by, is_active)
SELECT 
  'Soprano 1', 
  'Soprano 1 section', 
  'voice_section',
  'custom',
  id,
  true
FROM auth.users 
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.gw_message_groups (name, description, group_type, type, created_by, is_active)
SELECT 
  'Soprano 2', 
  'Soprano 2 section', 
  'voice_section',
  'custom',
  id,
  true
FROM auth.users 
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.gw_message_groups (name, description, group_type, type, created_by, is_active)
SELECT 
  'Alto 1', 
  'Alto 1 section', 
  'voice_section',
  'custom',
  id,
  true
FROM auth.users 
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.gw_message_groups (name, description, group_type, type, created_by, is_active)
SELECT 
  'Alto 2', 
  'Alto 2 section', 
  'voice_section',
  'custom',
  id,
  true
FROM auth.users 
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.gw_message_groups (name, description, group_type, type, created_by, is_active)
SELECT 
  'All Members', 
  'All Glee Club members', 
  'general',
  'custom',
  id,
  true
FROM auth.users 
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.gw_message_groups (name, description, group_type, type, created_by, is_active)
SELECT 
  'All Alumnae', 
  'All alumnae members', 
  'general',
  'custom',
  id,
  true
FROM auth.users 
LIMIT 1
ON CONFLICT DO NOTHING;