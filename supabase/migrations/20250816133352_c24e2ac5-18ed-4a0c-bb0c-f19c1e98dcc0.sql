-- Add the Fan Engagement Module to the gw_modules table
INSERT INTO public.gw_modules (
    name,
    key,
    description,
    category,
    is_active,
    default_permissions,
    created_at
) VALUES (
    'fan-engagement',
    'fan-engagement', 
    'Manage fan community, bulletin posts, and exclusive content',
    'communications',
    true,
    '["view", "manage"]'::jsonb,
    now()
) ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    is_active = EXCLUDED.is_active,
    default_permissions = EXCLUDED.default_permissions;