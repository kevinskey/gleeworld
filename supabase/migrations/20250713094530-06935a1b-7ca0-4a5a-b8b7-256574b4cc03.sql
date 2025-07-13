-- Add username permission for sheet music migration (fix the UUID issue)
INSERT INTO public.username_permissions (user_email, module_name, granted_by, notes)
VALUES ('sparkleme2002@gmail.com', 'migrate_sheet_music', 'dc10608c-dfa7-4aa3-8206-a0361f015a21', 'Access to sheet music migration tool')
ON CONFLICT (user_email, module_name) DO NOTHING;