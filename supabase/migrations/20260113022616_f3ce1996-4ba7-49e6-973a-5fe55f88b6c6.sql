-- Add duration_ms, layout, and transition columns to dashboard_hero_slides table
ALTER TABLE public.dashboard_hero_slides 
ADD COLUMN IF NOT EXISTS duration_ms integer DEFAULT 6000,
ADD COLUMN IF NOT EXISTS layout text DEFAULT 'one',
ADD COLUMN IF NOT EXISTS transition text DEFAULT 'fade';

-- Also add to gw_hero_slides for consistency
ALTER TABLE public.gw_hero_slides 
ADD COLUMN IF NOT EXISTS duration_ms integer DEFAULT 6000,
ADD COLUMN IF NOT EXISTS layout text DEFAULT 'one',
ADD COLUMN IF NOT EXISTS transition text DEFAULT 'fade';

-- Also add to advertising_hero for consistency
ALTER TABLE public.advertising_hero 
ADD COLUMN IF NOT EXISTS duration_ms integer DEFAULT 6000,
ADD COLUMN IF NOT EXISTS layout text DEFAULT 'one',
ADD COLUMN IF NOT EXISTS transition text DEFAULT 'fade';