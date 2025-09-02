-- Grant librarian access to specific users via username permissions
INSERT INTO public.username_permissions (user_email, module_name, is_active, notes)
VALUES 
  ('madisynwashington@spelman.edu', 'music-library', true, 'Librarian dashboard access'),
  ('alexandrawilliams@spelman.edu', 'music-library', true, 'Librarian dashboard access')
ON CONFLICT (user_email, module_name) 
DO UPDATE SET 
  is_active = true,
  notes = 'Librarian dashboard access',
  updated_at = now();