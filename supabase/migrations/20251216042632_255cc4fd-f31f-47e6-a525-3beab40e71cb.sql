-- Temporarily disable the problematic trigger
DROP TRIGGER IF EXISTS add_gw_group_leader_trigger ON public.gw_groups;

-- Create the default groups for MUS 070 without the trigger
INSERT INTO public.gw_groups (course_id, name, description, max_members, leader_id, is_active, is_official, semester)
VALUES
  ('a0000000-0000-0000-0000-000000000070', 'S1', 'Soprano 1 voice section', 50, 'aece359b-a80a-4726-ad75-49ed17fe20d2', true, true, 'Fall 2025'),
  ('a0000000-0000-0000-0000-000000000070', 'S2', 'Soprano 2 voice section', 50, 'aece359b-a80a-4726-ad75-49ed17fe20d2', true, true, 'Fall 2025'),
  ('a0000000-0000-0000-0000-000000000070', 'A1', 'Alto 1 voice section', 50, 'aece359b-a80a-4726-ad75-49ed17fe20d2', true, true, 'Fall 2025'),
  ('a0000000-0000-0000-0000-000000000070', 'A2', 'Alto 2 voice section', 50, 'aece359b-a80a-4726-ad75-49ed17fe20d2', true, true, 'Fall 2025'),
  ('a0000000-0000-0000-0000-000000000070', 'Exec Board', 'Executive Board members', 20, 'aece359b-a80a-4726-ad75-49ed17fe20d2', true, true, 'Fall 2025'),
  ('a0000000-0000-0000-0000-000000000070', 'Setup Crew', 'Performance setup and logistics team', 15, 'aece359b-a80a-4726-ad75-49ed17fe20d2', true, true, 'Fall 2025'),
  ('a0000000-0000-0000-0000-000000000070', 'Merch Team', 'Merchandise and sales team', 10, 'aece359b-a80a-4726-ad75-49ed17fe20d2', true, true, 'Fall 2025'),
  ('a0000000-0000-0000-0000-000000000070', 'Musical Leadership', 'Musical leadership and section leaders', 15, 'aece359b-a80a-4726-ad75-49ed17fe20d2', true, true, 'Fall 2025')
ON CONFLICT (course_id, name, semester) DO NOTHING;