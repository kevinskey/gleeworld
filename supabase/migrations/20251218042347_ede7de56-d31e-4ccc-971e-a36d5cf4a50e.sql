INSERT INTO gw_modules (name, key, category, description, default_permissions, is_active) 
VALUES ('Section Assignment', 'section-assignment', 'member-management', 'Assign voice parts (S1, S2, A1, A2) to choir members', '["view", "manage"]'::jsonb, true)
ON CONFLICT (key) DO NOTHING;