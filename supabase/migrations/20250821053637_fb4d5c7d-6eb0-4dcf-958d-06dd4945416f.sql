-- Create sample message groups for demo purposes
INSERT INTO gw_message_groups (name, description, group_type, is_private, is_archived, created_by)
VALUES 
  ('General Chat', 'Main group for general discussions', 'general', false, false, '8740a346-4b04-48fb-aa08-c4fdf1d0b77f'),
  ('Executive Board', 'Private group for executive board members', 'executive', true, false, '8740a346-4b04-48fb-aa08-c4fdf1d0b77f'),
  ('Soprano Section', 'Voice section group for sopranos', 'voice_section', false, false, '8740a346-4b04-48fb-aa08-c4fdf1d0b77f'),
  ('Alto Section', 'Voice section group for altos', 'voice_section', false, false, '8740a346-4b04-48fb-aa08-c4fdf1d0b77f');

-- Add the user to all groups as admin
INSERT INTO gw_group_members (group_id, user_id, role)
SELECT id, '8740a346-4b04-48fb-aa08-c4fdf1d0b77f', 'admin'
FROM gw_message_groups;

-- Add welcome messages to the general chat
INSERT INTO gw_group_messages (group_id, user_id, content, message_type)
SELECT id, '8740a346-4b04-48fb-aa08-c4fdf1d0b77f', 'Welcome to GleeWorld messaging! This is your GroupMe-style communication hub.', 'text'
FROM gw_message_groups 
WHERE name = 'General Chat';

INSERT INTO gw_group_messages (group_id, user_id, content, message_type)
SELECT id, '8740a346-4b04-48fb-aa08-c4fdf1d0b77f', 'You can create groups, send messages, react with emojis, and stay connected with your Glee Club family!', 'text'
FROM gw_message_groups 
WHERE name = 'General Chat';