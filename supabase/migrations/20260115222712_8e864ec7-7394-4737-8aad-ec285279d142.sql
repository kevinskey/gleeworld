-- Add 'secretary' to the allowed roles in app_roles
ALTER TABLE public.app_roles DROP CONSTRAINT IF EXISTS app_roles_role_check;

ALTER TABLE public.app_roles ADD CONSTRAINT app_roles_role_check 
CHECK (role IN ('admin', 'super_admin', 'executive_board', 'librarian', 'tour_manager', 'alumnae_liaison', 'secretary', 'instructor', 'ta'));

-- Add Rudy Schlosser as Teaching Assistant for LH 100 course
INSERT INTO public.course_teaching_assistants (user_id, course_code, notes, is_active)
VALUES (
  'b4df1a55-1c8b-44ae-96d0-861488fb9e53',
  'LH100',
  'Teaching Assistant and Secretary - Full course rights, attendance management',
  true
)
ON CONFLICT DO NOTHING;

-- Grant secretary role to this user for attendance taking
INSERT INTO public.app_roles (user_id, role, is_active)
VALUES (
  'b4df1a55-1c8b-44ae-96d0-861488fb9e53',
  'secretary',
  true
);