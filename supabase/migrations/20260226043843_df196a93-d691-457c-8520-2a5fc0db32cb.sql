INSERT INTO public.gw_modules (key, name, description, category, is_active, default_permissions) VALUES 
('feed-control', 'Feed Control', 'Manage news and scholarship RSS feed sources, filtering, quantity, and timing', 'system', true, '["admin","super-admin"]')
ON CONFLICT (key) DO NOTHING;