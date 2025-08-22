-- Create some sample message groups for testing
INSERT INTO public.gw_message_groups (name, description, group_type, created_by) VALUES
  ('Executive Board', 'Executive board communications', 'executive', '4e6c2ec0-1f83-449a-a984-8920f6056ab5'),
  ('General Discussion', 'General club discussions', 'general', '4e6c2ec0-1f83-449a-a984-8920f6056ab5'),
  ('Soprano Section', 'Soprano section discussions', 'voice_section', '4e6c2ec0-1f83-449a-a984-8920f6056ab5')
ON CONFLICT DO NOTHING;

-- Add yourself as a member of these groups
INSERT INTO public.gw_group_members (group_id, user_id, role) 
SELECT id, '4e6c2ec0-1f83-449a-a984-8920f6056ab5', 'admin'
FROM public.gw_message_groups
WHERE name IN ('Executive Board', 'General Discussion', 'Soprano Section')
ON CONFLICT (group_id, user_id) DO NOTHING;