-- Add the Fan Engagement Module to the gw_modules table
INSERT INTO public.gw_modules (
    name,
    key,
    title,
    description,
    category,
    is_active,
    created_at
) VALUES (
    'fan-engagement',
    'fan-engagement', 
    'Fan Engagement',
    'Manage fan community, bulletin posts, and exclusive content',
    'communications',
    true,
    now()
) ON CONFLICT (name) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    is_active = EXCLUDED.is_active;