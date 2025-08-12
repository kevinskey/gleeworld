-- Grant auditions access to the correct users
INSERT INTO username_permissions (user_email, module_name, is_active, notes, granted_by) VALUES 
('jordynoneal@spelman.edu', 'auditions', true, 'Access granted for audition roster viewing', auth.uid()),
('onnestypeele@spelman.edu', 'auditions', true, 'Access granted for audition roster viewing', auth.uid())
ON CONFLICT (user_email, module_name) DO UPDATE SET 
  is_active = true,
  notes = EXCLUDED.notes,
  updated_at = now();