-- Create sample message groups and add current user
-- First, let's create some default message groups

INSERT INTO gw_message_groups (name, description, group_type, is_private, is_archived, created_by)
VALUES 
  ('General Chat', 'Main group for general discussions', 'general', false, false, auth.uid()),
  ('Executive Board', 'Private group for executive board members', 'executive', true, false, auth.uid()),
  ('Soprano Section', 'Voice section group for sopranos', 'voice_section', false, false, auth.uid()),
  ('Alto Section', 'Voice section group for altos', 'voice_section', false, false, auth.uid()),
  ('Tenor Section', 'Voice section group for tenors', 'voice_section', false, false, auth.uid()),
  ('Bass Section', 'Voice section group for basses', 'voice_section', false, false, auth.uid());

-- Add the current user to all groups as admin
INSERT INTO gw_group_members (group_id, user_id, role)
SELECT id, auth.uid(), 'admin'
FROM gw_message_groups;

-- Add welcome messages to the general chat
INSERT INTO gw_group_messages (group_id, user_id, content, message_type)
SELECT id, auth.uid(), 'Welcome to GleeWorld messaging! This is your GroupMe-style communication hub.', 'text'
FROM gw_message_groups 
WHERE name = 'General Chat';

INSERT INTO gw_group_messages (group_id, user_id, content, message_type)
SELECT id, auth.uid(), 'You can create groups, send messages, react with emojis, and stay connected with your Glee Club family!', 'text'
FROM gw_message_groups 
WHERE name = 'General Chat';