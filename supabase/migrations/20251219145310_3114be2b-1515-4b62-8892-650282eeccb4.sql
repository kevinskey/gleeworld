-- Add unique constraint on name
ALTER TABLE public.messenger_groups ADD CONSTRAINT messenger_groups_name_key UNIQUE (name);

-- Create all messenger groups
INSERT INTO public.messenger_groups (name, description, is_active) VALUES
  ('All Members', 'All active Glee Club members and super admins', true),
  ('Soprano 1', 'S1 voice section', true),
  ('Soprano 2', 'S2 voice section', true),
  ('Alto 1', 'A1 voice section', true),
  ('Alto 2', 'A2 voice section', true),
  ('Musical Leadership', 'Section leaders, Doc Johnson, and student conductor', true),
  ('Setup Crew', 'First-year freshman members', true),
  ('First-Years', 'Freshman class members', true),
  ('Sophomores', 'Sophomore class members', true),
  ('Juniors', 'Junior class members', true),
  ('Seniors', 'Senior class members', true),
  ('Alumnae', 'Glee Club alumnae', true),
  ('Tour Hosts', 'Tour host volunteers', true),
  ('Fans', 'Glee Club fans and supporters', true),
  ('Mentors', 'Active mentors', true)
ON CONFLICT (name) DO NOTHING;

-- Run the sync
SELECT public.sync_all_messenger_groups();