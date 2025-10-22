-- Grant librarian permission to Alexandra Williams
INSERT INTO username_permissions (user_email, module_name, is_active, notes)
VALUES ('alexandrawilliams@spelman.edu', 'librarian', true, 'Granted via migration for librarian dashboard access')
ON CONFLICT (user_email, module_name) 
DO UPDATE SET is_active = true, updated_at = now();