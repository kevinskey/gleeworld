-- Add link_url column to dashboard_hero_slides
ALTER TABLE dashboard_hero_slides
ADD COLUMN IF NOT EXISTS link_url TEXT,
ADD COLUMN IF NOT EXISTS link_target TEXT DEFAULT 'internal' CHECK (link_target IN ('internal', 'external'));