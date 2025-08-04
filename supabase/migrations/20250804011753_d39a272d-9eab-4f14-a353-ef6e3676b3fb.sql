-- Insert the specific modules that the user wants to make modular
INSERT INTO public.gw_modules (name, description, category, is_active, default_permissions) VALUES
('media_library', 'Access to media library with file organization', 'pr', true, '["view"]'),
('hero_manager', 'Manage hero images and featured content', 'pr', true, '["view", "edit"]'),
('pr_manager', 'PR data analytics and management tools', 'pr', true, '["view", "edit"]'),
('ai_tools', 'AI-powered template generation and content tools', 'pr', true, '["view", "use"]'),
('press_kits', 'Create and manage press kits', 'pr', true, '["view", "create", "edit"]');

-- Grant default permissions to executive board members for these modules
INSERT INTO public.gw_module_permissions (user_id, module_id, permission_type, granted_by)
SELECT 
  ebm.user_id,
  m.id,
  'view',
  (SELECT user_id FROM public.gw_profiles WHERE is_super_admin = true LIMIT 1)
FROM public.gw_executive_board_members ebm
CROSS JOIN public.gw_modules m
WHERE ebm.is_active = true 
AND m.name IN ('media_library', 'hero_manager', 'pr_manager', 'ai_tools', 'press_kits')
ON CONFLICT (user_id, module_id, permission_type) DO NOTHING;